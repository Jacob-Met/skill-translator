import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createAppServer} from '../server.mjs';
import {capacityFixture,sizedSession,bytes,oversizedSource} from '../test/decision-capacity-fixture.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH);
const out=resolve(process.env.QA_OUTPUT),limit=1048576;await mkdir(out,{recursive:true});
const {source,session,sourceBundle}=capacityFixture(),pending=structuredClone(session);pending.events.pop();
const prior=sizedSession(pending,limit-100),boundary=sizedSession(session,limit);
const wrap=practice=>JSON.stringify({format:'skill-translator.decision-practice-bundle/v1',source:sourceBundle,practice});
const server=process.env.APP_URL?null:createAppServer();if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.env.APP_URL||`http://127.0.0.1:${server.address().port}`;
let browser;const report={tests:[],errors:[],offsite:[]};
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,headless:true,chromiumSandbox:true,args:['--no-first-run']});report.browser=browser.version();
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:960}}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>{const u=new URL(r.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)report.offsite.push(r.url());});
 const open=async(practice)=>{await page.goto(origin+'/decision-practice');await page.locator('#completeFile').setInputFiles({name:'practice.json',mimeType:'application/json',buffer:Buffer.from(wrap(practice))});await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Complete practice reopened'));};
 const save=async(id,name)=>{const waiting=page.waitForEvent('download');await page.locator(id).click();const download=await waiting;const path=resolve(out,name);await download.saveAs(path);return JSON.parse(await readFile(path,'utf8'));};
 await open(prior);
 if(process.env.CAPACITY_BASELINE==='1'){
  await page.locator('#reflection').fill('界'.repeat(1600));await page.locator('#revisedJudgment').fill('界'.repeat(1600));await page.locator('#remainingQuestion').fill('界'.repeat(1600));await page.locator('#evidenceChoices input[value="after"]').check();await page.locator('#saveReflection').click();await page.waitForFunction(()=>document.getElementById('reflection').disabled);
  for(const id of ['#saveSession','#saveComplete']){await page.locator(id).click();await page.waitForFunction(()=>document.getElementById('error').textContent.includes('1 MiB'));}
  report.tests.push('Baseline accepts oversized reflection then both actual downloads refuse');report.ok=true;
 }else{
 assert.deepEqual(await save('#saveSession','prior.json'),prior);
 await page.locator('#selectionPanel').evaluate(e=>e.open=true);await page.locator('#practiceStepChoices input').first().uncheck();const selection=await page.locator('#practiceStepChoices input:checked').count();
 await page.locator('#reflection').fill('界'.repeat(1600));await page.locator('#revisedJudgment').fill('界'.repeat(1600));await page.locator('#remainingQuestion').fill('界'.repeat(1600));await page.locator('#evidenceChoices input[value="after"]').check();await page.locator('#saveReflection').click();
 await page.waitForFunction(()=>document.getElementById('error').textContent.includes('1 MiB'));
 assert.equal(await page.locator('#reflection').inputValue(),'界'.repeat(1600));assert.equal(await page.locator('#reflection').isEditable(),true);assert.equal(await page.locator('#practiceStepChoices input:checked').count(),selection);assert.equal(await page.locator('#saveReflection').isEnabled(),true);report.tests.push('Oversized reflect refused with current draft and pending selection retained');
 await page.setViewportSize({width:390,height:844});await page.locator('#error').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'refused-draft-390.png')});
 await page.locator('#reflection').fill('');await page.locator('#revisedJudgment').fill('');await page.locator('#remainingQuestion').fill('');await page.locator('#evidenceChoices input[value="after"]').uncheck();await page.locator('#saveReflection').click();await page.waitForFunction(()=>document.getElementById('reflection').disabled);
 const accepted=await save('#saveSession','accepted.json');assert.deepEqual(accepted.events.slice(0,-1),prior.events);assert.ok(bytes(accepted)<=limit);report.tests.push('Shortened reflection commits without changing earlier events and remains downloadable');
 const complete=await save('#saveComplete','complete.json');await page.goto(origin+'/decision-practice');await page.locator('#completeFile').setInputFiles(resolve(out,'complete.json'));await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Complete practice reopened'));assert.deepEqual(await save('#saveSession','reopened.json'),accepted);report.tests.push('Original PNG complete download freshly reopens exact accepted account');
 await open(boundary);assert.ok(bytes(JSON.stringify(boundary,null,2))>limit);assert.deepEqual(await save('#saveSession','boundary.json'),boundary);assert.equal((await readFile(resolve(out,'boundary.json'))).length,limit);report.tests.push('Old formatting-only overflow complete account reopens and exports exact1MiB compact JSON');
 const large=oversizedSource(source);await page.locator('#sourceFile').setInputFiles({name:'large-source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...sourceBundle,sequence:large}))});await page.waitForFunction(()=>document.getElementById('error').textContent.includes('1 MiB'));assert.deepEqual(await save('#saveSession','after-refused-source.json'),boundary);report.tests.push('Oversized valid calibrated-source replacement refuses with accepted boundary account retained');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);report.ok=true;
 }
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
