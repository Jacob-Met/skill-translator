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
