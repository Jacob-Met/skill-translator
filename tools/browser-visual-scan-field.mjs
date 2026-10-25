// Internal source experiment; original/derived media stay outside the repository.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=resolve(process.env.RECEIPT_DIR||'/tmp/skill-visual-scan-field');
await mkdir(out,{recursive:true});
const original=process.env.SCAN_VIDEO;
assert.ok(original,'Supply the attributed original via SCAN_VIDEO.');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceHash=digest(await readFile(original));
assert.equal(sourceHash,'06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe');
const source={author:'Aerra Carnicom / Aerrapc',title:"Aerra’s Films of the Ordinary IV — Scissors Cutting Card Stock",url:'https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',sha256:sourceHash};
const report={result:'FAIL',source,checks:[],errors:[],offsite:[]};
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;let browser,page;
async function status(page,text){await page.waitForFunction(s=>document.querySelector('#status').textContent.includes(s),text,{timeout:20000});}
async function pageAtSequence(){const page=await browser.newPage({viewport:{width:1380,height:980}});page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>{const u=new URL(r.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)report.offsite.push(r.url());});await page.goto(origin+'/sequence');return page;}
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--allow-chrome-scheme-url'],executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome'});report.browser=browser.version();
 const guard=await browser.newPage();await guard.goto('chrome://sandbox/');report.sandbox=await guard.locator('body').innerText();assert.match(report.sandbox,/Layer 1 Sandbox\s+Namespace/);assert.match(report.sandbox,/Seccomp-BPF sandbox\s+Yes/);await guard.close();
 page=await pageAtSequence();
 await page.locator('#sequence-title').fill('Scissors source: inspect a visual-change candidate');
 await page.locator('#sequence-context').fill(`${source.author}; ${source.title}; ${source.url}; ${source.license}, ${source.licenseUrl}. Internal source inspection. Observer-supplied comparison goal; demonstrator intent, force, scale and technique quality are not supplied.`);
 await page.locator('#clip-file').setInputFiles(original);await status(page,'Original clip ready');
 report.duration=await page.locator('#video-host video').evaluate(v=>v.duration);
 await page.locator('#visual-scan summary').click();
 await page.locator('#scan-from').fill('0.1');await page.locator('#scan-until').fill(String(Math.min(9.1,report.duration-.1)));await page.locator('#scan-count').fill('32');await page.locator('#scan-start').click();
 await page.waitForFunction(()=>document.querySelector('#scan-status').textContent.includes('Scan ready'),null,{timeout:60000});
 report.chronological=await page.locator('.scan-interval').evaluateAll(rows=>rows.map(r=>({index:Number(r.dataset.index),state:r.dataset.state,text:r.textContent})));
 assert.equal(report.chronological.length,31);assert.equal(await page.locator('.moment-card').count(),0);
 await page.locator('#scan-order').selectOption('meanAdjustedChange');
 report.rankedIndices=await page.locator('.scan-interval').evaluateAll(rows=>rows.map(r=>Number(r.dataset.index)));
 report.checks.push('32 actual presented-frame samples yield31 explicit adjacent intervals without automatic retention');
 for(const [which,label] of [[0,'Earlier candidate image'],[1,'Later candidate image']]){
  await page.locator('.scan-interval').first().locator('button').nth(which).click();
  await page.locator('#moment-label').fill(label);await page.locator('#moment-state').fill('Selected from the highest adjusted-change interval for observer inspection; no action or contact verdict supplied.');
  await page.locator('#capture-moment').click();await status(page,'Retained '+label);
 }
 assert.deepEqual(await page.locator('.moment-card img').evaluateAll(images=>images.map(i=>[i.naturalWidth,i.naturalHeight])),[[1920,1080],[1920,1080]]);
 await page.locator('#step-title').fill('Inspect the selected source interval');await page.locator('#step-intent').fill('Observer goal: compare visible changes in these original images. This is not a statement of the demonstrator’s intent.');await page.locator('#save-step').click();await status(page,'Authored step saved');
 const pending=page.waitForEvent('download');await page.locator('#export-sequence').click();await(await pending).saveAs(out+'/source-sequence.json');
 const saved=JSON.parse(await readFile(out+'/source-sequence.json','utf8'));assert.equal(saved.sequence.clip.sha256,sourceHash);
 report.moments=saved.sequence.moments;
 for(const [i,frame]of saved.frames.entries()){
  const bytes=Buffer.from(frame.pngBase64,'base64');assert.equal(digest(bytes),saved.sequence.moments.find(m=>m.id===frame.momentId).image.sha256);await writeFile(out+`/original-candidate-${i}.png`,bytes);
 }
 const fresh=await pageAtSequence();await fresh.locator('#sequence-file').setInputFiles(out+'/source-sequence.json');await status(fresh,'Reopened 2 verified');
 assert.deepEqual(await fresh.locator('.moment-card img').evaluateAll(images=>images.map(i=>[i.naturalWidth,i.naturalHeight])),[[1920,1080],[1920,1080]]);
 report.checks.push('Candidate inspection recaptures1920×1080 original images; saved source hashes and fresh maintained sequence reopen agree');
 await page.screenshot({path:out+'/scan-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#visual-scan').screenshot({path:out+'/scan-narrow.png'});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);report.checks.push('Actual source receiving has no page exception or offsite application request');report.result='PASS';
}catch(error){report.failure=String(error);if(page){report.lastStatus=await page.locator('#status').textContent();report.momentCount=await page.locator('.moment-card').count();report.form=await page.evaluate(()=>({time:document.querySelector('#moment-time').value,label:document.querySelector('#moment-label').value,busy:document.querySelector('#capture-moment').disabled}));await page.screenshot({path:out+'/failure.png',fullPage:true});}throw error;
}finally{await writeFile(out+'/field-receipt.json',JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({result:report.result,checks:report.checks,rankedIndices:report.rankedIndices,lastStatus:report.lastStatus,form:report.form,moments:report.moments?.map(m=>({requested:m.origin.requestedTimeSeconds,presented:m.origin.mediaTimeSeconds,sha256:m.image.sha256}))},null,2));}
