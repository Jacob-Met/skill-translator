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

 if(!process.env.PLAYBACK_SOURCE||!process.env.CLOCK_VIDEO||!process.env.SILENT_SEQUENCE)throw Error('Set PLAYBACK_SOURCE, CLOCK_VIDEO and SILENT_SEQUENCE.');
 const sourceDir=resolve(process.env.PLAYBACK_SOURCE),videoBytes=await readFile(join(sourceDir,'original.webm')),vtt=await readFile(join(sourceDir,'transcript.vtt'),'utf8');
 assert.equal(hash(videoBytes),'c8c04c501a2d6335fd594778fc3e918150666846b080a8ec7cb03d0e7f18b43a');
 const media={name:'original.webm',mimeType:'video/webm',buffer:videoBytes};
 const file=(name,value)=>({name,mimeType:'application/json',buffer:Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value))});
 async function save(p,selector){const [d]=await Promise.all([p.waitForEvent('download'),p.locator(selector).click()]);return readFile(await d.path());}
 const studio=await context.newPage();await studio.goto(baseURL+'/sequence');await studio.locator('#clip-file').setInputFiles(media);
 await studio.waitForFunction(()=>!document.querySelector('#narration-file').disabled);
 for(const [i,t] of [.2,4.6].entries()){
  await studio.locator('#moment-time').fill(String(t));await studio.locator('#moment-label').fill('Authored moving control '+i);await studio.locator('#moment-state').fill('Synthetic moving pixels and voiced control; no physical skill claim.');
  await studio.waitForFunction(()=>!document.querySelector('#capture-moment').disabled);await studio.locator('#capture-moment').click();
  await studio.waitForFunction(n=>document.querySelector('#moment-count').textContent.includes(n+' /'),i+1);
 }
 const ids=await studio.locator('#step-before option').evaluateAll(es=>es.map(e=>e.value));
 for(let i=0;i<2;i++){
  await studio.locator('#step-before').selectOption(ids[0]);await studio.locator('#step-after').selectOption(ids[1]);await studio.locator('#step-title').fill('Authored listening step '+i);await studio.locator('#step-intent').fill('Compare supplied words with original audio.');await studio.locator('#step-change').fill('The authored moving pattern changed.');await studio.locator('#save-step').click();
 }
 const bundleBytes=await save(studio,'#export-sequence'),bundle=JSON.parse(bundleBytes);assert.equal(bundle.sequence.steps.length,2);
 assert.equal(bundle.sequence.clip.sha256,hash(videoBytes));assert.ok(Math.abs(bundle.sequence.clip.durationSeconds-5.008)<.002);
 for(const m of bundle.sequence.moments){const f=bundle.frames.find(f=>f.momentId===m.id)||bundle.frames[bundle.sequence.moments.indexOf(m)];assert.equal(hash(Buffer.from(f.pngBase64,'base64')),m.image.sha256);assert.equal(m.origin.frameSha256,m.image.sha256);assert.ok(Number.isFinite(m.origin.mediaTimeSeconds));}
 assert.notEqual(bundle.sequence.moments[0].image.sha256,bundle.sequence.moments[1].image.sha256);
 await writeFile(join(out,'playback-source-sequence.json'),bundleBytes);
 checks.push('Maintained studio captured two distinct original moving PNGs with presentation times and verified hashes, then authored two steps.');
 await studio.locator('#narration-moments').evaluate(e=>e.open=true);await studio.locator('#narration-file').setInputFiles({name:'transcript.vtt',mimeType:'text/vtt',buffer:Buffer.from(vtt)});await studio.locator('#narration-attribution').fill('Authored Flite voiced control; supplied text deliberately says glue where source says blue. Not ASR.');
 await studio.locator('#narration-clock-enabled').check();
 for(const [id,v] of Object.entries({aT:0,aC:.1,bT:4,bC:4.1,vT:2,vC:2.1,tolerance:.001,basis:'Authored navigation exercise: declared 100ms offset, separate authored check.'}))await studio.locator('#narration-clock-'+id).fill(String(v));
 await studio.locator('#narration-pair').click();const navigationBytes=await save(studio,'#narration-navigation-save'),navigation=JSON.parse(navigationBytes);
 const p=await context.newPage();await p.goto(baseURL+'/timed-narration');await p.locator('#source').setInputFiles(file('original-sequence.json',bundleBytes));await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original sequence frames verified'));
 await p.locator('#transcript').setInputFiles({name:'transcript.vtt',mimeType:'text/vtt',buffer:Buffer.from(vtt)});await p.locator('#attribution').fill('Authored Flite control with deliberate blue/glue text mismatch; not ASR.');await p.locator('#pair').click();
 const before=await save(p,'#save'),exportBefore=await save(p,'#export');assert.deepEqual(JSON.parse(before).selections,[]);
 await p.locator('#narration-playback-file').setInputFiles(media);await p.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.includes('Exact original clip paired'));
 assert.equal(await p.locator('.narration-original-video video').evaluate(v=>v.muted),true);await p.locator('#narration-playback-audio').check();assert.equal(await p.locator('.narration-original-video video').evaluate(v=>v.muted),false);
 const observations=[];
 async function playCue(index){await p.locator('#narration-playback-cue').selectOption(String(index));await p.locator('#narration-playback-play').click();await p.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.startsWith('Stopped:'),null,{timeout:15000});const text=await p.locator('#narration-playback-status').textContent();assert.doesNotMatch(text,/not reported/);assert.match(text,/interval-end-presented/);assert.equal(await p.locator('.narration-original-video video').evaluate(v=>v.paused),true);observations.push({cue:index,text});}
 await playCue(0);await playCue(1);assert.match(await p.locator('#narration-playback-words').textContent(),/glue/i);
 assert.deepEqual(await save(p,'#save'),before);assert.deepEqual(await save(p,'#export'),exportBefore);assert.equal(await p.locator('#cues input:checked').count(),0);
 checks.push('Exact original clip starts muted, explicit audio enable survives two complete utterances with actual presented endpoints; supplied glue mismatch remains literal and both exports remain byte-identical with no automatic quote selection.');
 await p.locator('#navigation').setInputFiles(file('navigation.json',navigationBytes));await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved navigation received'));
 await p.locator('#narration-playback-cue').selectOption('1');assert.match(await p.locator('#narration-playback-status').textContent(),/2\.063 s–3\.875 s/);await playCue(1);
 const clockSaved=await save(p,'#save'),clockExport=await save(p,'#export');
 const failed=structuredClone(navigation);failed.clock.verification.clipSeconds=3;
 await p.locator('#navigation').setInputFiles(file('failed-check.json',failed));await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Import refused'));
 assert.deepEqual(await save(p,'#save'),clockSaved);assert.equal(await p.locator('#narration-playback-play').isDisabled(),false);
 checks.push('Saved clock navigation reaches actual managed playback at its mapped interval; failed separate check refuses replacement and preserves accepted playable account.');
 const pairedURL=await p.locator('.narration-original-video video').getAttribute('src');
 await p.locator('#narration-playback-file').setInputFiles({name:'wrong.webm',mimeType:'video/webm',buffer:await readFile(process.env.CLOCK_VIDEO)});
 await p.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.includes('Clip refused'));
 assert.equal(await p.locator('.narration-original-video video').getAttribute('src'),pairedURL);assert.equal(await p.locator('#narration-playback-play').isDisabled(),false);
 await p.locator('#clear-clock').click();await p.locator('#offset').fill('-1');await p.locator('#pair').click();await p.locator('#narration-playback-cue').selectOption('0');assert.equal(await p.locator('#narration-playback-play').isDisabled(),true);assert.match(await p.locator('#narration-playback-status').textContent(),/complete mapped utterance/);
 await p.locator('#narration-playback-cue').selectOption('1');assert.equal(await p.locator('#narration-playback-play').isDisabled(),false);
 checks.push('Wrong clip replacement preserves accepted video; partly overlapping but incomplete first utterance refuses playback without clipping while the second remains available.');
 async function reopen(){await p.locator('#open').setInputFiles([]);await p.locator('#open').setInputFiles(file('reopen.json',clockSaved));await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Narration reopened'));}
 async function start(){await p.locator('#narration-playback-cue').selectOption('1');await p.locator('#narration-playback-play').click();await p.waitForFunction(()=>!document.querySelector('#narration-playback-stop').disabled);}
 async function paused(){assert.equal(await p.locator('.narration-original-video video').evaluate(v=>v.paused),true);assert.equal(await p.locator('#narration-playback-stop').isDisabled(),true);}
 await reopen();await start();await p.locator('#narration-playback-cue').selectOption('0');await paused();
 await start();await p.locator('#step').selectOption(bundle.sequence.steps[1].id);await paused();
 await start();await p.locator('#offset').isDisabled().then(disabled=>assert.equal(disabled,true));await p.locator('#attribution').fill('Changed draft');await paused();assert.equal(await p.locator('#narration-playback-play').isDisabled(),true);await reopen();
 checks.push('Cue and authored-step changes retire managed playback; an unpaired attribution draft stops and blocks playback until a valid record reopens.');
 await p.evaluate(()=>{const original=File.prototype.arrayBuffer;window.playbackReads={};File.prototype.arrayBuffer=function(){if(this.name.startsWith('hold-')){const self=this;return new Promise(resolve=>{window.playbackReads[this.name]=async()=>{resolve(await original.call(self));};});}return original.call(this);};});
 async function hold(selector,name,bytes){await p.locator(selector).setInputFiles(file(name,bytes));await p.waitForFunction(n=>typeof window.playbackReads[n]==='function',name);}
 async function release(name){await p.evaluate(async n=>{await window.playbackReads[n]();await new Promise(r=>setTimeout(r,30));},name);}
 const staleRecord={...JSON.parse(clockSaved),attribution:'STALE delayed import must never become accepted'};
 await hold('#open','hold-quote.json',staleRecord);assert.equal(await p.locator('#narration-playback-play').isDisabled(),true);await p.locator('#select').click();await release('hold-quote.json');await p.waitForFunction(()=>!document.querySelector('#narration-playback-play').disabled);assert.deepEqual(await save(p,'#save'),clockSaved);
 await hold('#open','hold-export.json',staleRecord);await save(p,'#export');await release('hold-export.json');await p.waitForFunction(()=>!document.querySelector('#narration-playback-play').disabled);assert.deepEqual(await save(p,'#save'),clockSaved);
 await hold('#open','hold-first.json',clockSaved);await hold('#open','hold-second.json',clockSaved);await release('hold-first.json');assert.equal(await p.locator('#narration-playback-play').isDisabled(),true);await release('hold-second.json');await p.waitForFunction(()=>!document.querySelector('#narration-playback-play').disabled);
 checks.push('Quote and export actions invalidate delayed imports without stranding suspension; an older receive cannot unsuspend a newer pending receive.');
 await p.locator('#narration-playback-file').setInputFiles({name:'hold-video.webm',mimeType:'video/webm',buffer:videoBytes});await p.waitForFunction(()=>typeof window.playbackReads['hold-video.webm']==='function');
 await p.locator('#attribution').fill('Draft interrupts video admission');await release('hold-video.webm');assert.equal(await p.locator('#narration-playback-play').isDisabled(),true);assert.equal(await p.locator('.narration-original-video video').getAttribute('src'),pairedURL);await reopen();
 await p.locator('#narration-playback-file').setInputFiles({name:'hold-video-old.webm',mimeType:'video/webm',buffer:videoBytes});await p.waitForFunction(()=>typeof window.playbackReads['hold-video-old.webm']==='function');
 await p.locator('#narration-playback-file').setInputFiles(media);await p.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.includes('Exact original clip paired'));const newerURL=await p.locator('.narration-original-video video').getAttribute('src');await release('hold-video-old.webm');assert.equal(await p.locator('.narration-original-video video').getAttribute('src'),newerURL);assert.equal(await p.locator('#narration-playback-play').isDisabled(),false);
 checks.push('Delayed original clip admissions cannot override an unpaired draft or replace a newer accepted clip.');
 await start();await p.locator('#source').setInputFiles(file('source-again.json',bundleBytes));await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original sequence frames verified'));assert.equal(await p.locator('.narration-original-video video').count(),0);assert.equal(await p.locator('#work').isVisible(),false);await reopen();assert.equal(await p.locator('#narration-playback-play').isDisabled(),true);
 await p.locator('#narration-playback-file').setInputFiles(media);await p.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.includes('Exact original clip paired'));
 checks.push('A new source session retires active playback and releases its clip even for identical source bytes; reopened narration requires explicit clip pairing again.');
 await p.screenshot({path:join(out,'playback-desktop.png'),fullPage:true});
 const narrow=await context.newPage();await narrow.setViewportSize({width:390,height:844});await narrow.goto(baseURL+'/timed-narration');await narrow.locator('#source').setInputFiles(file('original.json',bundleBytes));await narrow.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original sequence frames verified'));await narrow.locator('#open').setInputFiles(file('saved.json',clockSaved));await narrow.waitForFunction(()=>document.querySelector('#status').textContent.includes('Narration reopened'));
 assert.equal(await narrow.locator('#narration-playback-play').isDisabled(),true);await narrow.locator('#narration-playback-file').setInputFiles(media);await narrow.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.includes('Exact original clip paired'));await narrow.locator('#narration-playback-cue').selectOption('1');await narrow.locator('#narration-playback-audio').focus();await narrow.keyboard.press('Space');assert.equal(await narrow.locator('.narration-original-video video').evaluate(v=>v.muted),false);
 await narrow.locator('#narration-playback-play').focus();await narrow.keyboard.press('Enter');await narrow.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.startsWith('Stopped:'),null,{timeout:15000});assert.doesNotMatch(await narrow.locator('#narration-playback-status').textContent(),/not reported/);
 assert.deepEqual(await save(narrow,'#save'),clockSaved);assert.deepEqual(await save(narrow,'#export'),clockExport);assert.equal(await narrow.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await narrow.screenshot({path:join(out,'playback-narrow.png'),fullPage:true});
 checks.push('A fresh390px session reopens source and record, explicitly pairs the original media, enables audio and plays by keyboard with contained layout and byte-identical saved outputs.');
 const silent=await context.newPage();await silent.goto(baseURL+'/timed-narration');
 const silentSequence=await readFile(process.env.SILENT_SEQUENCE),silentBytes=await readFile(process.env.CLOCK_VIDEO);
 await silent.locator('#source').setInputFiles(file('silent-source.json',silentSequence));await silent.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original sequence frames verified'));
 await silent.locator('#transcript').setInputFiles({name:'silent.vtt',mimeType:'text/vtt',buffer:Buffer.from('WEBVTT\n\n00:02.500 --> 00:02.850\nAuthored supplied words over an intentionally silent source.\n')});await silent.locator('#attribution').fill('Authored no-audio video control; words are supplied text only.');await silent.locator('#pair').click();
 await silent.locator('#narration-playback-file').setInputFiles({name:'silent.webm',mimeType:'video/webm',buffer:silentBytes});await silent.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.includes('Exact original clip paired'));await silent.locator('#narration-playback-audio').check();await silent.locator('#narration-playback-play').click();await silent.waitForFunction(()=>document.querySelector('#narration-playback-status').textContent.startsWith('Stopped:'),null,{timeout:15000});assert.match(await silent.locator('#narration-playback-status').textContent(),/interval-end-presented/);assert.equal(await silent.locator('#cues input:checked').count(),0);
 checks.push('An original clip with no audio stream still pairs and presents the supplied interval when audio is enabled; no speech or quotation is inferred from silence.');
 await writeFile(join(out,'playback-source-receiving.json'),JSON.stringify({sourceSha256:hash(videoBytes),sourceDeclaration:JSON.parse(await readFile(join(sourceDir,'source.json'),'utf8')),transcriptSha256:hash(Buffer.from(vtt)),studioBundleSha256:hash(bundleBytes),clockRecordSha256:hash(clockSaved),silentSourceSha256:hash(silentBytes),originalMoments:bundle.sequence.moments.map(m=>({image:m.image,origin:m.origin})),observations,qualification:'Authored Flite speech with intentional supplied-text mismatch; browser audio enabled and presented video observed, no human listening or ASR accuracy claim.'},null,2));
 await writeFile(join(out,'playback-clock-record.json'),clockSaved);await writeFile(join(out,'playback-narrated-sequence.json'),clockExport);await writeFile(join(out,'playback-navigation.json'),navigationBytes);
 await studio.close();await p.close();await narrow.close();await silent.close();

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
