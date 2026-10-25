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
 if(!process.env.CLOCK_VIDEO)throw Error('Set CLOCK_VIDEO to the original finite-duration authored WebM control.');
 const clipBytes=await readFile(process.env.CLOCK_VIDEO);
 await writeFile(join(out,'clock-control.webm'),clipBytes);
 const clip={name:'authored-clock.webm',mimeType:'video/webm',buffer:clipBytes};
 const text='WEBVTT\n\n00:02.000 --> 00:02.100\nInspect resistance cue.\n\n00:04.200 --> 00:04.300\nCheck result.';
 await writeFile(join(out,'clock.vtt'),text);
 const page=await context.newPage();await page.goto(baseURL+'/sequence');
 async function pair(p){
  await p.locator('#clip-file').setInputFiles(clip);
  await p.waitForFunction(()=>!document.querySelector('#narration-file').disabled);
  await p.locator('#narration-moments').evaluate(e=>e.open=true);
  await p.locator('#narration-file').setInputFiles({name:'clock.vtt',mimeType:'text/vtt',buffer:Buffer.from(text)});
  await p.locator('#narration-attribution').fill('Authored software clock control; no physical demonstration claim.');
  await p.waitForFunction(()=>!document.querySelector('#narration-pair').disabled);
 }
 await pair(page);
 await page.locator('#narration-offset').fill('0.2');await page.locator('#narration-pair').click();
 await page.locator('button[data-cue="0"][data-choice="start"]').click();
 assert.equal(Number(await page.locator('#moment-time').inputValue()),2.2);
 checks.push('Maintained constant-offset baseline requests2.2seconds for original transcript cue2seconds.');
 await page.waitForFunction(()=>!document.querySelector('#narration-offset').disabled);
 await page.locator('#narration-offset').fill('0');await page.locator('#narration-clock-enabled').check();
 for(const [id,value] of Object.entries({aT:0,aC:.2,bT:4,bC:4.6,vT:2,vC:2.4,tolerance:.001,basis:'Authored clock landmarks and separate central check; tolerance1ms'}))await page.locator('#narration-clock-'+id).fill(String(value));
 await page.locator('#narration-pair').click();
 assert.match(await page.locator('#narration-clock-report').textContent(),/within declared tolerance/);
 assert.match(await page.locator('#narration-results').textContent(),/extends beyond fitting landmarks/);
 await page.locator('button[data-cue="0"][data-choice="start"]').click();
 assert.ok(Math.abs(Number(await page.locator('#moment-time').inputValue())-2.4)<1e-9);
 checks.push('Declared affine clock changes ordinary preview request to2.4seconds and labels cue extrapolation.');
 await page.locator('#moment-label').fill('Clock-aligned authored frame');
 await page.locator('#moment-state').fill('Authored test pattern; no physical skill claim.');
 await page.waitForFunction(()=>!document.querySelector('#capture-moment').disabled);
 await page.locator('#capture-moment').click();
 await page.waitForFunction(()=>document.querySelector('#moment-count').textContent.includes('1 /'));
 await page.waitForFunction(()=>!document.querySelector('button[data-cue="1"][data-choice="start"]').disabled);
 await page.locator('button[data-cue="1"][data-choice="start"]').click();
 await page.locator('#moment-label').fill('Later authored frame');await page.locator('#moment-state').fill('Later authored test pattern.');
 await page.waitForFunction(()=>!document.querySelector('#capture-moment').disabled);await page.locator('#capture-moment').click();
 await page.waitForFunction(()=>document.querySelector('#moment-count').textContent.includes('2 /'));
 const ids=await page.locator('#step-before option').evaluateAll(es=>es.map(e=>e.value));
 await page.locator('#step-before').selectOption(ids[0]);await page.locator('#step-after').selectOption(ids[1]);
 await page.locator('#step-title').fill('Inspect authored movement');await page.locator('#step-intent').fill('Exercise original-frame custody.');await page.locator('#step-change').fill('Authored test pattern changed.');await page.locator('#save-step').click();
 const[sequenceDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-sequence').click()]);
 const sequenceBytes=await readFile(await sequenceDownload.path()),sequence=JSON.parse(sequenceBytes);
 await writeFile(join(out,'actual-sequence.json'),sequenceBytes);
 const first=sequence.sequence.moments[0];
 assert.ok(Math.abs(first.origin.requestedTimeSeconds-2.4)<1e-9);
 assert.ok(Number.isFinite(first.origin.mediaTimeSeconds));
 assert.equal(first.origin.frameSha256,first.image.sha256);
 assert.equal(hash(Buffer.from(sequence.frames[0].pngBase64,'base64')),first.image.sha256);
 checks.push('Actual studio captures original pixels and separately retains requested/presented frame time and verified PNG hash.');
 await page.screenshot({path:join(out,'accepted-desktop.png'),fullPage:true});
 const[download]=await Promise.all([page.waitForEvent('download'),page.locator('#narration-navigation-save').click()]);
 const saved=await readFile(await download.path()),original=JSON.parse(saved);
 await writeFile(join(out,'navigation.json'),saved);
 assert.equal(original.narration.transcript,text);assert.equal(original.clock.verification.clipSeconds,2.4);
 await page.locator('#narration-clock-vC').fill('3');await page.locator('#narration-pair').click();
 assert.match(await page.locator('#narration-clock-report').textContent(),/Check failed/);
 assert.match(await page.locator('#narration-status').textContent(),/refused/);
 assert.equal(await page.locator('button[data-choice]').count(),0);
 await page.locator('#narration-search').fill('absent text');
 assert.match(await page.locator('#narration-status').textContent(),/refused/);
 await page.locator('#narration-search').fill('');
 checks.push('Failed separate check refuses all previews and stays refused even for an empty search result.');
 await page.locator('#narration-navigation-file').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:saved});
 await page.waitForFunction(()=>document.querySelectorAll('button[data-choice]').length>0);
 const wrong=structuredClone(original);wrong.narration.source.clip.sha256='b'.repeat(64);
 await page.locator('#narration-navigation-file').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(wrong))});
 await page.waitForFunction(()=>document.querySelector('#narration-status').textContent.includes('refused'));
 assert.ok(await page.locator('button[data-choice]').count()>0);
 const invalid=Buffer.concat([Buffer.from('{"bad":"'),Buffer.from([0xff]),Buffer.from('"}')]);
 await page.locator('#narration-navigation-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:invalid});
 await page.waitForFunction(()=>document.querySelector('#narration-status').textContent.includes('refused'));
 assert.ok(await page.locator('button[data-choice]').count()>0);
 checks.push('Saved original navigation reopens; wrong source and malformed UTF8 replacements refuse without erasing accepted choices.');
 const fresh=await context.newPage();await fresh.setViewportSize({width:390,height:844});await fresh.goto(baseURL+'/sequence');
 await fresh.locator('#clip-file').setInputFiles(clip);
 await fresh.waitForFunction(()=>!document.querySelector('#narration-navigation-file').disabled);
 await fresh.locator('#narration-moments').evaluate(e=>e.open=true);
 await fresh.locator('#narration-navigation-file').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:saved});
 await fresh.waitForFunction(()=>document.querySelectorAll('button[data-choice]').length>0);
 const button=fresh.locator('button[data-cue="0"][data-choice="start"]');await button.focus();await fresh.keyboard.press('Enter');
 assert.ok(Math.abs(Number(await fresh.locator('#moment-time').inputValue())-2.4)<1e-9);
 assert.equal(await fresh.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await fresh.screenshot({path:join(out,'accepted-narrow.png'),fullPage:true});
 checks.push('Fresh390px session reopens source declarations and uses keyboard preview with contained layout.');
 await fresh.waitForFunction(()=>!document.querySelector('#narration-navigation-file').disabled);
 await fresh.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(this.name==='delayed.json'){const f=this;return new Promise(resolve=>{window.releaseClockRead=async()=>resolve(await original.call(f));});}return original.call(this);};});
 await fresh.locator('#narration-navigation-file').setInputFiles({name:'delayed.json',mimeType:'application/json',buffer:saved});
 await fresh.waitForFunction(()=>typeof window.releaseClockRead==='function');
 await fresh.locator('#clear-sequence').click();await fresh.locator('#clip-file').setInputFiles(clip);
 await fresh.waitForFunction(()=>!document.querySelector('#narration-file').disabled);
 await fresh.evaluate(async()=>{await window.releaseClockRead();await new Promise(r=>setTimeout(r,0));});
 assert.equal(await fresh.locator('button[data-choice]').count(),0);
 assert.equal(await fresh.locator('#narration-clock-enabled').isChecked(),false);
 assert.equal(await fresh.locator('#narration-navigation-save').isDisabled(),true);
 checks.push('A delayed saved-record read cannot regain authority after a new clip session, even with identical clip bytes.');
 await writeFile(join(out,'source-receiving.json'),JSON.stringify({clipSha256:hash(clipBytes),transcriptSha256:hash(Buffer.from(text)),navigationSha256:hash(saved),sequenceSha256:hash(sequenceBytes),firstOrigin:first.origin,firstImageSha256:first.image.sha256},null,2));

 async function saveFrom(p,selector){
  const [item]=await Promise.all([p.waitForEvent('download'),p.locator(selector).click()]);
  return readFile(await item.path());
 }
 const quotePage=await context.newPage();await quotePage.goto(baseURL+'/timed-narration');
 const sourceFile={name:'actual-original-sequence.json',mimeType:'application/json',buffer:sequenceBytes};
 await quotePage.locator('#source').setInputFiles(sourceFile);
 await quotePage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original sequence frames verified'));
 await quotePage.locator('#transcript').setInputFiles({name:'clock.vtt',mimeType:'text/vtt',buffer:Buffer.from(text)});
 await quotePage.locator('#attribution').fill('Authored original video and supplied narration control.');
 await quotePage.locator('#offset').fill('0');await quotePage.locator('#pair').click();
 assert.equal(await quotePage.locator('#cues input[value="0"]').count(),0);
 await quotePage.locator('#navigation').setInputFiles({name:'studio-navigation.json',mimeType:'application/json',buffer:saved});
 await quotePage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved navigation received'));
 assert.equal(await quotePage.locator('#cues input[value="0"]').count(),1);
 assert.match(await quotePage.locator('#cues').textContent(),/Inspect resistance cue\./);
 assert.equal(await quotePage.locator('#offset').isDisabled(),true);
 assert.match(await quotePage.locator('#clock-summary').textContent(),/Separate check residual/);
 await quotePage.locator('#field').selectOption('sensoryCue');await quotePage.locator('#cues input[value="0"]').check();await quotePage.locator('#select').click();
 const sidecarBytes=await saveFrom(quotePage,'#save'),sidecar=JSON.parse(sidecarBytes);
 const narratedBytes=await saveFrom(quotePage,'#export'),narrated=JSON.parse(narratedBytes);
 await writeFile(join(out,'quotation-sidecar.json'),sidecarBytes);await writeFile(join(out,'narrated-sequence.json'),narratedBytes);
 assert.equal(sidecar.format,'skill-translator.timed-narration/v2');
 assert.deepEqual(sidecar.source,sequence.sequence);assert.equal(sidecar.transcript,text);assert.deepEqual(sidecar.clock,original.clock);
 assert.deepEqual(narrated.sequence.moments,sequence.sequence.moments);assert.deepEqual(narrated.frames,sequence.frames);
 const quote=narrated.sequence.steps[0].sensoryCue;
 assert.match(quote,/Inspect resistance cue\./);assert.match(quote,/2–2.1 s transcript/);assert.match(quote,/declared clock/);
 assert.match(quote,/s clip/);assert.match(quote,/separate check/);
 checks.push('The original video step misses its first utterance under offset0; saved clock navigation restores overlap and explicit quotation retains original source frames, words, times and declarations.');

 const retainedPreview=await quotePage.locator('#preview').textContent();
 const wrongNavigation=structuredClone(original);wrongNavigation.narration.source.clip.sha256='e'.repeat(64);
 const failedNavigation=structuredClone(original);failedNavigation.clock.verification.clipSeconds=3;
 for(const [name,value] of [['wrong-navigation.json',wrongNavigation],['failed-clock.json',failedNavigation],['quotation-in-navigation.json',sidecar]]){
  await quotePage.locator('#navigation').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await quotePage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Import refused'));
  assert.equal(await quotePage.locator('#preview').textContent(),retainedPreview);assert.equal(await quotePage.locator('#save').isDisabled(),false);
 }
 const wrongSidecar=structuredClone(sidecar);wrongSidecar.source.steps[0].intent='Changed original source account';
 for(const [name,value] of [['wrong-source-sidecar.json',wrongSidecar],['future-sidecar.json',{...sidecar,format:'skill-translator.timed-narration/v3'}]]){
  await quotePage.locator('#open').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await quotePage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Import refused'));
  assert.equal(await quotePage.locator('#preview').textContent(),retainedPreview);
 }
 await quotePage.locator('#open').setInputFiles({name:'invalid-sidecar.json',mimeType:'application/json',buffer:invalid});
 await quotePage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Import refused'));
 assert.equal(await quotePage.locator('#preview').textContent(),retainedPreview);
 await page.locator('#narration-navigation-file').setInputFiles({name:'quotation-sidecar.json',mimeType:'application/json',buffer:sidecarBytes});
 await page.waitForFunction(()=>document.querySelector('#narration-status').textContent.includes('refused'));
 assert.ok(await page.locator('button[data-choice]').count()>0);
 checks.push('Wrong clip, failed clock, future format, changed authored source and malformed UTF8 refuse without erasing the accepted quotation; the studio also refuses a quotation-sidecar format instead of losing its clock.');

 await quotePage.locator('#clear-clock').click();
 assert.equal(await quotePage.locator('#offset').isDisabled(),false);
 assert.equal(await quotePage.locator('#save').isDisabled(),true);assert.equal(await quotePage.locator('#export').isDisabled(),true);
 assert.equal(await quotePage.locator('#preview').textContent(),retainedPreview);
 await quotePage.locator('#pair').click();assert.equal(await quotePage.locator('#cues input[value="0"]').count(),0);
 await quotePage.locator('#open').setInputFiles({name:'accepted-sidecar.json',mimeType:'application/json',buffer:sidecarBytes});
 await quotePage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Narration reopened'));
 assert.equal(await quotePage.locator('#preview').textContent(),retainedPreview);
 await quotePage.screenshot({path:join(out,'quotation-desktop.png'),fullPage:true});
 checks.push('Switching to ordinary offset first creates a draft and disables saved output; explicit pairing changes overlap, and exact-source sidecar reopening restores the accepted clock quotation.');

 const narrowQuote=await context.newPage();await narrowQuote.setViewportSize({width:390,height:844});await narrowQuote.goto(baseURL+'/timed-narration');
 await narrowQuote.locator('#source').setInputFiles(sourceFile);
 await narrowQuote.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original sequence frames verified'));
 await narrowQuote.locator('#open').setInputFiles({name:'accepted-sidecar.json',mimeType:'application/json',buffer:sidecarBytes});
 await narrowQuote.waitForFunction(()=>document.querySelector('#status').textContent.includes('Narration reopened'));
 assert.equal(await narrowQuote.locator('#preview').textContent(),retainedPreview);
 const selectedCue=narrowQuote.locator('#cues input[value="0"]');assert.equal(await selectedCue.isChecked(),true);
 await selectedCue.focus();await narrowQuote.keyboard.press('Space');await narrowQuote.keyboard.press('Space');
 await narrowQuote.locator('#select').focus();await narrowQuote.keyboard.press('Enter');
 const reopenedSidecar=JSON.parse(await saveFrom(narrowQuote,'#save'));assert.deepEqual(reopenedSidecar,sidecar);
 const reopenedNarrated=JSON.parse(await saveFrom(narrowQuote,'#export'));assert.deepEqual(reopenedNarrated,narrated);
 assert.equal(await narrowQuote.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await narrowQuote.screenshot({path:join(out,'quotation-narrow.png'),fullPage:true});
 checks.push('Fresh390px quotation receiving recomputes the v2 sidecar, supports keyboard selection and preserves the complete narrated original-frame bundle on export.');

 const studio=await context.newPage();await studio.goto(baseURL+'/sequence');
 await studio.locator('#sequence-file').setInputFiles({name:'narrated-sequence.json',mimeType:'application/json',buffer:narratedBytes});
 await studio.waitForFunction(()=>!document.querySelector('#export-sequence').disabled);
 assert.match(await studio.locator('body').textContent(),/Inspect resistance cue\./);
 const studioBytes=await saveFrom(studio,'#export-sequence'),studioSaved=JSON.parse(studioBytes);
 assert.deepEqual(studioSaved.sequence,narrated.sequence);assert.deepEqual(studioSaved.frames,narrated.frames);
 await writeFile(join(out,'studio-reopened-sequence.json'),studioBytes);
 checks.push('The maintained demonstration studio receives and re-exports the separately narrated sequence with exact original moments, requested/presented times and PNG records.');

 const practice=await context.newPage();await practice.goto(baseURL+'/decision-practice');
 await practice.locator('#sourceFile').setInputFiles({name:'narrated-sequence.json',mimeType:'application/json',buffer:narratedBytes});
 await practice.waitForFunction(()=>!document.querySelector('#exercise').hidden);
 assert.equal(await practice.locator('#account').isVisible(),false);
 assert.doesNotMatch(await practice.locator('#account').textContent(),/Inspect resistance cue/);
 await practice.waitForFunction(()=>{const img=document.querySelector('#beforeImage');return img.complete&&img.naturalWidth>0;});
 const pixelProof=await practice.locator('#beforeImage').evaluate(async(img,originalPng)=>{
  const decoded=await createImageBitmap(new Blob([Uint8Array.from(atob(originalPng),c=>c.charCodeAt(0))],{type:'image/png'}));
  function pixels(source){const canvas=document.createElement('canvas');canvas.width=source.naturalWidth||source.width;canvas.height=source.naturalHeight||source.height;const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0,canvas.width,canvas.height);return Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data);}
  const actual=pixels(img),expected=pixels(decoded);decoded.close();return {actual,expected};
 },sequence.frames[0].pngBase64);
 assert.equal(hash(Buffer.from(pixelProof.actual)),hash(Buffer.from(pixelProof.expected)));
 await practice.locator('#uncertain').check();await practice.locator('#submitPrediction').click();await practice.locator('#reveal').click();
 assert.match(await practice.locator('#account').textContent(),/Inspect resistance cue\./);
 assert.match(await practice.locator('#account').textContent(),/declared clock/);
 assert.match(await practice.locator('#account').textContent(),/2–2.1 s transcript/);
 assert.match(await practice.locator('#assistance').textContent(),/before the interface reveal/);
 const practiceBytes=await saveFrom(practice,'#saveSession');await writeFile(join(out,'practice-session.json'),practiceBytes);
 await practice.screenshot({path:join(out,'practice-revealed.png'),fullPage:true});
 checks.push('Decision practice reproduces the original before-frame pixels, withholds the supplied clock quotation before prediction, then reveals the retained literal account after an explicit uncertainty response.');

 await narrowQuote.evaluate(()=>{const previous=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(this.name==='late-navigation.json'){const file=this;return new Promise(resolve=>{window.releaseQuotationRead=async()=>resolve(await previous.call(file));});}return previous.call(this);};});
 await narrowQuote.locator('#navigation').setInputFiles({name:'late-navigation.json',mimeType:'application/json',buffer:saved});
 await narrowQuote.waitForFunction(()=>typeof window.releaseQuotationRead==='function');
 await narrowQuote.locator('#source').setInputFiles({name:'same-source-new-session.json',mimeType:'application/json',buffer:sequenceBytes});
 await narrowQuote.waitForFunction(()=>document.querySelector('#status').textContent.includes('Original sequence frames verified'));
 await narrowQuote.evaluate(async()=>{await window.releaseQuotationRead();await new Promise(r=>setTimeout(r,0));});
 assert.equal(await narrowQuote.locator('#work').isVisible(),false);
 assert.equal(await narrowQuote.locator('#offset').isDisabled(),false);
 assert.match(await narrowQuote.locator('#clock-summary').textContent(),/ordinary transcript offset/);
 checks.push('A delayed clock-navigation read cannot pair an account after a newer original-source import, even when the source bytes are identical.');

 await writeFile(join(out,'quotation-source-receiving.json'),JSON.stringify({sidecarSha256:hash(sidecarBytes),narratedBundleSha256:hash(narratedBytes),studioBundleSha256:hash(studioBytes),practiceSessionSha256:hash(practiceBytes),practiceBeforeRgbaSha256:hash(Buffer.from(pixelProof.actual)),sourceClip:sequence.sequence.clip,originalMoments:sequence.sequence.moments.map(m=>({id:m.id,image:m.image,origin:m.origin})),quotedText:quote},null,2));
 await quotePage.close();await narrowQuote.close();await studio.close();await practice.close();

 await page.close();await fresh.close();

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
