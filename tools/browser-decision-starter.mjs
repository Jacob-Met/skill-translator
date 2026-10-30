import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const [runtimeArg,outArg]=process.argv.slice(2);
assert(runtimeArg&&outArg,'Usage: node receive-decision-starter.mjs RUNTIME OUT');
const runtime=path.resolve(runtimeArg),out=path.resolve(outArg);
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.mkdir(out,{recursive:false});
const require=createRequire(path.join(runtime,'package.json'));
const {chromium}=process.env.PLAYWRIGHT_PATH?await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_PATH))):require('playwright');
const {createAppServer}=await import(pathToFileURL(path.join(runtime,'server.mjs')));
const {requireChromiumSandbox}=await import(new URL('./support/chromium-sandbox.mjs',import.meta.url));
const report={checks:[],errors:[],offsite:[],startedAt:new Date().toISOString(),receiverSha256:crypto.createHash('sha256').update(await fs.readFile(fileURLToPath(import.meta.url))).digest('hex'),runtime};
try{report.sourceManifest=JSON.parse(await fs.readFile(path.join(runtime,'MANIFEST.json'),'utf8'));}catch{}
if(!report.sourceManifest?.source_commit){try{report.source={commit:execFileSync('git',['-C',runtime,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['-C',runtime,'status','--porcelain'],{encoding:'utf8'}).trim()};}catch{report.source={commit:null,dirty:null};}}
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;const pass=s=>report.checks.push(s);
async function visible(page,selector){await page.locator(selector).waitFor({state:'visible'});}
async function equalText(page,selector,text){await page.waitForFunction(({selector,text})=>document.querySelector(selector)?.textContent===text,{selector,text});}
async function download(page,selector,label){const pending=page.waitForEvent('download');await page.locator(selector).click();const d=await pending;const filename=path.join(out,label+'.json');await d.saveAs(filename);return {filename,data:JSON.parse(await fs.readFile(filename,'utf8'))};}
async function fresh(){const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)report.offsite.push(r.url());});return {context,page};}
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.CHROME_BINARY?{executablePath:process.env.CHROME_BINARY}:{})});
 const probe=await browser.newPage();const cdp=await probe.context().newCDPSession(probe);report.sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});await probe.close();
 const {page}=await fresh();let sampleRequests=0;page.on('request',r=>{if(r.url().includes('/web/examples/decision-registration.mjs'))sampleRequests++;});
 await page.goto(origin+'/decision-practice',{waitUntil:'networkidle'});await visible(page,'#loadExample');assert.equal(sampleRequests,0);assert.equal(await page.locator('#exercise').isVisible(),false);
 const disclosure=await page.locator('#authoredExample').innerText();assert.match(disclosure,/author|diagram/i);await page.screenshot({path:path.join(out,'initial.png'),fullPage:true});
 await page.locator('#loadExample').focus();await page.keyboard.press('Enter');await visible(page,'#exercise');assert.equal(sampleRequests,1);assert.equal(await page.locator('#afterFigure').isVisible(),false);assert.equal(await page.locator('#account').isVisible(),false);
 assert.match(await page.locator('#sourceContext').innerText(),/authored.*diagram/i);pass('Explicit keyboard CTA loads authored example; no initial sample request or premature after/account disclosure');
 const original=await download(page,'#saveComplete','initial');const source=original.data.source;assert.equal(source.sequence.steps.length,2);assert.equal(source.frames.length,3);const firstTitle=source.sequence.steps[0].title;
 for(let i=0;i<2;i++){
  await equalText(page,'#stepTitle',source.sequence.steps[i].title);
  await page.locator('#expectedChange').fill('Expected visible change '+i);await page.locator('#decisionCue').fill('Inspect the reference '+i);await page.locator('#recovery').fill('Ask if the purpose is unknown '+i);
  assert.equal(await page.locator('#saveComplete').isEnabled(),false);await page.locator('#submitPrediction').click();await page.locator('#reveal').click();await visible(page,'#afterFigure');
  await page.waitForFunction(()=>['beforeImage','afterImage'].every(id=>{const n=document.getElementById(id);return n.complete&&n.naturalWidth>0;}));
  await page.locator('#comparison').selectOption('unsure');await page.locator('#reflection').fill('The diagram does not establish physical contact '+i);await page.locator('#saveReflection').click();if(i===0)await page.locator('#advance').click();
 }
 const completed=await download(page,'#saveComplete','complete');assert.deepEqual(completed.data.source,source);assert.equal(completed.data.practice.events.length>0,true);pass('Both real prediction/reveal/self-comparison steps retain original source and prevent exporting unsaved drafts');
 const reopened=await fresh();await reopened.page.goto(origin+'/decision-practice');await reopened.page.locator('#completeFile').setInputFiles(completed.filename);await visible(reopened.page,'#exercise');const roundtrip=await download(reopened.page,'#saveComplete','reopened');assert.deepEqual(roundtrip.data,completed.data);assert.match(await reopened.page.locator('#history').innerText(),/physical contact 1/);pass('Fresh browser context reopens complete practice with identical source, frames and retained actions');
 const p=reopened.page;await p.locator('#selectionPanel summary').click();const choices=p.locator('#practiceStepChoices input');await choices.nth(0).uncheck();const pending=await download(p,'#saveComplete','pending');assert.deepEqual(pending.data,completed.data);await choices.nth(1).uncheck();assert.equal(await p.locator('#startSelected').isEnabled(),false);await choices.nth(1).check();await p.locator('#startSelected').click();await equalText(p,'#stepTitle',source.sequence.steps[1].title);const selected=await download(p,'#saveComplete','selected');assert.deepEqual(selected.data.practice.stepIds,[source.sequence.steps[1].id]);assert.deepEqual(selected.data.practice.events,[]);pass('Pending selections leave retained exercise unchanged; explicit selected start resets only selected decision history');
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,'narrow.png'),fullPage:true});
 const failure=await fresh();let attempts=0;await failure.page.route('**/web/examples/decision-registration.mjs*',async route=>{if(++attempts===1)await route.fulfill({status:503,body:'unavailable'});else await route.continue();});await failure.page.goto(origin+'/decision-practice');await failure.page.locator('#loadExample').click();await visible(failure.page,'#error');await failure.page.waitForFunction(()=>!document.querySelector('#loadExample').disabled);assert.equal(await failure.page.locator('#exercise').isVisible(),false);await failure.page.locator('#loadExample').click();await visible(failure.page,'#exercise');assert.equal(attempts,2);pass('Failed module acquisition keeps source empty and explicit retry recovers');
 const race=await fresh();let release,started;const arrived=new Promise(r=>started=r),gate=new Promise(r=>release=r);await race.page.route('**/web/examples/decision-registration.mjs*',async route=>{started();await gate;await route.continue();});await race.page.goto(origin+'/decision-practice');await race.page.locator('#loadExample').click();await arrived;
 const personal=structuredClone(source);personal.sequence.title='Personal source supersedes deferred starter';const personalPath=path.join(out,'personal.json');await fs.writeFile(personalPath,JSON.stringify(personal));await race.page.locator('#sourceFile').setInputFiles(personalPath);await visible(race.page,'#exercise');await race.page.waitForFunction(()=>document.querySelector('#sourceContext').textContent.includes('Personal source supersedes'));
 const raceUI=()=>race.page.evaluate(()=>({status:document.querySelector('#status').textContent,error:document.querySelector('#error').textContent,errorHidden:document.querySelector('#error').hidden,focus:document.activeElement?.id}));
 const acceptedUI=await raceUI();assert.equal(acceptedUI.errorHidden,true);assert.match(acceptedUI.status,/verified|opened|accepted/i);
 const response=race.page.waitForResponse(r=>r.url().includes('/web/examples/decision-registration.mjs'));release();await response;await race.page.waitForLoadState('networkidle');assert.deepEqual(await raceUI(),acceptedUI,'Retired sample must not change accepted-source status, error or focus');const winner=await download(race.page,'#saveComplete','race-winner');assert.equal(winner.data.source.sequence.title,personal.sequence.title);assert.deepEqual(winner.data.practice.events,[]);pass('New personal source wins over an already-started deferred sample module');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);report.result='PASS';
}catch(e){report.result='FAIL';report.failure=String(e.stack||e);process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
