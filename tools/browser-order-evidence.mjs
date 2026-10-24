import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'/tmp/skill-order-evidence-receiving');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
const origin=`http://127.0.0.1:${server.address().port}`,checks=[],errors=[],offsite=[],sourceHashes={};let browser,failure;
const digest=b=>createHash('sha256').update(b).digest('hex');
const files=['src/order-evidence.mjs','src/prerequisite-rehearsal.mjs','src/demonstration-sequence.mjs','src/frame-origin.mjs','src/capture.mjs','web/order-evidence.mjs','web/order-evidence-input.mjs','web/order-evidence.html','web/order-evidence.css','web/sequence-input.mjs','web/image-input.mjs','web/prerequisite-rehearsal.mjs','web/sequence.mjs','server.mjs','tools/browser-order-evidence.mjs'];
const mark=s=>{checks.push(s);console.log('PASS '+s);};
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)offsite.push(r.url());});};
const fill=(p,id,value)=>p.$eval(id,(e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
const status=(p,s)=>p.waitForFunction(s=>document.getElementById('status').textContent.includes(s),{},s);
const upload=async(p,id,path)=>{await p.$eval(id,e=>{e.value='';});await(await p.$(id)).uploadFile(path);};
const frames=async p=>p.$$eval('#witnesses img',async imgs=>{await Promise.all(imgs.map(i=>i.decode()));return imgs.length>0&&imgs.every(i=>i.naturalWidth>0);});
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function download(p,selector,name,label){
 const dir=join(out,label);await mkdir(dir,{recursive:true});
 const cdp=await p.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
 await p.click(selector);const path=join(dir,name);
 for(let i=0;i<200;i++){
  try{return {path,value:JSON.parse(await readFile(path,'utf8'))};}
  catch(e){if(e.code!=='ENOENT')throw e;}
  await new Promise(r=>setTimeout(r,40));
 }
 throw Error('Actual browser download missing: '+name);
}
async function authoredSource(variant){
 const p=await browser.newPage();watch(p);await p.goto(origin+'/sequence',{waitUntil:'networkidle0'});
 await fill(p,'#sequence-title',`Original authored order control ${variant}`);
 await fill(p,'#sequence-context','Original software-generated clip; no measured expert success or physical skill claim.');
 const dir=join(out,'clip-'+variant);await mkdir(dir,{recursive:true});
 const pngs=await p.evaluate(variant=>Array.from({length:12},(_,i)=>{
  const c=document.createElement('canvas');c.width=160;c.height=100;const x=c.getContext('2d');
  const palettes=variant==='A'?['#df2020','#2030df','#20bf50']:['#c08010','#8840c0','#20a0b0'];
  x.fillStyle=palettes[Math.floor(i/4)];x.fillRect(0,0,160,100);
  x.fillStyle='white';x.fillRect((variant==='A'?30:45)+Math.floor(i/4)*20,40,15,15);
  return c.toDataURL('image/png').split(',')[1];
 }),variant);
 for(const [i,png]of pngs.entries())await writeFile(join(dir,`frame-${i}.png`),Buffer.from(png,'base64'));
 const video=join(dir,`authored-${variant}.webm`);
 const encoded=spawnSync(process.env.FFMPEG_BINARY||'/usr/bin/ffmpeg',['-y','-loglevel','error','-framerate','4','-i',join(dir,'frame-%d.png'),'-c:v','libvpx-vp9','-pix_fmt','yuv420p',video],{encoding:'utf8',timeout:30000});
 assert.equal(encoded.status,0,encoded.stderr);
 await upload(p,'#clip-file',video);await status(p,'Original clip ready');
 for(const [i,time]of [.25,1.25,2.25].entries()){
  await fill(p,'#moment-time',String(time));await fill(p,'#moment-label',`State ${i+1}`);
  await fill(p,'#moment-state',`Authored ${variant} state ${i+1}`);await p.click('#capture-moment');await status(p,`Retained State ${i+1}`);
 }
 const momentIds=await p.$$eval('#step-before option',a=>a.map(o=>o.value));
 for(const i of [0,1]){
  await p.select('#step-before',momentIds[i]);await p.select('#step-after',momentIds[i+1]);
  await fill(p,'#step-title',i?'Inspect result':'Arrange reference');await fill(p,'#step-intent','Inspect the authored marker arrangement');
  await fill(p,'#step-change','The authored marker changes color and location');await fill(p,'#step-sensory','');
  await fill(p,'#step-recovery','Ask for another observation if unclear');await p.click('#save-step');await status(p,'Authored step saved');
 }
 const saved=await download(p,'#export-sequence','demonstration-sequence.json','source-'+variant);
 assert.equal(saved.value.sequence.steps.length,2);assert.equal(saved.value.sequence.clip.sha256,digest(await readFile(video)));
 await p.close();return {...saved,video};
}
try{
 for(const path of files)sourceHashes[path]=digest(await readFile(resolve(path)));
 browser=await puppeteer.launch({headless:true,...(process.env.CHROME_BINARY?{executablePath:process.env.CHROME_BINARY}:{}),args:process.env.CHROME_TEST_NO_SANDBOX==='1'?['--no-sandbox','--no-first-run']:['--no-first-run']});
 const a=await authoredSource('A'),b=await authoredSource('B');
 assert.notEqual(a.value.sequence.clip.sha256,b.value.sequence.clip.sha256);
 assert.notEqual(a.value.frames[0].pngBase64,b.value.frames[0].pngBase64);
 mark('two distinct original clips pass actual Studio frame capture and saved-source export');
 const p=await browser.newPage();watch(p);await p.setViewport({width:1200,height:900,deviceScaleFactor:1});
 await p.goto(origin+'/sequence',{waitUntil:'networkidle0'});
 await Promise.all([p.waitForNavigation({waitUntil:'networkidle0'}),p.click('a[href="/order-evidence"]')]);
 await upload(p,'#referenceFile',a.path);await status(p,'Source PNGs checked');
 await upload(p,'#comparisonFile',b.path);
 await p.waitForFunction(()=>document.querySelectorAll('#mappings .example').length===1);await status(p,'Source PNGs checked');
 assert.match(await p.$eval('#result',e=>e.textContent),/unresolved/);
 assert.deepEqual(await p.$$eval('#mappings select',a=>a.map(e=>e.value)),['','']);assert.ok(await frames(p));
 mark('actual source entry preserves unmapped uncertainty despite matching authored labels');
 const aid=a.value.sequence.steps.map(s=>s.id),bid=b.value.sequence.steps.map(s=>s.id),selector=id=>`#mappings select[data-reference="${id}"]`;
 const map=async(left,right)=>{await p.select(selector(left),right);};
 await map(aid[0],bid[0]);await map(aid[1],bid[1]);
 assert.match(await p.$eval('#result',e=>e.textContent),/Same non-overlapping order/);assert.equal(await p.$eval('#declare',e=>e.disabled),false);assert.ok(await frames(p));
 await map(aid[1],bid[0]);await status(p,'Match each');assert.equal(await p.$eval(selector(aid[1]),e=>e.value),bid[1]);
 await map(aid[0],'');await map(aid[1],bid[0]);await map(aid[0],bid[1]);
 assert.match(await p.$eval('#result',e=>e.textContent),/Both orders/);assert.equal(await p.$eval('#declare',e=>e.disabled),true);
 assert.match(await p.$eval('#witnesses',e=>e.textContent),/B is at-or-before A/);
 await map(aid[0],'');await map(aid[1],bid[1]);await map(aid[0],bid[0]);
 mark('explicit changed correspondences flip stable order to opposing witnesses; duplicate targets refuse');
 const renamed=structuredClone(a.value);renamed.sequence.title='Renamed original evidence';
 const renamedPath=join(out,'duplicate-renamed.json');await writeFile(renamedPath,JSON.stringify(renamed));
 await upload(p,'#comparisonFile',renamedPath);await status(p,'already included');
 assert.equal(await p.$$eval('#mappings .example',x=>x.length),1);
 assert.match(await p.$eval('#result',e=>e.textContent),/Same non-overlapping order/);
 mark('renaming an already retained demonstration does not create additional evidence');
 await fill(p,'#reason','  Expert-declared software-control prerequisite  ');
 await p.focus('#declare');await p.keyboard.press('Enter');await status(p,'Expert declaration retained');
 const lesson=await download(p,'#lesson','declared-order-rehearsal.json','lesson');
 assert.deepEqual(lesson.value.rehearsal.dependencies,[{before:aid[0],after:aid[1],reason:'Expert-declared software-control prerequisite'}]);
 assert.equal(lesson.value.rehearsal.attempt,null);
 const q=await browser.newPage();watch(q);await q.goto(origin+'/prerequisite-rehearsal');
 await upload(q,'#open',lesson.path);await status(q,'reopened');assert.equal(await q.$eval('#edge-form',e=>e.hidden),false);
 await q.click('#begin');await q.click(`#choices button[data-step-id="${aid[1]}"]`);await q.click(`#choices button[data-step-id="${aid[0]}"]`);
 await q.click('#submit');assert.match(await q.$eval('#feedback',e=>e.textContent),/reversed/);
 await q.click('#restart');await q.click(`#choices button[data-step-id="${aid[0]}"]`);await q.click(`#choices button[data-step-id="${aid[1]}"]`);
 await q.click('#submit');assert.match(await q.$eval('#feedback',e=>e.textContent),/Complete order agrees/);await q.close();
 mark('downloaded declaration is received by maintained rehearsal and distinguishes correct from reversed order');
 const saved=await download(p,'#save','order-evidence.json','study');assert.equal(saved.value.sources.length,2);
 assert.equal(saved.value.declarations[0].reason,'Expert-declared software-control prerequisite');
 await p.screenshot({path:join(out,'desktop.png'),fullPage:true});
 const m=await browser.newPage();watch(m);await m.setViewport({width:390,height:844,deviceScaleFactor:1});
 await m.goto(origin+'/order-evidence');await upload(m,'#studyFile',saved.path);await status(m,'Study reopened');
 assert.match(await m.$eval('#result',e=>e.textContent),/Same non-overlapping order/);
 assert.equal(await m.$$eval('#declarations li',a=>a.length),1);assert.ok(await frames(m));
 assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await m.screenshot({path:join(out,'narrow.png'),fullPage:true});
 mark('fresh390px study reopening checks original frames and recomputes exact matches and expert declarations');
 const forged=structuredClone(saved.value);forged.study.findings={candidate:{before:aid[1],after:aid[0]},sourceCount:99};
 const forgedPath=join(out,'forged-findings.json');await writeFile(forgedPath,JSON.stringify(forged));
 await m.$eval('#status',e=>{e.textContent='awaiting forged findings control';});
 await upload(m,'#studyFile',forgedPath);await status(m,'Study reopened');
 assert.match(await m.$eval('#result',e=>e.textContent),/Same non-overlapping order/);
 const wrong=structuredClone(saved.value);wrong.sources[1].bundle.frames[0].pngBase64=wrong.sources[0].bundle.frames[0].pngBase64;
 const wrongPath=join(out,'wrong-png.json');await writeFile(wrongPath,JSON.stringify(wrong));
 await m.$eval('#status',e=>{e.textContent='awaiting wrong PNG control';});await upload(m,'#studyFile',wrongPath);
 await m.waitForFunction(()=>!document.getElementById('status').textContent.includes('awaiting wrong PNG'));
 assert.doesNotMatch(await m.$eval('#status',e=>e.textContent),/Study reopened/);
 assert.match(await m.$eval('#result',e=>e.textContent),/Same non-overlapping order/);
 assert.equal(await m.$$eval('#declarations li',a=>a.length),1);
 const absent=structuredClone(saved.value);delete absent.study.comparisons;
 const absentPath=join(out,'missing-comparisons.json');await writeFile(absentPath,JSON.stringify(absent));
 await upload(m,'#studyFile',absentPath);await status(m,'complete order-evidence');assert.equal(await m.$$eval('#declarations li',a=>a.length),1);
 mark('forged findings are recomputed; swapped PNGs and omitted raw comparisons refuse transactionally');
 const arithmetic=await m.evaluate(async()=>{
  const {budget,TOTAL_FRAME_BYTES,TOTAL_PIXELS}=await import('/web/order-evidence-input.mjs');
  const fake=(bytes,pixels)=>new Map([['x',{sequence:{moments:[{image:{widthPx:pixels,heightPx:1}}]},assets:new Map([['frame',{file:{size:bytes}}]])}]]);
  const at=budget(fake(TOTAL_FRAME_BYTES,TOTAL_PIXELS));let byteRefusal=false,pixelRefusal=false;
  try{budget(fake(TOTAL_FRAME_BYTES+1,TOTAL_PIXELS));}catch{byteRefusal=true;}
  try{budget(fake(TOTAL_FRAME_BYTES,TOTAL_PIXELS+1));}catch{pixelRefusal=true;}
  return {at,byteRefusal,pixelRefusal};
 });
 assert.equal(arithmetic.byteRefusal,true);assert.equal(arithmetic.pixelRefusal,true);
 const oversized=structuredClone(saved.value);
 const enlarge=s=>{for(const moment of s.moments){moment.image.widthPx=2500;moment.image.heightPx=2500;Object.assign(moment.origin,{widthPx:2500,heightPx:2500,decodedWidthPx:2500,decodedHeightPx:2500});}};
 enlarge(oversized.study.reference);for(const c of oversized.study.comparisons)enlarge(c.sequence);
 for(const item of oversized.sources)enlarge(item.bundle.sequence);
 const oversizedPath=join(out,'aggregate-pixels.json');await writeFile(oversizedPath,JSON.stringify(oversized));
 await m.evaluate(()=>{window.baseDecode=HTMLImageElement.prototype.decode;window.decodeCount=0;HTMLImageElement.prototype.decode=function(){window.decodeCount++;return window.baseDecode.call(this);};});
 await upload(m,'#studyFile',oversizedPath);await status(m,'shared 32 MB');
 assert.equal(await m.evaluate(()=>window.decodeCount),0);
 await m.evaluate(()=>{HTMLImageElement.prototype.decode=window.baseDecode;});
 mark('aggregate byte/pixel arithmetic boundaries and multi-source pixel preflight refuse excess before decoding');
 await m.evaluate(()=>{
  window.baseDecode=HTMLImageElement.prototype.decode;window.activeDecodes=0;window.maximumDecodes=0;window.holdFirstDecode=true;
  HTMLImageElement.prototype.decode=async function(){
   window.activeDecodes++;window.maximumDecodes=Math.max(window.maximumDecodes,window.activeDecodes);
   try{
    if(window.holdFirstDecode){window.holdFirstDecode=false;await new Promise(r=>window.releaseBlockedDecode=r);}
    return await window.baseDecode.call(this);
   }finally{window.activeDecodes--;}
  };
 });
 await upload(m,'#referenceFile',b.path);await m.waitForFunction(()=>typeof window.releaseBlockedDecode==='function');
 await upload(m,'#referenceFile',a.path);await upload(m,'#referenceFile',b.path);
 await m.evaluate(()=>window.releaseBlockedDecode());
 await m.waitForFunction(title=>document.getElementById('referenceTitle').textContent===title&&document.querySelectorAll('#mappings .example').length===0,{},b.value.sequence.title);
 assert.equal(await m.evaluate(()=>window.maximumDecodes),1);
 await m.evaluate(()=>{HTMLImageElement.prototype.decode=window.baseDecode;});
 mark('single-flight admission drains superseded decodes and adopts only the latest of three source requests');
 await upload(m,'#studyFile',saved.path);await status(m,'Study reopened');
 const delayed=join(out,'delayed-study.json');await writeFile(delayed,JSON.stringify(saved.value));
 await m.evaluate(()=>{
  window.baseText=File.prototype.text;
  File.prototype.text=async function(){
   if(this.name==='delayed-study.json'){await new Promise(r=>window.releaseStudyRead=r);const value=await window.baseText.call(this);window.studyReadSettled=true;return value;}
   return window.baseText.call(this);
  };
 });
 await upload(m,'#studyFile',delayed);await m.waitForFunction(()=>typeof window.releaseStudyRead==='function');
 await fill(m,'#reason','A newer unsaved expert explanation');await m.evaluate(()=>window.releaseStudyRead());
 await m.waitForFunction(()=>window.studyReadSettled);await settle(m);
 assert.equal(await m.$eval('#reason',e=>e.value),'A newer unsaved expert explanation');assert.equal(await m.$$eval('#declarations li',a=>a.length),1);
 await m.evaluate(()=>{File.prototype.text=window.baseText;});
 mark('a delayed whole-study read cannot overwrite a newer expert draft');
 const replacement=join(out,'late-reference.json');await writeFile(replacement,JSON.stringify(b.value));
 await m.evaluate(()=>{
  window.baseText=File.prototype.text;window.baseBytes=File.prototype.arrayBuffer;window.baseURL=URL.createObjectURL;
  window.delayedSaveOnce=true;window.downloadedJSON=0;
  File.prototype.text=async function(){if(this.name==='late-reference.json')await new Promise(r=>window.releaseReplacementRead=r);return window.baseText.call(this);};
  File.prototype.arrayBuffer=async function(){if(window.delayedSaveOnce&&this.type==='image/png'){window.delayedSaveOnce=false;await new Promise(r=>window.releaseOldSave=r);}return window.baseBytes.call(this);};
  URL.createObjectURL=function(blob){if(blob.type==='application/json')window.downloadedJSON++;return window.baseURL.call(this,blob);};
 });
 await upload(m,'#referenceFile',replacement);await m.waitForFunction(()=>typeof window.releaseReplacementRead==='function');
 await m.click('#save');await m.waitForFunction(()=>typeof window.releaseOldSave==='function');
 await m.evaluate(()=>window.releaseReplacementRead());
 await m.waitForFunction(title=>document.getElementById('referenceTitle').textContent===title&&document.querySelectorAll('#mappings .example').length===0,{},b.value.sequence.title);
 await m.evaluate(()=>window.releaseOldSave());await status(m,'changed during saving');
 assert.equal(await m.evaluate(()=>window.downloadedJSON),0);assert.equal(await m.$eval('#referenceTitle',e=>e.textContent),b.value.sequence.title);
 await m.evaluate(()=>{File.prototype.text=window.baseText;File.prototype.arrayBuffer=window.baseBytes;URL.createObjectURL=window.baseURL;});
 mark('old-source save completing after replacement commit is refused without a stale download');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
 for(const [path,hash]of Object.entries(sourceHashes))assert.equal(digest(await readFile(resolve(path))),hash,'Source changed during receiving: '+path);
 mark('no browser exceptions or offsite requests; exact source hashes stayed unchanged throughout');
}catch(e){failure={message:e.message,stack:e.stack};process.exitCode=1;console.error(e);}
finally{
 await writeFile(join(out,'verification.json'),JSON.stringify({checks,errors,offsite,failure:failure??null,browser:browser?await browser.version():null,node:process.version,sourceHashes,evidence:'Two original authored clips and actual browser/PNG software controls; no physical-skill, causal-necessity or learning-efficacy claim.'},null,2));
 await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));
}
