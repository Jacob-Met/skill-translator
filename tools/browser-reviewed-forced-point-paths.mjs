import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {createAppServer} from '../server.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
import {inspectSequencePath} from '../src/sequence-path.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'playwright');
const output=process.env.QA_DIR||'docs/receipts/reviewed-forced-point-paths-c1764c';await mkdir(output,{recursive:true});
const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',chromiumSandbox:true});
const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[],responses=[],responseTasks=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const create=URL.createObjectURL.bind(URL);window.__previewBlobs=new Map();URL.createObjectURL=blob=>{const url=create(blob);window.__previewBlobs.set(url,blob);return url;};});
const base='http://127.0.0.1:'+server.address().port;
page.on('response',response=>{if(response.url().startsWith(base)&&response.status()===200)responseTasks.push(response.body().then(bytes=>responses.push({path:new URL(response.url()).pathname,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})));});
const upload=async(id,value,name='input.json')=>page.locator('#'+id).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
const poll=async(predicate,arg)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){if(await page.evaluate(predicate,arg))return;await pause(40);}throw Error('Browser condition did not complete in time.');};
async function downloadJson(button){const event=page.waitForEvent('download');await page.locator(button).click();const download=await event,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);return JSON.parse(Buffer.concat(chunks).toString());}
async function makeSource(step){
 const sequence=JSON.parse(await readFile(new URL('../test/fixtures/point-choice-sequence.json',import.meta.url),'utf8'));sequence.title=`Authored forced subset course ${step}`;
 for(const [i,m]of sequence.moments.entries()){const h=calibrate(m.calibratedTask.source.corners);[[50,10],[50,30],[30,60],[70,60]].forEach(([x,y],j)=>{const a=i*step,dx=x-50,dy=y-50;m.calibratedTask.landmarks[j].sourcePx=toImage(h,(50+dx*Math.cos(a)-dy*Math.sin(a)+i)/100,(50+dx*Math.sin(a)+dy*Math.cos(a))/100);});}
 const frames=await page.evaluate(async moments=>Promise.all(moments.map(async m=>{const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle='#faf1d4';x.fillRect(0,0,640,420);x.fillStyle='#163e45';for(const mark of m.calibratedTask.landmarks){x.beginPath();x.arc(mark.sourcePx.x,mark.sourcePx.y,7,0,Math.PI*2);x.fill();}const blob=await new Promise(r=>c.toBlob(r,'image/png'));return {sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join(''),pngBase64:c.toDataURL('image/png').split(',')[1]};})),sequence.moments);
 sequence.moments.forEach((m,i)=>{m.image.sha256=frames[i].sha256;m.origin.frameSha256=frames[i].sha256;m.calibratedTask.source.image.sha256=frames[i].sha256;m.calibratedTask.source.origin.frameSha256=frames[i].sha256;});
 return {format:'skill-translator.sequence-bundle/v1',sequence,frames:sequence.moments.map((m,i)=>({momentId:m.id,pngBase64:frames[i].pngBase64}))};
}
async function openAndReview(source,all){
 await upload('input',source);await poll(title=>document.querySelector('#source-name').textContent===title&&document.querySelector('#status').textContent.startsWith('Original sequence opened'),source.sequence.title);
 for(const check of await page.locator('#samples .include').all())await check.check();await page.locator('#point-pair-bound').fill('.000001');await page.locator('#point-propose').click();
 assert.equal(await page.locator('#point-proposals article').count(),3);
 for(const card of await page.locator('#point-proposals article').all()){
  assert.match(await card.innerText(),/2 complete geometric mappings remain/);
  await card.locator('.point-semantic-confirm').check();
  if(all){await card.locator('details.forced-subset-review summary').click();assert.equal(await card.locator('.forced-subset-review circle').count(),4);await card.locator('.point-forced-subset-confirm').check();}
  await card.locator('button').click();
 }
 await page.locator('#point-label').fill('Seed point purpose');await page.locator('#reference-label').fill('Independent original plane');await page.locator('#reference-basis').fill('Authored common plane and original corner meanings, separately supplied');
 assert.equal(await page.locator('#reference-confirm').isChecked(),false);await page.locator('#reference-confirm').check();await page.locator('#editor button[type=submit]').click();assert.equal(await page.locator('#result').isVisible(),true);
}
try{
 await page.goto('chrome://sandbox');const sandbox=await page.locator('body').innerText();assert.doesNotMatch(sandbox,/not adequately sandboxed/i);assert.match(sandbox,/you are adequately sandboxed/i);assert.match(sandbox,/PID namespaces\s+Yes/i);assert.match(sandbox,/Seccomp-BPF sandbox\s+Yes/i);await writeFile(output+'/sandbox.txt',sandbox);
 await page.goto(base+'/sampled-path');const source=await makeSource(.21);
 // Current anchor-only workflow remains useful but cannot imply other reviews.
 await openAndReview(source,false);assert.equal(await page.locator('#reviewed-forced-point-paths').isVisible(),false);assert.equal(await page.locator('#reviewed-point-paths').isVisible(),false);
 const seed=await downloadJson('#save');
 await openAndReview(source,true);const panel=page.locator('#reviewed-forced-point-paths');assert.equal(await panel.locator('article').count(),1);assert.equal(await page.locator('#reviewed-point-paths').isVisible(),false);assert.match(await panel.innerText(),/local-0-2, local-0-3/);
 const retained=await downloadJson('#save-forced-points'),derived=await downloadJson('#reviewed-forced-point-paths .save-forced-path');
 assert.equal(retained.reviews.length,3);assert.ok(retained.reviews.every(r=>r.pairs.length===2&&r.semanticForcedPairsConfirmed));assert.deepEqual(derived.sourceBundle.frames,source.frames);assert.deepEqual(derived.sourceBundle.sequence,source.sequence);assert.deepEqual(derived.path.reference,seed.path.reference);assert.notEqual(derived.path.label,seed.path.label);
 const finding=inspectSequencePath({...derived.path,sequence:derived.sourceBundle.sequence});assert.notEqual(finding.sampledPathDistanceMm,inspectSequencePath({...seed.path,sequence:seed.sourceBundle.sequence}).sampledPathDistanceMm);
 await panel.locator('details summary').click();const proof=await panel.locator('article').evaluate(async card=>Promise.all([...card.querySelectorAll('svg')].map(async svg=>{const blob=window.__previewBlobs.get(svg.querySelector('image').getAttribute('href'));return {hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join(''),x:Number(svg.querySelector('circle').getAttribute('cx')),y:Number(svg.querySelector('circle').getAttribute('cy'))};})));
 assert.deepEqual(proof.map(p=>p.hash),source.sequence.moments.map(m=>m.image.sha256));assert.deepEqual(proof.map(p=>({x:p.x,y:p.y})),finding.samples.map(s=>s.sourcePx));
 await panel.screenshot({path:output+'/desktop.png'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await panel.screenshot({path:output+'/narrow.png'});await page.setViewportSize({width:1100,height:850});
 // Same original subset identities entered manually through ordinary consumer.
 await page.reload();await upload('input',seed);await poll(()=>!document.querySelector('#result').hidden);assert.equal(await panel.isVisible(),false);
 for(let i=0;i<4;i++){await page.locator('#samples .mark').nth(i).selectOption(derived.path.samples[i].markId);await page.locator('#samples .basis').nth(i).fill(derived.path.samples[i].basis);}
 await page.locator('#point-label').fill(derived.path.label);await page.locator('#editor button[type=submit]').click();const manual=await downloadJson('#save');assert.deepEqual(manual.path,derived.path);assert.equal(await panel.isVisible(),false);
 await upload('forced-reviewed-input',retained);await poll(()=>!document.querySelector('#reviewed-forced-point-paths').hidden);assert.deepEqual(await downloadJson('#save-forced-points'),retained);assert.deepEqual(await downloadJson('#reviewed-forced-point-paths .save-forced-path'),derived);
 const negatives=[];const unforced=structuredClone(retained);unforced.reviews[0].pairs.push({referenceId:'local-0-2',observationId:'local-1-2'});negatives.push(unforced);const omitted=structuredClone(retained);omitted.reviews.pop();negatives.push(omitted);const unreviewed=structuredClone(retained);unreviewed.reviews[1].semanticForcedPairsConfirmed=false;negatives.push(unreviewed);const wrongPng=structuredClone(retained);wrongPng.sourceBundle.frames[1].pngBase64=wrongPng.sourceBundle.frames[0].pngBase64;negatives.push(wrongPng);negatives.push(seed);
 for(const bad of negatives){await upload('forced-reviewed-input',bad);await poll(()=>document.querySelector('#status').textContent.includes('Forced-subset account refused:'));assert.equal(await panel.locator('article').count(),1);assert.deepEqual(await downloadJson('#save-forced-points'),retained);}
 await page.locator('#samples .basis').first().fill('Later authored correction');assert.equal(await panel.isVisible(),false);await page.locator('#editor button[type=submit]').click();assert.equal(await panel.isVisible(),false);
 const changed=await makeSource(.32);await openAndReview(changed,true);const changedPath=await downloadJson('#reviewed-forced-point-paths .save-forced-path'),changedFinding=inspectSequencePath({...changedPath.path,sequence:changedPath.sourceBundle.sequence});assert.ok(Math.abs(changedFinding.sampledPathDistanceMm-finding.sampledPathDistanceMm)>1);assert.deepEqual(changedPath.sourceBundle.frames,changed.frames);
 // Withdraw an expanded review. Ordinary authored identity can remain but no
 // all-pair record may be reconstructed from its basis text.
 await upload('input',source);await poll(title=>document.querySelector('#source-name').textContent===title&&document.querySelector('#status').textContent.startsWith('Original sequence opened'),source.sequence.title);for(const check of await page.locator('#samples .include').all())await check.check();await page.locator('#point-pair-bound').fill('.000001');await page.locator('#point-propose').click();
 for(const card of await page.locator('#point-proposals article').all()){await card.locator('.point-semantic-confirm').check();await card.locator('details summary').click();await card.locator('.point-forced-subset-confirm').check();await card.locator('button').click();}
 await page.locator('#point-proposals .point-forced-subset-confirm').first().uncheck();await page.locator('#samples .basis').nth(1).fill('Independent point-only replacement');await page.locator('#point-label').fill('Point-only');await page.locator('#reference-label').fill('Fixed sheet');await page.locator('#reference-basis').fill('Separately confirmed common plane');await page.locator('#reference-confirm').check();await page.locator('#editor button[type=submit]').click();assert.equal(await page.locator('#result').isVisible(),true);assert.equal(await panel.isVisible(),false);
 await Promise.all(responseTasks);assert.deepEqual(errors,[]);const coverage=['anchor-only-does-not-review-other-identities','explicit-all-forced-review','ambiguous-full-maps-stay-unpromoted','one-extra-distinct-original-point-path','unforced-identities-excluded','exact-original-png-and-pixels','ordinary-manual-consumer-parity','source-only-review-reopen','five-invalid-accounts-preserve-accepted-work','ordinary-edit-retires-subset','changed-original-course-changes-path','withdrawn-subset-review-not-reconstructed','desktop-and390px'];
 const receipt={passed:true,groups:coverage.length,coverage,chordSums:[finding.sampledPathDistanceMm,changedFinding.sampledPathDistanceMm],remainingExpertInput:'Original source calibrations/annotations, an anchor, explicit semantic review of all offered forced pairs in each frame, and independent common-plane declaration. Extra point selections removed; no measured human-time claim.',browser:browser.version(),source:process.env.SOURCE_SHA||'draft composition',pageErrors:errors,responses};await writeFile(output+'/browser.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({...receipt,responses:responses.length}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
