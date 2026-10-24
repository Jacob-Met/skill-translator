import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'docs/receipts/layout-feedback');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const url=`http://127.0.0.1:${server.address().port}`;
const errors=[],report={evidence:'Authored geometry in actual practice consumer; no learning study',tests:[]};let browser;
const demo={title:'Authored orientation control',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[[30,30],[70,30],[40,70]].map(([x,y],i)=>({id:'m'+i,label:'Mark '+i,sourcePx:{x,y},kind:'fraction',toleranceMm:1}))};
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run',...(process.env.CHROME_TEST_NO_SANDBOX==='1'?['--no-sandbox']:[])]});report.browser=await browser.version();
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.setViewport({width:1280,height:960});await page.goto(url+'/practice');
 await page.evaluate(demo=>sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify({demo,widthMm:100,heightMm:100,showGoals:false})),demo);await page.reload({waitUntil:'networkidle0'});
 assert.equal(await page.$eval('#layoutDiagnostic',e=>e.hidden),true);
 for(let i=0;i<3;i++){
  await page.click(`#practiceMarks button[data-id="m${i}"]`);
  await page.evaluate(({x,y})=>{document.getElementById('placementX').value=x;document.getElementById('placementY').value=y;document.getElementById('placementForm').requestSubmit();},{x:100-demo.landmarks[i].sourcePx.y,y:demo.landmarks[i].sourcePx.x});
 }
 await page.click('#reviewTask');assert.match(await page.$eval('#layoutDiagnostic',e=>e.textContent),/90.0° clockwise/);assert.match(await page.$eval('#layoutDiagnostic',e=>e.textContent),/0.0 mm RMS/);assert.equal(await page.$eval('#taskOutcome',e=>e.dataset.state),'needs-adjustment');report.tests.push('rotated actual placements retain failed verdict alongside zero fitted residual');
 const before=await page.$eval('#layoutDiagnostic',e=>e.textContent);await page.select('#practiceView','mirrored');assert.equal(await page.$eval('#layoutDiagnostic',e=>e.textContent),before);report.tests.push('mirrored view leaves physical diagnostic unchanged');
 await page.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.downloadBlob=blob;return original(blob);};});await page.click('#savePractice');const saved=await page.evaluate(async()=>JSON.parse(await window.downloadBlob.text()));await writeFile(out+'/session.json',JSON.stringify(saved));
 await page.click('#retryTask');assert.equal(await page.$eval('#layoutDiagnostic',e=>e.hidden),true);await(await page.$('#openPractice')).uploadFile(out+'/session.json');await page.waitForFunction(()=>document.getElementById('practiceStatus').textContent.includes('reopened'));await page.click('#reviewTask');assert.equal(await page.$eval('#layoutDiagnostic',e=>e.textContent),before);report.tests.push('raw session reopen recomputes identical diagnosis');
 await page.screenshot({path:out+'/desktop.png',fullPage:true});await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/mobile.png',fullPage:true});report.tests.push('390px no horizontal page overflow');
 await page.evaluate(()=>{document.getElementById('placementX').value=40;document.getElementById('placementY').value=40;document.getElementById('placementForm').requestSubmit();});assert.equal(await page.$eval('#layoutDiagnostic',e=>e.hidden),true);report.tests.push('placement edits hide stale diagnosis until review');
 assert.deepEqual(errors,[]);report.result='PASS';console.log(JSON.stringify(report,null,2));
}finally{report.errors=errors;await writeFile(out+'/browser-receipt.json',JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
