import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,stat,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
const require=createRequire(import.meta.url),puppeteer=require(process.env.PUPPETEER_PATH||'puppeteer');
const out=resolve(process.env.QA_OUTPUT||'/tmp/instrument-trace-qa');await mkdir(out,{recursive:true});if((await readdir(out)).length)throw Error('Choose a fresh QA output directory');
const sourceVideo=out+'/authored-original.webm',wrongVideo=out+'/different-original.webm';
for(const [file,filter] of [[sourceVideo,'testsrc2=size=320x240:rate=20'],[wrongVideo,'color=c=blue:size=320x240:rate=20']])execFileSync(process.env.FFMPEG_BINARY||'ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',filter,'-t','4','-c:v','libvpx-vp9','-threads','1','-pix_fmt','yuv420p',file],{timeout:30000});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;const checks=[],errors=[],offsite=[];
async function downloaded(name){const path=out+'/'+name;for(let i=0;i<100;i++){try{await stat(path);return JSON.parse(await readFile(path,'utf8'));}catch{await new Promise(r=>setTimeout(r,100));}}throw Error('Download did not complete: '+name);}
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY,headless:true,args:['--no-first-run']});
 const sandbox=await browser.newPage();await sandbox.goto('chrome://sandbox');const sandboxText=await sandbox.evaluate(()=>document.body.innerText);await writeFile(out+'/sandbox.txt',sandboxText);assert.match(sandboxText,/You are adequately sandboxed/i);await sandbox.close();
 const cdp=await browser.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});
 async function page(width=1280){const p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))offsite.push(r.url());});await p.setViewport({width,height:900});await p.goto(origin+'/instrument-trace');return p;}
 let p=await page();
 const originalBytes=(await readFile(sourceVideo)).toString('base64');
 const bundle=await p.evaluate(async encoded=>{
  const {loadLocalVideo,capturePresentedFrame,releaseVideo}=await import('/web/video-input.mjs');
  const {loadLocalImage}=await import('/web/image-input.mjs');
  const {createSequence,appendMoment,upsertStep}=await import('/src/demonstration-sequence.mjs');
  const {frameOrigin}=await import('/src/frame-origin.mjs');
  const {makeSequenceBundle,releaseSequenceAssets}=await import('/web/sequence-input.mjs');
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),clip=await loadLocalVideo(new File([bytes],'authored-original.webm',{type:'video/webm'}));
  let sequence=createSequence(clip.identity,{title:'Authored moving test pattern; software control'});const assets=new Map();
  try{
   for(const [index,time] of [.4,3.4].entries()){
    const captured=await capturePresentedFrame(clip,time),media=await loadLocalImage(captured.file),id='m'+index;
    assets.set(id,{file:captured.file,media});sequence=appendMoment(sequence,{id,label:'Original presented frame '+index,visibleState:'Authored moving pattern, not skilled physical work',image:media.image,origin:frameOrigin(clip.identity,time,captured.metadata,media.image)});
   }
   sequence=upsertStep(sequence,{id:'control',beforeMomentId:'m0',afterMomentId:'m1',title:'Inspect supplied readings',intent:'Authored timing control',visibleChange:'Moving test pattern',sensoryCue:'No physical sensory cue measured',recoveryCue:''});
   return JSON.parse(await(await makeSequenceBundle(sequence,assets)).text());
  }finally{releaseSequenceAssets(assets);releaseVideo(clip);}
 },originalBytes);
 await writeFile(out+'/sequence.json',JSON.stringify(bundle));
 const readings={format:'skill-translator.instrument-readings/v1',evidenceClass:'authored-example',instrument:{name:'Authored scalar instrument',quantity:'supplied force',unit:'N',calibrationBasis:'Authored software control; not a physical force measurement'},samples:[{timeSeconds:100,value:0},{timeSeconds:100.5,value:6},{timeSeconds:101,value:7},{timeSeconds:101.5,value:0},{timeSeconds:103,value:9},{timeSeconds:103.25,value:10}],clock:{anchors:[{instrumentSeconds:100,clipSeconds:.4},{instrumentSeconds:104,clipSeconds:3.6}],verification:{instrumentSeconds:102,clipSeconds:2},toleranceSeconds:.01,basis:'Authored timing landmarks; not physical synchronization'},settings:{threshold:5,direction:'at-or-above',maximumGapSeconds:1,minimumSamples:2}};
 await writeFile(out+'/readings.json',JSON.stringify(readings));
 const paired=execFileSync(process.execPath,[resolve('tools/pair-instrument-trace.mjs'),out+'/sequence.json',out+'/readings.json'],{encoding:'utf8',timeout:10000});await writeFile(out+'/paired-trace.json',paired);const trace=JSON.parse(paired);
 const upload=async(p,id,file)=>{await(await p.$('#'+id)).uploadFile(file);};
 const text=(p,id)=>p.$eval('#'+id,e=>e.textContent);
 const received=async(p)=>{await upload(p,'source-file',out+'/sequence.json');await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original demonstration received'));await upload(p,'trace-file',out+'/paired-trace.json');await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Trace received'));};
 await received(p);assert.equal(await p.$$eval('#original-frames img',x=>x.length),2);assert.equal(await p.$$eval('#samples tr',x=>x.length),6);assert.equal(await p.$$eval('#candidate option',x=>x.length),2);assert.equal(await p.$eval('#play',e=>e.disabled),true);
 await upload(p,'clip-file',sourceVideo);await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Exact original clip paired'));assert.equal(await p.$eval('video',e=>e.muted),true);assert.equal(await p.$eval('#play',e=>e.disabled),false);
 checks.push('actual encoded authored video -> original presented PNGs -> source bundle -> CLI trace pairing -> original byte-verified consumer');
 await p.focus('#play');await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Playback interval-end-presented'));
 const playback=await text(p,'status');const times=playback.match(/first presented ([0-9.]+) s, last ([0-9.]+) s/);assert.ok(times,playback);assert.ok(Math.abs(Number(times[1])-.8)<=.16);assert.ok(Number(times[2])>=1.2&&Number(times[2])<=1.36);
 checks.push('keyboard requested0.8–1.2s playback reports independently presented original frame times: '+playback);
 await p.$eval('#threshold',e=>{e.value='12';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await p.$eval('#play',e=>e.disabled),true);assert.equal(await p.$eval('#save',e=>e.disabled),true);await p.click('#apply');assert.equal(await p.$$eval('#candidate option',x=>x.length),0);
 await p.$eval('#threshold',e=>{e.value='5';e.dispatchEvent(new Event('input',{bubbles:true}));});await p.click('#apply');assert.equal(await p.$$eval('#candidate option',x=>x.length),2);
 await p.click('#save');const saved=await downloaded('instrument-trace.json');assert.deepEqual(saved,trace);assert.equal(saved.candidates,undefined);
 await p.screenshot({path:out+'/desktop.png',fullPage:true});checks.push('declared threshold edit retires stale playback/save, changed-input no-candidate control, actual raw-only download');
 await p.close();p=await page(390);await upload(p,'source-file',out+'/sequence.json');await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original demonstration received'));await upload(p,'trace-file',out+'/instrument-trace.json');await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Trace received'));await upload(p,'clip-file',sourceVideo);await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Exact original clip paired'));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:out+'/narrow.png',fullPage:true});assert.equal(await p.$$eval('#candidate option',x=>x.length),2);checks.push('fresh390px original source, downloaded trace and original clip reopen without horizontal overflow');
 const wrong=structuredClone(trace);wrong.source.title='Changed source';await writeFile(out+'/wrong-trace.json',JSON.stringify(wrong));await upload(p,'trace-file',out+'/wrong-trace.json');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Trace refused'));assert.equal(await p.$$eval('#candidate option',x=>x.length),2);
 const acceptedUrl=await p.$eval('video',e=>e.src);await upload(p,'clip-file',wrongVideo);await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Clip refused'));assert.equal(await p.$eval('video',e=>e.src),acceptedUrl);assert.equal(await p.$eval('#play',e=>e.disabled),false);
 const failed=structuredClone(trace);failed.clock.verification.clipSeconds=2.2;await writeFile(out+'/failed-clock.json',JSON.stringify(failed));await upload(p,'trace-file',out+'/failed-clock.json');await p.waitForFunction(()=>document.querySelector('#clock-summary').textContent.includes('FAILS'));assert.equal(await p.$$eval('#candidate option',x=>x.length),2);assert.equal(await p.$eval('#play',e=>e.disabled),true);
 await upload(p,'trace-file',out+'/paired-trace.json');await p.waitForFunction(()=>document.querySelector('#clock-summary').textContent.includes('passes'));
 checks.push('changed source and different original clip preserve accepted evidence; failed independent clock keeps candidates but refuses playback');
 await writeFile(out+'/late-trace.json',JSON.stringify({...trace,settings:{...trace.settings,threshold:0}}));
 await p.evaluate(()=>{const native=File.prototype.text;File.prototype.text=function(){if(this.name==='late-trace.json')return new Promise(resolve=>{window.releaseLateTrace=async()=>resolve(await native.call(this));window.lateTraceStarted=true;});return native.call(this);};});
 await upload(p,'trace-file',out+'/late-trace.json');await p.waitForFunction(()=>window.lateTraceStarted===true);
 await p.$eval('#threshold',e=>{e.value='6';e.dispatchEvent(new Event('input',{bubbles:true}));});await p.evaluate(()=>window.releaseLateTrace());await p.evaluate(()=>new Promise(r=>setTimeout(r,100)));
 assert.equal(await p.$eval('#threshold',e=>e.value),'6');assert.equal(await p.$eval('#save',e=>e.disabled),true);await p.click('#apply');assert.equal(await p.$eval('#threshold',e=>e.value),'6');checks.push('late trace read cannot overwrite a newer declared threshold draft');
 assert.deepEqual(errors,[]);assert.deepEqual(offsite,[]);
 await writeFile(out+'/receipt.json',JSON.stringify({status:'PASS',checks,errors,offsite,source:{kind:'authored encoded moving pattern, not physical skill',clip:bundle.sequence.clip,originalPresentedTimes:bundle.sequence.moments.map(m=>m.origin.mediaTimeSeconds)},scalarEvidence:'authored numeric readings, not instrument accuracy',browser:await browser.version()},null,2));console.log(JSON.stringify({status:'PASS',checks,output:out}));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({status:'FAIL',error:String(error),stack:error.stack,checks,errors},null,2));throw error;}
finally{await browser?.close();await new Promise(r=>server.close(r));}
