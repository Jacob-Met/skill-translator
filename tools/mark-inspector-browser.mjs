import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.RECEIPT_DIR||'docs/receipts/mark-inspector-20261024');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
const groups=[],errors=[],offsite=[];let browser;
const value=(page,id,v)=>page.$eval('#'+id,(e,x)=>{e.value=String(x);e.dispatchEvent(new Event('input',{bubbles:true}));},v);
const upload=async(page,id,path)=>(await page.$('#'+id)).uploadFile(path);
async function intercept(page){await page.evaluate(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='application/json')window.__sourceExport=blob;return create(blob);};});}
async function exported(page,id='downloadSource'){await page.click('#'+id);return page.evaluate(async()=>JSON.parse(await window.__sourceExport.text()));}
try{
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome',args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('blob:'))offsite.push(r.url());});
 await page.setViewport({width:1380,height:1000});await page.goto(origin+'/mark-inspector',{waitUntil:'networkidle0'});
 const urls=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=240;const x=c.getContext('2d'),pixels=x.createImageData(320,240);
  for(let y=0;y<240;y++)for(let xx=0;xx<320;xx++){const cross=(xx>=75&&xx<89&&y>=60&&y<64)||(xx>=80&&xx<84&&y>=55&&y<69),dot=xx>=138&&xx<142&&y>=60&&y<64,v=Math.round(100+.35*xx-(cross||dot?100:0)),i=(y*320+xx)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
  x.putImageData(pixels,0,0);const good=c.toDataURL();x.fillStyle='#f00';x.fillRect(0,0,2,2);return [good,c.toDataURL()];});
 const bytes=Buffer.from(urls[0].split(',')[1],'base64');await writeFile(out+'/source.png',bytes);await writeFile(out+'/wrong.png',Buffer.from(urls[1].split(',')[1],'base64'));
 const image={name:'source.png',sha256:createHash('sha256').update(bytes).digest('hex'),widthPx:320,heightPx:240,mimeType:'image/png',pixelCoordinates:'browser-oriented'};
 const demo=appendCaptureMark(createCapture(image,[{x:0,y:0},{x:320,y:0},{x:320,y:240},{x:0,y:240}],160,120,{title:'Authored cross with background gradient'}),{label:'Cross guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:80,y:60},toleranceMm:3,why:'Human supplied meaning'});
 await writeFile(out+'/source.json',JSON.stringify(demo));
 async function open(json='source.json',photo='source.png'){await upload(page,'annotationFile',out+'/'+json);await upload(page,'imageFile',out+'/'+photo);await page.$eval('#openSource',e=>e.requestSubmit());}
 await open();await page.waitForFunction(()=>!document.querySelector('#inspectorWorkspace').hidden);await intercept(page);
 assert.equal(await page.$eval('#adoptRegion',e=>e.disabled),true);for(const[id,v]of Object.entries({cropX:50,cropY:30,cropWidth:64,cropHeight:64}))await value(page,id,v);
 await page.click('#inspectPixels');await page.waitForFunction(()=>document.querySelectorAll('#regionChoices button').length===1);assert.equal(await page.$eval('#adoptRegion',e=>e.disabled),true);groups.push('exact original image pairs and extraction never selects a component automatically');
 await page.click('[data-component="component-1"]');assert.match(await page.$eval('#proposalDetails',e=>e.textContent),/96 source pixels.*82\.000, 62\.000/);
 const highlighted=await page.$eval('#cropView',c=>Array.from(c.getContext('2d').getImageData(32,32,1,1).data));await page.click('#showSupport');const plain=await page.$eval('#cropView',c=>Array.from(c.getContext('2d').getImageData(32,32,1,1).data));assert.notDeepEqual(highlighted,plain);await page.click('#showSupport');groups.push('known cross support and global source centroid are visible against original crop pixels');
 await page.click('#adoptRegion');const adopted=await exported(page);assert.deepEqual(adopted.landmarks[0].sourcePx,{x:82,y:62});assert.equal(adopted.landmarks[0].why,demo.landmarks[0].why);assert.deepEqual(adopted.landmarks[0].pixelInspections[0].priorPoint,{x:80,y:60});assert.equal(adopted.source.image.sha256,image.sha256);await writeFile(out+'/adopted.json',JSON.stringify(adopted));groups.push('adoption exports revised geometry with original point and pixel extraction evidence');
 await page.click('#reproduceSaved');assert.match(await page.$eval('#retainedStatus',e=>e.textContent),/reproduced from the paired image crop/);groups.push('saved inspection reproduces from actual paired image pixels');
 const identity=await page.$eval('#pairedIdentity',e=>e.textContent);await open('source.json','wrong.png');await page.waitForFunction(()=>document.querySelector('#inspectorError').textContent.includes('does not match'));assert.equal(await page.$eval('#pairedIdentity',e=>e.textContent),identity);assert.deepEqual(await exported(page),adopted);groups.push('wrong original image is transactional');
 await value(page,'threshold',200);assert.equal(await page.$eval('#adoptRegion',e=>e.disabled),true);await page.click('#inspectPixels');await page.waitForFunction(()=>document.querySelector('#extractionStatus').textContent.startsWith('0 regions'));assert.equal(await page.$eval('#adoptRegion',e=>e.disabled),true);groups.push('changed settings clear the old selection and missing foreground invents no mark');
 for(const[id,v]of Object.entries({threshold:24,cropX:80,cropWidth:16}))await value(page,id,v);await page.click('#inspectPixels');await page.waitForFunction(()=>document.querySelector('#regionChoices').textContent.includes('truncated'));await page.click('#regionChoices button');assert.equal(await page.$eval('#adoptRegion',e=>e.disabled),true);groups.push('crop-boundary truncation remains visible and cannot be adopted');
 for(const[id,v]of Object.entries({cropX:50,cropWidth:128}))await value(page,id,v);await page.click('#inspectPixels');await page.waitForFunction(()=>document.querySelectorAll('#regionChoices button').length===2);assert.equal(await page.$eval('#adoptRegion',e=>e.disabled),true);groups.push('multiple visible features remain explicit alternatives');
 const tampered=structuredClone(adopted);tampered.landmarks[0].pixelInspections[0].area++;await writeFile(out+'/tampered.json',JSON.stringify(tampered));await open('tampered.json');await page.waitForFunction(()=>document.querySelector('#inspectorError').hidden);await page.click('#reproduceSaved');assert.match(await page.$eval('#inspectorError',e=>e.textContent),/do not reproduce/);groups.push('saved measurement claims are recomputed and tampering is refused');
 await page.goto(origin+'/capture',{waitUntil:'networkidle0'});await intercept(page);await page.evaluate(()=>document.querySelector('#reopenCaptureForm').parentElement.open=true);await upload(page,'savedAnnotations',out+'/adopted.json');await upload(page,'savedPhoto',out+'/source.png');await page.$eval('#reopenCaptureForm',e=>e.requestSubmit());await page.waitForFunction(()=>document.querySelector('#markCount').textContent.includes('1 source mark'));
 await page.click('[aria-label="Edit Cross guide"]');await value(page,'markX',83);await page.click('#addCaptureMark');const manual=await exported(page,'downloadCapture');assert.equal(manual.landmarks[0].pixelInspections.length,1);await writeFile(out+'/manual.json',JSON.stringify(manual));
 await page.goto(origin+'/mark-inspector',{waitUntil:'networkidle0'});await open('manual.json');await page.waitForFunction(()=>!document.querySelector('#inspectorWorkspace').hidden);assert.match(await page.$eval('#retainedStatus',e=>e.textContent),/historical evidence only/);assert.equal(await page.$eval('#reproduceSaved',e=>e.disabled),true);groups.push('maintained Source Studio edits retain history without false current-pixel verification');
 await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/inspector-mobile.png',fullPage:true});groups.push('390px inspector has no horizontal overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);groups.push('no page exceptions or offsite requests');
}finally{
 await writeFile(out+'/browser-receipt.json',JSON.stringify({groups,errors,offsite,fixture:'Authored cross and dot under an intensity gradient; no physical registration accuracy or skill claim'},null,2));if(browser)await browser.close();await new Promise(ok=>server.close(ok));console.log(JSON.stringify({groups,errors,offsite},null,2));
}
