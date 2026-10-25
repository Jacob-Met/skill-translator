// Optional original-source receiving. No media is downloaded or redistributed.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {validateSequence,upsertStep} from '../src/demonstration-sequence.mjs';
import {importDecisionComparison,DECISION_COMPARISON_FORMAT} from '../src/decision-comparison.mjs';
const input=process.env.CUE_SOURCE_SEQUENCE;
if(!input)throw Error('Supply the separately retained documented scissors sequence via CUE_SOURCE_SEQUENCE');
const original=JSON.parse(await readFile(input,'utf8')),sequence=validateSequence(original.sequence);
assert.equal(sequence.clip.sha256,'06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe');
assert.equal(sequence.moments.length,5);assert.equal(original.frames.length,5);
const moments=[...sequence.moments].sort((a,b)=>a.origin.mediaTimeSeconds-b.origin.mediaTimeSeconds);
let source=sequence;
for(const [id,a,b,label]of [['observer-approach',0,1,'Observer comparison: approach interval'],['observer-separation',3,4,'Observer comparison: separation interval']]){
 source=upsertStep(source,{id,beforeMomentId:moments[a].id,afterMomentId:moments[b].id,title:label,
  intent:'Observer question: inspect the visible difference across these original frames. Original demonstrator intent was not supplied.',
  visibleChange:'Inspect the retained original before and after pixels. This is an observer-authored comparison interval, not an expert explanation.',sensoryCue:'',recoveryCue:''});
}
assert.deepEqual(source.moments,sequence.moments);
const comparison=importDecisionComparison({format:DECISION_COMPARISON_FORMAT,examples:[{source,stepId:'observer-approach'},{source,stepId:'observer-separation'}],relationship:'unresolved',explanation:'Two explicitly observer-selected intervals in one retained demonstration. They are not asserted to be equivalent operations or evidence of learning.'});
const bundle={format:'skill-translator.decision-comparison-bundle/v1',study:comparison,sources:[{...original,sequence:source},{...original,sequence:source}]};
const out=resolve(process.env.QA_OUTPUT||'/tmp/cue-transfer-real-source');await mkdir(out,{recursive:true});await writeFile(out+'/source-comparison.json',JSON.stringify(bundle));
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer'),server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run']});const sandbox=await browser.newPage();await sandbox.goto('chrome://sandbox');assert.match(await sandbox.evaluate(()=>document.body.innerText),/You are adequately sandboxed/i);await sandbox.close();const cdp=await browser.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(`http://127.0.0.1:${server.address().port}/decision-transfer`);await(await p.$('#comparisonFile')).uploadFile(out+'/source-comparison.json');await p.waitForFunction(()=>!document.getElementById('setup').hidden);await p.select('#familiarity','seen-before');await p.select('#helpMode','selective-cues');await p.click('#begin');await p.type('#expectedChange','Observer prediction draft: inspect whether the retained target interval shows a separate strip.');await p.click('#requestSensory');await p.click('#requestRecovery');assert.match(await p.$eval('#targetCues',e=>e.textContent),/Not supplied — unknown/);assert.equal(await p.$$eval('#examples article:last-child img',a=>a.length),1);assert.match(await p.$eval('#expectedChange',e=>e.value),/Observer prediction draft/);await p.click('#answer');await p.click('#save');
 const path=out+'/decision-transfer.json';let saved;for(let i=0;i<100;i++){try{await stat(path);saved=JSON.parse(await readFile(path,'utf8'));break;}catch{await new Promise(r=>setTimeout(r,100));}}assert.ok(saved);assert.deepEqual(saved.comparison.sources.map(s=>s.frames),[original.frames,original.frames]);assert.equal(saved.session.practice.events.filter(e=>e.type==='request-cue').length,2);
 await p.screenshot({path:out+'/original-source.png',fullPage:true});await p.close();const q=await browser.newPage();q.on('pageerror',e=>errors.push(String(e)));await q.setViewport({width:390,height:844});await q.goto(`http://127.0.0.1:${server.address().port}/decision-transfer`);await(await q.$('#transferFile')).uploadFile(path);await q.waitForFunction(()=>document.getElementById('status').textContent.includes('reopened'));assert.match(await q.$eval('#assistance',e=>e.textContent),/0 supplied cue disclosure/);assert.equal(await q.$$eval('#examples article:last-child img',a=>a.length),1);await q.click('#reveal');assert.equal(await q.$$eval('#examples article:last-child img',a=>a.length),2);await q.screenshot({path:out+'/original-source-narrow.png',fullPage:true});assert.deepEqual(errors,[]);
 await writeFile(out+'/receipt.json',JSON.stringify({sourceClipSha256:sequence.clip.sha256,originalMomentIdentities:sequence.moments.map(m=>({id:m.id,time:m.origin.mediaTimeSeconds,sha256:m.image.sha256})),source:'Aerra Carnicom / Aerrapc, Scissors Cutting Card Stock, CC BY-SA 4.0; separately retained source',observerAuthoredIntervals:true,originalExpertCuesSupplied:false,allOriginalPngBytesPreserved:true,preAnswerCueRequests:2,suppliedCueDisclosures:0,learningEffectEstablished:false,errors},null,2));console.log('PASS: original five-frame source, missing cues, retained prediction, download and fresh narrow reopen');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
