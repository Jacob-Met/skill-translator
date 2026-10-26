import {OPUS_CLOCK_PROFILE} from '../src/audio-decoder-clock.mjs';
import {audioInputProfile} from '../tools/audio-input-profile.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {prepareAudioActivity} from '../tools/prepare-audio-activity.mjs';
const execute=promisify(execFile),MAX_BYTES=128*1024*1024;
let busy=false;
const check=(ok,message)=>{if(!ok)throw Error(message);};
export async function prepareOriginalAudio(bytes,{name,sha256,streamIndex=null,signal,clockProfile='strict'}={}){
 check(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=MAX_BYTES,'Supply one complete original clip up to128MiB.');
 check(typeof name==='string'&&name.length>0&&name.length<=180,'Retain a bounded original clip name.');
 check(typeof sha256==='string'&&/^[a-f0-9]{64}$/.test(sha256)&&createHash('sha256').update(bytes).digest('hex')===sha256,'Original clip hash does not match its selected source.');
 check(streamIndex===null||Number.isSafeInteger(streamIndex)&&streamIndex>=0&&streamIndex<=100,'Choose an original audio stream index0..100.');
 check(clockProfile==='strict'||clockProfile===OPUS_CLOCK_PROFILE,'Choose a supported decoder clock profile.');
 const profile=audioInputProfile(bytes);signal?.throwIfAborted();check(!busy,'Another original audio preparation is running.');busy=true;let directory;
 try{
  directory=await mkdtemp(join(tmpdir(),'skill-original-audio-'));const path=join(directory,'original.media');await writeFile(path,bytes,{flag:'wx',signal});
  const {stdout}=await execute('ffprobe',['-v','error',...profile.args,'-show_streams','-show_entries','stream=index,codec_type,codec_name,sample_rate,channels:stream_tags=language,title','-of','json',path],{signal,timeout:15000,maxBuffer:256*1024});
  const metadata=JSON.parse(stdout);check(Array.isArray(metadata.streams),'Native stream metadata is unavailable.');
  const streams=metadata.streams.filter(s=>s.codec_type==='audio').map(s=>({index:s.index,codec:String(s.codec_name||'unknown').slice(0,80),sampleRate:Number(s.sample_rate)||null,channels:s.channels??null,language:String(s.tags?.language||'').slice(0,80),title:String(s.tags?.title||'').slice(0,180)}));
  check(streams.every(s=>Number.isSafeInteger(s.index)&&s.index>=0&&s.index<=100),'Original audio stream index exceeds the admitted profile.');
  const source={name,sha256,sizeBytes:bytes.length};
  if(streamIndex===null&&streams.length!==1)return {format:'skill-translator.audio-intake/v1',status:streams.length?'choose-stream':'no-audio',source,streams};
  const selected=streamIndex??streams[0].index;check(streams.some(s=>s.index===selected),'Selected original audio stream is absent.');
  const {report}=await prepareAudioActivity(path,selected,{signal,selfContained:true,clockProfile});signal?.throwIfAborted();
  check(report.source.sha256===sha256&&report.source.sizeBytes===bytes.length,'Original clip changed during native decoding.');report.source.name=name;
  const result={format:'skill-translator.audio-intake/v1',status:'prepared',source,streams,report};check(Buffer.byteLength(JSON.stringify(result))<=48*1024*1024,'Complete original audio report exceeds48MiB; no source discarded.');return result;
 }finally{try{if(directory)await rm(directory,{recursive:true,force:true});}finally{busy=false;}}
}

let requestActive=false;
export async function serveAudioIntake(req,res){
 const send=(status,value)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));}};
 let localOrigin=null;try{const host=req.headers.host,url=new URL('http://'+host);if(typeof host==='string'&&url.host===host&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))localOrigin=url.origin;}catch{}
 if(!localOrigin||req.headers.origin!==localOrigin||req.headers['content-type']!=='application/octet-stream'){send(403,{error:'Same-origin original media request required.'});req.resume();return;}
 if(requestActive){send(409,{error:'Another original audio preparation is running.'});req.resume();return;}
 requestActive=true;const controller=new AbortController(),signal=controller.signal;const deadline=setTimeout(()=>controller.abort(),90000);deadline.unref();
 const abandon=()=>controller.abort();const closed=()=>{if(!res.writableEnded)abandon();};const cancelUpload=()=>{if(!req.complete)req.destroy();};req.on('aborted',abandon);res.on('close',closed);signal.addEventListener('abort',cancelUpload,{once:true});
 try{
  const length=req.headers['content-length'];check(length===undefined||/^\d+$/.test(length)&&Number(length)>0&&Number(length)<=MAX_BYTES,'Original upload exceeds128MiB.');
  const nameHeader=req.headers['x-audio-name'],sha256=req.headers['x-audio-sha256'],indexHeader=req.headers['x-audio-stream']||'auto',clockProfile=req.headers['x-audio-clock']||'strict';
  check(typeof nameHeader==='string'&&nameHeader.length<=2160,'Retain the original clip name.');const name=decodeURIComponent(nameHeader);
  check(typeof indexHeader==='string'&&(indexHeader==='auto'||/^(0|[1-9][0-9]{0,2})$/.test(indexHeader)),'Choose an original audio stream index.');
  const streamIndex=indexHeader==='auto'?null:Number(indexHeader);
  const chunks=[];let size=0;for await(const chunk of req){signal.throwIfAborted();size+=chunk.length;check(size<=MAX_BYTES,'Original upload exceeds128MiB.');chunks.push(chunk);}
  const result=await prepareOriginalAudio(Buffer.concat(chunks,size),{name,sha256,streamIndex,signal,clockProfile});send(200,result);
 }catch(error){send(signal.aborted?408:400,{error:signal.aborted?'Original audio preparation was cancelled or exceeded90seconds.':String(error.message).slice(0,1200)});}
 finally{clearTimeout(deadline);req.removeListener('aborted',abandon);res.removeListener('close',closed);signal.removeEventListener('abort',cancelUpload);requestActive=false;}
}
