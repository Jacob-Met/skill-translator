import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,mkdtemp,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {maximumCuePractice} from '../test/fixtures/max-cue-practice.mjs';
import {importCuePractice,inspectCuePractice} from '../src/cue-practice.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
if(!process.env.BASELINE_DIR)throw Error('BASELINE_DIR must identify the complete pinned pre-change source');
const baselineDir=resolve(process.env.BASELINE_DIR),out=resolve(process.env.QA_OUTPUT||'/tmp/cue-performance-qa');await mkdir(out,{recursive:true});
const baseline=await import(pathToFileURL(resolve(baselineDir,'server.mjs'))),servers=[],errors=[],offsite=[];
const report={boundary:'Actual Chrome file-input to rendered completion on an authored maximum-history control with saturated task and learner text fields; not a learning or physical performance measurement',runs:[],hashes:{}};let browser;
const original=JSON.parse(await readFile(new URL('../docs/receipts/decision-practice-20261024/source.json',import.meta.url),'utf8'));
const {source,practice}=maximumCuePractice(original.sequence),sourceFile=resolve(out,'source.json'),practiceFile=resolve(out,'practice.json');
await writeFile(sourceFile,JSON.stringify({...original,sequence:source}));await writeFile(practiceFile,JSON.stringify(practice));
report.input={bytes:Buffer.byteLength(JSON.stringify(practice)),steps:24,events:practice.events.length,sha256:createHash('sha256').update(JSON.stringify(practice)).digest('hex')};
const accepted=importCuePractice(source,practice);assert.equal(inspectCuePractice(source,accepted).complete,true);
const upload=async(p,id,path)=>(await p.$(id)).uploadFile(path);
async function download(p,label){const folder=await mkdtemp(resolve(out,label+'-download-')),cdp=await p.target().createCDPSession();try{await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder});await p.click('#saveSession');const deadline=Date.now()+15000;while(Date.now()<deadline){const files=await readdir(folder);if(files.length===1&&!/\.(crdownload|tmp)$/.test(files[0]))return JSON.parse(await readFile(resolve(folder,files[0]),'utf8'));await new Promise(ok=>setTimeout(ok,50));}throw Error('Chrome download did not finish');}finally{await cdp.detach();}}
try{
 for(const [label,dir]of [['before',baselineDir],['after',resolve(new URL('..',import.meta.url).pathname)]]){report.hashes[label]={};for(const file of ['server.mjs','src/cue-practice.mjs','src/decision-practice.mjs','web/cue-practice.mjs'])report.hashes[label][file]=createHash('sha256').update(await readFile(resolve(dir,file))).digest('hex');}
 assert.equal(report.hashes.before['src/decision-practice.mjs'],report.hashes.after['src/decision-practice.mjs'],'ordinary reducer must match');assert.equal(report.hashes.before['web/cue-practice.mjs'],report.hashes.after['web/cue-practice.mjs'],'consumer must match');
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run',...(process.env.CHROME_TEST_NO_SANDBOX==='1'?['--no-sandbox']:[])]});
 const origins={};for(const [label,factory]of [['before',baseline.createAppServer],['after',createAppServer]]){const server=factory();servers.push(server);await new Promise(ok=>server.listen(0,'127.0.0.1',ok));origins[label]=`http://127.0.0.1:${server.address().port}`;}
 // Alternate order to reduce systematic warm-up/order bias; report all samples, no timing gate.
 for(const [index,label]of ['before','after','after','before','before','after'].entries()){
  const p=await browser.newPage(),origin=origins[label];p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{const u=new URL(r.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)offsite.push(r.url());});await p.setViewport({width:1280,height:960});await p.goto(origin+'/cue-practice',{waitUntil:'networkidle0'});await upload(p,'#sourceFile',sourceFile);await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Retained source frames verified'));
  await p.evaluate(()=>{const input=document.getElementById('sessionFile'),status=document.getElementById('status');input.addEventListener('change',()=>{window.importStart=performance.now();},{capture:true,once:true});const observer=new MutationObserver(()=>{if(status.textContent.includes('Practice reopened'))requestAnimationFrame(()=>requestAnimationFrame(()=>{window.importElapsed=performance.now()-window.importStart;observer.disconnect();}));});observer.observe(status,{childList:true,subtree:true,characterData:true});});
  await upload(p,'#sessionFile',practiceFile);await p.waitForFunction(()=>Number.isFinite(window.importElapsed),{timeout:60000});const elapsedMs=await p.evaluate(()=>window.importElapsed);assert.equal(await p.$eval('#saveSession',e=>e.disabled),false);assert.equal(await p.$eval('#error',e=>e.textContent),'');assert.deepEqual(await download(p,label),accepted);if(index<2)await p.screenshot({path:resolve(out,label+'.png'),fullPage:false});report.runs.push({label,elapsedMs,completedDownloadMatches:true});console.log(JSON.stringify(report.runs.at(-1)));await p.close();
 }
 for(const label of ['before','after']){const values=report.runs.filter(r=>r.label===label).map(r=>r.elapsedMs).sort((a,b)=>a-b);report[label]={medianMs:values[1],minMs:values[0],maxMs:values[2]};}report.medianRatio=report.before.medianMs/report.after.medianMs;assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);report.result='PASS';
}finally{report.errors=errors;report.offsite=offsite;await writeFile(resolve(out,'receipt.json'),JSON.stringify(report,null,2));if(browser)await browser.close();for(const server of servers)await new Promise(ok=>server.close(ok));}
