import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const runtime=resolve(process.argv[2]),out=resolve(process.argv[3]);
await mkdir(out,{recursive:false});
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_PATH));
const {createAppServer}=await import(pathToFileURL(join(runtime,'server.mjs')));
const {requireChromiumSandbox}=await import(pathToFileURL(join(runtime,'tools/support/chromium-sandbox.mjs')));
const {validateSequence}=await import(pathToFileURL(join(runtime,'src/demonstration-sequence.mjs')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const server=createAppServer();await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
const base='http://127.0.0.1:'+server.address().port;
const report={kind:'authored geometric example, not a physical craft demonstration or learning study',sourceCommit:spawnSync('git',['-C',runtime,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()||null,sourceDirty:Boolean(spawnSync('git',['-C',runtime,'status','--porcelain'],{encoding:'utf8'}).stdout.trim()),checks:[],errors:[],offsite:[]};
let browser;
const fill=(p,id,value)=>p.locator(id).fill(value);
const waitStatus=(p,s)=>p.waitForFunction(s=>document.getElementById('status').textContent.includes(s),s);
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,headless:true,chromiumSandbox:true,args:['--no-first-run','--disable-extensions','--no-default-browser-check']});
 const page=await browser.newPage({viewport:{width:1280,height:920},acceptDownloads:true});
 const cdp=await page.context().newCDPSession(page);
 report.sandbox=await requireChromiumSandbox({send:(m,a)=>cdp.send(m,a)});await cdp.detach();
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base+'/'))report.offsite.push(r.url())});
 await page.goto(base+'/sequence',{waitUntil:'networkidle'});
 const frames=await page.evaluate(()=>{
  return [0,1,2].map(state=>{
   const c=document.createElement('canvas');c.width=920;c.height=520;
   const x=c.getContext('2d');
   function text(t,px,py,size=18,color='#243442',weight='400'){x.font=weight+' '+size+'px sans-serif';x.fillStyle=color;x.fillText(t,px,py);}
   function line(ax,ay,bx,by,color,width=2){x.strokeStyle=color;x.lineWidth=width;x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();}
   function paper(px,py,w,h,marker,tilt=0){
    x.save();x.translate(px,py);x.rotate(tilt);
    x.shadowColor='#20304424';x.shadowBlur=12;x.shadowOffsetY=5;
    x.fillStyle='#fffdf5';x.fillRect(0,0,w,h);x.shadowColor='transparent';
    x.strokeStyle='#4d5961';x.lineWidth=1.5;x.strokeRect(0,0,w,h);
    if(marker){line(0,60,15,60,'#be6239',2);x.fillStyle='#be6239';x.beginPath();x.arc(15,60,5,0,Math.PI*2);x.fill();line(15,46,15,74,'#be6239',1);text('10 mm',24,66,15,'#a34622','600');}
    x.restore();
   }
   x.fillStyle='#eef0eb';x.fillRect(0,0,920,520);
   text('SKILL TRANSLATOR',28,34,15,'#336068','700');
   text('Paper registration / authored diagram',28,72,27,'#20383e','600');
   x.fillStyle='#dce4de';x.fillRect(28,104,270,330);x.fillStyle='#e2e6df';x.fillRect(322,104,570,330);
   text('ORIGINAL REFERENCE',48,135,13,'#42616a','700');
   text('100 × 80 mm',48,162,20,'#243442','600');
   text('WIDER WORKPIECE',344,135,13,'#42616a','700');
   text('200 × 80 mm',344,162,20,'#243442','600');
   x.fillStyle='#2b737c';x.fillRect(74,192,8,136);x.fillRect(74,192,166,8);
   x.fillRect(390,192,8,136);x.fillRect(390,192,316,8);
   paper(82,200,150,120,true);
   if(state===0)paper(440,224,300,120,false,.055);
   else paper(398,200,300,120,state===2);
   text('Supplied mark: 10 mm from the left edge.',48,370,14,'#3d5157');
   text('Dimensions and purpose are authored.',48,395,14,'#3d5157');
   const caption=['Inspect the reference edges before marking.','The sheet is aligned; consider the mark next.','Inspect the authored placement on the wider sheet.'][state];
   text(caption,344,370,15,'#3d5157');
   text('Blue = registration guide     Orange = supplied mark',344,395,14,'#3d5157');
   line(28,452,892,452,'#bacac3',1);
   text('AUTHORED EXAMPLE',28,480,13,'#336068','700');
   text('A diagram of visible states. No hand, force, contact or expertise is measured.',204,480,14,'#506267');
   return c.toDataURL('image/png').split(',')[1];
  });
 });
 for(let i=0;i<12;i++)await writeFile(join(out,'frame-'+i+'.png'),Buffer.from(frames[Math.floor(i/4)],'base64'));
 const video=join(out,'decision-registration-authored.webm');
 const enc=spawnSync(process.env.FFMPEG_BINARY||'/usr/bin/ffmpeg',['-y','-loglevel','error','-framerate','4','-i',join(out,'frame-%d.png'),'-c:v','libvpx-vp9','-lossless','1','-pix_fmt','yuv420p',video],{encoding:'utf8',timeout:30000});
 assert.equal(enc.status,0,enc.stderr);
 await fill(page,'#sequence-title','Paper registration — an authored two-decision example');
 await fill(page,'#sequence-context','Authored paper-registration diagrams. The dimensions and decisions are supplied examples, not observations of a craftsperson. Compare the visible states and keep your own reasoning.');
 await page.locator('#clip-file').setInputFiles(video);await waitStatus(page,'Original clip ready');
 const labels=['A wider sheet approaches the guide','The wider sheet is aligned','The mark appears on the wider sheet'];
 const states=['The original reference has a supplied mark 10 authored millimetres from its left edge. The wider sheet is visibly offset and rotated relative to the blue guide.','The wider sheet now meets the depicted left and top guide. It has no orange mark yet. The original reference remains unchanged.','The wider sheet now has an orange mark 10 authored millimetres from its left edge. Its width is twice the reference width; the supplied left clearance is unchanged.'];
 for(const [i,time]of [.25,1.25,2.25].entries()){
  await fill(page,'#moment-time',String(time));await fill(page,'#moment-label',labels[i]);await fill(page,'#moment-state',states[i]);
  await page.locator('#capture-moment').click();await waitStatus(page,'Retained '+labels[i]);
 }
 const ids=await page.locator('#step-before option').evaluateAll(els=>els.map(e=>e.value).filter(Boolean));
 assert.equal(ids.length,3);
 const steps=[
  {title:'Establish the reference before making a mark',intent:'Use the same depicted left and top reference before considering a mark on a differently sized sheet.',change:'The wider sheet moves from its offset, rotated position to the depicted left and top guides. No mark is added during this step.',recovery:'The drawing does not show whether a physical sheet is held or touching a stop. Those details would need the original demonstrator\'s account; do not infer them from the aligned diagram.'},
  {title:'Decide what the mark should preserve',intent:'In this authored example, retain a 10 mm clearance from the left reference edge when the sheet width changes; do not scale that clearance with the width.',change:'An orange mark appears at the same supplied left clearance as in the reference. The reference width is 100 mm and the new width is 200 mm.',recovery:'If the purpose or reference edge is different, the same visible source could support another relationship. Ask the author which relationship matters before treating this example as a rule for another task.'}
 ];
 for(const[i,s]of steps.entries()){
  await page.locator('#step-before').selectOption(ids[i]);await page.locator('#step-after').selectOption(ids[i+1]);
  await fill(page,'#step-title',s.title);await fill(page,'#step-intent',s.intent);await fill(page,'#step-change',s.change);await fill(page,'#step-sensory','');await fill(page,'#step-recovery',s.recovery);
  await page.locator('#save-step').click();await waitStatus(page,'Authored step saved');
 }
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-sequence').click()]);
 const bundlePath=join(out,'decision-registration.json');await download.saveAs(bundlePath);
 const bundleBytes=await readFile(bundlePath),bundle=JSON.parse(bundleBytes),sequence=validateSequence(bundle.sequence),videoBytes=await readFile(video);
 assert.equal(sequence.clip.sha256,sha(videoBytes));assert.equal(sequence.clip.sizeBytes,videoBytes.length);assert.equal(sequence.moments.length,3);assert.equal(sequence.steps.length,2);
 for(const m of sequence.moments){const f=bundle.frames.find(f=>f.momentId===m.id);assert.equal(sha(Buffer.from(f.pngBase64,'base64')),m.image.sha256);assert.equal(m.origin.timing,'requestVideoFrameCallback');}
 report.clip={file:video,bytes:videoBytes.length,sha256:sha(videoBytes),duration:sequence.clip.durationSeconds};report.bundle={file:bundlePath,bytes:bundleBytes.length,sha256:sha(bundleBytes)};report.timing=sequence.moments.map(m=>({id:m.id,requested:m.origin.requestedTimeSeconds,presented:m.origin.mediaTimeSeconds,sha256:m.image.sha256}));
 report.checks.push('Actual generated WebM received, timed and exported through unchanged Demonstration studio; every retained PNG hash matches.');
 await page.goto(base+'/decision-practice',{waitUntil:'networkidle'});await page.locator('#sourceFile').setInputFiles(bundlePath);await waitStatus(page,'Retained source frames verified');
 assert.equal(await page.locator('#afterFigure').isVisible(),false);
 assert.equal(await page.locator('#afterImage').getAttribute('src'),null);
 await page.locator('#stepTitle').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'practice-before.png'),fullPage:false});
 await fill(page,'#expectedChange','I expect the wider sheet to align with the same left and top reference.');await fill(page,'#decisionCue','Inspect both visible reference edges.');await fill(page,'#recovery','The picture cannot tell me whether the sheet is held.');
 await page.locator('#submitPrediction').click();await page.locator('#reveal').click();
 assert.match(await page.locator('#account').innerText(),/Not supplied by the author/);
 await page.locator('#comparison').selectOption('consistent');await fill(page,'#reflection','My visible-state prediction matches this authored account; physical contact is still unknown.');await page.locator('#saveReflection').click();await page.locator('#advance').click();
 assert.equal(await page.locator('#afterFigure').isVisible(),false);
 await page.locator('#stepTitle').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'second-decision-before.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('#stepTitle').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'practice-mobile.png')});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 report.checks.push('Unchanged Decision practice imports example, hides later evidence, retains prediction/reveal/comparison and advances to the second decision; 390px no overflow.');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);
 report.result='PASS';console.log(JSON.stringify(report,null,2));
}finally{
 await writeFile(join(out,'generation-receipt.json'),JSON.stringify(report,null,2)+'\n');
 if(browser)await browser.close();await new Promise(ok=>server.close(ok));
}
