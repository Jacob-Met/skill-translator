import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
import {pathFixture,pathAccount} from '../test/helpers/sampled-path-fixture.mjs';
import {inspectPathCircle} from '../src/path-circle.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const out=resolve(process.env.RECEIPT_DIR||'/tmp/skill-path-circle');await mkdir(out,{recursive:true});
const receipt={result:'FAIL',tests:[],errors:[],sourceHashes:{}};
for(const p of ['src/path-circle.mjs','web/path-circle-view.mjs','web/sampled-path.mjs','web/sampled-path.html','vendor/materialtruth/photometric.mjs'])receipt.sourceHashes[p]=createHash('sha256').update(await readFile(new URL('../'+p,import.meta.url))).digest('hex');
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome-stable'});
 const preflight=await browser.newPage(),cdp=await preflight.context().newCDPSession(preflight);try{receipt.sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});}finally{await cdp.detach();await preflight.close();}
 const page=await browser.newPage({viewport:{width:1280,height:960}});page.on('pageerror',e=>receipt.errors.push(e.message));
 await page.addInitScript(()=>{
  window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective));
  // Observe actual Blob transport without fetching forbidden blob URLs or
  // changing the original bytes, native URLs, revocation, CSP or image loader.
  window.__originalBlobs=new Map();const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=function(...args){const url=create.apply(this,args);if(args[0] instanceof Blob)window.__originalBlobs.set(url,args[0]);return url;};
  URL.revokeObjectURL=function(...args){const result=revoke.apply(this,args);window.__originalBlobs.delete(args[0]);return result;};
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/sampled-path`);
 const input=async value=>page.locator('#input').setInputFiles({name:'source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
 // Poll ordinary locator text from Node; Playwright's injected predicate uses
 // dynamic evaluation that the unchanged product CSP correctly refuses.
 const status=async text=>{const until=Date.now()+10000;let last='';while(Date.now()<until){last=await page.locator('#status').textContent();if(last.includes(text))return;await new Promise(r=>setTimeout(r,50));}throw Error(`Expected status containing ${text}; received ${last}`);};
 const infer=async()=>{await page.locator('#infer-circle').click();await status('Circular reference recomputed');};
 async function bundle(points){
  const provisional=pathFixture(points);
  const pngs=await page.evaluate(moments=>moments.map((m,i)=>{const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle='#e7dbc1';x.fillRect(0,0,640,420);x.strokeStyle='#82674d';x.lineWidth=2;x.beginPath();for(const[j,p]of m.calibratedTask.source.corners.entries())j?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);x.closePath();x.stroke();x.fillStyle='#603a23';x.font='22px sans-serif';x.fillText('Authored circle study '+i,35,42);const p=m.calibratedTask.landmarks[0].sourcePx;x.fillStyle='#c02b30';x.beginPath();x.arc(p.x,p.y,7,0,2*Math.PI);x.fill();return c.toDataURL('image/png').split(',')[1];}),provisional.moments);
  const images=provisional.moments.map((m,i)=>({...m.image,sha256:createHash('sha256').update(Buffer.from(pngs[i],'base64')).digest('hex')})),sequence=pathFixture(points,{images}),{sequence:unused,...path}=pathAccount(sequence);
  return {format:'skill-translator.sampled-path-bundle/v1',path,sourceBundle:{format:'skill-translator.sequence-bundle/v1',sequence,frames:pngs.map((pngBase64,i)=>({momentId:'moment-'+i,pngBase64}))}};
 }
 const points=Array.from({length:8},(_,i)=>{const a=(17+i*45)*Math.PI/180;return[51+23*Math.cos(a),48+23*Math.sin(a)];}),original=await bundle(points);
 await input(original);await status('inspected');const evidence=await page.locator('#evidence').textContent();await infer();
 assert.equal(await page.locator('#circle-result').getAttribute('data-status'),'resolved');assert.match(await page.locator('#circle-result').textContent(),/radius 23 mm/);assert.equal(await page.locator('[data-inferred-circle]').count(),8);assert.equal(await page.locator('[data-original-point]').count(),8);assert.equal(await page.locator('#evidence').textContent(),evidence);
 const displayed=await page.locator('#circle-result image').evaluateAll(async imgs=>Promise.all(imgs.map(async image=>{
  const blob=window.__originalBlobs.get(image.getAttribute('href'));if(!(blob instanceof Blob))throw Error('Displayed original image has no retained actual Blob');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
 })));assert.deepEqual(displayed,original.sourceBundle.sequence.moments.map(m=>m.image.sha256));
 assert.ok(await page.locator('#circle-result image').evaluateAll(async imgs=>(await Promise.all(imgs.map(async i=>{const image=new Image();image.src=i.getAttribute('href');await image.decode();return image.naturalWidth===640&&image.naturalHeight===420;}))).every(Boolean)));
 const centers=await page.locator('[data-original-point]').evaluateAll(nodes=>nodes.map(n=>[Number(n.getAttribute('cx')),Number(n.getAttribute('cy'))]));assert.deepEqual(centers,original.sourceBundle.sequence.moments.map(m=>{const p=m.calibratedTask.landmarks[0].sourcePx;return[p.x,p.y];}));
 receipt.tests.push('eight original PNG hashes and exact original mark overlays preserved while center/radius inferred with no new anchors');
 await page.locator('#circle-result section').first().screenshot({path:resolve(out,'circle-desktop.png')});
 const download=page.waitForEvent('download');await page.locator('#save').click();await(await download).saveAs(resolve(out,'saved-path.json'));const saved=JSON.parse(await readFile(resolve(out,'saved-path.json'),'utf8'));assert.deepEqual(saved.sourceBundle.frames,original.sourceBundle.frames);assert.equal(saved.path.circle,undefined);
 saved.path.circle={center:{xMm:999,yMm:999},radiusMm:0};await input(saved);await status('inspected');assert.equal(await page.locator('#circle-result').textContent(),'');assert.equal(await page.locator('#circle-result').getAttribute('data-status'),null);await infer();assert.match(await page.locator('#circle-result').textContent(),/radius 23 mm/);receipt.tests.push('actual download/source-only reopen preserves bytes and recomputes rather than admitting poisoned derived result');
 await page.locator('#samples fieldset').nth(2).locator('.mark').selectOption('');assert.equal(await page.locator('#result').isHidden(),true);assert.equal(await page.locator('#circle-result').textContent(),'');assert.equal(await page.locator('#circle-result').getAttribute('data-status'),null);await page.locator('button[type="submit"]').click();await status('inspected');await infer();assert.match(await page.locator('#circle-result').textContent(),/7 observed of 8/);assert.equal(await page.locator('[data-original-point]').count(),7);receipt.tests.push('changed correspondence retires prior evidence and missing sample stays explicit');
 const wrong=structuredClone(saved);wrong.sourceBundle.frames[1].pngBase64=wrong.sourceBundle.frames[0].pngBase64;await input(wrong);await status('refused');assert.match(await page.locator('#circle-result').textContent(),/7 observed of 8/);receipt.tests.push('wrong original image rejected without discarding accepted evidence');
 await page.setViewportSize({width:390,height:844});await page.locator('#infer-circle').focus();await page.keyboard.press('Enter');await status('Circular reference recomputed');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#circle-result section').first().screenshot({path:resolve(out,'circle-narrow.png')});receipt.tests.push('390px keyboard inference retains original-pixel overlays without horizontal overflow');
 const shifted=await bundle(points.map(([x,y])=>[x+7,y-8]));await input(shifted);await status('inspected');await infer();assert.match(await page.locator('#circle-result').textContent(),/center \(58 mm, 40 mm\)/);receipt.tests.push('new original source shifts visible inferred center appropriately');
 const short=await bundle(Array.from({length:8},(_,i)=>{const a=(15+i*2)*Math.PI/180;return[50+24*Math.cos(a),50+24*Math.sin(a)];}));await input(short);await status('inspected');await infer();assert.equal(await page.locator('#circle-result').getAttribute('data-status'),'insufficient-angular-support');assert.match(await page.locator('#circle-result').textContent(),/rejected fit spans 14\.0°/);assert.equal(await page.locator('[data-inferred-circle]').count(),0);assert.equal(await page.locator('[data-original-point]').count(),8);receipt.tests.push('short-arc control displays no usable circle while retaining original samples');
 const ellipse=await bundle(Array.from({length:8},(_,i)=>[50+30*Math.cos(i*Math.PI/4),50+10*Math.sin(i*Math.PI/4)]));await input(ellipse);await status('inspected');await infer();const native=inspectPathCircle({...ellipse.path,sequence:ellipse.sourceBundle.sequence});assert.ok(native.maxResidualMm>12);assert.match(await page.locator('#circle-result').textContent(),/largest 12\.3607 mm/);receipt.tests.push('ellipse keeps large radial disagreement visibly instead of claiming circular agreement');
 assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.deepEqual(receipt.errors,[]);receipt.result='PASS';
}finally{await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify(receipt,null,2));await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(receipt,null,2));}
