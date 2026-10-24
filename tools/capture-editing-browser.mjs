// Actual browser receiving; fixtures are authored pixels and supplied metadata.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.RECEIPT_DIR||'docs/receipts/capture-editing-20261024');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port,groups=[],errors=[],offsite=[];let browser;
const value=(page,id,value)=>page.$eval('#'+id,(el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
const upload=async(page,id,path)=>(await page.$('#'+id)).uploadFile(path);
async function exported(page){await page.click('#downloadCapture');return page.evaluate(async()=>JSON.parse(await window.__captureBlob.text()));}
try{
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome',args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('blob:'))offsite.push(r.url());});
 await page.setViewport({width:1380,height:960});await page.goto(origin+'/capture',{waitUntil:'networkidle0'});
 const urls=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='#ddd';x.fillRect(0,0,600,400);x.fillStyle='#123';x.fillText('AUTHORED REOPEN CONTROL',70,80);const good=c.toDataURL();x.fillRect(20,20,10,10);return [good,c.toDataURL()];});
 const bytes=Buffer.from(urls[0].split(',')[1],'base64');await writeFile(out+'/source.png',bytes);await writeFile(out+'/wrong.png',Buffer.from(urls[1].split(',')[1],'base64'));
 const image={name:'source.png',widthPx:600,heightPx:400,mimeType:'image/png',pixelCoordinates:'browser-oriented',sha256:createHash('sha256').update(bytes).digest('hex')};
 const frame=frameOrigin({name:'authored-reference.webm',mimeType:'video/webm',sizeBytes:1000,durationSeconds:3,sha256:'c'.repeat(64)},1.3,{mediaTime:1.25,width:600,height:400},image);
 let demo=createCapture(image,[{x:50,y:50},{x:550,y:50},{x:550,y:350},{x:50,y:350}],240,160,{title:'Authored reopening control',origin:frame,provenance:'Original expert credit'});
 for(const [label,x] of [['First mark',200],['Second mark',300]])demo=appendCaptureMark(demo,{label,sourcePx:{x,y:150},kind:'edge_offset_mm',edge:'left',toleranceMm:3,why:'Retain this expert explanation'});
 await writeFile(out+'/capture.json',JSON.stringify(demo));await writeFile(out+'/invalid.json','{');
 await page.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='application/json')window.__captureBlob=blob;return original(blob);};document.querySelector('#reopenCaptureForm').parentElement.open=true;});
 async function reopen(json='capture.json',photo='source.png'){await upload(page,'savedAnnotations',out+'/'+json);await upload(page,'savedPhoto',out+'/'+photo);await page.$eval('#reopenCaptureForm',el=>el.requestSubmit());}
 await reopen();await page.waitForFunction(()=>document.querySelector('#markCount').textContent.includes('2 source marks'));
 assert.deepEqual(await exported(page),demo);assert.match(await page.$eval('#reopenStatus',el=>el.textContent),/clip bytes were not checked/);groups.push('paired files restore exact source, marks, authorship and declared video timing');
 const acceptedUrl=await page.$eval('#captureSvg image',el=>el.getAttribute('href'));
 await reopen('capture.json','wrong.png');await page.waitForFunction(()=>document.querySelector('#studioError').textContent.includes('does not match'));
 assert.equal(await page.$eval('#captureSvg image',el=>el.getAttribute('href')),acceptedUrl);assert.deepEqual(await exported(page),demo);
 await reopen('invalid.json');await page.waitForFunction(()=>document.querySelector('#studioError').textContent.includes('Reopen refused'));assert.deepEqual(await exported(page),demo);groups.push('wrong pixels and malformed JSON preserve accepted work');
 await page.click('[aria-label="Edit First mark"]');await value(page,'markLabel','Edited first');await value(page,'markX',250);await page.select('#markKind','fraction');await page.click('#addCaptureMark');
 let revised=await exported(page);assert.equal(revised.landmarks[0].id,demo.landmarks[0].id);assert.equal(revised.landmarks[0].label,'Edited first');assert.equal(revised.landmarks[0].edge,undefined);assert.equal(revised.landmarks[0].why,demo.landmarks[0].why);assert.deepEqual(revised.landmarks[1],demo.landmarks[1]);assert.deepEqual(revised.source,demo.source);groups.push('mark edits preserve IDs, untouched marks and source context');
 await page.click('[aria-label="Edit Edited first"]');await value(page,'markX',900);await page.click('#addCaptureMark');assert.match(await page.$eval('#studioError',el=>el.textContent),/refused/);assert.deepEqual(await exported(page),revised);await page.click('#cancelMarkEdit');groups.push('invalid edit rollback and cancel');
 await value(page,'captureWidth',300);await page.click('#applyCalibration');revised=await exported(page);assert.equal(revised.source.widthMm,300);assert.equal(revised.provenance,demo.provenance);assert.deepEqual(revised.source.origin,demo.source.origin);assert.deepEqual(revised.unknowns,demo.unknowns);groups.push('recalibration retains author context and clip timing');
 await page.click('[aria-label="Remove Edited first"]');assert.equal((await exported(page)).landmarks[0].id,demo.landmarks[1].id);await page.click('[aria-label="Remove Second mark"]');assert.equal(await page.$eval('#downloadCapture',el=>el.disabled),true);
 await value(page,'markX',200);await value(page,'markY',150);await value(page,'markLabel','New after removal');await page.click('#addCaptureMark');assert.equal((await exported(page)).landmarks.length,1);groups.push('last removal leaves editable draft; remaining IDs stay stable');
 await reopen();await page.waitForFunction(()=>document.querySelector('#markCount').textContent.includes('2 source marks'));
 await page.evaluate(text=>{const input=document.querySelector('#savedAnnotations'),file=new File([text],'slow.json',{type:'application/json'});file.text=()=>new Promise(resolve=>{window.__finishSlow=()=>resolve(text);});const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;document.querySelector('#reopenCaptureForm').requestSubmit();},JSON.stringify(demo));
 await upload(page,'photoFile',out+'/wrong.png');await page.waitForFunction(()=>document.querySelector('#markCount').textContent==='No marks yet');await page.evaluate(async()=>{window.__finishSlow();await new Promise(r=>setTimeout(r,100));});assert.equal(await page.$eval('#markCount',el=>el.textContent),'No marks yet');groups.push('stale reopen cannot replace a newer photo selection');
 await reopen();await page.waitForFunction(()=>document.querySelector('#markCount').textContent.includes('2 source marks'));await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/reopened-mobile.png',fullPage:true});groups.push('390px reopened studio without horizontal overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);groups.push('no page exceptions or offsite requests');
}finally{
 await writeFile(out+'/browser-receipt.json',JSON.stringify({groups,errors,offsite,fixture:'Authored pixels and declared clip metadata; no clip verification or physical demonstration claim'},null,2));
 if(browser)await browser.close();await new Promise(ok=>server.close(ok));console.log(JSON.stringify({groups,errors,offsite},null,2));
}
