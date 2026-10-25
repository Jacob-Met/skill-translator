import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {createAppServer} from '../server.mjs';
import {pathFixture,pathAccount} from '../test/helpers/sampled-path-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'playwright');
const output=process.env.QA_DIR||'docs/receipts/path-correspondence-ffdbf872';await mkdir(output,{recursive:true});
const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',chromiumSandbox:true});
const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[],responses=[],responseTasks=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:'+server.address().port;
page.on('response',response=>{if(response.url().startsWith(base)&&response.status()===200)responseTasks.push(response.body().then(bytes=>responses.push({path:new URL(response.url()).pathname,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})));});
const upload=async(id,value,name='input.json')=>page.locator('#'+id).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
const poll=async(predicate,arg)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){if(await page.evaluate(predicate,arg))return;await pause(40);}throw Error('Browser condition did not complete in time.');};
async function downloadJson(button){const event=page.waitForEvent('download');await page.locator(button).click();const download=await event,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);return JSON.parse(Buffer.concat(chunks).toString());}
try{
 await page.goto('chrome://sandbox');const sandbox=await page.locator('body').innerText();assert.doesNotMatch(sandbox,/not adequately sandboxed/i);assert.match(sandbox,/you are adequately sandboxed/i);assert.match(sandbox,/PID namespaces\s+Yes/i);assert.match(sandbox,/Seccomp-BPF sandbox\s+Yes/i);await writeFile(output+'/sandbox.txt',sandbox);
 await page.goto(base+'/path-timing');
 const generated=await page.evaluate(async()=>{const result=[];for(let i=0;i<4;i++){const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle='#edebd8';x.fillRect(0,0,640,420);x.fillStyle='#176257';x.fillRect(20+i*40,40+i*20,15,15);const blob=await new Promise(r=>c.toBlob(r,'image/png')),bytes=new Uint8Array(await blob.arrayBuffer()),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');result.push({image:{name:'frame-'+i+'.png',mimeType:'image/png',sha256:hash,widthPx:640,heightPx:420,pixelCoordinates:'browser-oriented'},pngBase64:c.toDataURL('image/png').split(',')[1]});}return result;});
 function bundle(points,times,missing=[]){const sequence=pathFixture(points,{times,images:generated.map(x=>x.image)}),account=pathAccount(sequence,missing),{sequence:ignored,...path}=account;return {format:'skill-translator.sampled-path-bundle/v1',sourceBundle:{format:'skill-translator.sequence-bundle/v1',sequence,frames:sequence.moments.map((m,i)=>({momentId:m.id,pngBase64:generated[i].pngBase64}))},path};}
 const points=[[13,17],[31,19],[27,42],[59,48]],left=bundle(points,[0,1,4,6]),right=bundle(points,[10,12,13,19]);
 await upload('left-file',left);await poll(()=>document.querySelector('#sources').textContent.includes('First: An authored'));
 await upload('right-file',right);await poll(()=>!document.querySelector('#match-fields').disabled);
 await page.locator('#propose').click();assert.match(await page.locator('#status').innerText(),/confirm/);assert.equal(await page.locator('#proposals button').count(),0);
 await page.locator('#proposal-confirm').check();await page.locator('#proposal-distance').fill('.001');await page.locator('#propose').click();
 assert.equal(await page.locator('#proposals button').count(),3);assert.match(await page.locator('#proposals').innerText(),/1 admissible full alignments/);assert.equal(await page.locator('#results article').count(),0);
 await page.locator('#proposals button').first().click();assert.match(await page.locator('#basis').inputValue(),/Geometric proposal/);
 await page.locator('#left-to').selectOption('moment-2');assert.equal(await page.locator('#basis').inputValue(),'');
 await page.locator('#proposals button').first().click();assert.match(await page.locator('#basis').inputValue(),/Geometric proposal/);
 await upload('left-file',left);await poll(()=>document.querySelector('#proposals').textContent==='');assert.equal(await page.locator('#basis').inputValue(),'');assert.equal(await page.locator('#proposal-confirm').isChecked(),false);await page.locator('#proposal-confirm').check();
 await page.locator('#propose').click();await page.locator('#proposals button').first().click();await page.locator('#proposal-confirm').uncheck();assert.equal(await page.locator('#basis').inputValue(),'');assert.equal(await page.locator('#proposals button').count(),0);
 await page.locator('#proposal-confirm').check();await page.locator('#propose').click();await page.locator('#proposals button').first().click();await page.locator('#proposal-distance').fill('.002');assert.equal(await page.locator('#basis').inputValue(),'');
 await page.locator('#proposal-distance').fill('.001');await page.locator('#propose').click();await page.locator('#proposals button').first().click();const retainedBasis=await page.locator('#basis').inputValue();await upload('right-file',{});await poll(()=>document.querySelector('#status').textContent.includes('Not accepted:'));assert.equal(await page.locator('#basis').inputValue(),retainedBasis);assert.equal(await page.locator('#proposals button').count(),3);
 await page.locator('#basis').fill('My independently reviewed correspondence');await page.locator('#proposal-confirm').uncheck();assert.equal(await page.locator('#basis').inputValue(),'My independently reviewed correspondence');await page.locator('#proposal-confirm').check();
 for(let i=0;i<3;i++){
  await page.locator('#propose').click();await page.locator('#proposals button').nth(i).click();assert.equal(await page.locator('#label').inputValue(),'');
  assert.equal(await page.locator('#left-from').inputValue(),'moment-'+i);assert.equal(await page.locator('#right-to').inputValue(),'moment-'+(i+1));
  await page.locator('#label').fill('Confirmed authored phase '+(i+1));await page.locator('#match-form button').click();
 }
 assert.equal(await page.locator('#results article').count(),3);const text=await page.locator('#results').innerText();assert.match(text,/elapsed time: 2×/);assert.match(text,/elapsed time: 0.333333×/);assert.match(text,/elapsed time: 3×/);
 const saved=await downloadJson('#save');assert.equal(saved.leftBundle.sourceBundle.frames[0].pngBase64,generated[0].pngBase64);
 await page.reload();await upload('study-file',saved);await poll(()=>document.querySelector('#status').textContent.includes('reopened'));assert.equal(await page.locator('#results article').count(),3);
 await page.locator('#proposal-confirm').check();await page.locator('#propose').click();assert.ok(await page.locator('#proposals button').first().isDisabled());
 await page.locator('#proposal-distance').fill('2');assert.equal(await page.locator('#proposals button').count(),0);
 const repeated=bundle(Array.from({length:4},()=>[20,20]),[1,2,3,4]);await upload('left-file',repeated);await poll(()=>document.querySelector('#results article')===null);await upload('right-file',repeated);await poll(()=>document.querySelector('#right-from option')?.textContent.includes('1 s'));
 await page.locator('#proposal-confirm').check();await page.locator('#propose').click();assert.match(await page.locator('#proposals').innerText(),/No internal correspondence/);assert.match(await page.locator('#proposals').innerText(),/63 admissible full alignments/);assert.equal(await page.locator('#results article').count(),0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#proposals').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/narrow.png'});
 const missing=bundle(points,[10,12,13,19],[1]);await upload('right-file',missing);await poll(()=>document.querySelector('#proposals').textContent==='');await page.locator('#proposal-confirm').check();await page.locator('#propose').click();assert.match(await page.locator('#proposals').innerText(),/selected position is missing/);assert.equal(await page.locator('#proposals button').count(),0);
 await Promise.all(responseTasks);assert.deepEqual(errors,[]);const coverage=['shared-frame-refusal','bound-and-frame-premise-retirement','failed-source-preserves-proposal','manual-basis-preserved','edited-endpoint-retires-generated-basis','source-replacement-retires-filled-proposal','unfamiliar-inferred-three-phases','explicit-form-acceptance','original-png-save-reopen','bound-edit-retires-proposals','repeated-position-ambiguity','missing-observation-nonwin','390px-layout'];const receipt={groups:coverage.length,passed:true,coverage,browser:browser.version(),source:process.env.SOURCE_SHA||'uncommitted receiving tree',pageErrors:errors,responses};await writeFile(output+'/browser.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({...receipt,responses:responses.length}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
