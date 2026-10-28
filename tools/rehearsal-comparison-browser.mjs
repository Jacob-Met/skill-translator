import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRehearsal,placeRehearsal,submitRehearsal,advanceRehearsal} from '../src/transfer-rehearsal.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.RECEIPT_DIR||'docs/receipts/rehearsal-comparison');await mkdir(out,{recursive:true});
const source={title:'Cross-size comparison control',provenance:'Authored geometry, not physical evidence',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'edge',label:'Left clearance',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:40},toleranceMm:1,why:'Keep left clearance.'},{id:'ratio',label:'Quarter',kind:'fraction',sourcePx:{x:25,y:20},toleranceMm:1}]};
let session=createRehearsal(source,[{widthMm:200,heightMm:160},{widthMm:80,heightMm:120},{widthMm:300,heightMm:200}]);
session=placeRehearsal(session,'edge',{xMm:21,yMm:80});session=submitRehearsal(session);session=advanceRehearsal(session);
session=placeRehearsal(session,'edge',{xMm:19,yMm:60});session=placeRehearsal(session,'ratio',{xMm:20,yMm:30});session=submitRehearsal(session);session=advanceRehearsal(session);
await writeFile(out+'/session.json',JSON.stringify(session));await writeFile(out+'/bad.json','{"schema":"invalid"}');
function loopbackOrigin(value){
 assert(/^http:\/\/127\.0\.0\.1(?::[0-9]{1,5})?\/?$/.test(value),'External receiving requires an HTTP 127.0.0.1 origin without credentials, path, query or fragment');
 const url=new URL(value),port=Number(url.port||80);assert(Number.isInteger(port)&&port>=1&&port<=65535,'Invalid receiving port');return url.origin;
}
const externalURL=process.env.SKILL_RECEIVE_BASE_URL;
let server=null,origin;
if(externalURL!==undefined){
 origin=loopbackOrigin(externalURL);
 assert(process.env.SKILL_RECEIVE_ROOT&&/^[a-f0-9]{40}$/.test(process.env.SKILL_RECEIVE_COMMIT||''),'Supply extracted runtime root and exact source commit');
 const verified=spawnSync(process.execPath,[fileURLToPath(new URL('./receive-runtime.mjs',import.meta.url)),process.env.SKILL_RECEIVE_ROOT,process.env.SKILL_RECEIVE_COMMIT],{encoding:'utf8',env:{...process.env,SKILL_RECEIVE_BASE_URL:origin}});
 await writeFile(out+'/external-static-receipt.json',verified.stdout||'');
 assert.equal(verified.status,0,'External package verification failed: '+verified.stderr);
}
else{const {createAppServer}=await import('../server.mjs');server=createAppServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));origin='http://127.0.0.1:'+server.address().port;}
let browser;const errors=[],groups=[];
const text=(p,id)=>p.$eval('#'+id,e=>e.textContent);
const upload=async(p,file)=>(await p.$('#openRehearsal')).uploadFile(out+'/'+file);
const value=(p,id,v)=>p.$eval('#'+id,(e,x)=>{e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}));},v);
const snapshot=p=>p.evaluate(()=>({x:document.querySelector('#placeX').value,y:document.querySelector('#placeY').value,reason:document.querySelector('#judgmentReason').value,choice:document.querySelector('#judgmentChoice').value,mark:document.querySelector('#markChoice').value,title:document.querySelector('#trialTitle').textContent,goals:document.querySelectorAll('[data-goal]').length}));
async function exported(p,id){await p.click('#'+id);return p.evaluate(async()=>JSON.parse(await window.__download.text()));}
try{
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome',args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
 const p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.setViewport({width:1280,height:1000});await p.goto(origin+'/rehearsal',{waitUntil:'networkidle0'});
 await p.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__download=b;return original(b);};});
 await upload(p,'session.json');await p.waitForFunction(()=>!document.querySelector('#markComparison').hidden);
 const rows=await p.$$eval('[data-comparison-trial]',els=>els.map(e=>e.textContent));
 assert.match(rows[0],/horizontal 1 mm/);assert.match(rows[1],/horizontal -1 mm/);assert.match(rows[0],/Within tolerance/);assert.match(rows[1],/Within tolerance/);assert.match(rows[2],/Not committed/);assert.doesNotMatch(rows[2],/Target:|Retained placement:|distance|horizontal/);groups.push('opposite residuals, boundary verdicts and uncommitted withholding');
 await value(p,'placeX','73.25');await value(p,'placeY','42.5');await value(p,'judgmentReason','My unfinished reasoning');await p.select('#judgmentChoice','inadequate');
 const before=await snapshot(p),raw=await exported(p,'saveRehearsal'),judgments=await exported(p,'saveJudgments');
 await p.select('#comparisonMark','ratio');assert.deepEqual(await snapshot(p),before);assert.deepEqual(await exported(p,'saveRehearsal'),raw);assert.deepEqual(await exported(p,'saveJudgments'),judgments);assert.deepEqual(raw,session);
 assert.match(await text(p,'comparisonRows'),/Missing placement · no error result/);assert.match(await text(p,'comparisonRows'),/distance 0 mm/);groups.push('comparison preserves active drafts and exact exports; missing differs from zero');
 const comparison=await text(p,'comparisonRows');await upload(p,'bad.json');await p.waitForFunction(()=>!document.querySelector('#rehearsalError').hidden);assert.equal(await text(p,'comparisonRows'),comparison);assert.deepEqual(await snapshot(p),before);groups.push('failed import retains accepted comparison and drafts');
 await p.select('#view','mirrored');assert.equal(await text(p,'comparisonRows'),comparison);groups.push('mirroring preserves physical comparison');
 await p.screenshot({path:out+'/desktop.png',fullPage:true});await (await p.$('#markComparison')).screenshot({path:out+'/desktop-comparison.png'});await p.setViewport({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/mobile.png',fullPage:true});await (await p.$('#markComparison')).screenshot({path:out+'/mobile-comparison.png'});groups.push('390px layout has no horizontal overflow');
 await p.reload({waitUntil:'networkidle0'});await upload(p,'session.json');await p.waitForFunction(()=>!document.querySelector('#markComparison').hidden);assert.equal(await p.$eval('#comparisonMark',e=>e.value),'edge');assert.match(await text(p,'comparisonRows'),/horizontal -1 mm/);groups.push('fresh reopen derives comparison from unchanged raw source');
 assert.deepEqual(errors,[]);await writeFile(out+'/receipt.json',JSON.stringify({groups,errors,browser:await browser.version(),hosting:externalURL===undefined?'self-hosted':'external',base_url:origin,source_commit:externalURL===undefined?null:process.env.SKILL_RECEIVE_COMMIT,limitations:'Authored software controls only; not physical skill or learning evidence.'},null,2));console.log(JSON.stringify({passed:groups.length,groups}));
}finally{await browser?.close();if(server)await new Promise(ok=>server.close(ok));}
