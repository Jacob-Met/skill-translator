import {discoverOpenCvRuntime} from './optional-opencv.mjs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isLoopbackOrigin} from './loopback-origin.mjs';
import {imageMetadata} from '../src/capture.mjs';
export class PhotoScanUnavailable extends Error {}
let running=false;
export async function runNativePhotoCorners(raw){
 const runtime=await discoverOpenCvRuntime();if(!runtime)throw new PhotoScanUnavailable('Optional page scan runtime is unavailable.');
 imageMetadata(raw.image);
 if(!raw.raster||typeof raw.raster.pngBase64!=='string'||raw.raster.pngBase64.length>12*1024*1024||!/^[0-9a-f]{64}$/.test(raw.raster.sha256))throw Error('Bounded image-bound page scan required');
 if(running)throw Error('Another page scan is running. Try again when it finishes.');
 running=true;let timer;
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(runtime.interpreter,[fileURLToPath(new URL('../tools/photo-corners-native.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',tooLarge=false,timedOut=false;
  timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},15000);
  child.on('error',error=>reject(error.code==='ENOENT'?new PhotoScanUnavailable('Optional page scan runtime is unavailable.'):error));child.stdin.on('error',()=>{});
  child.stdout.on('data',data=>{stdout+=data;if(stdout.length>200000){tooLarge=true;child.kill();}});
  child.stderr.on('data',data=>{stderr+=data;if(stderr.length>10000){tooLarge=true;child.kill();}});
  child.on('close',code=>{try{
   if(code===78)throw new PhotoScanUnavailable('Optional OpenCV runtime is not installed.');
   if(timedOut)throw Error('Page scan exceeded 15 seconds');
   if(code!==0||tooLarge)throw Error(tooLarge?'Page scan report exceeded capacity':stderr.trim()||'Page scan stopped');
   const report=JSON.parse(stdout);
   if(report.version!=='skill-translator.photo-corners/v1'||report.width!==raw.raster.width||report.height!==raw.raster.height||report.rasterSha256!==raw.raster.sha256||!Array.isArray(report.candidates)||report.candidates.length>8)throw Error('Page scan returned a different analysis raster');
   resolve(report);
  }catch(error){reject(error);}});
  child.stdin.end(JSON.stringify({raster:raw.raster}));
 });}finally{clearTimeout(timer);running=false;}
}
export async function servePhotoCorners(req,res){
 if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({available:Boolean(await discoverOpenCvRuntime())}));return;}
 if(!isLoopbackOrigin(req)||!String(req.headers['content-type']).startsWith('application/json')){res.writeHead(403);res.end('Same-origin JSON request required');return;}
 try{let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>16*1024*1024)throw Error('Page scan request exceeds capacity');chunks.push(chunk);}
  const report=await runNativePhotoCorners(JSON.parse(Buffer.concat(chunks).toString('utf8')));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(report));
 }catch(error){res.writeHead(error instanceof PhotoScanUnavailable?503:400,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:error.message}));}
}
