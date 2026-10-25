import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function verifyNarrationDiscoveryControls(browser,url,input,out,errors){
 const p=await browser.newPage(),checks=[];p.on('pageerror',e=>errors.push(String(e)));
 const upload=async(id,path)=>{await(await p.$('#'+id)).uploadFile(path);};
 const field=async(id,value)=>p.$eval('#'+id,(e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const wait=part=>p.waitForFunction(part=>document.getElementById('narration-status').textContent.includes(part),{},part);
 const media=join(input,'asr-synthetic-speech.webm'),vttPath=join(input,'asr-synthetic-speech.vtt'),vtt=await readFile(vttPath,'utf8');
 try{
  await p.goto(url+'/sequence');await p.click('#narration-moments summary');assert.equal(await p.$eval('#narration-file',e=>e.disabled),true);
  await upload('clip-file',media);await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Original clip ready'));
  await upload('narration-file',vttPath);await wait('Transcript read');await field('narration-attribution','Existing synthetic-speech ASR control; no physical learning claim.');await p.click('#narration-pair');await wait('Narration paired');
  const original=await p.$eval('#narration-results',e=>e.textContent);
  const wrong=join(out,'wrong-discovery-source.vtt');await writeFile(wrong,vtt.replace('48a48f20d264b5bd55f3f939979248409b3dbc72214675da295098758cb104f0','b'.repeat(64)));
  await upload('narration-file',wrong);await wait('Transcript read');await p.click('#narration-pair');await wait('declared source digest');assert.equal(await p.$eval('#narration-results',e=>e.textContent),original);
  assert.equal(await p.$eval('#narration-results button',e=>e.disabled),true);await p.click('#narration-discard');await wait('Draft discarded');assert.equal(await p.$eval('#narration-results',e=>e.textContent),original);
  checks.push('missing original clip gates intake; mismatched producer declaration preserves accepted navigation and draft can be discarded');
  await field('narration-offset','-1');await p.click('#narration-pair');await wait('Narration paired');
  assert.equal(await p.$eval('#narration-results button[data-cue="0"][data-choice="start"]',e=>e.disabled),true);
  assert.match(await p.$eval('#narration-results button[data-cue="0"][data-choice="start"]',e=>e.textContent),/-1 s.*outside clip/);
  await p.click('#narration-results button[data-cue="0"][data-choice="midpoint"]');await p.waitForFunction(()=>!document.getElementById('capture-moment').disabled);assert.ok(Math.abs(Number(await p.$eval('#moment-time',e=>e.value))-.15)<1e-12);assert.equal(await p.$eval('#moment-count',e=>e.textContent),'0 / 12');
  await field('narration-offset','20');await p.click('#narration-pair');await wait('Narration paired');assert.equal(await p.$$eval('#narration-results button',a=>a.every(x=>x.disabled)),true);
  await field('narration-offset','0');await p.click('#narration-pair');await wait('Narration paired');
  await field('narration-search','not-present');assert.match(await p.$eval('#narration-results',e=>e.textContent),/No cue matches/);await field('narration-search','');assert.equal(await p.$$eval('#narration-results article',a=>a.length),2);
  checks.push('negative and beyond-duration candidates remain visible but nonseekable; valid midpoint preview creates no retained frame; zero-result search clears correctly');
  const pages=join(out,'discovery-pages.vtt');await writeFile(pages,'WEBVTT\n\n'+Array.from({length:51},(_,i)=>'00:00.000 --> 00:00.100\nPagination control '+i).join('\n\n'));
  await upload('narration-file',pages);await wait('Transcript read');await p.click('#narration-pair');await wait('Narration paired');assert.equal(await p.$$eval('#narration-results article',a=>a.length),50);
  await p.click('#narration-next');assert.equal(await p.$$eval('#narration-results article',a=>a.length),1);assert.ok(await p.$('#narration-results button[data-cue="50"]'));
  await p.click('#narration-previous');assert.equal(await p.$$eval('#narration-results article',a=>a.length),50);
  await field('narration-search','Pagination control 50');assert.equal(await p.$$eval('#narration-results article',a=>a.length),1);assert.ok(await p.$('#narration-results button[data-cue="50"][data-choice="end"]'));
  await p.setViewport({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:join(out,'narration-discovery-narrow.png'),fullPage:true});checks.push('real paginated navigation and literal search preserve original cue indexes at narrow width');
  await p.evaluate(()=>{
   document.getElementById('narration-file').value='';const old=File.prototype.arrayBuffer;
   File.prototype.arrayBuffer=function(){if(this.name==='asr-synthetic-speech.vtt')return new Promise(resolve=>{window.releaseNarrationRead=async()=>{resolve(await old.call(this));window.narrationReadReleased=true;};});return old.call(this);};
  });
  await upload('narration-file',vttPath);await p.waitForFunction(()=>!!window.releaseNarrationRead);
  assert.equal(await p.$eval('#narration-pair',e=>e.disabled),true);assert.equal(await p.$$eval('#narration-results button',a=>a.every(e=>e.disabled)),true);
  await p.$eval('#clip-file',e=>e.value='');await upload('clip-file',media);
  await p.waitForFunction(()=>document.getElementById('narration-count').textContent==='No narration paired.'&&document.getElementById('status').textContent.includes('Original clip ready'));
  await p.evaluate(()=>window.releaseNarrationRead());await p.waitForFunction(()=>window.narrationReadReleased);await new Promise(r=>setTimeout(r,100));
  assert.equal(await p.$eval('#narration-count',e=>e.textContent),'No narration paired.');assert.equal(await p.$eval('#narration-pair',e=>e.disabled),true);assert.equal(await p.$$eval('#narration-results article',a=>a.length),0);
  checks.push('late transcript read is retired after same-byte original-clip replacement; new session inherits no navigation');
  return checks;
 }finally{await p.close();}
}
