import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'/tmp/feature-clearance-qa');await mkdir(out,{recursive:true});const downloads=resolve(out,'downloads');await mkdir(downloads,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));async function untilFile(path){for(let i=0;i<150;i++){try{if((await stat(path)).size)return;}catch{}await delay(50);}throw Error('Browser download did not complete: '+path);}
const server=createAppServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const url=`http://127.0.0.1:${server.address().port}`;
let browser;const errors=[],offsite=[],groups=[];const record=name=>{groups.push(name);console.log('PASS '+name);};
const source={title:'Authored clearance control',provenance:'Analytic authored geometry; not physical evidence',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',sourcePx:{x:20,y:50},kind:'fraction',toleranceMm:2},{id:'b',label:'B',sourcePx:{x:40,y:50},kind:'fraction',toleranceMm:3}]};
await writeFile(out+'/source.json',JSON.stringify(source));
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run',...(process.env.CHROME_TEST_NO_SANDBOX==='1'?['--no-sandbox']:[])]});
 const page=await browser.newPage();const cdp=await page.createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('blob:'))offsite.push(r.url());});await page.setViewport({width:1280,height:960});
 await page.goto(url+'/feature-clearance',{waitUntil:'networkidle0'});
 await(await page.$('#sourceFile')).uploadFile(out+'/source.json');await page.waitForFunction(()=>!document.getElementById('editor').hidden);
 assert.equal(await page.$$eval('#features input',els=>els.every(e=>e.value==='')),true);
 await page.evaluate(()=>{for(const e of document.querySelectorAll('#features input'))e.value='5';document.getElementById('gap').value='10';document.getElementById('sizes').value='100,100\n200,100';document.getElementById('assumption').checked=true;document.getElementById('settings').requestSubmit();});
 await page.waitForFunction(()=>!document.getElementById('results').hidden);
 assert.match(await page.$eval('#summary',e=>e.textContent),/0\/1 pairs fail nominal gap; 1\/1 pairs fail/);
 assert.match(await page.$eval('#pairs',e=>e.textContent),/Nominal meets; envelope fails/);
 await page.select('#selected','1');assert.match(await page.$eval('#summary',e=>e.textContent),/0\/1 pairs fail the full tolerance envelope/);record('actual source import, explicit radii and gap, comparison across two adapted sizes');
 await page.click('#save');const savedFile=resolve(downloads,'feature-clearance.json');await untilFile(savedFile);
 const saved=JSON.parse(await readFile(savedFile,'utf8'));assert.deepEqual(saved.source,source);
 await page.click('#example');await(await page.$('#bundleFile')).uploadFile(savedFile);await page.waitForFunction(()=>document.getElementById('sourceTitle').textContent==='Authored clearance control');assert.equal(await page.$$eval('#pairs tr',els=>els.length),1);record('completed browser download/reopen retains exact source, feature declarations and comparison sizes');
 const bad=structuredClone(saved);bad.features[0].radiusMm=null;await writeFile(out+'/bad.json',JSON.stringify(bad));await(await page.$('#bundleFile')).uploadFile(out+'/bad.json');await page.waitForFunction(()=>!document.getElementById('error').hidden);assert.equal(await page.$eval('#sourceTitle',e=>e.textContent),source.title);assert.equal(await page.$eval('#results',e=>e.hidden),false);record('missing radius is refused transactionally without replacing accepted comparison');
 await page.evaluate(()=>{document.getElementById('gap').value='12';document.getElementById('gap').dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.$eval('#results',e=>e.hidden),true);await page.evaluate(()=>document.getElementById('settings').requestSubmit());await page.waitForFunction(()=>!document.getElementById('results').hidden);record('editing declarations hides stale result and handoff until recomputation');
 // A delayed read must not replace a newer authored example.
 await page.evaluate(()=>{window.originalText=File.prototype.text;File.prototype.text=function(){return new Promise(resolve=>{window.releaseRead=()=>window.originalText.call(this).then(resolve);});};});
 await(await page.$('#bundleFile')).uploadFile(savedFile);await page.waitForFunction(()=>typeof window.releaseRead==='function');await page.click('#example');await page.evaluate(()=>{window.releaseRead();File.prototype.text=window.originalText;});await page.waitForFunction(()=>document.getElementById('bundleFile').value==='');assert.match(await page.$eval('#sourceTitle',e=>e.textContent),/Bookbinding/);record('late saved comparison read cannot overwrite a newer source state');
 await(await page.$('#bundleFile')).uploadFile(savedFile);await page.waitForFunction(()=>document.getElementById('sourceTitle').textContent=== 'Authored clearance control');
 await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'/mobile.png',fullPage:true});await page.setViewport({width:1280,height:960});await page.screenshot({path:out+'/desktop.png',fullPage:true});record('390px and desktop rendering with exact physical-aspect SVG and contained table scrolling');
 await page.select('#selected','1');await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#practice')]);assert.equal(new URL(page.url()).pathname,'/practice');
 const input=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('skill-translator-practice-input/v1')));assert.deepEqual(input.demo,source);assert.equal(input.widthMm,200);assert.equal(input.heightMm,100);assert.deepEqual(input.session.attempts,[]);assert.equal(await page.$eval('#practiceGoals',e=>e.checked),false);record('maintained practice receives unchanged source and selected size, fresh attempts and hidden goals');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
 const result={browser:await browser.version(),groups,errors,offsite};await writeFile(out+'/receipt.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
