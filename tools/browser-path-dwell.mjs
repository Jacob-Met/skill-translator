import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {pathFixture,pathAccount} from '../test/helpers/sampled-path-fixture.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
const {default:puppeteer}=await import(process.env.PUPPETEER_MODULE||'puppeteer');
const out=process.env.RECEIPT_DIR||'/tmp/skill-dwell-7ad52-receiving',base=process.env.BASE_URL||'http://127.0.0.1:8787';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--disable-dev-shm-usage']});
const passed=[];let sandbox;
try{
 const preflight=await browser.newPage(),cdp=await preflight.createCDPSession();
 sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});await preflight.close();
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewport({width:1280,height:900});await page.goto(base+'/sampled-path');
 // New asymmetric, oblique authored clusters; per-frame originals are distinct.
 const points=[[17,31],[17.2,31.1],[17.1,31.3],[60,73],[60.2,73.2],[60.3,73.1],[90,15],[90.2,15.1]],times=[0,1,3,4,7,9,11,11.5];
 const pixels=points.map((p,i)=>toImage(calibrate([{x:10+i,y:10},{x:610,y:15+i},{x:600-i,y:400},{x:20,y:390-i}]),p[0]/100,p[1]/100));
 const pngs=await page.evaluate(pixels=>pixels.map((p,i)=>{const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle=`hsl(${i*37},60%,85%)`;x.fillRect(0,0,640,420);x.fillStyle='#16343f';x.font='32px sans-serif';x.fillText('Original authored frame '+i,35,55);x.beginPath();x.arc(p.x,p.y,5,0,2*Math.PI);x.fill();return c.toDataURL('image/png').split(',')[1];}),pixels);
 const images=pngs.map((png,i)=>({name:`original-${i}.png`,mimeType:'image/png',sha256:createHash('sha256').update(Buffer.from(png,'base64')).digest('hex'),widthPx:640,heightPx:420,pixelCoordinates:'browser-oriented'}));
 const sequence=pathFixture(points,{times,images}),study=pathAccount(sequence),{sequence:_,...path}=study;
 const bundle={format:'skill-translator.sampled-path-bundle/v1',sourceBundle:{format:'skill-translator.sequence-bundle/v1',sequence,frames:pngs.map((pngBase64,i)=>({momentId:'moment-'+i,pngBase64}))},path};
 const original=out+'/new-source.json';await writeFile(original,JSON.stringify(bundle));
 const input=await page.$('#input');await input.uploadFile(original);await page.waitForSelector('#result:not([hidden])');
 const set=async(id,value)=>page.$eval(id,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
 await set('#dwell-diameter',.5);await set('#dwell-duration',2);await page.click('#dwell-propose');
 assert.deepEqual(await page.$$eval('#dwell-result li',rows=>rows.map(r=>[+r.dataset.start,+r.dataset.end])),[[0,2],[3,5]]);passed.push('new source: two inferred intervals, four endpoint selections removed');
 assert.equal(await page.$$eval('[data-path-returns]',x=>x.length),1);await page.click('[data-path-returns] button');assert.match(await page.$eval('[data-path-returns] [role="status"]',e=>e.textContent),/^0 overlapping candidate intervals/);assert.equal(await page.$$eval('#dwell-result li',x=>x.length),2);
 await page.$eval('[data-path-returns] input',e=>{e.value='.5';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.$$eval('#dwell-result li',x=>x.length),2);passed.push('concurrent return panel works without changing dwell results');
 await page.click('#infer-circle');assert.match(await page.$eval('#status',e=>e.textContent),/^Circular reference recomputed/);assert.ok(await page.$eval('#circle-result',e=>e.children.length>0));assert.equal(await page.$$eval('#dwell-result li',x=>x.length),2);passed.push('current circle inquiry remains interactive without changing dwell proposals');

 await page.click('#dwell-result li:nth-child(2) button:nth-of-type(2)');
 assert.equal(await page.evaluate(()=>document.activeElement.closest('fieldset')?.dataset.moment),'moment-4');
 const rasterHashes=await page.$eval('[data-moment="moment-4"] image',async(e,png)=>{
  const hash=async url=>{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);const bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');};
  const url=URL.createObjectURL(new Blob([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],{type:'image/png'}));
  try{return {actual:await hash(e.getAttribute('href')),expected:await hash(url)};}finally{URL.revokeObjectURL(url);}
 },pngs[4]);assert.equal(rasterHashes.actual,rasterHashes.expected);
 const overlay=await page.$eval('[data-moment="moment-4"] circle',e=>({x:+e.getAttribute('cx'),y:+e.getAttribute('cy')}));assert.deepEqual(overlay,sequence.moments[4].calibratedTask.landmarks[0].sourcePx);passed.push('proposal navigates original decoded raster and exact correspondence; encoded bytes checked on save');
 await set('#dwell-duration',20);assert.equal(await page.$$eval('#dwell-result li',x=>x.length),0);await page.click('#dwell-propose');assert.match(await page.$eval('#dwell-status',e=>e.textContent),/No selected interval/);passed.push('changed limits retire result; no-fit stays no-fit');
 await set('#dwell-duration',2);await page.click('#dwell-propose');
 await writeFile(out+'/invalid.json','{}');await input.uploadFile(out+'/invalid.json');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Input refused'));assert.equal(await page.$$eval('#dwell-result li',x=>x.length),2);passed.push('failed replacement preserves accepted evidence');
 await rm(out+'/sampled-path.json',{force:true});
 const session=await page.createCDPSession();await session.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:out});await page.click('#save');
 let saved;for(let i=0;i<100;i++){try{saved=JSON.parse(await readFile(out+'/sampled-path.json','utf8'));break;}catch{await new Promise(r=>setTimeout(r,50));}}
 assert.ok(saved);assert.deepEqual(saved.path,path);assert.deepEqual(saved.sourceBundle.sequence,sequence);assert.deepEqual(saved.sourceBundle.frames,bundle.sourceBundle.frames);passed.push('save preserves all original points and PNG bytes');
 await input.uploadFile(out+'/sampled-path.json');await page.waitForFunction(()=>document.querySelector('#dwell-result').children.length===0);await page.click('#dwell-propose');assert.equal(await page.$$eval('#dwell-result li',x=>x.length),2);passed.push('reopen recomputes from source');
 await page.$eval('#dwell-proposals',e=>e.scrollIntoView());await page.screenshot({path:out+'/desktop.png'});
 await page.setViewport({width:390,height:844});await page.$eval('#dwell-proposals',e=>e.scrollIntoView());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/narrow.png'});passed.push('390px interactive layout');
 const gapped=structuredClone(bundle);gapped.path.samples[1].markId=null;gapped.path.samples[1].basis='Point unavailable in retained frame';await writeFile(out+'/gapped-source.json',JSON.stringify(gapped));
 await input.uploadFile(out+'/gapped-source.json');await page.waitForFunction(()=>document.querySelector('#dwell-result').children.length===0);await page.click('#dwell-propose');assert.deepEqual(await page.$$eval('#dwell-result li',rows=>rows.map(r=>[+r.dataset.start,+r.dataset.end])),[[3,5]]);passed.push('new missing-source evidence retires old proposal and changes inferred intervals');
 await page.$eval('[data-moment="moment-1"] .basis',e=>{e.value+=' changed';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.$eval('#result',e=>e.hidden),true);assert.equal(await page.$$eval('#dwell-result li',x=>x.length),0);passed.push('selection declaration edit retires proposals');
 assert.deepEqual(errors,[]);await writeFile(out+'/browser.json',JSON.stringify({passed,sandbox,errors},null,2));console.log(JSON.stringify({passed,out}));
}finally{await browser.close();}
