import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {motionStudy} from '../test/helpers/shared-motion-fixture.mjs';
import {createSequenceDiscovery,sequenceDiscoveryInputs} from '../src/sequence-discovery.mjs';
import {inspectFixedMotion} from '../src/fixed-motion.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=resolve(process.env.QA_OUTPUT||'/tmp/skill-fixed-motion-receiving'),originalPath=process.env.ORIGINAL_BUNDLE||new URL('../docs/receipts/shared-motion-387/original-source-bundle.json',import.meta.url);
await mkdir(out,{recursive:true});const server=createAppServer();await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});const base='http://127.0.0.1:'+server.address().port;
let browser;const report={result:'FAIL',tests:[],errors:[]};
const file=x=>({name:'original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(x))});
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,headless:true,chromiumSandbox:true});
 const pre=await browser.newPage();const cdp=await pre.context().newCDPSession(pre);report.sandbox=await requireChromiumSandbox({send:(m,p)=>cdp.send(m,p)});await pre.close();report.tests.push('Full maintained native sandbox preflight');
 const page=await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/relationship-discovery');
 const raw=motionStudy([[[0,0],[10,0],[20,0]],[[0,0],[10,0],[23,0]]],1.6);
 const retired=process.env.EXPECT_RETIRED==='1';
 for(const mode of ['source','identity']){
  await page.locator('#reopen').setInputFiles(file(raw));await page.waitForFunction(()=>document.querySelector('#fixedMotionRun').getAttribute('aria-disabled')==='false');
  await page.locator('#fixedMotionRun').click();await page.waitForFunction(()=>document.querySelector('#fixedMotionResult').textContent.includes('3/2'));
  if(mode==='source')await page.locator('#sources').setInputFiles(file(raw.demonstrations[0].annotation));else await page.locator('#identities').check();
  await page.locator('#fixedMotionRun').focus();await page.keyboard.press('Enter');
  if(!retired)await page.waitForFunction(()=>document.querySelector('#fixedMotionResult').textContent.includes('3/2'));else await page.waitForTimeout(200);
  const state=await page.evaluate(()=>({text:document.querySelector('#fixedMotionResult').textContent,saveDisabled:document.querySelector('#fixedMotionSave').disabled,runDisabled:document.querySelector('#fixedMotionRun').getAttribute('aria-disabled'),practiceDisabled:document.querySelector('#motionPracticeStart').disabled}));
  report.tests.push({mode,retired,state});assert.equal(state.saveDisabled,retired);assert.equal(state.practiceDisabled,false);if(retired){assert.equal(state.text,'');assert.equal(state.runDisabled,'true');}
 }
 report.result='PASS';
}catch(error){report.failure=error.stack;throw error;}finally{await writeFile(out+'/receipt.json',JSON.stringify(report,null,2));await browser?.close();await new Promise(ok=>server.close(ok));}
