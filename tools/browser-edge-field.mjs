import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const source=process.env.EDGE_FIELD_SOURCE;if(!source)throw Error('Set EDGE_FIELD_SOURCE to the permitted captured paper-cutter sequence');
const captured=JSON.parse(await readFile(source,'utf8'));assert.equal(captured.sequence.clip.sha256,'7dd438a32071a1ed2903841be9b207f0565cb17a31413d6812bd85e6dd2c6d4d');assert.deepEqual(captured.sequence.moments.map(m=>m.origin.mediaTimeSeconds),[.507,2.007,4.007,6.007,7.973]);
const out=process.env.EDGE_FIELD_RECEIPT||'/tmp/skill-edge-field';await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const receipt={result:'FAIL',tests:[],frames:[],errors:[]};
try{
 browser=await chromium.launch({headless:true,executablePath:'/tmp/earth-shade-full-chrome-156.0.8078.47/chrome-linux64/chrome'});
 const page=await browser.newPage({viewport:{width:1280,height:960}});page.on('pageerror',e=>receipt.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/sequence-edge`);await page.locator('#edge-source').setInputFiles(source);
 await page.waitForFunction(()=>document.querySelector('#edge-status').textContent.includes('Original frames received'));
 for(const [i,count]of [30411,8810,30030,23526,15983].entries()){
  await page.locator('#edge-moment').selectOption({index:i});for(const[k,v]of Object.entries({x:160,y:200,w:700,h:1200}))await page.locator(`[name=${k}]`).fill(String(v));
  await page.locator('#edge-request button').click();await page.waitForFunction(()=>document.querySelector('#edge-status').textContent.includes('report received'),null,{timeout:15000});
  const summary=await page.locator('#edge-summary').textContent();assert.match(summary,new RegExp(`^${count} edge pixels`));receipt.frames.push({index:i,summary});
  await page.locator('#show-pixels').check();assert.equal(await page.locator('#edge-view image').count(),2);
  if(i===0){
   const download=page.waitForEvent('download');await page.locator('#edge-save').click();await(await download).saveAs(out+'/complete-field-account.json');
   const raw=JSON.parse(await readFile(out+'/complete-field-account.json','utf8'));assert.equal((raw.account??raw.study.entries[0]).report.format,'skill-translator.sequence-edge-report/v2');assert.equal((raw.account??raw.study.entries[0]).report.field.count,count);assert.equal((raw.account??raw.study.entries[0]).report.points,undefined);
   await page.locator('#edge-source').setInputFiles(out+'/complete-field-account.json');await page.waitForFunction(()=>document.querySelector('#edge-status').textContent.includes('report received'));
   await page.screenshot({path:out+'/paper-cutter-field.png',fullPage:true});
   const tampered=structuredClone((raw.account??raw.study.entries[0]).report);tampered.candidates[0].supportCount++;
   await page.locator('#edge-report').setInputFiles({name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(tampered))});await page.waitForFunction(()=>document.querySelector('#edge-status').textContent.includes('refused'));assert.match(await page.locator('#edge-summary').textContent(),/^30411 edge pixels/);
   receipt.tests.push('complete field raw source roundtrip and support-count tamper refusal retain accepted evidence');
  }
 }
 if(process.env.EDGE_LEGACY_ACCOUNT){await page.locator('#edge-source').setInputFiles(process.env.EDGE_LEGACY_ACCOUNT);await page.waitForFunction(()=>document.querySelector('#edge-status').textContent.includes('report received'));assert.match(await page.locator('#edge-summary').textContent(),/^7300 edge pixels and 31 candidate/);await page.locator('#show-pixels').check();assert.equal(await page.locator('#edge-view path').count(),1);receipt.tests.push('original v1 real source account still reopens with exact legacy support overlay');}
 receipt.tests.push('all five unfamiliar real frames admitted without threshold or ROI retuning; three exceed prior point cap','all original detected pixels rendered from complete field');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));receipt.tests.push('390px consumer fits');assert.deepEqual(receipt.errors,[]);receipt.result='PASS';
}finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(out+'/browser-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));}
