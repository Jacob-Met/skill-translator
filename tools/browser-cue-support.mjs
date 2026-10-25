import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'/tmp/cue-support-qa');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;let browser;const checks=[],errors=[];
async function downloaded(name){const path=out+'/'+name;for(let i=0;i<100;i++){try{await stat(path);return JSON.parse(await readFile(path,'utf8'));}catch{await new Promise(r=>setTimeout(r,100));}}throw Error('Chrome download did not complete: '+name);}
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run']});const sandbox=await browser.newPage();await sandbox.goto('chrome://sandbox');const sandboxText=await sandbox.evaluate(()=>document.body.innerText);await writeFile(out+'/sandbox.txt',sandboxText);assert.match(sandboxText,/You are adequately sandboxed/i);await sandbox.close();const cdp=await browser.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});let p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto(url+'/cue-sufficiency');
 const sources=await p.evaluate(async()=>{
  const {createSequence,appendMoment,upsertStep}=await import('/src/demonstration-sequence.mjs');const {frameOrigin}=await import('/src/frame-origin.mjs');
  const sources=[];for(let n=0;n<4;n++){
   const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:String(n+1).repeat(64),durationSeconds:10};let sequence=createSequence(clip,{title:`Authored example ${n+1}`}),frames=[];
   for(let i=1;i<=2;i++){const c=document.createElement('canvas');c.width=100;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle=i===1?'red':'blue';ctx.fillRect(0,0,100,80);const blob=await new Promise(r=>c.toBlob(r,'image/png')),bytes=await blob.arrayBuffer(),sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');const image={name:`frame-${i}.png`,mimeType:'image/png',sha256,widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};sequence=appendMoment(sequence,{id:`moment-${i}`,label:`State ${i}`,visibleState:'Authored control',image,origin:frameOrigin(clip,i,{mediaTime:i,width:100,height:80},image)});frames.push({momentId:`moment-${i}`,pngBase64:c.toDataURL('image/png').split(',')[1]});}
   sequence=upsertStep(sequence,{id:'step-1',beforeMomentId:'moment-1',afterMomentId:'moment-2',title:'Align',intent:'Align edge',sensoryCue:n?'Feel resistance':'',visibleChange:'Edge aligned',recoveryCue:'Pause'});sources.push({format:'skill-translator.sequence-bundle/v1',sequence,frames});
  }return sources;
 });

 const comparison={format:'skill-translator.decision-comparison-bundle/v1',study:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples:sources.map(s=>({source:s.sequence,stepId:'step-1'}))},sources};
 await writeFile(out+'/comparison.json',JSON.stringify(comparison));await(await p.$('#open')).uploadFile(out+'/comparison.json');await p.waitForFunction(()=>document.querySelectorAll('#examples article').length===4);assert.equal(await p.$$eval('#examples img',a=>a.length),8);checks.push('original four-example comparison and eight verified frame images');
 await p.click('#add');
 async function fill(){await p.evaluate(()=>{const edit=(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));};const cues=[...document.querySelectorAll('#cues input')];['Texture','Authored texture account','Resistance','Supplied tactile account'].forEach((v,i)=>edit(cues[i],v));const rows=[['stay','0','0'],['change','0','1'],['change','1','0'],['stay','1','1']];document.querySelectorAll('#examples article').forEach((article,i)=>{const inputs=article.querySelectorAll('input');edit(inputs[0],rows[i][0]);edit(inputs[1],'Explicit authored control');edit(inputs[2],rows[i][1]);edit(inputs[3],rows[i][2]);});});}
 await fill();await p.click('#inspect');assert.match(await p.$eval('#results',e=>e.textContent),/Texture \+ Resistance/);checks.push('complementary XOR cue combinations through actual editor');await p.click('#support');assert.match(await p.$eval('#support-results',e=>e.textContent),/no-exact-support/);assert.equal(await p.$$eval('#support-results h3',a=>a.length),4);checks.push('all four withheld XOR patterns lack exact retained support');
 await p.click('#save');const saved=await downloaded('cue-study.json');assert.equal(saved.comparison.sources.length,4);assert.equal(saved.study.rows.length,4);assert.equal(saved.study.minimalCueSets,undefined);checks.push('actual download retains raw source accounts and inputs only');
 await p.evaluate(()=>{const e=document.querySelectorAll('#examples article')[0].querySelectorAll('input')[2];e.value='';e.dispatchEvent(new Event('input'));});assert.equal(await p.$eval('#results',e=>e.textContent),'');assert.equal(await p.$eval('#support-results',e=>e.textContent),'');await p.click('#inspect');assert.match(await p.$eval('#results',e=>e.textContent),/unresolved/);checks.push('unknown cue invalidates and refuses a false complete distinction');
 await fill();await p.evaluate(()=>{const e=document.querySelectorAll('#examples article')[1].querySelectorAll('input')[3];e.value='0';e.dispatchEvent(new Event('input'));});await p.click('#inspect');assert.match(await p.$eval('#results',e=>e.textContent),/conflicting/);checks.push('same complete cues with different decisions exposes exact conflicting pair');
 await p.close();p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.setViewport({width:390,height:844});await p.goto(url+'/cue-sufficiency');await(await p.$('#open')).uploadFile(out+'/cue-study.json');await p.waitForFunction(()=>document.querySelectorAll('#examples article').length===4);await p.click('#inspect');assert.match(await p.$eval('#results',e=>e.textContent),/Texture \+ Resistance/);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:out+'/narrow.png',fullPage:true});checks.push('fresh 390px raw-source reopening and recomputation');await p.focus('#support');await p.keyboard.press('Enter');assert.match(await p.$eval('#support-results',e=>e.textContent),/no-exact-support/);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));checks.push('keyboard narrow raw reopen recomputes omission support');
 const unusual=structuredClone(saved);unusual.study.cues[0].id='cue2';await writeFile(out+'/unusual.json',JSON.stringify(unusual));await p.$eval('#cues input',e=>{e.value='pending';e.dispatchEvent(new Event('input'));});await(await p.$('#open')).uploadFile(out+'/unusual.json');await p.waitForFunction(()=>document.querySelector('#cues input')?.value==='Texture');await p.click('#add');assert.equal(await p.$$eval('#cues section',a=>a.length),3);await p.$$eval('#cues section',rows=>rows[2].querySelector('button').click());await p.click('#inspect');assert.match(await p.$eval('#results',e=>e.textContent),/Texture \+ Resistance/);checks.push('imported arbitrary cue identities preserve editable add/remove and existing categories');
 const incoming=structuredClone(saved);incoming.study.cues[0].label='Incoming cue';await writeFile(out+'/incoming.json',JSON.stringify(incoming));await p.evaluate(()=>{const old=File.prototype.text;File.prototype.text=function(){if(this.name==='incoming.json')return new Promise(resolve=>{window.finishIncoming=async()=>resolve(await old.call(this));});return old.call(this);};});await(await p.$('#open')).uploadFile(out+'/incoming.json');await p.waitForFunction(()=>!!window.finishIncoming);await p.click('#support');await p.click('#inspect');assert.equal(await p.$eval('#support-results',e=>e.textContent),'');assert.equal(await p.$eval('#results',e=>e.textContent),'');await p.evaluate(()=>window.finishIncoming());await p.waitForFunction(()=>document.querySelector('#cues input').value==='Incoming cue');assert.equal(await p.$eval('#support-results',e=>e.textContent),'');await p.click('#support');assert.match(await p.$eval('#support-results',e=>e.textContent),/Incoming cue/);checks.push('pending-source clicks cannot retain old conclusions under incoming examples');
 const bad=structuredClone(saved);bad.study.comparison.examples[0].source.steps[0].intent='Changed';await writeFile(out+'/bad.json',JSON.stringify(bad));await(await p.$('#open')).uploadFile(out+'/bad.json');await p.waitForFunction(()=>document.getElementById('error').textContent.includes('refused'));assert.equal(await p.$$eval('#examples img',a=>a.length),8);checks.push('mismatched retained source refuses transactionally');
 await p.evaluate(()=>{document.getElementById('open').value='';const old=File.prototype.text;File.prototype.text=function(){if(this.name==='cue-study.json')return new Promise(resolve=>{window.releaseRead=async()=>resolve(await old.call(this));});return old.call(this);};});await(await p.$('#open')).uploadFile(out+'/cue-study.json');await p.waitForFunction(()=>!!window.releaseRead);await p.$eval('#cues input',e=>{e.value='Newer cue';e.dispatchEvent(new Event('input'));});await p.evaluate(()=>window.releaseRead());await new Promise(r=>setTimeout(r,150));assert.equal(await p.$eval('#cues input',e=>e.value),'Newer cue');checks.push('delayed import cannot replace a newer cue declaration');
 await p.evaluate(()=>{const rows=[['A','0','1'],['A','0','0'],['B','1','1'],['B','1','1']];document.querySelectorAll('#examples article').forEach((article,i)=>{const inputs=article.querySelectorAll('input');for(const [j,value] of [[0,rows[i][0]],[2,rows[i][1]],[3,rows[i][2]]]){inputs[j].value=value;inputs[j].dispatchEvent(new Event('input'));}});});await p.click('#support');const first=await p.$eval('#support-results section',e=>e.textContent);assert.match(first,/same-declared-label/);assert.match(first,/opposing-declared-label/);checks.push('alternative cue subsets retain opposing exact-label accounts without choosing a rule');await p.screenshot({path:out+'/support-narrow.png',fullPage:true});
 const duplicated=structuredClone(saved);
 duplicated.study.rows=[{decision:'A',basis:'Authored',values:['0','0']},{decision:'A',basis:'Authored',values:['0','0']},{decision:'B',basis:'Authored',values:['1','1']},{decision:'B',basis:'Authored',values:['1','1']}];
 duplicated.study.comparison.examples[1]=structuredClone(duplicated.study.comparison.examples[0]);
 duplicated.study.comparison.examples[1].source.steps[0].id='renamed-copy';duplicated.study.comparison.examples[1].stepId='renamed-copy';
 duplicated.comparison.study=structuredClone(duplicated.study.comparison);
 duplicated.comparison.sources[1]=structuredClone(duplicated.comparison.sources[0]);duplicated.comparison.sources[1].sequence.steps[0].id='renamed-copy';
 await writeFile(out+'/duplicated.json',JSON.stringify(duplicated));
 await(await p.$('#open')).uploadFile(out+'/duplicated.json');await p.waitForFunction(()=>document.querySelector('#cues input')?.value==='Texture');
 await p.click('#support');const duplicateResult=await p.$eval('#support-results section',e=>e.textContent);
 assert.match(duplicateResult,/Original-evidence rows withheld together: 1, 2/);assert.match(duplicateResult,/no-decision-contrast/);assert.doesNotMatch(duplicateResult,/same-declared-label/);
 checks.push('renamed identical original evidence withheld together through complete source importer');
 await(await p.$('#support-results section')).screenshot({path:out+'/duplicate-narrow.png'});
 await p.setViewport({width:1280,height:900});await(await p.$('#support-results section')).screenshot({path:out+'/duplicate-desktop.png'});
 await p.setViewport({width:390,height:844});
 // Change the duplicate's presented interval, keeping its declared original clip.
 const intervals=structuredClone(duplicated);
 intervals.study.cues[0].label='Interval texture';
 intervals.study.comparison.examples[1].source.moments[0].origin.mediaTimeSeconds=1.5;
 intervals.comparison.study=structuredClone(intervals.study.comparison);
 intervals.comparison.sources[1].sequence=structuredClone(intervals.study.comparison.examples[1].source);
 await writeFile(out+'/intervals.json',JSON.stringify(intervals));
 await(await p.$('#open')).uploadFile(out+'/intervals.json');await p.waitForFunction(()=>document.querySelector('#cues input')?.value==='Interval texture');
 assert.equal(await p.$eval('#withhold-original-clip',e=>e.checked),false);
 await p.click('#support');assert.match(await p.$eval('#support-results section',e=>e.textContent),/same-declared-label/);
 await p.focus('#withhold-original-clip');await p.keyboard.press('Space');
 assert.equal(await p.$eval('#support-results',e=>e.textContent),'');
 await p.click('#support');const clipResult=await p.$eval('#support-results section',e=>e.textContent);
 assert.match(clipResult,/withheld together: 1, 2/);assert.match(clipResult,/no-decision-contrast/);assert.doesNotMatch(clipResult,/same-declared-label/);
 checks.push('different intervals support each other by default but explicit clip omission removes their support; keyboard toggle retires stale report');
 const independent=structuredClone(saved);independent.study.rows=structuredClone(duplicated.study.rows);independent.study.cues[0].label='Other clip texture';
 await writeFile(out+'/other-clips.json',JSON.stringify(independent));await(await p.$('#open')).uploadFile(out+'/other-clips.json');await p.waitForFunction(()=>document.querySelector('#cues input')?.value==='Other clip texture');
 await p.click('#support');assert.match(await p.$eval('#support-results section',e=>e.textContent),/same-declared-label/);
 checks.push('same categories on other original clip digests remain available in clip scope');
 const oneClip=structuredClone(intervals);oneClip.study.cues[0].label='One clip texture';
 oneClip.study.rows=oneClip.study.rows.slice(0,2);oneClip.study.comparison.examples=oneClip.study.comparison.examples.slice(0,2);oneClip.comparison.study=structuredClone(oneClip.study.comparison);oneClip.comparison.sources=oneClip.comparison.sources.slice(0,2);
 await writeFile(out+'/one-clip.json',JSON.stringify(oneClip));await(await p.$('#open')).uploadFile(out+'/one-clip.json');await p.waitForFunction(()=>document.querySelector('#cues input')?.value==='One clip texture');
 await p.click('#support');assert.match(await p.$eval('#support-results section',e=>e.textContent),/insufficient-other-examples/);assert.doesNotMatch(await p.$eval('#support-results',e=>e.textContent),/same-declared-label/);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:out+'/clip-scope-narrow.png',fullPage:true});
 checks.push('all examples from one clip leave insufficient support with no fabricated witness');
 await p.click('#withhold-original-clip');assert.equal(await p.$eval('#support-results',e=>e.textContent),'');
 assert.deepEqual(errors,[]);await writeFile(out+'/receipt.json',JSON.stringify({checks,errors},null,2));console.log(checks);
}finally{await browser?.close();await new Promise(r=>server.close(r));}



