import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import {createAppServer} from '../server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'playwright');
const out=process.env.QA_DIR||'docs/receipts/interval-playback-f6b2';await mkdir(out,{recursive:true});
const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',chromiumSandbox:true});
const page=await browser.newPage({viewport:{width:1120,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
const base='http://127.0.0.1:'+server.address().port;
const poll=async(fn,arg)=>{const deadline=Date.now()+20000;while(Date.now()<deadline){if(await page.evaluate(fn,arg))return;await pause(40);}throw Error('Browser interval condition timed out.');};
const upload=async(selector,value,name='input.json')=>page.locator(selector).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
const panel=side=>'#clip-playback [data-side="'+side+'"]';
async function save(){const event=page.waitForEvent('download');await page.locator('#save').click();const stream=await(await event).createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);return JSON.parse(Buffer.concat(chunks).toString());}
try{
 await page.goto('chrome://sandbox');const sandbox=await page.locator('body').innerText();assert.match(sandbox,/adequately sandboxed/i);await writeFile(out+'/sandbox.txt',sandbox);
 await page.goto(base+'/path-timing');
 const frames=await page.evaluate(()=>Array.from({length:4},(_,i)=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const c=canvas.getContext('2d');c.fillStyle='#eee1c1';c.fillRect(0,0,640,360);c.fillStyle='#264736';c.font='20px sans-serif';c.fillText('AUTHORED INTERVAL CONTROL '+i,50,70);c.fillStyle=i<2?'#e02020':'#2030df';c.fillRect(90+i*90,150,28,28);return canvas.toDataURL('image/png').split(',')[1];}));
 for(const[i,data]of frames.entries())await writeFile(out+'/frame-'+i+'.png',Buffer.from(data,'base64'));
 for(const [name,fps]of [['first',2],['second',1]]){const encodedResult=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',out+'/frame-%d.png','-c:v','libvpx-vp9','-pix_fmt','yuv420p','-r',String(fps),out+'/'+name+'.webm'],{encoding:'utf8'});assert.equal(encodedResult.status,0,encodedResult.stderr||encodedResult.error?.message);}
 const firstBytes=await readFile(out+'/first.webm'),secondBytes=await readFile(out+'/second.webm');
 const produced=await page.evaluate(async encoded=>{
  const {loadLocalVideo,releaseVideo,capturePresentedFrame}=await import('/web/video-input.mjs');
  const {loadLocalImage}=await import('/web/image-input.mjs');
  const {createSequence,appendMoment,attachMomentCalibration}=await import('/src/demonstration-sequence.mjs');
  const {frameOrigin}=await import('/src/frame-origin.mjs');
  const {createCapture,appendCaptureMark}=await import('/src/capture.mjs');
  const {createSequencePath}=await import('/src/sequence-path.mjs');
  const {makeSampledPathBundle}=await import('/web/sampled-path-input.mjs');
  const {releaseSequenceAssets}=await import('/web/sequence-input.mjs');
  const results=[];
  for(let side=0;side<2;side++){
   const bytes=Uint8Array.from(atob(encoded[side]),char=>char.charCodeAt(0)),file=new File([bytes],side?'second.webm':'first.webm',{type:'video/webm'});
   const clip=await loadLocalVideo(file),assets=new Map();clip.video.width=320;document.body.append(clip.video);
   try{
    let sequence=createSequence(clip.identity,{title:side?'Second authored timing clip':'First authored timing clip',context:'Generated timing controls, not measured physical work.'});
    const requested=side?[.1,1.1,3.1]:[.1,.6,1.6];
    for(let i=0;i<requested.length;i++){
     const captured=await capturePresentedFrame(clip,requested[i]),media=await loadLocalImage(captured.file),id='moment-'+i;
     assets.set(id,{file:captured.file,media});
     const origin=frameOrigin(clip.identity,captured.requestedTimeSeconds,captured.metadata,media.image);
     sequence=appendMoment(sequence,{id,label:'Frame '+i,visibleState:'Original generated frame; correspondence is authored.',image:media.image,origin});
     const w=media.image.widthPx,h=media.image.heightPx,corners=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
     let task=createCapture(media.image,corners,100,100,{origin,provenance:'Authored planar annotation of an original generated control clip.'});
     task=appendCaptureMark(task,{label:'Authored moving point',sourcePx:{x:[104,194,374][i],y:164},kind:'fraction',toleranceMm:1});
     sequence=attachMomentCalibration(sequence,id,task);
    }
    const path=createSequencePath(sequence,{label:'Authored matched point',reference:{samePlaneAndCorners:true,label:'Generated canvas plane',basis:'Fixed authored canvas and corner meanings.'},samples:sequence.moments.map(m=>({momentId:m.id,markId:'authored-1',basis:'Explicit authored correspondence, not automatic tracking.'}))});
    const bundle=JSON.parse(await(await makeSampledPathBundle(path,assets)).text());results.push(bundle);
   }finally{releaseSequenceAssets(assets);releaseVideo(clip);}
  }return results;
 },[firstBytes.toString('base64'),secondBytes.toString('base64')]);
 await page.goto(base+'/sampled-path');
 const originalBundles=[];
 for(const bundle of produced){await upload('#input',bundle);await poll(title=>!document.querySelector('#result').hidden&&document.querySelector('#source-name').textContent===title,bundle.sourceBundle.sequence.title);originalBundles.push(await save());}
 await page.locator('a[href="/path-timing"]').click();
 await upload('#left-file',originalBundles[0]);await poll(()=>document.querySelector('#sources').textContent.includes('First authored timing clip'));
 await upload('#right-file',originalBundles[1]);await poll(()=>!document.querySelector('#match-fields').disabled);
 for(let i=0;i<2;i++){await page.locator('#label').fill('Authored phase '+(i+1));await page.locator('#basis').fill('Same generated visual progression at two encoded rates.');await page.locator('#left-from').selectOption('moment-'+i);await page.locator('#right-from').selectOption('moment-'+i);await page.locator('#left-to').selectOption('moment-'+(i+1));await page.locator('#right-to').selectOption('moment-'+(i+1));await page.locator('#match-form button').click();}
 assert.equal(await page.locator('#results article').count(),2);assert.match(await page.locator('#results').innerText(),/elapsed time: 2×/);
 const beforeViewing=await save();assert.equal(await page.locator('#clip-playback').isVisible(),true);
 await page.locator(panel('left')+' input').setInputFiles({name:'renamed-original.webm',mimeType:'video/webm',buffer:firstBytes});
 await page.locator(panel('right')+' input').setInputFiles({name:'second.webm',mimeType:'video/webm',buffer:secondBytes});
 await poll(()=>[...document.querySelectorAll('#clip-playback .clip-status')].every(e=>e.textContent.startsWith('Exact original clip paired.')));
 const acceptedSrc=await page.locator(panel('left')+' video').getAttribute('src');
 await page.locator(panel('left')+' input').setInputFiles({name:'wrong.webm',mimeType:'video/webm',buffer:secondBytes});await poll(()=>document.querySelector('#clip-playback [data-side="left"] .clip-status').textContent.startsWith('Clip refused:'));
 assert.equal(await page.locator(panel('left')+' video').getAttribute('src'),acceptedSrc);
 await page.locator(panel('left')).getByRole('button',{name:'Play selected interval at 1×'}).click();
 await poll(()=>document.querySelector('#clip-playback [data-side="left"] .clip-status').textContent.startsWith('Stopped:'));
 const actualReport=await page.locator(panel('left')+' .clip-status').innerText();assert.match(actualReport,/First .*last .*Start offset .*end offset/);assert.equal(await page.locator(panel('left')+' video').evaluate(video=>video.paused),true);
 await page.locator('#clip-playback select').selectOption('1');await page.locator(panel('right')).getByRole('button',{name:'Play selected interval at 1×'}).click();
 await poll(()=>document.querySelector('#clip-playback [data-side="right"] .clip-status').textContent.startsWith('Presented '));
 await page.locator('#clip-playback select').selectOption('0');assert.equal(await page.locator(panel('right')+' video').evaluate(video=>video.paused),true);await pause(650);assert.match(await page.locator(panel('right')+' .clip-status').innerText(),/Selected interval changed/);
 await page.locator(panel('left')+' video').evaluate(video=>video.play());await poll(()=>document.querySelector('#clip-playback [data-side="left"] .clip-status').textContent.startsWith('Native controls'));await page.locator(panel('left')).getByRole('button',{name:'Stop interval',exact:true}).click();
 assert.deepEqual(await save(),beforeViewing);
 await page.locator('#clip-playback').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/narrow.png',fullPage:true});
 await page.evaluate(()=>{
  const digest=crypto.subtle.digest.bind(crypto.subtle),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  window.pendingClipUrls=[];window.retiredClipUrls=[];URL.createObjectURL=value=>{const url=create(value);window.pendingClipUrls.push(url);return url;};URL.revokeObjectURL=url=>{window.retiredClipUrls.push(url);return revoke(url);};
  crypto.subtle.digest=(algorithm,data)=>new Promise((resolve,reject)=>{window.releaseClipDigest=()=>digest(algorithm,data).then(resolve,reject);});
 });
 await page.locator(panel('left')+' input').setInputFiles({name:'delayed-original.webm',mimeType:'video/webm',buffer:firstBytes});await poll(()=>typeof window.releaseClipDigest==='function');
 await page.locator('#remove').click();await page.locator('#remove').click();assert.equal(await page.locator('#clip-playback').isVisible(),false);
 await page.evaluate(()=>window.releaseClipDigest());await poll(()=>window.pendingClipUrls.length>0&&window.pendingClipUrls.every(url=>window.retiredClipUrls.includes(url)));
 assert.equal(await page.locator('#clip-playback video').count(),0);assert.equal(await page.locator('#results article').count(),0);
 assert.deepEqual(errors,[]);
 const receipt={source:process.env.SOURCE_SHA||'uncommitted receiving tree',browser:browser.version(),groups:9,passed:true,coverage:['maintained-frame-capture-and-path-producer','actual-timing-comparison','exact-clip-rename','wrong-clip-preserves-accepted','native-rate-presented-offsets','interval-change-retires-playback','native-controls-distinct','viewing-preserves-export','stale-digest-closes-source-and-mobile'],actualReport,firstClip:originalBundles[0].sourceBundle.sequence.clip,secondClip:originalBundles[1].sourceBundle.sequence.clip,pageErrors:errors};
 await writeFile(out+'/browser.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
