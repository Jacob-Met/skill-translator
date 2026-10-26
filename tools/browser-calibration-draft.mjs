import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH);
assert.ok(process.env.RECEIPT_DIR);assert.ok(process.env.CHROME_BINARY);
const out=resolve(process.env.RECEIPT_DIR),fixtures=new URL('../test/calibration-fixtures/',import.meta.url);await mkdir(out,{recursive:true});
const receipt={result:'FAIL',groups:[],errors:[],sourceHashes:{}},hash=x=>createHash('sha256').update(x).digest('hex');
for(const path of ['src/calibration-draft.mjs','web/calibration-draft.mjs','web/capture.mjs','tools/calibration-translation-native.py','vendor/microverse/fiducials.py','server.mjs'])receipt.sourceHashes[path]=hash(await readFile(new URL('../'+path,import.meta.url)));
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser,page;
const file=async(id,name,mimeType)=>page.locator('#'+id).setInputFiles({name,mimeType,buffer:await readFile(new URL(name,fixtures))});
const status=async text=>page.waitForFunction(text=>document.querySelector('#transferStatus').textContent.includes(text),text);
const values=()=>page.locator('#cornerRows input').evaluateAll(nodes=>nodes.map(n=>Number(n.value)));
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROME_BINARY});
 const security=await browser.newPage(),cdp=await security.context().newCDPSession(security);
 try{receipt.sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});}finally{await cdp.detach();await security.close();}
 const context=await browser.newContext({viewport:{width:1280,height:960},acceptDownloads:true});
 await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective));});
 page=await context.newPage();page.on('pageerror',error=>receipt.errors.push(error.message));await page.goto(origin+'/capture');
 await file('photoFile','target.png','image/png');await page.waitForFunction(()=>!document.querySelector('#applyCalibration').disabled);
 const originalCorners=[20,20,170,25,165,125,25,120];for(let i=0;i<4;i++){await page.locator('#cornerX'+i).fill(String(originalCorners[2*i]));await page.locator('#cornerY'+i).fill(String(originalCorners[2*i+1]));}
 await page.locator('#applyCalibration').click();await page.locator('#markX').fill('95');await page.locator('#markY').fill('80');await page.locator('#addCaptureMark').click();assert.match(await page.locator('#markCount').textContent(),/1 source mark/);
 const marks=await page.locator('#capturedMarks').textContent();
 await page.locator('#calibrationTransferPanel summary').click();await file('referenceTask','reference-task.json','application/json');await file('referencePhoto','reference.png','image/png');await page.locator('#loadCalibrationReference').click();await status('Reference loaded');
 await page.locator('#patchCoordinates').fill('24, 24, 24, 24\n132, 96, 24, 24');await page.locator('#stationaryBasis').fill('Authored test control: texture attached to a single plane translated seven pixels right and five up.');await page.locator('#stationaryPlane').check();
 await page.locator('#proposeCalibration').click();await status('Draft translated by 7, -5 px');assert.deepEqual(await values(),[27,15,177,20,172,120,32,115]);assert.ok(await page.locator('#downloadCapture').isDisabled());assert.equal(await page.locator('#capturedMarks').textContent(),marks);
 receipt.groups.push('actual original-color-PNG native inference transfers four editable corners; accepted marks persist and export waits for Apply');
 await page.locator('#cornerX0').fill('28');await page.locator('#applyCalibration').click();
 const download=page.waitForEvent('download');await page.locator('#downloadCapture').click();await(await download).saveAs(resolve(out,'target-annotations.json'));
 const saved=JSON.parse(await readFile(resolve(out,'target-annotations.json'),'utf8'));assert.equal(saved.source.corners[0].x,28);assert.equal(saved.source.calibrationDraftEvidence.proposedCorners[0].x,27);assert.deepEqual(saved.landmarks[0].sourcePx,{x:95,y:80});assert.equal(saved.source.image.sha256,hash(await readFile(new URL('target.png',fixtures))));assert.equal(saved.source.calibrationDraftEvidence.report.registration.frames[1].stage[0],7);
 await page.locator('#calibrationTransferPanel').screenshot({path:resolve(out,'calibration-desktop.png')});
 receipt.groups.push('manual correction applies through maintained calibration; real download retains target points, original hashes, reference calibration and native proposal');
 // Hold an actual native response, change a corner, then release it. No mocked
 // successful report is admitted by this race test.
 let ready,release;const arrived=new Promise(r=>ready=r),gate=new Promise(r=>release=r);
 await page.route('**/api/calibration-translation',async route=>{const response=await route.fetch();ready();await gate;try{await route.fulfill({response});}catch{}});
 await page.locator('#proposeCalibration').click();await arrived;await page.locator('#cornerX0').fill('29');release();await page.unroute('**/api/calibration-translation');await page.waitForTimeout(100);assert.equal((await values())[0],29);
 await page.locator('#revertCalibration').click();assert.equal((await values())[0],28);
 receipt.groups.push('late actual native response cannot overwrite a newer manual corner draft');
 await page.locator('#patchCoordinates').fill('24,24,24,24\n25,25,24,24');await page.locator('#proposeCalibration').click();await status('No draft applied');assert.equal((await values())[0],28);assert.equal(await page.locator('#capturedMarks').textContent(),marks);
 assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
 await page.close();page=await context.newPage();page.on('pageerror',error=>receipt.errors.push(error.message));await page.goto(origin+'/capture');await page.locator('#reopenCaptureForm').evaluate(form=>form.closest('details').open=true);
 await page.locator('#savedAnnotations').setInputFiles(resolve(out,'target-annotations.json'));await file('savedPhoto','target.png','image/png');await page.locator('#reopenCaptureForm button').click();await page.waitForFunction(()=>document.querySelector('#reopenStatus').textContent.includes('Annotations reopened'));
 assert.equal((await values())[0],28);assert.match(await page.locator('#markCount').textContent(),/1 source mark/);assert.ok(await page.locator('#downloadCapture').isEnabled());
 await page.setViewportSize({width:390,height:844});await page.locator('#calibrationTransferPanel summary').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#proposeCalibration').focus();await page.keyboard.press('Enter');await status('No draft applied');await page.locator('#calibrationTransferPanel').screenshot({path:resolve(out,'calibration-narrow.png')});
 receipt.groups.push('bad patch refusal preserves work; actual fresh-page reopening and 390px keyboard path preserve editable source');
 assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.deepEqual(receipt.errors,[]);receipt.result='PASS';
}finally{await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify(receipt,null,2));await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(receipt,null,2));}
