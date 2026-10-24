import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer-core');
const out=process.env.QA_OUTPUT||'/tmp/skill-response-receiving';await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY||'/opt/google/chrome/chrome'});
const page=await browser.newPage(),errors=[],offsite=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:'+server.address().port;
page.on('request',req=>{if(/^https?:/.test(req.url())&&!req.url().startsWith(base))offsite.push(req.url());});
const client=await page.createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:out});
const text=id=>page.$eval('#'+id,e=>e.textContent),upload=async path=>(await page.$('#source-file')).uploadFile(path);
const fill=async(id,value)=>page.$eval('#'+id,(e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 await page.goto('chrome://sandbox');const sandbox=await page.$eval('body',e=>e.innerText);assert.match(sandbox,/Layer 1 Sandbox\s+Namespace/);assert.match(sandbox,/PID namespaces\s+Yes/);assert.match(sandbox,/Network namespaces\s+Yes/);assert.match(sandbox,/Seccomp-BPF sandbox\s+Yes/);assert.match(sandbox,/You are adequately sandboxed\./);assert.doesNotMatch(sandbox,/not adequately sandboxed|(?:PID namespaces|Network namespaces|Seccomp-BPF sandbox)\s+No/i);checks.push('Chrome namespace and seccomp sandbox verified');
 await page.setViewport({width:1280,height:1000});await page.goto(base+'/response-family',{waitUntil:'networkidle0'});await page.click('#example');
 assert.match(await text('prediction'),/x 83 to 87 mm; y 88 to 92 mm/);assert.equal(await page.$$eval('#rows tr',n=>n.length),2);checks.push('authored mixed and cross-axis response reaches served consumer');
 await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await fill('target-width',150);assert.equal(await page.$eval('#save',e=>e.disabled),true);assert.equal(await page.$eval('#x-plot',e=>e.hidden),true);await page.click('#compare');assert.match(await text('prediction'),/x 71 to 74 mm/);checks.push('dirty settings suppress stale ranges and recompute exact target');
 await fill('target-width',200);await page.click('#compare');await page.click('#save');const file=out+'/skill-response-family.json';
 for(let i=0;i<100;i++){try{await access(file);break;}catch{await delay(30);}}
 const bytes=await readFile(file),raw=JSON.parse(bytes);assert.equal(raw.observations.length,2);assert.equal(raw.coefficientLimit,2);checks.push('actual completed download retains original source and coordinate bounds');
 raw.derived={status:'fabricated'};await writeFile(out+'/reopen.json',JSON.stringify(raw));await upload(out+'/reopen.json');await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Source and original'));assert.match(await text('prediction'),/x 83 to 87/);checks.push('reopen ignores forged derived conclusions');
 const bad=structuredClone(raw);bad.source.source.widthMm=101;await writeFile(out+'/wrong-source.json',JSON.stringify(bad));const before=await text('prediction');await upload(out+'/wrong-source.json');await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Import refused'));assert.equal(await text('prediction'),before);checks.push('mismatched source replacement preserves accepted study');
 await fill('row-width',200);await fill('row-height',160);await fill('row-x',100);await fill('row-y',90);await fill('row-x-bound',0);await fill('row-y-bound',0);await page.click('#observation button');assert.match(await text('summary'),/No complete affine family/);assert.match(await text('prediction'),/No joint target/);checks.push('contradictory supplied result retains empty family');
 await page.$eval('#rows tr:last-child button',e=>e.click());assert.match(await text('prediction'),/x 83 to 87/);checks.push('explicit observation removal recomputes surviving family');
 await page.evaluate(()=>{window.originalText=File.prototype.text;File.prototype.text=function(){const self=this;return new Promise(resolve=>{window.finishOldImport=async()=>resolve(await window.originalText.call(self));});};});
 await upload(out+'/wrong-source.json');await page.waitForFunction(()=>typeof window.finishOldImport==='function');await page.click('#example');await page.evaluate(async()=>{await window.finishOldImport();File.prototype.text=window.originalText;});await delay(80);assert.match(await text('status'),/Authored controls/);checks.push('late file read cannot overwrite newer accepted source');
 const mobile=await browser.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.setViewport({width:390,height:844});await mobile.goto(base+'/response-family',{waitUntil:'networkidle0'});await mobile.focus('#example');await mobile.keyboard.press('Enter');assert.match(await mobile.$eval('#prediction',e=>e.textContent),/x 83 to 87/);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.screenshot({path:out+'/mobile.png',fullPage:true});checks.push('fresh390px keyboard and layout receiving');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
 await writeFile(out+'/browser-receipt.json',JSON.stringify({checks,errors,offsite,download:{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},limits:'Authored analytic controls only; no measured physical demonstrations, skill study, provider runtime or deployment.'},null,2));console.log(JSON.stringify({passed:checks.length,checks}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
