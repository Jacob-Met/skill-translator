import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createAppServer } from '../server.mjs';
import { upsertStep } from '../src/demonstration-sequence.mjs';
import { createPrerequisiteRehearsal } from '../src/prerequisite-rehearsal.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer');
const out = resolve(process.env.QA_OUTPUT || '/tmp/skill-context-order-receiving');
await mkdir(out, { recursive: true });
const server = createAppServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const checks = [], errors = [], offsite = [], hashes = {};
const files = ['src/context-order.mjs','src/prerequisite-rehearsal.mjs','web/context-order-input.mjs','web/context-order.mjs','web/context-order.html','web/context-order.css','web/sequence-input.mjs','web/image-input.mjs','web/prerequisite-rehearsal.mjs','web/sequence.mjs','tools/browser-context-order.mjs','server.mjs'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const mark = name => { checks.push({ name, passed: true }); console.log('PASS '+name); };
let browser, failure = null;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function page(width=1200,height=900) {
  const p = await browser.newPage();
  await p.setViewport({ width, height });
  p.on('pageerror', e => errors.push(String(e)));
  p.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin + '/')) offsite.push(r.url()); });
  return p;
}
async function fill(p, selector, value) {
  await p.bringToFront();
  await p.$eval(selector, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); }, value);
}
async function status(p, text) {
  await p.waitForFunction(t => document.querySelector('#status').textContent.includes(t), {}, text);
}
async function upload(p, path, selector='#open') {
  await p.bringToFront();
  await p.$eval(selector, e => { e.value = ''; });
  await p.evaluate(() => { const e = document.querySelector('#status'); if(e) e.textContent='Test awaiting new admission'; });
  await (await p.$(selector)).uploadFile(path);
}
async function download(p, selector, filename, label) {
  await p.bringToFront();
  const dir = join(out, label); await mkdir(dir, { recursive:true });
  const cdp = await p.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior:'allow', downloadPath:dir });
  await p.click(selector);
  const path = join(dir, filename);
  let bytes;
  for(let i=0;i<200;i++) {
    try { bytes = await readFile(path); JSON.parse(bytes); break; } catch { await sleep(40); }
  }
  assert.ok(bytes, `Download absent: ${label}/${filename}`);
  await cdp.detach();
  return { path, value:JSON.parse(bytes) };
}
async function loaded(p) { await status(p, 'Source frames checked'); }
async function contexts(p, values) {
  for(let i=0;i<values.length;i++) {
    await fill(p, `#context-${i}`, values[i]);
    await fill(p, `#basis-${i}`, `Authored grouping assumption for step ${i+1}`);
  }
}
async function compare(p, changes, count) {
  await p.bringToFront();
  await p.click('#compare'); await status(p, 'Conditional comparison recomputed');
  assert.equal(await p.$eval('#minimumChanges', e=>e.textContent), String(changes));
  assert.equal(Number((await p.$eval('#optimalCount', e=>e.textContent)).replaceAll(',', '')), count);
}
async function jsonFile(name, value) {
  const path=join(out,name); await writeFile(path,JSON.stringify(value)); return path;
}
async function lesson(source, edges, attempt, name) {
  const p=await page(); await p.goto(origin+'/prerequisite-rehearsal');
  await upload(p,source.path); await loaded(p);
  const ids=source.value.sequence.steps.map(s=>s.id);
  for(let i=0;i<edges.length;i++) {
    const [a,b]=edges[i]; await p.select('#before',ids[a]); await p.select('#after',ids[b]);
    await fill(p,'#reason',`Authored ${name} prerequisite ${i+1}`); await p.click('#edge-form button');
  }
  if(attempt!==null) {
    await p.click('#begin');
    for(const i of attempt) await p.click(`#choices button[data-step-id="${ids[i]}"]`);
    await p.click('#submit');
  }
  const result=await download(p,'#save','prerequisite-rehearsal.json',name);
  await p.close(); return result;
}
try {
  for(const file of files) hashes[file]=sha(await readFile(new URL('../'+file,import.meta.url)));
  browser=await puppeteer.launch({ headless:true, ...(process.env.CHROME_BINARY?{executablePath:process.env.CHROME_BINARY}:{}), args:process.env.CHROME_TEST_NO_SANDBOX==='1'?['--no-sandbox','--no-first-run']:['--no-first-run'] });
  const studio=await page(); await studio.goto(origin+'/sequence');
  await fill(studio,'#sequence-title','Original authored context-order control');
  await fill(studio,'#sequence-context','Original software-generated clip; no measured expert success or physical skill claim.');
  const clipDir=join(out,'authored-clip'); await mkdir(clipDir,{recursive:true});
  const frames=await studio.evaluate(()=>{
    const c=document.createElement('canvas'); c.width=160;c.height=100;
    const x=c.getContext('2d'),colors=['#d02020','#2040d0','#20b050','#b08010','#8040c0'];
    return Array.from({length:20},(_,i)=>{
      const phase=Math.floor(i/4);x.fillStyle=colors[phase];x.fillRect(0,0,160,100);
      x.fillStyle='white';x.fillRect(20+phase*22,40,15,15);return c.toDataURL('image/png').split(',')[1];
    });
  });
  for(let i=0;i<frames.length;i++) await writeFile(join(clipDir,`frame-${i}.png`),Buffer.from(frames[i],'base64'));
  const clipPath=join(clipDir,'authored-context.webm');
  const ff=spawnSync(process.env.FFMPEG_BINARY||'/usr/bin/ffmpeg',['-y','-loglevel','error','-framerate','4','-i',join(clipDir,'frame-%d.png'),'-c:v','libvpx-vp9','-pix_fmt','yuv420p',clipPath],{encoding:'utf8'});
  assert.equal(ff.status,0,ff.stderr);
  await upload(studio,clipPath,'#clip-file'); await status(studio,'Original clip ready');
  for(const [i,time] of [.25,1.25,2.25,3.25,4.25].entries()) {
    await fill(studio,'#moment-time',String(time));await fill(studio,'#moment-label',`Context state ${i+1}`);
    await fill(studio,'#moment-state',`Authored visible state ${i+1}`);await studio.click('#capture-moment');
    await status(studio,`Retained Context state ${i+1}`);
  }
  const moments=await studio.$$eval('#step-before option',es=>es.map(e=>e.value).filter(Boolean));
  assert.equal(moments.length,5);
  for(let i=0;i<4;i++) {
    await studio.select('#step-before',moments[i]);await studio.select('#step-after',moments[i+1]);
    await fill(studio,'#step-title',`Operation ${i+1}`);await fill(studio,'#step-intent','Inspect an authored change');
    await fill(studio,'#step-change','The authored marker changes color and position');
    await fill(studio,'#step-sensory','');await fill(studio,'#step-recovery','Ask for a clearer observation');
    await studio.click('#save-step');await status(studio,'Authored step saved');
  }
  const source=await download(studio,'#export-sequence','demonstration-sequence.json','original-source');
  assert.equal(source.value.sequence.steps.length,4);
  assert.ok(JSON.stringify(source.value.sequence).includes(sha(await readFile(clipPath))), 'Original clip hash retained');
  await studio.close();
  const ids=source.value.sequence.steps.map(s=>s.id);
  const original=await lesson(source,[[0,2],[1,3]],[2,0],'original-lesson');
  const chain=await lesson(source,[[0,1],[1,2],[2,3]],null,'chain-lesson');
  assert.ok(JSON.stringify(original.value.rehearsal.attempt).includes(ids[2]));
  mark('Original authored clip retained through Studio and prerequisite first proposal');

  const p=await page();await p.goto(origin+'/prerequisite-rehearsal');
  await Promise.all([p.waitForNavigation(),p.click('a[href="/context-order"]')]);
  await upload(p,original.path);await loaded(p);
  assert.equal(await p.$eval('#compare',e=>e.disabled),true);
  await p.waitForFunction(()=>[...document.querySelectorAll('#inspector img')].length===2&&[...document.querySelectorAll('#inspector img')].every(e=>e.complete&&e.naturalWidth>0));
  await fill(p,'#context-0','X');await fill(p,'#basis-0','An authored draft grouping');
  const partial=await download(p,'#save','context-order.json','partial');
  assert.equal(partial.value.contexts[1].context,'');
  assert.deepEqual(partial.value.prerequisites,original.value.rehearsal);
  mark('Partial declarations preserve normalized original prerequisite record');
  const m=await page(390,844);await m.goto(origin+'/context-order');await upload(m,partial.path);await loaded(m);
  assert.equal(await m.$eval('#context-0',e=>e.value),'X');assert.equal(await m.$eval('#context-1',e=>e.value),'');
  assert.equal(await m.$eval('#compare',e=>e.disabled),true);assert.equal(await m.$eval('#plan',e=>e.hidden),true);
  await contexts(p,['X','Y','X','Y']);await compare(p,1,2);
  assert.match(await p.$eval('#planSummary',e=>e.textContent),/3/);
  const inspectedId=await p.$eval('#groups button',e=>e.dataset.inspectStep),inspectedStep=source.value.sequence.steps.find(s=>s.id===inspectedId);assert.ok(inspectedStep);
  await p.focus('#groups button');await p.keyboard.press('Enter');
  assert.equal(await p.$eval('#inspectStep',e=>e.value),inspectedId);
  assert.deepEqual(await p.$$eval('#inspector img',es=>es.map(e=>e.dataset.momentId)),[inspectedStep.beforeMomentId,inspectedStep.afterMomentId]);
  await p.waitForFunction(()=>[...document.querySelectorAll('#inspector img')].every(e=>e.complete&&e.naturalWidth>0));
  await p.screenshot({path:join(out,'desktop.png'),fullPage:true});
  mark('Exact conditional grouping changes while retained source witnesses remain inspectable');
  const complete=await download(p,'#save','context-order.json','complete');
  const returned=await download(p,'#saveOriginal','original-prerequisite-rehearsal.json','returned');
  assert.deepEqual(returned.value.rehearsal,original.value.rehearsal);
  const q=await page();await q.goto(origin+'/prerequisite-rehearsal');await upload(q,returned.path);await loaded(q);
  assert.equal(await q.$eval('#edge-form',e=>e.hidden),true);
  assert.match(await q.$eval('#feedback',e=>e.textContent),/reversed/i);
  const retainedOrder=await q.$$eval('#order li',es=>es.map(e=>e.textContent));
  assert.equal(retainedOrder.length,2);assert.ok(retainedOrder[0].includes(source.value.sequence.steps[2].title));
  assert.ok(retainedOrder[1].includes(source.value.sequence.steps[0].title));await q.close();
  mark('Actual maintained rehearsal receives unchanged first proposal instead of optimum');
  await upload(m,complete.path);await loaded(m);assert.equal(await m.$eval('#plan',e=>e.hidden),true);await compare(m,1,2);
  assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await m.screenshot({path:join(out,'narrow.png'),fullPage:true});
  await contexts(m,['X','X','X','X']);await compare(m,0,6);
  mark('Fresh 390px reopen recomputes and changed explicit contexts change optimum and count');
  await upload(m,chain.path);await loaded(m);assert.equal(await m.$eval('#dependencyCount',e=>Number(e.textContent)),3);
  assert.equal(await m.$eval('#context-0',e=>e.value),'');await contexts(m,['X','Y','X','Y']);await compare(m,3,1);
  mark('Changed declared DAG changes optimum without changing source images');
  await upload(m,complete.path);await loaded(m);await compare(m,1,2);
  const forged=structuredClone(complete.value);forged.result={minimumChanges:0,order:[...ids].reverse()};
  await upload(m,await jsonFile('forged.json',forged));await loaded(m);assert.equal(await m.$eval('#plan',e=>e.hidden),true);await compare(m,1,2);
  const missing=structuredClone(complete.value);delete missing.contexts;
  await upload(m,await jsonFile('missing.json',missing));await status(m,'explicitly cover');
  assert.equal(await m.$eval('#minimumChanges',e=>e.textContent),'1');
  const wrong=structuredClone(complete.value);wrong.sourceBundle.frames[1].pngBase64=wrong.sourceBundle.frames[0].pngBase64;
  await upload(m,await jsonFile('wrong-png.json',wrong));
  await m.waitForFunction(()=>!document.querySelector('#status').textContent.includes('Test awaiting'));
  assert.ok(!(await m.$eval('#status',e=>e.textContent)).includes('Source frames checked'));
  assert.equal(await m.$eval('#minimumChanges',e=>e.textContent),'1');
  mark('Forged output ignored and missing declarations or mismatched PNG refuse transactionally');

  let large=structuredClone(source.value.sequence);
  for(let i=4;i<17;i++) large=upsertStep(large,{id:`extra-${i}`,title:`Authored bound step ${i}`,beforeMomentId:moments[0],afterMomentId:moments[1],intent:'Explicit software bound control'});
  const oversized={format:'skill-translator.prerequisite-bundle/v1',sourceBundle:{...source.value,sequence:large},rehearsal:createPrerequisiteRehearsal(large,original.value.rehearsal.dependencies)};
  await m.evaluate(()=>{window.baseDecode=HTMLImageElement.prototype.decode;window.decodeCount=0;HTMLImageElement.prototype.decode=function(){window.decodeCount++;return window.baseDecode.call(this);};});
  await upload(m,await jsonFile('seventeen.json',oversized));await status(m,'at most 16');
  assert.equal(await m.evaluate(()=>window.decodeCount),0);
  await m.evaluate(()=>{HTMLImageElement.prototype.decode=window.baseDecode;});
  assert.equal(await m.$eval('#minimumChanges',e=>e.textContent),'1');mark('Seventeen-step admission refuses before PNG decode without truncation');

  await m.evaluate(()=>{
    window.baseDecode=HTMLImageElement.prototype.decode;window.activeDecodes=0;window.maximumDecodes=0;window.holdDecode=true;
    HTMLImageElement.prototype.decode=async function(){window.activeDecodes++;window.maximumDecodes=Math.max(window.maximumDecodes,window.activeDecodes);try{if(window.holdDecode){window.holdDecode=false;await new Promise(resolve=>window.releaseDecode=resolve);}return await window.baseDecode.call(this);}finally{window.activeDecodes--;}};
  });
  await upload(m,original.path);await m.waitForFunction(()=>typeof window.releaseDecode==='function');
  await upload(m,chain.path);await upload(m,complete.path);await m.evaluate(()=>window.releaseDecode());
  await m.waitForFunction(()=>document.querySelector('#open').value===''&&document.querySelector('#plan').hidden&&document.querySelector('#context-0').value==='X'&&Number(document.querySelector('#dependencyCount').textContent)===2);
  assert.equal(await m.evaluate(()=>window.maximumDecodes),1);await m.evaluate(()=>{HTMLImageElement.prototype.decode=window.baseDecode;});
  mark('Single-flight admission discards queued superseded sources and adopts latest complete source');

  const delayed=await jsonFile('delayed-context.json',complete.value);
  await m.evaluate(()=>{window.baseText=File.prototype.text;window.contextReadSettled=false;File.prototype.text=async function(){if(this.name==='delayed-context.json'){await new Promise(resolve=>window.releaseContextRead=resolve);const text=await window.baseText.call(this);window.contextReadSettled=true;return text;}return window.baseText.call(this);};});
  await upload(m,delayed);await m.waitForFunction(()=>typeof window.releaseContextRead==='function');
  await fill(m,'#context-0','Newer authored context');await m.evaluate(()=>window.releaseContextRead());
  await m.waitForFunction(()=>window.contextReadSettled);await m.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await m.$eval('#context-0',e=>e.value),'Newer authored context');await m.evaluate(()=>{File.prototype.text=window.baseText;});
  await fill(m,'#context-0','X');await compare(m,1,2);
  mark('Newer author edits invalidate delayed source admission without losing accepted context truth');

  const late=await jsonFile('late-chain.json',chain.value);
  await m.evaluate(()=>{
    window.baseText=File.prototype.text;window.baseBytes=File.prototype.arrayBuffer;window.baseURL=URL.createObjectURL;
    window.delaySaveOnce=true;window.downloadedJSON=0;
    File.prototype.text=async function(){if(this.name==='late-chain.json')await new Promise(resolve=>window.releaseIncoming=resolve);return window.baseText.call(this);};
    File.prototype.arrayBuffer=async function(){if(window.delaySaveOnce&&this.type==='image/png'){window.delaySaveOnce=false;await new Promise(resolve=>window.releaseOldSave=resolve);}return window.baseBytes.call(this);};
    URL.createObjectURL=function(blob){if(blob.type==='application/json')window.downloadedJSON++;return window.baseURL.call(this,blob);};
  });
  await upload(m,late);await m.waitForFunction(()=>typeof window.releaseIncoming==='function');
  await m.click('#save');await m.waitForFunction(()=>typeof window.releaseOldSave==='function');
  await m.evaluate(()=>window.releaseIncoming());
  await m.waitForFunction(()=>Number(document.querySelector('#dependencyCount').textContent)===3&&document.querySelector('#context-0').value==='');
  await m.evaluate(()=>window.releaseOldSave());await status(m,'changed while saving');
  assert.equal(await m.evaluate(()=>window.downloadedJSON),0);
  await m.evaluate(()=>{File.prototype.text=window.baseText;File.prototype.arrayBuffer=window.baseBytes;URL.createObjectURL=window.baseURL;});
  mark('Old-source save cannot export after pending replacement commits');
  assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
  for(const file of files) assert.equal(sha(await readFile(new URL('../'+file,import.meta.url))),hashes[file]);
  mark('Exact tested source stayed unchanged and browser made no offsite requests or errors');
} catch(e) { failure=String(e.stack||e);process.exitCode=1;console.error(failure); }
finally {
  await writeFile(join(out,'verification.json'),JSON.stringify({checks,errors,offsite,failure,browser:browser?await browser.version():null,node:process.version,sourceHashes:hashes,evidence:'Original authored clip, supplied prerequisite/context assumptions and software receiving. No physical effort, safety, readiness, completion or learning claim.'},null,2));
  if(browser) await browser.close();server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));
}
