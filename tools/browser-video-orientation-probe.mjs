/** Bounded actual-decoder discriminator for encoded and displayed dimensions.
 * Authored software controls only: no physical demonstration or skill claim.
 * Generates one small H.264 raster and two stream-copy display-matrix variants.
 * Uses the maintained browser decoder and frameOrigin contract without UI
 * choreography or production changes. A difference between PNG and callback
 * dimensions is reported as an observed domain difference, not itself a bug.
 * Reuses the maintained video-browser-smoke authored-input/pixel/hash/origin
 * checks, scoped to the exact decoder dependency closure on a test page.
 * PLAYWRIGHT_MODULE, CHROME_BINARY, QA_OUTPUT, SOURCE_ROOT, FFMPEG_BINARY,
 * FFPROBE_BINARY. Sequential FFmpeg jobs use one thread and 30s process limits.
 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {requireChromiumSandbox} from './support/chromium-sandbox.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve(process.env.QA_OUTPUT||'video-orientation-probe');await mkdir(out,{recursive:true});
const sourceRoot=resolve(process.env.SOURCE_ROOT||fileURLToPath(new URL('..',import.meta.url)));
const ffmpeg=process.env.FFMPEG_BINARY||'ffmpeg',ffprobe=process.env.FFPROBE_BINARY||'ffprobe';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={course:'actual-video-orientation-discriminator',completed:false,
 evidence:'Authored asymmetric static raster controls, actual browser decoder on an isolated test page, independent FFmpeg orientation reference; not a physical skill study or full application/UI receiving. Static pixels qualify orientation, not independent timestamp accuracy.',
 commands:[],cases:[],errors:[],offsite:[],badResponses:[]};
function run(program,args,{binary=false}={}){
 report.commands.push({program,args});
 const result=spawnSync(program,args,{encoding:binary?undefined:'utf8',timeout:30000,maxBuffer:8*1024*1024});
 if(result.error||result.status!==0)throw Error('Control-generation command failed: '+program+' '+(result.error?.message||String(result.stderr).slice(-2000)));
 return result.stdout;
}
const ffargs=['-hide_banner','-loglevel','error','-nostdin','-threads','1','-filter_threads','1'];
function parsePPM(bytes){
 const match=/^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(bytes.subarray(0,100).toString('ascii'));
 assert(match,'FFmpeg must return an ordinary P6 RGB reference');
 const width=Number(match[1]),height=Number(match[2]),rgb=bytes.subarray(Buffer.byteLength(match[0]));
 assert.equal(rgb.length,width*height*3);return {width,height,rgb};
}
function markers(bytes,width,height,channels){
 const found=Object.fromEntries(['red','green','blue','yellow'].map(name=>[name,{count:0,xSum:0,ySum:0,minX:width,minY:height,maxX:-1,maxY:-1}]));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*channels,r=bytes[i],g=bytes[i+1],b=bytes[i+2];
  const name=r>150&&g<100&&b<100?'red':g>140&&r<110&&b<130?'green':b>150&&r<110&&g<140?'blue':r>150&&g>150&&b<110?'yellow':null;
  if(!name)continue;const p=found[name];p.count++;p.xSum+=x+.5;p.ySum+=y+.5;p.minX=Math.min(p.minX,x);p.maxX=Math.max(p.maxX,x);p.minY=Math.min(p.minY,y);p.maxY=Math.max(p.maxY,y);
 }
 return Object.fromEntries(Object.entries(found).map(([name,p])=>[name,{count:p.count,center:p.count?[p.xSum/p.count,p.ySum/p.count]:null,bounds:[p.minX,p.minY,p.maxX,p.maxY]}]));
}
function compareMarkers(observed,width,height,reference,referenceWidth,referenceHeight){
 const result={};
 for(const name of ['red','green','blue','yellow']){
  const a=observed[name],b=reference[name];assert(a.count>=30&&b.count>=100,name+' marker must be independently visible');
  const expected=[b.center[0]*width/referenceWidth,b.center[1]*height/referenceHeight];
  const errorPixels=Math.hypot(a.center[0]-expected[0],a.center[1]-expected[1]);
  result[name]={observed:a.center,expected,errorPixels};assert(errorPixels<2,name+' orientation marker disagrees with the independent FFmpeg display reference');
 }
 return result;
}
let browser,server,url;
try{
 report.ffmpegVersion=run(ffmpeg,['-version']).split('\n')[0];report.ffprobeVersion=run(ffprobe,['-version']).split('\n')[0];
 report.sourceRoot=sourceRoot;report.sourceHashes={};const modules=new Map();
 for(const name of ['web/video-input.mjs','src/frame-origin.mjs','src/capture.mjs','src/visual-scan.mjs','src/authoring.mjs','src/geometry.mjs']){
  const bytes=await readFile(join(sourceRoot,name));report.sourceHashes[name]=digest(bytes);modules.set('/'+name,bytes);
 }
 report.harnessHashes={probe:digest(await readFile(fileURLToPath(import.meta.url))),sandboxHelper:digest(await readFile(new URL('./support/chromium-sandbox.mjs',import.meta.url)))};
 const width=320,height=192,rgb=Buffer.alloc(width*height*3,218);
 const rectangles=[['red',20,18,60,30,[230,20,25]],['green',228,28,44,56,[20,220,30]],['blue',38,130,82,38,[20,35,230]],['yellow',242,132,46,28,[230,220,20]]];
 for(const [,x,y,w,h,color] of rectangles)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)for(let c=0;c<3;c++)rgb[(yy*width+xx)*3+c]=color[c];
 const authored=join(out,'authored-asymmetric.ppm');await writeFile(authored,Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`),rgb]));
 report.authoredRaster={width,height,rectangles,sha256:digest(await readFile(authored))};
 const base=join(out,'no-rotation.mp4');
 run(ffmpeg,[...ffargs,'-y','-loop','1','-framerate','8','-i',authored,'-t','2','-an','-vf','setsar=1','-c:v','libx264','-threads','1','-preset','veryfast','-crf','10','-pix_fmt','yuv420p','-movflags','+faststart',base]);
 const controls=[{name:'no-rotation',path:base,declaredRotation:0}];
 for(const rotation of [90,270]){
  const path=join(out,`display-${rotation}.mp4`);
  // The receiving FFmpeg 6.1.1 advertises input-side display_rotation; its
  // legacy rotate metadata option emitted no matrix. Preserve encoded pixels
  // by disabling autorotation and stream-copying, then verify the real matrix.
  run(ffmpeg,[...ffargs,'-y','-display_rotation:v:0',String(rotation),'-noautorotate','-i',base,'-map','0:v:0','-c:v','copy','-movflags','+faststart',path]);
  controls.push({name:'display-'+rotation,path,declaredRotation:rotation});
 }
 for(const control of controls){
  const bytes=await readFile(control.path);control.fileSha256=digest(bytes);control.sizeBytes=bytes.length;
  control.ffprobe=JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,sample_aspect_ratio:stream_side_data','-of','json',control.path]));
  const stream=control.ffprobe.streams?.[0];assert.equal(stream?.codec_name,'h264');assert.equal(stream.width,width);assert.equal(stream.height,height);assert.equal(stream.sample_aspect_ratio,'1:1');
  const matrix=stream.side_data_list?.find(item=>item.side_data_type==='Display Matrix');control.observedRotation=matrix?.rotation??0;
  const normalizedRotation=((control.observedRotation%360)+360)%360;
  assert(control.declaredRotation?[90,270].includes(normalizedRotation):normalizedRotation===0,'Container must carry a real quarter-turn display matrix or the unrotated control');
  if(control.declaredRotation)assert(matrix?.displaymatrix,'Rotated controls require an actual display matrix, not a filename assertion');
  control.encodedPayloadSha256=digest(run(ffmpeg,[...ffargs,'-i',control.path,'-map','0:v:0','-c:v','copy','-f','h264','pipe:1'],{binary:true}));
  const ppm=run(ffmpeg,[...ffargs,'-ss','0.5','-i',control.path,'-frames:v','1','-c:v','ppm','-threads','1','-f','image2pipe','-pix_fmt','rgb24','pipe:1'],{binary:true});
  const reference=parsePPM(ppm);await writeFile(join(out,control.name+'-ffmpeg-reference.ppm'),ppm);
  control.reference={width:reference.width,height:reference.height,markers:markers(reference.rgb,reference.width,reference.height,3),sha256:digest(ppm)};
  assert.deepEqual([reference.width,reference.height],control.declaredRotation?[height,width]:[width,height]);
 }
 assert(controls.every(c=>c.encodedPayloadSha256===controls[0].encodedPayloadSha256),'Display-matrix controls must retain the exact same compressed video payload');
 assert.deepEqual(controls.map(c=>((c.observedRotation%360)+360)%360).sort((a,b)=>a-b),[0,90,270],'Both distinct quarter-turn matrix orientations must actually be present');
 assert.equal(new Set(controls.map(c=>c.fileSha256)).size,3,'Container fingerprints must distinguish all three originals');
 report.controls=controls;
 // Serve only the exact cached dependency bytes above. This small receiving
 // page is deliberately not the application's calibration/sequence UI.
 server=http.createServer((request,response)=>{
  response.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'");
  response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return;}
  const pathname=new URL(request.url,'http://localhost').pathname;
  if(pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
  const bytes=pathname==='/'?Buffer.from('<!doctype html><meta charset="utf-8"><title>Authored video orientation decoder probe</title><h1>Decoder test page</h1><p>Authored software controls; not the application workflow.</p>'):modules.get(pathname);
  if(!bytes){response.writeHead(404);response.end();return;}
  response.setHeader('Content-Type',pathname==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');response.setHeader('Content-Length',bytes.length);
  response.writeHead(200);response.end(request.method==='HEAD'?undefined:bytes);
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});url=`http://127.0.0.1:${server.address().port}`;
 report.url=url;
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,headless:true,chromiumSandbox:true,timeout:45000,args:['--no-first-run']});report.browser=await browser.version();
 const context=await browser.newContext();
 const sandboxPage=await context.newPage(),cdp=await context.newCDPSession(sandboxPage);
 try{report.sandbox=await requireChromiumSandbox({send:(method,args)=>cdp.send(method,args)});}catch(error){report.sandbox=error.receipt;throw error;}finally{await cdp.detach();await sandboxPage.close();}
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)report.badResponses.push({url:r.url(),status:r.status()});});
 page.on('request',r=>{const u=new URL(r.url());if(['http:','https:','ws:','wss:'].includes(u.protocol)&&u.origin!==new URL(url).origin)report.offsite.push(r.url());});
 await page.goto(url+'/',{waitUntil:'networkidle'});
 for(const control of controls){
  const result={name:control.name};report.cases.push(result);
  try{
   const observed=await page.evaluate(async input=>{
    const {loadLocalVideo,capturePresentedFrame,samplePresentedFrame,releaseVideo}=await import('/web/video-input.mjs');
    const {frameOrigin,validateFrameOrigin}=await import('/src/frame-origin.mjs');
    const {MAX_SAMPLE_SIDE}=await import('/src/visual-scan.mjs');
    const bytes=Uint8Array.from(atob(input.base64),c=>c.charCodeAt(0));
    const file=new File([bytes],input.name,{type:'video/mp4'});let clip;
    const base64=bytes=>{const chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));return btoa(chunks.join(''));};
    try{
     clip=await loadLocalVideo(file);document.body.append(clip.video);
     const intrinsicAtLoad={width:clip.video.videoWidth,height:clip.video.videoHeight};
     const captured=await capturePresentedFrame(clip,.5);
     const pngBytes=new Uint8Array(await captured.file.arrayBuffer());
     const pngSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pngBytes)),v=>v.toString(16).padStart(2,'0')).join('');
     const bitmap=await createImageBitmap(captured.file),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
     const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();
     const image={name:captured.file.name,mimeType:'image/png',sha256:pngSha256,widthPx:canvas.width,heightPx:canvas.height,pixelCoordinates:'browser-oriented'};
     const origin=frameOrigin(clip.identity,captured.requestedTimeSeconds,captured.metadata,image);
     const reopenedOrigin=validateFrameOrigin(JSON.parse(JSON.stringify(origin)),image);
     let wrongPNGSizeRefused=false;try{validateFrameOrigin({...origin,widthPx:origin.widthPx+1},image);}catch{wrongPNGSizeRefused=true;}
     const sample=await samplePresentedFrame(clip,.75);
     return {identity:clip.identity,intrinsicAtLoad,intrinsicAfterCapture:{width:clip.video.videoWidth,height:clip.video.videoHeight},
      requestedTimeSeconds:captured.requestedTimeSeconds,metadata:captured.metadata,image,origin,reopenedOrigin,wrongPNGSizeRefused,
      pngBase64:base64(pngBytes),rgbaBase64:base64(context.getImageData(0,0,canvas.width,canvas.height).data),
      sample:{width:sample.widthPx,height:sample.heightPx,maxSide:MAX_SAMPLE_SIDE,requestedSeconds:sample.requestedSeconds,presentedSeconds:sample.presentedSeconds,rgbaBase64:base64(sample.rgba)}};
    }finally{releaseVideo(clip);}
   },{name:basename(control.path),base64:(await readFile(control.path)).toString('base64')});
   const png=Buffer.from(observed.pngBase64,'base64'),rgba=Buffer.from(observed.rgbaBase64,'base64'),sampleRGBA=Buffer.from(observed.sample.rgbaBase64,'base64');
   delete observed.pngBase64;delete observed.rgbaBase64;delete observed.sample.rgbaBase64;
   Object.assign(result,observed);await writeFile(join(out,control.name+'-captured.png'),png);
   assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert.equal(png.subarray(12,16).toString('ascii'),'IHDR');
   result.pngHeader={width:png.readUInt32BE(16),height:png.readUInt32BE(20)};result.independentPNGHash=digest(png);
   assert.equal(result.identity.sha256,control.fileSha256,'Browser clip fingerprint must match the independent original bytes');assert.equal(result.identity.sizeBytes,control.sizeBytes);
   assert.equal(result.image.sha256,result.independentPNGHash,'Browser PNG identity must match independent exported bytes');
   assert.deepEqual(result.pngHeader,{width:result.image.widthPx,height:result.image.heightPx});
   assert.deepEqual(result.pngHeader,{width:control.reference.width,height:control.reference.height},'PNG dimensions must match the independently decoded display orientation');
   assert.deepEqual(result.intrinsicAtLoad,result.pngHeader);assert.deepEqual(result.intrinsicAfterCapture,result.pngHeader);
   assert.equal(rgba.length,result.pngHeader.width*result.pngHeader.height*4);assert.equal(sampleRGBA.length,result.sample.width*result.sample.height*4);
   result.pngMarkers=markers(rgba,result.pngHeader.width,result.pngHeader.height,4);
   result.markerComparison=compareMarkers(result.pngMarkers,result.pngHeader.width,result.pngHeader.height,control.reference.markers,control.reference.width,control.reference.height);
   assert(Number.isInteger(result.sample.maxSide)&&result.sample.maxSide>=1,'The maintained sample bound must be a positive integer');
   const sampleScale=Math.min(1,result.sample.maxSide/Math.max(control.reference.width,control.reference.height));
   const expectedSampleSize=[Math.max(1,Math.round(control.reference.width*sampleScale)),Math.max(1,Math.round(control.reference.height*sampleScale))];
   assert.deepEqual([result.sample.width,result.sample.height],expectedSampleSize,'Sample dimensions must preserve the independent display reference aspect under the maintained bound');
   assert(Math.max(result.sample.width,result.sample.height)<=result.sample.maxSide,'Sample dimensions must respect the maintained maximum side');
   result.sample.markers=markers(sampleRGBA,result.sample.width,result.sample.height,4);
   result.sample.markerComparison=compareMarkers(result.sample.markers,result.sample.width,result.sample.height,control.reference.markers,control.reference.width,control.reference.height);
   assert.deepEqual(result.reopenedOrigin,result.origin);assert.equal(result.wrongPNGSizeRefused,true);
   assert.deepEqual([result.origin.widthPx,result.origin.heightPx],[result.pngHeader.width,result.pngHeader.height]);
   assert.deepEqual([result.origin.decodedWidthPx,result.origin.decodedHeightPx],[result.metadata.width,result.metadata.height]);
   result.callbackMatchesPNG=result.metadata.width===result.pngHeader.width&&result.metadata.height===result.pngHeader.height;
   result.callbackMatchesEncoded=result.metadata.width===width&&result.metadata.height===height;
   if(control.declaredRotation===0)assert.equal(result.callbackMatchesPNG,true,'Unrotated dimension control must agree');
   result.qualified=true;
  }catch(error){result.failure={message:error.message,stack:error.stack};}
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.offsite,[]);assert.deepEqual(report.badResponses,[]);
 assert.equal(report.cases.filter(c=>c.qualified).length,3,'All three authored controls must qualify before interpreting dimensions');
 report.dimensionDifferences=report.cases.filter(c=>!c.callbackMatchesPNG).map(c=>({name:c.name,png:c.pngHeader,callback:{width:c.metadata.width,height:c.metadata.height},callbackMatchesEncoded:c.callbackMatchesEncoded}));
 report.finding=report.dimensionDifferences.length?'Actual browser callback and displayed PNG use different dimension domains; the maintained frameOrigin contract retains and validates both.':'This browser reports matching callback and PNG dimensions for all three controls. Both metadata fields were retained and validated; unequal dimension domains were not observed or exercised in this run.';
 report.completed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};process.exitCode=1;}
finally{
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({completed:report.completed,browser:report.browser,finding:report.finding,dimensionDifferences:report.dimensionDifferences,cases:report.cases.map(c=>({name:c.name,qualified:c.qualified,png:c.pngHeader,metadata:c.metadata,origin:c.origin,sample:c.sample?{width:c.sample.width,height:c.sample.height}:undefined,failure:c.failure})),failure:report.failure,report:join(out,'report.json')}));
}
