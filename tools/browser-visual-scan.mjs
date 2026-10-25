// Actual local-video decoding and maintained sequence receiving; authored media.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=resolve(process.env.RECEIPT_DIR||'/tmp/skill-visual-scan-receiving');await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const report={fixture:'Original authored 640×360 image sequence: eight one-second states, encoded at 8 fps. No physical demonstration or learning claim.',tests:[],errors:[],offsite:[],result:'FAIL'};
const record=name=>report.tests.push(name);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let browser;
async function pageAtSequence(){
  const page=await browser.newPage({viewport:{width:1380,height:980}});
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('request',r=>{const u=new URL(r.url());if(['http:','https:','ws:','wss:'].includes(u.protocol)&&u.origin!==origin)report.offsite.push(r.url());});
  await page.goto(origin+'/sequence');return page;
}
async function status(page,part){await page.waitForFunction(text=>document.querySelector('#status').textContent.includes(text),part,{timeout:20000});}
async function scanStatus(page,part){await page.waitForFunction(text=>document.querySelector('#scan-status').textContent.includes(text),part,{timeout:60000});}
async function scan(page,count=8,from=.1,until=7.1){
  await page.locator('#scan-from').fill(String(from));await page.locator('#scan-until').fill(String(until));await page.locator('#scan-count').fill(String(count));
  await page.locator('#scan-start').click();await scanStatus(page,'Scan ready');
}
async function retainSample(page,interval,which,label){
  const button=page.locator(`.scan-interval[data-index="${interval}"] button`).nth(which);
  await button.focus();await page.keyboard.press('Enter');
  await page.locator('#moment-label').fill(label);await page.locator('#capture-moment').click();await status(page,'Retained '+label);
}
try{
  for(let frame=0;frame<8;frame++){
    const pixels=Buffer.alloc(640*360*3);const light=frame>=2?30:0;
    for(let y=0;y<360;y++)for(let x=0;x<640;x++){
      const offset=(y*640+x)*3;let rgb=[40+light,55+light,65+light];
      const left=frame>=3?360:90;
      if(x>=left&&x<left+110&&y>=100&&y<260)rgb=frame>=5?[50+light,160+light,60+light]:[160+light,60+light,50+light];
      for(let c=0;c<3;c++)pixels[offset+c]=rgb[c];
    }
    await writeFile(out+`/frame-${frame}.ppm`,Buffer.concat([Buffer.from('P6\n640 360\n255\n'),pixels]));
  }
  for(const [name,args] of [['authored.webm',['-c:v','libvpx-vp9','-lossless','1']],['other-encoding.mp4',['-c:v','libx264','-pix_fmt','yuv420p']]]){
    const encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','1','-i',out+'/frame-%d.ppm','-vf','fps=8',...args,out+'/'+name],{encoding:'utf8'});
    assert.equal(encoded.status,0,encoded.stderr);
  }
  report.clipSha256=digest(await readFile(out+'/authored.webm'));
  browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--allow-chrome-scheme-url'],executablePath:process.env.CHROME_BINARY||'/usr/bin/google-chrome'});
  report.browser=browser.version();
  const sandboxPage=await browser.newPage();await sandboxPage.goto('chrome://sandbox/');
  report.sandbox=await sandboxPage.locator('body').innerText();
  assert.match(report.sandbox,/Layer 1 Sandbox\s+(Namespace|SUID)/);assert.match(report.sandbox,/PID namespaces\s+Yes/);
  assert.match(report.sandbox,/Network namespaces\s+Yes/);assert.match(report.sandbox,/Seccomp-BPF sandbox\s+Yes/);
  await sandboxPage.close();
  const page=await pageAtSequence();await page.locator('#clip-file').setInputFiles(out+'/authored.webm');await status(page,'Original clip ready');
  await page.locator('#visual-scan summary').click();await scan(page);
  report.intervals=await page.locator('.scan-interval').evaluateAll(items=>items.map(i=>({index:i.dataset.index,state:i.dataset.state,text:i.textContent})));
  assert.equal(await page.locator('.scan-interval').count(),7);assert.equal(await page.locator('.scan-interval[data-state="compared"]').count(),7);
  assert.equal(await page.locator('.moment-card').count(),0);
  const raw=await page.locator('.scan-interval[data-index="1"]').textContent();
  assert.match(raw,/Uniform shift \+30/);assert.ok(Number(raw.match(/adjusted ([\d.]+)/)[1])<1.5);
  assert.match(await page.locator('.scan-interval[data-index="2"]').textContent(),/Uniform shift \+0/);
  await page.locator('#scan-order').selectOption('meanAbsoluteChange');
  assert.equal(await page.locator('.scan-interval').first().getAttribute('data-index'),'1');
  await page.locator('#scan-order').selectOption('meanAdjustedChange');
  assert.equal(await page.locator('.scan-interval').first().getAttribute('data-index'),'2');
  record('actual decoded source distinguishes lighting from moved/color-changed regions; all intervals survive sorting without auto-retaining moments');

  await retainSample(page,2,0,'Before movement');await retainSample(page,2,1,'After movement');
  assert.deepEqual(await page.locator('.moment-card img').evaluateAll(imgs=>imgs.map(i=>[i.naturalWidth,i.naturalHeight])),[[640,360],[640,360]]);
  assert.ok(await page.locator('#scan-preview canvas').evaluate(canvas=>canvas.width<=160&&canvas.height<=160));
  await page.locator('#step-title').fill('Authored movement');await page.locator('#step-intent').fill('Move the declared colored region in this authored image sequence');
  await page.locator('#save-step').click();await status(page,'Authored step saved');
  const pending=page.waitForEvent('download');await page.locator('#export-sequence').click();const download=await pending;await download.saveAs(out+'/sequence.json');
  const saved=JSON.parse(await readFile(out+'/sequence.json','utf8'));
  assert.equal(saved.sequence.clip.sha256,report.clipSha256);
  assert.equal(saved.sequence.moments.length,2);
  for(let i=0;i<2;i++)assert.equal(digest(Buffer.from(saved.frames[i].pngBase64,'base64')),saved.sequence.moments[i].image.sha256);
  record('keyboard-selected scan candidates pass through full-resolution original capture, authored step and byte-bound saved sequence');

  const fresh=await pageAtSequence();await fresh.locator('#sequence-file').setInputFiles(out+'/sequence.json');await status(fresh,'Reopened 2 verified');
  assert.deepEqual(await fresh.locator('.moment-card img').evaluateAll(imgs=>imgs.map(i=>[i.naturalWidth,i.naturalHeight])),[[640,360],[640,360]]);
  assert.equal(await fresh.locator('#step-detail h3').textContent(),'Authored movement');
  record('fresh maintained sequence consumer reopens original frames and supplied account without scan thumbnails replacing evidence');

  const kept=await page.locator('#source-identity').textContent(),previousSummary=await page.locator('#scan-summary').textContent();
  await page.locator('#scan-count').fill('64');await page.locator('#scan-start').click();await page.locator('#scan-cancel').click();
  await scanStatus(page,'Scan cancelled');assert.equal(await page.locator('#source-identity').textContent(),kept);
  assert.equal(await page.locator('#scan-summary').textContent(),previousSummary);assert.equal(await page.locator('#scan-progress').isVisible(),false);
  assert.equal(await page.locator('#scan-start').isEnabled(),true);
  record('cancellation restores controls and preserves retained source plus the earlier completed scan');

  await page.locator('#scan-start').click();await page.locator('#clip-file').setInputFiles(out+'/other-encoding.mp4');await status(page,'does not match the original demonstration');
  assert.equal(await page.locator('#source-identity').textContent(),kept);assert.equal(await page.locator('#scan-progress').isVisible(),false);
  assert.equal(await page.locator('#scan-start').isEnabled(),true);
  record('replacement cancels an in-flight scan; a wrong clip cannot replace accepted source or leave controls busy');

  await page.locator('#scan-until').fill('10');await page.locator('#scan-start').click();await scanStatus(page,'not including');
  assert.equal(await page.locator('#scan-summary').textContent(),previousSummary);
  record('invalid scan range preserves existing results and source');

  // The actual video emits its ordinary error event during the third sample.
  await page.evaluate(()=>{const video=document.querySelector('#video-host video'),original=video.requestVideoFrameCallback;let calls=0;
    window.__restoreScanCallback=()=>{video.requestVideoFrameCallback=original;};
    video.requestVideoFrameCallback=function(callback){const result=original.call(this,callback);if(++calls===3)queueMicrotask(()=>this.dispatchEvent(new Event('error')));return result;};});
  await page.locator('#scan-until').fill('7.1');await page.locator('#scan-count').fill('8');await page.locator('#scan-start').click();await scanStatus(page,'decoder failure');
  await page.evaluate(()=>window.__restoreScanCallback());
  assert.equal(await page.locator('.scan-interval').count(),7);assert.ok(await page.locator('.scan-interval[data-state="missing-frame"]').count()>0);
  assert.equal(await page.locator('#source-identity').textContent(),kept);assert.equal(await page.locator('#scan-start').isEnabled(),true);
  record('actual decoder error lifecycle retains complete missing-interval account without bridging or altering original moments');

  await scan(page);await page.screenshot({path:out+'/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:out+'/mobile.png',fullPage:true});
  await page.locator('#visual-scan').screenshot({path:out+'/scan-panel-mobile.png'});
  record('desktop and 390px sequence receiving with bounded interval scroll and no horizontal overflow');
  await page.locator('#clear-sequence').click();assert.equal(await page.locator('#scan-results').isVisible(),false);assert.equal(await page.locator('.moment-card').count(),0);
  await page.locator('#clip-file').setInputFiles(out+'/other-encoding.mp4');await status(page,'Original clip ready');await scan(page);
  assert.equal(await page.locator('.moment-card').count(),0);record('clearing/new source discards old scan and the new clip can be scanned independently');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);record('no page exceptions or offsite requests in actual local consumer');
  report.result='PASS';
}finally{
  await writeFile(out+'/browser-receipt.json',JSON.stringify(report,null,2)+'\n');
  await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(report,null,2));
}
