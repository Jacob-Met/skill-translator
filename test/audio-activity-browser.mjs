/** Actual maintained-application browser receiving; no browser sandbox bypass. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createAppServer} from '../server.mjs';
process.env.NO_PROXY='127.0.0.1,localhost,'+(process.env.NO_PROXY||'');
process.env.no_proxy='127.0.0.1,localhost,'+(process.env.no_proxy||'');
if(!process.env.PLAYWRIGHT_MODULE||!process.env.CHROMIUM_SANDBOX_MODULE||!process.env.BROWSER_OUTPUT)throw Error('Set PLAYWRIGHT_MODULE, CHROMIUM_SANDBOX_MODULE and BROWSER_OUTPUT to receiving paths.');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const {requireChromiumSandbox}=await import(process.env.CHROMIUM_SANDBOX_MODULE);
const out=resolve(process.env.BROWSER_OUTPUT);await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const baseURL='http://127.0.0.1:'+server.address().port;
const profile=await mkdtemp(join(out,'chrome-profile-'));
const chrome=spawn(process.env.CHROME||'/usr/bin/google-chrome-stable',
 ['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','about:blank'],
 {stdio:['ignore','ignore','pipe']});
let stderr='';chrome.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-12000);});
let browser;const checks=[],errors=[];
try{
 let port;
 for(let i=0;i<100;i++){
  if(chrome.exitCode!==null)throw Error('Owned Chrome exited: '+stderr);
  try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 if(!port)throw Error('Owned Chrome did not publish its debugging port: '+stderr);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port);
 const admission=await browser.contexts()[0].newPage(),cdp=await admission.context().newCDPSession(admission);
 const sandbox=await requireChromiumSandbox({send:(method,params)=>cdp.send(method,params)});
 await writeFile(join(out,'sandbox.json'),JSON.stringify(sandbox,null,2));await admission.close();
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1100,height:850}});
 context.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(['script','stylesheet','font','image'].includes(r.request().resourceType())&&r.status()>=400)errors.push('Asset '+r.status()+': '+r.url());});});

 if(!process.env.AUDIO_SOURCE)throw Error('Set AUDIO_SOURCE to original authored receiving directory');const sources=resolve(process.env.AUDIO_SOURCE),native=JSON.parse(await readFile(join(sources,'receiving.json'),'utf8'));
 const payload=(name,buffer,mimeType='application/json')=>({name,mimeType,buffer});
 async function save(p,id){const [d]=await Promise.all([p.waitForEvent('download'),p.locator(id).click()]);return readFile(await d.path());}
 async function pair(p,name){const media=await readFile(join(sources,name+'.mp4')),report=await readFile(join(sources,name+'-analysis','audio-activity.json'));assert.equal(hash(media),JSON.parse(report).source.sha256);await p.goto(baseURL+'/sequence');await p.locator('#clip-file').setInputFiles(payload(name+'.mp4',media,'video/mp4'));await p.waitForFunction(()=>!document.querySelector('#narration-file').disabled);await p.locator('#audio-activity').evaluate(e=>e.open=true);await p.locator('#audio-file').setInputFiles(payload(name+'.json',report));await p.waitForFunction(()=>document.querySelector('#audio-status').textContent.includes('Native report received'));assert.equal(await p.locator('#audio-preview').isDisabled(),true);await p.locator('#audio-origin').fill('0');await p.locator('#audio-basis').fill('Authored muxed video starts at zero; native PTS retained and independent browser energy measurement follows.');await p.locator('#audio-pair').click();return {media,report};}
 const browserEnergy=[];
 for(const name of ['moving-voiced','moving-silent','heldback-delayed']){
  const p=await context.newPage();await pair(p,name);const expected=native.media.find(m=>m.name===name);assert.equal(await p.locator('#audio-event option').count(),expected.analysis.events.length);assert.equal(await p.locator('#video-host video').evaluate(v=>v.muted),true);await p.locator('#audio-enabled').check();
  await p.evaluate(async()=>{const video=document.querySelector('#video-host video'),audioContext=new AudioContext(),source=audioContext.createMediaElementSource(video),processor=audioContext.createScriptProcessor(1024,1,1);source.connect(processor);processor.connect(audioContext.destination);const observations=[];window.audioReceiving={audioContext,processor,source,observations,sampleRate:audioContext.sampleRate,bufferSize:processor.bufferSize};processor.onaudioprocess=e=>{const values=e.inputBuffer.getChannelData(0);let sum=0;for(const x of values)sum+=x*x;if(!video.paused)observations.push({mediaTime:video.currentTime,rms:Math.sqrt(sum/values.length),audioContextTime:audioContext.currentTime});e.outputBuffer.copyToChannel(values,0);};await audioContext.resume();video.currentTime=0;await video.play();});
  await p.waitForFunction(()=>document.querySelector('#video-host video').ended,null,{timeout:10000});const measured=await p.evaluate(async()=>{const r=window.audioReceiving;await r.audioContext.close();return {observations:r.observations,sampleRate:r.sampleRate,bufferSize:r.bufferSize};});assert.ok(measured.observations.length>0);const active=measured.observations.filter(o=>o.rms>=.05);if(name==='moving-silent')assert.equal(active.length,0);else{assert.ok(active.length>0);assert.ok(Math.abs(active[0].mediaTime-expected.analysis.events[0].start.seconds)<=.15,'Predeclared150ms browser energy observation bound: '+name);}
  browserEnergy.push({name,sourceSha256:expected.sourceSha256,...measured});await p.close();
 }
 checks.push('Actual browser Web Audio energy is measured against media.currentTime for original moving sound, moving silence and a separately delayed heldback source; full callbacks retained with150ms observation bound.');

 {
 const p=await context.newPage();await pair(p,'steady-voiced');const navigation=await save(p,'#audio-save');
 await p.locator('#narration-moments').evaluate(e=>e.open=true);
 await p.locator('#narration-file').setInputFiles(payload('interruption.vtt',Buffer.from('WEBVTT\n\n00:00.800 --> 00:00.900\nAuthored later preview.\n'),'text/vtt'));
 await p.locator('#narration-attribution').fill('Authored shared-player interruption control.');await p.locator('#narration-pair').click();
 await p.evaluate(()=>{const schedule=window.setTimeout,clear=window.clearTimeout;window.audioIntervalTimers=new Set();window.setTimeout=function(fn,delay,...args){let id;const wrapped=(...values)=>{window.audioIntervalTimers.delete(id);return fn(...values);};id=schedule.call(window,wrapped,delay,...args);if(delay>=10000&&delay<=16000)window.audioIntervalTimers.add(id);return id;};window.clearTimeout=function(id){window.audioIntervalTimers.delete(id);return clear.call(window,id);};});
 async function startInterruptedAudio(){await p.locator('#audio-event').selectOption('audio-event-0');await p.locator('#audio-play').click();await p.waitForFunction(()=>!document.querySelector('#audio-stop').disabled&&window.audioIntervalTimers.size===1);}
 await startInterruptedAudio();await p.locator('button[data-cue="0"][data-choice="start"]').click();
 assert.equal(await p.locator('#audio-stop').isDisabled(),true);assert.match(await p.locator('#audio-status').textContent(),/retired by another studio/);assert.equal(await p.evaluate(()=>window.audioIntervalTimers.size),0);assert.equal(Number(await p.locator('#moment-time').inputValue()),.8);
 await p.waitForFunction(()=>!document.querySelector('#video-host video').seeking);const retiredStatus=await p.locator('#audio-status').textContent();await p.locator('#video-host video').evaluate(v=>v.play());await p.waitForFunction(()=>{const v=document.querySelector('#video-host video');return v.currentTime>2.2&&!v.paused;},null,{timeout:3000});assert.equal(await p.locator('#audio-status').textContent(),retiredStatus);await p.locator('#video-host video').evaluate(v=>v.pause());
 await startInterruptedAudio();await p.locator('#use-playhead').click();assert.equal(await p.locator('#audio-stop').isDisabled(),true);assert.equal(await p.evaluate(()=>window.audioIntervalTimers.size),0);assert.match(await p.locator('#audio-status').textContent(),/retired by another studio/);assert.deepEqual(await save(p,'#audio-save'),navigation);
 checks.push('Existing narration preview and Use current playhead synchronously retire managed audio callbacks and timer; unrelated original playback proceeds beyond the old interval with no stale completion, while navigation remains byte-identical.');
 await p.close();
 }
 const p=await context.newPage(),inputs=await pair(p,'moving-voiced');const navigation=await save(p,'#audio-save');assert.equal(JSON.parse(navigation).report.source.sha256,hash(inputs.media));
 const staleNavigation=JSON.parse(navigation);staleNavigation.declaration.basis='Superseded delayed declaration must never replace the newer accepted origin.';const staleNavigationBytes=Buffer.from(JSON.stringify(staleNavigation));
 await p.locator('#audio-enabled').check();await p.locator('#audio-play').click();await p.waitForFunction(()=>document.querySelector('#audio-status').textContent.startsWith('Stopped:'),null,{timeout:10000});assert.doesNotMatch(await p.locator('#audio-status').textContent(),/not reported/);assert.match(await p.locator('#moment-count').textContent(),/^0 \/ /);
 const opts=await p.locator('#audio-event option').evaluateAll(es=>es.map(e=>e.value));assert.equal(opts.length,2);
 for(let i=0;i<2;i++){await p.locator('#audio-event').selectOption(opts[i]);await p.locator('#audio-preview').click();const requested=Number(await p.locator('#moment-time').inputValue());assert.ok(Math.abs(requested-native.media.find(m=>m.name==='moving-voiced').analysis.events[i].start.seconds)<1e-12);await p.locator('#moment-label').fill('Authored acoustic candidate '+i);await p.locator('#moment-state').fill('Original moving control at an audio activity request; physical meaning not inferred.');await p.waitForFunction(()=>!document.querySelector('#capture-moment').disabled);await p.locator('#capture-moment').click();await p.waitForFunction(n=>document.querySelector('#moment-count').textContent.includes(n+' /'),i+1);}
 const ids=await p.locator('#step-before option').evaluateAll(es=>es.map(e=>e.value));await p.locator('#step-before').selectOption(ids[0]);await p.locator('#step-after').selectOption(ids[1]);await p.locator('#step-title').fill('Inspect two authored acoustic moments');await p.locator('#step-intent').fill('Retain original evidence selected using audible activity.');await p.locator('#step-change').fill('Authored moving pattern differs between the selected moments.');await p.locator('#save-step').click();const bundleBytes=await save(p,'#export-sequence'),bundle=JSON.parse(bundleBytes);assert.equal(bundle.sequence.moments.length,2);assert.notEqual(bundle.sequence.moments[0].image.sha256,bundle.sequence.moments[1].image.sha256);for(let i=0;i<2;i++){const m=bundle.sequence.moments[i];assert.equal(hash(Buffer.from(bundle.frames[i].pngBase64,'base64')),m.image.sha256);assert.equal(m.origin.frameSha256,m.image.sha256);assert.ok(Number.isFinite(m.origin.mediaTimeSeconds));}
 await writeFile(join(out,'audio-original-sequence.json'),bundleBytes);await writeFile(join(out,'audio-navigation.json'),navigation);await p.screenshot({path:join(out,'audio-desktop.png'),fullPage:true});checks.push('Audio candidate preview reaches unchanged studio capture, retaining distinct original PNGs with requested/presented times and an explicit authored step; listening alone captures nothing.');
 const wrong=await readFile(join(sources,'moving-silent-analysis','audio-activity.json'));await p.locator('#audio-file').setInputFiles(payload('wrong-source.json',wrong));await p.waitForFunction(()=>document.querySelector('#audio-status').textContent.includes('Audio import refused'));assert.deepEqual(await save(p,'#audio-save'),navigation);
 const tampered=JSON.parse(inputs.report);tampered.pcm.sha256='b'.repeat(64);await p.locator('#audio-file').setInputFiles(payload('bad-pcm.json',Buffer.from(JSON.stringify(tampered))));await p.waitForFunction(()=>document.querySelector('#audio-status').textContent.includes('PCM hash mismatch'));assert.deepEqual(await save(p,'#audio-save'),navigation);
 await p.locator('#audio-origin').fill('3');assert.equal(await p.locator('#audio-preview').isDisabled(),true);await p.locator('#audio-pair').click();assert.equal(await p.locator('#audio-play').isDisabled(),true);assert.equal(await p.locator('#audio-preview').isDisabled(),true);assert.match(await p.locator('#audio-event-detail').textContent(),/complete interval lies outside/);
 await p.locator('#audio-file').setInputFiles(payload('accepted.json',navigation));await p.waitForFunction(()=>document.querySelector('#audio-status').textContent.includes('Saved audio navigation reopened'));assert.equal(await p.locator('#audio-preview').isDisabled(),false);
 checks.push('Wrong original source and corrupted PCM refuse while preserving accepted navigation; an explicit adverse origin makes the complete mapped interval unavailable without clipping, and saved declarations reopen.');
 await p.locator('#audio-play').click();await p.waitForFunction(()=>!document.querySelector('#audio-stop').disabled);await p.locator('#audio-origin').fill('.1');assert.equal(await p.locator('#video-host video').evaluate(v=>v.paused),true);assert.equal(await p.locator('#audio-preview').isDisabled(),true);await p.locator('#audio-file').setInputFiles(payload('accepted-again.json',navigation));await p.waitForFunction(()=>document.querySelector('#audio-status').textContent.includes('Saved audio navigation reopened'));
 await p.evaluate(()=>{const original=File.prototype.arrayBuffer;window.audioReadReleases={};File.prototype.arrayBuffer=function(){if(this.name.startsWith('hold-audio')){const f=this;return new Promise(resolve=>{window.audioReadReleases[this.name]=async()=>resolve(await original.call(f));});}return original.call(this);};});
 await p.locator('#audio-file').setInputFiles(payload('hold-audio-old.json',staleNavigationBytes));await p.waitForFunction(()=>typeof window.audioReadReleases['hold-audio-old.json']==='function');await p.locator('#audio-file').setInputFiles(payload('newer.json',navigation));await p.waitForFunction(()=>document.querySelector('#audio-status').textContent.includes('Saved audio navigation reopened'));await p.evaluate(async()=>{await window.audioReadReleases['hold-audio-old.json']();await new Promise(r=>setTimeout(r,30));});assert.deepEqual(await save(p,'#audio-save'),navigation);
 await p.locator('#audio-file').setInputFiles(payload('hold-audio-session.json',navigation));await p.waitForFunction(()=>typeof window.audioReadReleases['hold-audio-session.json']==='function');await p.locator('#clear-sequence').click();await p.locator('#clip-file').setInputFiles(payload('same-original.mp4',inputs.media,'video/mp4'));await p.waitForFunction(()=>!document.querySelector('#narration-file').disabled);await p.evaluate(async()=>{await window.audioReadReleases['hold-audio-session.json']();await new Promise(r=>setTimeout(r,30));});assert.equal(await p.locator('#audio-event option').count(),0);assert.equal(await p.locator('#audio-save').isDisabled(),true);
 checks.push('Origin drafts retire playback; stale native reads cannot replace a newer accepted navigation or regain authority after a new same-byte source session.');
 const narrow=await context.newPage();await narrow.setViewportSize({width:390,height:844});await narrow.goto(baseURL+'/sequence');await narrow.locator('#sequence-file').setInputFiles(payload('retained.json',bundleBytes));await narrow.waitForFunction(()=>document.querySelector('#status').textContent.includes('Reopened'));await narrow.locator('#clip-file').setInputFiles(payload('original.mp4',inputs.media,'video/mp4'));await narrow.waitForFunction(()=>!document.querySelector('#narration-file').disabled);await narrow.locator('#audio-activity').evaluate(e=>e.open=true);await narrow.locator('#audio-file').setInputFiles(payload('navigation.json',navigation));await narrow.waitForFunction(()=>document.querySelector('#audio-status').textContent.includes('Saved audio navigation reopened'));await narrow.locator('#audio-preview').focus();await narrow.keyboard.press('Enter');assert.ok(Math.abs(Number(await narrow.locator('#moment-time').inputValue())-native.media.find(m=>m.name==='moving-voiced').analysis.events[0].start.seconds)<1e-12);assert.deepEqual(await save(narrow,'#audio-save'),navigation);assert.equal(await narrow.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await narrow.screenshot({path:join(out,'audio-narrow.png'),fullPage:true});
 checks.push('Fresh390px session reopens original retained frames and source-bound audio evidence, uses keyboard preview with contained layout and saves unchanged native/declaration evidence.');
 const gap=await context.newPage();await pair(gap,'heldback-gap');assert.match(await gap.locator('#audio-summary').textContent(),/[1-9]\d* original timestamp gaps/);checks.push('Actual gap-containing original imports with missing coverage explicit and complete nonbridging candidates retained.');
 await writeFile(join(out,'audio-browser-source-receiving.json'),JSON.stringify({browserEnergy,navigationSha256:hash(navigation),bundleSha256:hash(bundleBytes),originalMoments:bundle.sequence.moments.map(m=>({image:m.image,origin:m.origin})),boundaries:['Authored signals and original moving pixels only','Web Audio energy observed, not human hearing','PCM native artifact recomputed, not independent browser decoder authentication','Declared media origin remains explicit']},null,2));await p.close();await narrow.close();await gap.close();

 assert.deepEqual(errors,[]);
 await writeFile(join(out,'receiving.json'),JSON.stringify({passed:checks.length,checks,errors,browser:await browser.version(),node:process.version,sandbox,receiverSha256:hash(await readFile(new URL(import.meta.url)))},null,2));
 console.log(JSON.stringify({passed:checks.length,checks,errors}));
 await context.close();
}catch(error){
 await writeFile(join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error),stack:error.stack},null,2)).catch(()=>{});
 if(browser){const pages=browser.contexts().flatMap(c=>c.pages());await pages.at(-1)?.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});}
 throw error;
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(chrome.exitCode===null){chrome.kill('SIGTERM');await new Promise(r=>{chrome.once('exit',r);setTimeout(r,3000);});}
 if(chrome.exitCode===null)chrome.kill('SIGKILL');
 await new Promise(r=>server.close(r));
 await rm(profile,{recursive:true,force:true});
}
