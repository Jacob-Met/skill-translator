import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'/tmp/skill-prerequisite-receiving');await mkdir(out,{recursive:true});
const fixture=resolve('docs/receipts/decision-practice-20261024/source.json'),sourceText=await readFile(fixture,'utf8'),source=JSON.parse(sourceText),ids=source.sequence.steps.map(step=>step.id);
assert.equal(ids.length,2);
const server=createAppServer();await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
const checks=[],errors=[],offsite=[];let browser,page,failure;
const mark=name=>{checks.push(name);console.log('PASS '+name);};
async function upload(path){await (await page.$('#open')).uploadFile(path);}
async function sourceReady(){await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Source frames checked'));}
async function download(label){
 const dir=join(out,label);await mkdir(dir,{recursive:true});const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await page.click('#save');
 const path=join(dir,'prerequisite-rehearsal.json');
 for(let i=0;i<150;i++){try{return {path,value:JSON.parse(await readFile(path,'utf8'))};}catch(error){if(error.code!=='ENOENT')throw error;}await new Promise(r=>setTimeout(r,40));}
 throw Error('The actual browser download did not arrive.');
}
async function declare(){await page.select('#before',ids[1]);await page.select('#after',ids[0]);await page.type('#reason','Authored software control: the later filmed step is declared necessary first.');await page.click('#edge-form button');}
async function choose(id){await page.click(`#choices button[data-step-id="${id}"]`);}
try{
 browser=await puppeteer.launch({headless:true,...(process.env.CHROME_BINARY?{executablePath:process.env.CHROME_BINARY}:{}),args:process.env.CHROME_TEST_NO_SANDBOX==='1'?['--no-sandbox','--no-first-run']:['--no-first-run']});
 page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url())&&!/^http:\/\/127\.0\.0\.1:/.test(request.url()))offsite.push(request.url());});
 await page.setViewport({width:1200,height:900,deviceScaleFactor:1});await page.goto(`http://127.0.0.1:${server.address().port}/sequence`,{waitUntil:'networkidle0'});
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('a[href="/prerequisite-rehearsal"]')]);await upload(fixture);await sourceReady();
 assert.ok(await page.$$eval('#steps img',images=>images.length===4&&images.every(img=>img.complete&&img.naturalWidth>0)));mark('maintained sequence route opens a rehearsal with all checked source frames');
 await declare();const author=await download('authoring');assert.equal(author.value.rehearsal.attempt,null);await upload(author.path);await sourceReady();
 assert.equal(await page.$eval('#edge-form',e=>e.hidden),false);await page.click('#edges button');await declare();mark('saved unsubmitted declarations reopen for continued authoring');
 await page.focus('#begin');await page.keyboard.press('Enter');await choose(ids[0]);await choose(ids[1]);await page.click('#submit');
 assert.match(await page.$eval('#feedback',e=>e.textContent),/reversed/);assert.equal(await page.$eval('#submit',e=>e.disabled),true);
 const failed=await download('submitted');assert.deepEqual(failed.value.rehearsal.attempt,ids);
 await page.screenshot({path:join(out,'desktop.png'),fullPage:true});await (await page.$('#attempt-panel')).screenshot({path:join(out,'desktop-attempt.png')});mark('keyboard begins rehearsal; a reversed prerequisite retains the exact first attempt and declared reason');
 await page.click('#restart');await choose(ids[1]);await choose(ids[0]);await page.click('#submit');
 assert.match(await page.$eval('#feedback',e=>e.textContent),/Complete order agrees/);mark('a valid alternative order passes despite reversing filmed chronology');
 await page.click('#restart');await choose(ids[1]);await page.click('#submit');assert.match(await page.$eval('#feedback',e=>e.textContent),/Partial order agrees/);assert.match(await page.$eval('#feedback',e=>e.textContent),/Available next/);mark('a valid partial prefix stays incomplete and identifies the available next step');
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await upload(failed.path);await sourceReady();
 assert.match(await page.$eval('#feedback',e=>e.textContent),/reversed/);assert.equal(await page.$eval('#edge-form',e=>e.hidden),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.screenshot({path:join(out,'narrow.png'),fullPage:true});await (await page.$('#attempt-panel')).screenshot({path:join(out,'narrow-attempt.png')});mark('actual saved first attempt reopens with locked declarations and a 390px layout');
 const changed=structuredClone(failed.value);changed.rehearsal.source.steps[0].intent='Changed source';const wrong=join(out,'changed-source.json');await writeFile(wrong,JSON.stringify(changed));await upload(wrong);await page.waitForFunction(()=>document.getElementById('status').textContent.includes('changed'));
 assert.match(await page.$eval('#feedback',e=>e.textContent),/reversed/);
 const missing=structuredClone(failed.value);delete missing.rehearsal.dependencies;const missingPath=join(out,'missing-declarations.json');await writeFile(missingPath,JSON.stringify(missing));await upload(missingPath);await page.waitForFunction(()=>document.getElementById('status').textContent.includes('explicitly retained'));assert.match(await page.$eval('#feedback',e=>e.textContent),/reversed/);mark('changed source and missing saved constraints refuse without replacing the accepted attempt');
 const delayed=join(out,'delayed-import.json');await writeFile(delayed,JSON.stringify(failed.value));
 await page.evaluate(()=>{const original=File.prototype.text;File.prototype.text=async function(){if(this.name==='delayed-import.json'){await new Promise(resolve=>window.releaseDelayedRead=resolve);const value=await original.call(this);window.delayedReadSettled=true;return value;}return original.call(this);};});
 await upload(delayed);await page.waitForFunction(()=>typeof window.releaseDelayedRead==='function');await page.click('#restart');await choose(ids[1]);await page.evaluate(()=>window.releaseDelayedRead());await page.waitForFunction(()=>window.delayedReadSettled===true);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.$eval('#submit',e=>e.disabled),false);assert.deepEqual(await page.$$eval('#order li',items=>items.map(e=>e.textContent)),[source.sequence.steps[1].title]);assert.equal(await page.$eval('#feedback',e=>e.textContent),'');mark('delayed saved-file completion cannot overwrite a newer restarted rehearsal and selection');
 const replacement=structuredClone(author.value);replacement.sourceBundle.sequence.title='Replacement demonstration';replacement.rehearsal.source.title='Replacement demonstration';const replacementPath=join(out,'delayed-replacement.json');await writeFile(replacementPath,JSON.stringify(replacement));
 await page.evaluate(()=>{
   const oldText=File.prototype.text,oldBytes=File.prototype.arrayBuffer,oldURL=URL.createObjectURL;window.downloadedJSON=0;window.delayOneFrame=true;
   File.prototype.text=async function(){if(this.name==='delayed-replacement.json')await new Promise(resolve=>window.releaseReplacement=resolve);return oldText.call(this);};
   File.prototype.arrayBuffer=async function(){if(window.delayOneFrame&&this.type==='image/png'){window.delayOneFrame=false;await new Promise(resolve=>window.releaseSave=resolve);}return oldBytes.call(this);};
   URL.createObjectURL=function(blob){if(blob.type==='application/json')window.downloadedJSON++;return oldURL.call(this,blob);};
 });
 await upload(replacementPath);await page.waitForFunction(()=>typeof window.releaseReplacement==='function');await page.click('#save');await page.waitForFunction(()=>typeof window.releaseSave==='function');
 await page.evaluate(()=>window.releaseReplacement());await page.waitForFunction(()=>document.getElementById('title').textContent==='Replacement demonstration');
 await page.evaluate(()=>window.releaseSave());await page.waitForFunction(()=>document.getElementById('status').textContent.includes('changed while saving'));
 assert.equal(await page.evaluate(()=>window.downloadedJSON),0);assert.equal(await page.$eval('#title',e=>e.textContent),'Replacement demonstration');mark('an overlapping old-source save is refused after replacement import commits, with no stale download');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
}catch(error){failure={message:error.message,stack:error.stack};process.exitCode=1;console.error(error);}
finally{
 await writeFile(join(out,'verification.json'),JSON.stringify({checks,errors,offsite,failure:failure??null,browser:browser?await browser.version():null,node:process.version,inputSHA256:createHash('sha256').update(sourceText).digest('hex'),evidence:'Authored retained PNG frames and software-control prerequisites; no demonstrated learning or physical skill claim.'},null,2));
 await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));
}
