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
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser,page;
const status=async s=>page.waitForFunction(s=>document.querySelector('#status').textContent.includes(s),s);
const put=async(id,value)=>page.locator('#'+id).setInputFiles({name:'input.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
const declare=async()=>{await page.locator('#confirm').check();await page.locator('#basis').fill('Authored corresponding point in the same fixed sheet coordinates.');await page.locator('#compare').click();await status('Ordered samples compared');};
async function bundle(points,tag){
 const provisional=pathFixture(points),pngs=await page.evaluate(({moments,tag})=>moments.map((m,i)=>{const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle=tag==='first'?'#e7dbc1':'#cdd9e7';x.fillRect(0,0,640,420);const p=m.calibratedTask.landmarks[0].sourcePx;x.fillStyle='#c02b30';x.beginPath();x.arc(p.x,p.y,7,0,2*Math.PI);x.fill();x.fillStyle='#142d39';x.font='24px sans-serif';x.fillText(`${tag} original ${i+1}`,30,35);return c.toDataURL('image/png').split(',')[1];}),{moments:provisional.moments,tag});
 const images=provisional.moments.map((m,i)=>({...m.image,sha256:hash(Buffer.from(pngs[i],'base64'))})),sequence=pathFixture(points,{images});sequence.title=tag+' authored demonstration';
 const {sequence:_,...path}=pathAccount(sequence);return {format:'skill-translator.sampled-path-bundle/v1',path,sourceBundle:{format:'skill-translator.sequence-bundle/v1',sequence,frames:pngs.map((pngBase64,i)=>({momentId:'moment-'+i,pngBase64}))}};
}
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.CHROME_BINARY});
 const security=await browser.newPage(),cdp=await security.context().newCDPSession(security);
 try{receipt.sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});}finally{await cdp.detach();await security.close();}
 const context=await browser.newContext({viewport:{width:1280,height:960},acceptDownloads:true});await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective));});
 page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));await page.goto(origin+'/path-comparison');
 const first=await bundle([[10,30],[20,30],[40,30],[60,30],[80,30]],'first'),second=await bundle([[15,36],[25,36],[35,36],[55,36],[75,36]],'second');
 await put('first',first);await status('Sampled path opened');await put('second',second);await status('Sampled path opened');await declare();
 const original=await page.locator('#evidence').textContent(),baseline=await page.locator('#summary').textContent();
 await page.locator('#predict-axis').click();await status('unchanged first-source axis');assert.match(await page.locator('#axis-prediction-result').textContent(),/maximum: 6.000 mm/);assert.equal(await page.locator('#frames line').count(),2);assert.equal(await page.locator('#evidence').textContent(),original);assert.equal(await page.locator('#summary').textContent(),baseline);
 await page.locator('#coupling button').last().click();assert.equal(await page.locator('#frames line').count(),2);receipt.groups.push('original-frame reference-only inference exposes6mm departure without changing either source or ordered comparison');
 const event=page.waitForEvent('download');await page.locator('#save').click();await(await event).saveAs(resolve(out,'comparison.json'));const saved=JSON.parse(await readFile(resolve(out,'comparison.json'),'utf8'));
 assert.deepEqual(saved.paths[0].sourceBundle.frames,first.sourceBundle.frames);assert.deepEqual(saved.paths[1].sourceBundle.frames,second.sourceBundle.frames);
 await page.close();page=await context.newPage();page.on('pageerror',e=>receipt.errors.push(e.message));await page.goto(origin+'/path-comparison');await put('saved',saved);await status('Ordered samples compared');assert.equal(await page.locator('#axis-prediction-result').textContent(),'');await page.locator('#predict-axis').click();assert.match(await page.locator('#axis-prediction-result').textContent(),/maximum: 6.000 mm/);receipt.groups.push('actual source-only export and fresh-page replay recompute held-out prediction');
 const different=await bundle([[15,50],[25,50],[35,50],[55,50],[75,50]],'second-new');await put('second',different);await status('Sampled path opened');assert.ok(await page.locator('#result').isHidden());await declare();assert.equal(await page.locator('#axis-prediction-result').textContent(),'');await page.locator('#predict-axis').click();assert.match(await page.locator('#axis-prediction-result').textContent(),/maximum: 20.000 mm/);receipt.groups.push('new held-out input changes visible error to20mm without fitting it away');
 await page.locator('#basis').fill('Changed declaration');assert.ok(await page.locator('#result').isHidden());await page.locator('#compare').click();await status('Ordered samples compared');assert.equal(await page.locator('#axis-prediction-result').textContent(),'');
 await page.locator('#predict-axis').click();await status('unchanged first-source axis');await page.locator('#result').screenshot({path:resolve(out,'prediction-desktop.png')});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#predict-axis').focus();await page.keyboard.press('Enter');await status('unchanged first-source axis');await page.locator('#result').screenshot({path:resolve(out,'prediction-narrow.png')});receipt.groups.push('declaration edits retire predictions;390px keyboard recomputes original-frame overlays');
 assert.deepEqual(await page.evaluate(()=>window.__csp),[]);assert.deepEqual(receipt.errors,[]);receipt.result='PASS';
}finally{await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify(receipt,null,2));await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(receipt,null,2));}

