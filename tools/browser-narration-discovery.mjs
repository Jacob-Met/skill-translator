import {verifyNarrationDiscoveryControls} from './narration-discovery-controls.mjs';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
if(!process.env.CAPTIONVERSE_MEDIA_DIR)throw Error('Supply the separately fetched pinned CAPTIONVERSE_MEDIA_DIR.');
const input=resolve(process.env.CAPTIONVERSE_MEDIA_DIR),out=resolve(process.env.QA_OUTPUT||'/tmp/narration-discovery');await mkdir(out,{mode:0o700});
const mediaPath=join(input,'asr-synthetic-speech.webm'),vttPath=join(input,'asr-synthetic-speech.vtt');
const hash=b=>createHash('sha256').update(b).digest('hex');const mediaHash=hash(await readFile(mediaPath)),vtt=await readFile(vttPath,'utf8'),vttHash=hash(await readFile(vttPath));
assert.equal(mediaHash,'48a48f20d264b5bd55f3f939979248409b3dbc72214675da295098758cb104f0');assert.equal(vttHash,'44c4faa4da02bb5e7b355dc010d36a5dfa48e64c6ccc0a1bc4e5e457d7c6bb07');
const previous=JSON.parse(await readFile(join(input,'asr-synthetic-speech.receipt.json'),'utf8'));assert.equal(previous.source.sha256,mediaHash);assert.equal(previous.vtt_sha256,vttHash);
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;let browser;const errors=[],checks=[];
async function download(name){const path=join(out,name);for(let i=0;i<100;i++){try{await stat(path);return JSON.parse(await readFile(path,'utf8'));}catch{await new Promise(r=>setTimeout(r,100));}}throw Error('Download missing: '+name);}
async function upload(page,id,path){await(await page.$('#'+id)).uploadFile(path);}
async function field(page,id,value){await page.$eval('#'+id,(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run']});const sandbox=await browser.newPage();await sandbox.goto('chrome://sandbox');assert.match(await sandbox.evaluate(()=>document.body.innerText),/You are adequately sandboxed/i);await sandbox.close();
 const cdp=await browser.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});const p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto(url+'/sequence');await upload(p,'clip-file',mediaPath);await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Original clip ready'));
 await field(p,'sequence-title','Existing CAPTIONVERSE synthetic speech: inspect an unchanged draft');await field(p,'sequence-context','Synthetic visual/speech input with a retained ASR error; no physical craft, expert judgment or new model execution.');
 await p.click('#narration-moments summary');
 await upload(p,'narration-file',vttPath);await p.waitForFunction(()=>document.getElementById('narration-status').textContent.includes('Transcript read'));
 await field(p,'narration-attribution','Existing CAPTIONVERSE synthetic-speech ASR draft; unchanged supplied wording and estimated times.');
 await p.click('#narration-pair');await p.waitForFunction(()=>document.querySelectorAll('#narration-results article').length===2);
 assert.equal(await p.$eval('#moment-count',e=>e.textContent),'0 / 12');
 for(const [i,query,time] of [[0,'green',1.15],[1,'bell',3.58]]){
  await field(p,'narration-search',query);assert.equal(await p.$$eval('#narration-results article',a=>a.length),1);
  const choice='#narration-results button[data-cue="'+i+'"][data-choice="midpoint"]';
  await p.focus(choice);await p.keyboard.press('Space');
  assert.equal(Number(await p.$eval('#moment-time',e=>e.value)),time);
  assert.equal(Number.parseInt(await p.$eval('#moment-count',e=>e.textContent)),i,'Preview must not silently retain a frame');
  await p.waitForFunction(()=>!document.getElementById('capture-moment').disabled);
  await field(p,'moment-label','Narration-selected original frame '+(i+1));
  await field(p,'moment-state','Original decoded pixels selected for inspection through supplied narration; no action inferred.');
  await p.click('#capture-moment');await p.waitForFunction(n=>document.getElementById('moment-count').textContent.startsWith(String(n)+' /'),{},i+1);
 }
 checks.push('with no initial frames, literal narration search and keyboard midpoint preview guide unchanged Retain action');

 await field(p,'step-title','Inspect both retained speech passages');await field(p,'step-intent','Read the original recognition draft beside source evidence; no physical-skill inference.');await p.click('#save-step');await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Authored step saved'));await p.click('#export-sequence');const source=await download('demonstration-sequence.json');
 assert.equal(source.sequence.clip.sha256,mediaHash);assert.equal(source.sequence.clip.sizeBytes,71149);assert.equal(source.sequence.moments.length,2);assert.equal(source.sequence.steps.length,1);
 assert.deepEqual(source.sequence.moments.map(m=>m.origin.requestedTimeSeconds),[1.15,3.58]);assert.ok(source.sequence.moments[0].origin.mediaTimeSeconds<source.sequence.moments[1].origin.mediaTimeSeconds);
 for(const m of source.sequence.moments){const f=source.frames.find(f=>f.momentId===m.id);assert.equal(hash(Buffer.from(f.pngBase64,'base64')),m.image.sha256);assert.equal(m.origin.frameSha256,m.image.sha256);assert.equal(m.origin.clip.sha256,mediaHash);assert.equal(m.origin.timing,'requestVideoFrameCallback');}
 checks.push('actual source bytes decoded and two original presented frames retained through maintained studio UI');
 await p.goto(url+'/timed-narration');await upload(p,'source',join(out,'demonstration-sequence.json'));await p.waitForFunction(()=>document.getElementById('status').textContent.includes('frames verified'));await upload(p,'transcript',vttPath);await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Transcript read'));await field(p,'attribution','Existing CAPTIONVERSE local-ASR draft from synthetic speech. Words and estimated times are uncorrected; no new inference run.');await p.click('#pair');await p.waitForFunction(()=>!document.getElementById('work').hidden);
 assert.equal(await p.$$eval('#cues input',a=>a.length),2);assert.match(await p.$eval('#cues',e=>e.textContent),/left, like/);assert.match(await p.$eval('#cues',e=>e.textContent),/white bell rings/);
 await p.$$eval('#cues input',inputs=>{for(const input of inputs){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}});await p.select('#field','visibleChange');
 await p.$$eval('#cues input',inputs=>{for(const input of inputs){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}});await p.click('#select');await p.click('#save');const sidecar=await download('timed-narration.json');assert.equal(sidecar.transcript,vtt);assert.equal(sidecar.source.clip.sha256,mediaHash);assert.deepEqual(sidecar.selections[0].cueIndices,[0,1]);
 await p.click('#export');const narrated=await download('narrated-sequence.json');assert.deepEqual(narrated.frames,source.frames);assert.deepEqual(narrated.sequence.moments,source.sequence.moments);assert.match(narrated.sequence.steps[0].visibleChange,/left, like/);assert.match(narrated.sequence.steps[0].visibleChange,/white bell rings/);checks.push('existing source-bound ASR draft is received verbatim, including recognition error, and explicitly quoted');
 await p.close();const reopened=await browser.newPage();reopened.on('pageerror',e=>errors.push(String(e)));await reopened.setViewport({width:390,height:844});await reopened.goto(url+'/sequence');await upload(reopened,'sequence-file',join(out,'narrated-sequence.json'));await reopened.waitForFunction(()=>document.getElementById('status').textContent.includes('Reopened 2 verified source frames'));assert.match(await reopened.$eval('#step-detail',e=>e.textContent),/white bell rings/);await reopened.screenshot({path:join(out,'actual-source-received-narrow.png'),fullPage:true});checks.push('fresh maintained studio receives unchanged original PNGs and retained draft wording');
 checks.push(...await verifyNarrationDiscoveryControls(browser,url,input,out,errors));
 assert.deepEqual(errors,[]);await writeFile(join(out,'narration-discovery-receipt.json'),JSON.stringify({checks,errors,sourceCommit:'aedd749b9a8eb43af5be838aa4c438d7772956fd',mediaHash,vttHash,sourceDuration:source.sequence.clip.durationSeconds,presentedFrames:source.sequence.moments.map(m=>({requested:m.origin.requestedTimeSeconds,presented:m.origin.mediaTimeSeconds,pngSha256:m.image.sha256})),boundary:'Existing synthetic-speech/ASR input; no new inference, physical craft or learning result.'},null,2));console.log(checks);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
