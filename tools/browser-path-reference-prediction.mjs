import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {pathFixture,pathAccount} from '../test/helpers/sampled-path-fixture.mjs';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH);
assert.ok(process.env.RECEIPT_DIR);assert.ok(process.env.CHROME_BINARY);
const out=resolve(process.env.RECEIPT_DIR);await mkdir(out,{recursive:true});
const receipt={result:'FAIL',groups:[],errors:[]},hash=x=>createHash('sha256').update(x).digest('hex');
receipt.sourceHashes={};for(const file of ['src/path-reference-prediction.mjs','src/path-axis-prediction.mjs','src/path-circle.mjs','web/path-comparison.mjs','web/path-comparison.html','web/path-circle-view.mjs'])receipt.sourceHashes[file]=hash(await readFile(new URL('../'+file,import.meta.url)));
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser,page;
const status=async s=>{const until=Date.now()+10000;let last='';while(Date.now()<until){last=await page.locator('#status').textContent();if(last.includes(s))return;await new Promise(r=>setTimeout(r,40));}throw Error(`Expected ${s}; received ${last}`);};
const put=async(id,value)=>page.locator('#'+id).setInputFiles({name:'input.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
const declare=async()=>{await page.locator('#confirm').check();await page.locator('#basis').fill('Authored corresponding point in the same fixed sheet coordinates.');await page.locator('#compare').click();await status('Ordered samples compared');};
async function bundle(points,tag){
 const provisional=pathFixture(points),pngs=await page.evaluate(({moments,tag})=>moments.map((m,i)=>{const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle=tag==='first'?'#e7dbc1':'#cdd9e7';x.fillRect(0,0,640,420);const p=m.calibratedTask.landmarks[0].sourcePx;x.fillStyle='#c02b30';x.beginPath();x.arc(p.x,p.y,7,0,2*Math.PI);x.fill();x.fillStyle='#142d39';x.font='24px sans-serif';x.fillText(`${tag} original ${i+1}`,30,35);return c.toDataURL('image/png').split(',')[1];}),{moments:provisional.moments,tag});
 const images=provisional.moments.map((m,i)=>({...m.image,sha256:hash(Buffer.from(pngs[i],'base64'))})),sequence=pathFixture(points,{images});sequence.title=tag+' authored demonstration';
 const {sequence:_,...path}=pathAccount(sequence);return {format:'skill-translator.sampled-path-bundle/v1',path,sourceBundle:{format:'skill-translator.sequence-bundle/v1',sequence,frames:pngs.map((pngBase64,i)=>({momentId:'moment-'+i,pngBase64}))}};
}
const arc=(r=23,start=17,span=180,n=8)=>Array.from({length:n},(_,i)=>{const a=(start+i*span/(n-1))*Math.PI/180;return[50+r*Math.cos(a),50+r*Math.sin(a)];});
const infer=async()=>{await page.locator('#predict-references').click();await status('Both first-source references inspected');};
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROME_BINARY});
 const security=await browser.newPage(),cdp=await security.context().newCDPSession(security);
 try{receipt.sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});}finally{await cdp.detach();await security.close();}
 const context=await browser.newContext({viewport:{width:1280,height:960},acceptDownloads:true});
 await context.addInitScript(()=>{
  window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective));window.__originalBlobs=new Map();const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=function(...args){const url=create.apply(this,args);if(args[0] instanceof Blob)window.__originalBlobs.set(url,args[0]);return url;};
  URL.revokeObjectURL=function(...args){const result=revoke.apply(this,args);window.__originalBlobs.delete(args[0]);return result;};
 });
 const open=async()=>{page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));await page.goto(origin+'/path-comparison');};await open();
 const first=await bundle(arc(),'first'),second=await bundle(arc(23,26,160,9),'second');
 await put('first',first);await status('Sampled path opened');await put('second',second);await status('Sampled path opened');await declare();
 const original=await page.locator('#evidence').textContent(),baseline=await page.locator('#summary').textContent();await infer();
 let target=page.locator('#reference-prediction-result');assert.equal(await target.getAttribute('data-status'),'both-references-supported');assert.match(await target.textContent(),/9 original second-source samples; 9 have both/);assert.equal(await target.locator('li').count(),9);assert.equal(await page.locator('#frames [data-inferred-circle]').count(),2);assert.equal(await page.locator('#frames line').count(),2);
 assert.equal(await page.locator('#evidence').textContent(),original);assert.equal(await page.locator('#summary').textContent(),baseline);
 await target.locator('li').last().getByRole('button').click();assert.equal(await page.locator('#frames figure').nth(1).getAttribute('data-moment-id'),'moment-8');
 const displayed=await page.locator('#frames figure').evaluateAll(async figures=>Promise.all(figures.map(async figure=>{
  const image=figure.querySelector('image'),blob=window.__originalBlobs.get(image.getAttribute('href'));if(!(blob instanceof Blob))throw Error('Missing actual original Blob');const decoded=new Image();decoded.src=image.getAttribute('href');await decoded.decode();
  return{side:Number(figure.dataset.sourceSide),moment:figure.dataset.momentId,width:decoded.naturalWidth,height:decoded.naturalHeight,sha:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')};
 })));
 for(const image of displayed){assert.equal(image.width,640);assert.equal(image.height,420);assert.equal(image.sha,[first,second][image.side].sourceBundle.sequence.moments.find(m=>m.id===image.moment).image.sha256);}
 receipt.groups.push('ordinary two-source workflow scores nine original target moments exactly once and overlays unchanged first-source references on verified original pixels');
 await page.locator('#frames').screenshot({path:resolve(out,'references-desktop.png')});
 const event=page.waitForEvent('download');await page.locator('#save').click();await(await event).saveAs(resolve(out,'comparison.json'));const saved=JSON.parse(await readFile(resolve(out,'comparison.json'),'utf8'));
 assert.deepEqual(saved.paths[0].sourceBundle.frames,first.sourceBundle.frames);assert.deepEqual(saved.paths[1].sourceBundle.frames,second.sourceBundle.frames);assert.equal(saved.referencePrediction,undefined);saved.referencePrediction={circleRms:0,radius:999};
 await page.close();await open();target=page.locator('#reference-prediction-result');await put('saved',saved);await status('Ordered samples compared');assert.equal(await target.textContent(),'');await infer();assert.match(await target.textContent(),/radius 23.000 mm/);receipt.groups.push('real download and fresh-page source-only replay ignore injected derived findings and preserve both original PNG populations');
 const different=await bundle(arc(30,26,160,9),'new-target');await put('second',different);await status('Sampled path opened');assert.ok(await page.locator('#result').isHidden());assert.equal(await target.textContent(),'');assert.equal(await target.getAttribute('data-status'),null);await declare();await infer();assert.match(await target.textContent(),/circular reference: resolved. Second-source RMS 7.000 mm/);assert.match(await target.textContent(),/radius 23.000 mm/);receipt.groups.push('changed held-out radius changes residual to seven millimetres while first-source radius stays twenty-three');
 const wrong=structuredClone(different);wrong.sourceBundle.frames[0].pngBase64=wrong.sourceBundle.frames[1].pngBase64;await put('second',wrong);await status('Input refused');assert.match(await target.textContent(),/Second-source RMS 7.000 mm/);receipt.groups.push('wrong source image is refused while the accepted comparison remains intact');
 await page.locator('#basis').fill('Changed declared common-coordinate basis');assert.ok(await page.locator('#result').isHidden());assert.equal(await target.textContent(),'');assert.equal(await target.getAttribute('data-status'),null);await page.locator('#compare').click();await status('Ordered samples compared');await infer();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#predict-references').focus();await page.keyboard.press('Enter');await status('Both first-source references inspected');await page.locator('#frames').screenshot({path:resolve(out,'references-narrow.png')});receipt.groups.push('declaration retirement and 390px keyboard recomputation preserve source overlays without horizontal overflow');
 await page.locator('#predict-axis').click();await status('unchanged first-source axis');assert.equal(await target.textContent(),'');assert.equal(await page.locator('#frames [data-inferred-circle]').count(),0);assert.equal(await page.locator('#frames line').count(),2);await infer();receipt.groups.push('existing straight-only inspection remains callable and retires optional comparison overlay');
 const reversed={...saved,paths:[different,first]};await put('saved',reversed);await status('Ordered samples compared');await infer();assert.match(await target.textContent(),/radius 30.000 mm/);assert.match(await target.textContent(),/8 original second-source samples; 8 have both/);receipt.groups.push('reversing original sources changes training radius and exact target population explicitly');
 const short=await bundle(arc(23,17,15),'short-first');await put('first',short);await status('Sampled path opened');await declare();await infer();assert.equal(await target.getAttribute('data-status'),'incomplete-reference-support');assert.match(await target.textContent(),/0 have both/);assert.match(await target.textContent(),/circular reference: insufficient angular support. Second-source RMS unresolved/);assert.equal(await page.locator('#frames [data-inferred-circle]').count(),0);receipt.groups.push('short first-source arc refuses circle scoring without turning missing support into zero discrepancy');
 assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.deepEqual(receipt.errors,[]);receipt.result='PASS';
}finally{await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify(receipt,null,2));await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(receipt,null,2));}
