import {audioInputProfile} from './audio-input-profile.mjs';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,basename,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {AUDIO_ACTIVITY_FORMAT,AUDIO_SETTINGS,analyzeAudioActivity} from '../src/audio-activity.mjs';
const execute=promisify(execFile),hash=b=>createHash('sha256').update(b).digest('hex');
async function command(executable,args,signal){const r=await execute(executable,args,{encoding:'buffer',maxBuffer:64*1024*1024,timeout:60000,signal});return {stdout:r.stdout,stderr:r.stderr};}
function check(test,message){if(!test)throw Error(message);}
function exactInteger(x,label){const s=String(x);check(/^-?(0|[1-9][0-9]{0,15})$/.test(s)&&Number.isSafeInteger(Number(s)),label+' must be an exact bounded integer');return s;}
export async function prepareAudioActivity(path,index,{signal,selfContained=false}={}){
 signal?.throwIfAborted();path=resolve(path);check(Number.isSafeInteger(index)&&index>=0&&index<=100,'Declare an absolute audio stream index0..100');
 const info=await stat(path);check(info.isFile()&&info.size>0&&info.size<=128*1024*1024,'Original file must be1..128MiB');const original=await readFile(path);check(original.length===info.size,'Original file changed during admission');
 const profile=selfContained?audioInputProfile(original):null;
 const probeArgs=['-v','error',...(profile?.args||[]),'-select_streams',String(index),'-show_streams','-show_frames','-show_entries','stream=index,codec_type,codec_name,time_base,sample_rate,channels,channel_layout,start_pts,start_time:frame=pts,pts_time,nb_samples,sample_rate,channels,channel_layout','-of','json',path];
 const probe=await command('ffprobe',probeArgs,signal),metadata=JSON.parse(probe.stdout.toString('utf8'));check(metadata.streams?.length===1&&metadata.streams[0].codec_type==='audio','Selected stream must be one audio stream');
 const stream=metadata.streams[0],rate=Number(stream.sample_rate),channels=stream.channels;
 const declaredLayout=typeof stream.channel_layout==='string'&&stream.channel_layout?stream.channel_layout:null;let frameLayoutState;
 check(Number.isSafeInteger(rate)&&rate>=8000&&rate<=96000&&rate%50===0,'Unsupported sample rate');check(channels===1||channels===2,'Only original mono/stereo is admitted');check(/^[1-9][0-9]{0,8}\/[1-9][0-9]{0,8}$/.test(stream.time_base),'Missing exact stream time base');
 check(Array.isArray(metadata.frames)&&metadata.frames.length>0&&metadata.frames.length<=20000,'Decoded frame ledger is missing or exceeds the complete work bound');
 const frames=metadata.frames.map((f,i)=>{check(f.pts!==undefined,'Decoded frame'+i+' lacks original PTS');check(Number.isSafeInteger(f.nb_samples)&&f.nb_samples>0&&f.nb_samples<=1000000,'Invalid decoded frame sample count');check(f.channels===channels&&(!f.sample_rate||Number(f.sample_rate)===rate),'Decoded audio format changed');const layout=typeof f.channel_layout==='string'&&f.channel_layout?f.channel_layout:null;if(i===0)frameLayoutState=layout;check(layout===frameLayoutState,'Decoded frame channel-layout metadata changed (including known/unknown)');check(!declaredLayout||!layout||declaredLayout===layout,'Decoded frame layout differs from declared stream layout');return {pts:exactInteger(f.pts,'Decoded PTS'),samples:f.nb_samples};});
 const samples=frames.reduce((sum,f)=>sum+f.samples,0);check(samples<=rate*60&&samples*channels<=8000000,'Complete decoded audio exceeds60seconds or8million channel samples');
 const args=['-nostdin','-hide_banner','-loglevel','info','-copyts',...(profile?.args||[]),'-i',path,'-map','0:'+index,'-vn','-sn','-dn','-af','aformat=sample_fmts=flt,ashowinfo','-c:a','pcm_f32le','-f','f32le','pipe:1'];
 const decoded=await command('ffmpeg',args,signal),stderr=decoded.stderr.toString('utf8');
 const lines=stderr.split(/\r?\n/).filter(line=>line.includes('Parsed_ashowinfo_')&&/\bn:\d+/.test(line));
 const observed=lines.map(line=>{const m=line.match(/\bn:(\d+)\s+pts:(-?\d+)\s+pts_time:([^\s]+).*?fmt:(\S+)\s+channels:(\d+).*?rate:(\d+)\s+nb_samples:(\d+)/);check(m,'Cannot reconcile an ashowinfo frame');const layoutMatch=line.match(/\bchlayout:(.*?)\s+rate:/);check(layoutMatch&&layoutMatch[1].trim(),'Filter channel layout missing');return {layout:layoutMatch[1].trim(),index:Number(m[1]),pts:exactInteger(m[2],'Filter PTS'),ptsTime:Number(m[3]),format:m[4],channels:Number(m[5]),rate:Number(m[6]),samples:Number(m[7])};});
 check(observed.length===frames.length,'Native decoder ledgers have different frame counts');check(decoded.stdout.length===samples*channels*4,'Complete packed PCM bytes disagree with the original decoded sample ledger');
 const [tn,td]=stream.time_base.split('/').map(BigInt),rescaling=[];
 for(let i=0;i<frames.length;i++){
  const f=frames[i],a=observed[i];check(a.index===i&&a.format==='flt'&&a.channels===channels&&a.rate===rate&&a.samples===f.samples,'Native decoder frame/sample correspondence changed at'+i);
  check(a.layout===observed[0].layout,'Filter channel layout changed');check(!frameLayoutState||a.layout===frameLayoutState,'Filter layout differs from known original decoded-frame layout');check(!declaredLayout||a.layout===declaredLayout,'Filter layout differs from known original stream layout');
  // Audio-filter PTS are checked against their own displayed time and the
  // original rational PTS; never use rounded pts_time as source authority.
  check(Number.isFinite(a.ptsTime)&&Math.abs(Number(a.pts)/rate-a.ptsTime)<=Math.max(1e-6,Math.abs(a.ptsTime)*1e-5),'Unexpected audio-filter time base');
  const errorNumerator=BigInt(a.pts)*td-BigInt(f.pts)*tn*BigInt(rate),absolute=errorNumerator<0n?-errorNumerator:errorNumerator;
  check(absolute*2n<=td,'Filter timestamp differs by more than half a sample from original PTS');
  rescaling.push({frame:i,errorSamplesNumerator:String(errorNumerator),errorSamplesDenominator:String(td)});
 }
 // Bind the actual bytes after both native reads as well; a changing source
 // cannot be published as the initially hashed original.
 check(hash(await readFile(path))===hash(original),'Original source changed during decoding');
 const [ffmpegVersion,ffprobeVersion]=await Promise.all([command('ffmpeg',['-version'],signal),command('ffprobe',['-version'],signal)]);
 const report={format:AUDIO_ACTIVITY_FORMAT,source:{name:basename(path),sha256:hash(original),sizeBytes:original.length},stream:{index,timeBase:stream.time_base,sampleRate:rate,channels,codec:stream.codec_name},decoder:{ffmpeg:ffmpegVersion.stdout.toString().split('\n')[0],ffprobe:ffprobeVersion.stdout.toString().split('\n')[0],probeArgs,decodeArgs:args,originalProbe:metadata,filterFrames:observed,rescaling,layout:{stream:declaredLayout,decodedFrames:frameLayoutState,filter:observed[0].layout,qualification:'null means original layout unreported; filter layout is not evidence that original metadata was known'},stderrSha256:hash(decoded.stderr),policy:'Original decoded frame PTS authoritative; packed-float conversion only; no resampling, mixing, gain, silence fill or browser-origin inference.'},frames,pcm:{encoding:'f32le-interleaved',sha256:hash(decoded.stdout),base64:decoded.stdout.toString('base64')},settings:{...AUDIO_SETTINGS}};
 const analysis=await analyzeAudioActivity(report);return {report,analysis,stderr};
}
async function main(){const args=process.argv.slice(2);check(args.length===5&&args[1]==='--stream'&&args[3]==='--out','Usage: node tools/prepare-audio-activity.mjs source --stream INDEX --out NEW_DIRECTORY');const result=await prepareAudioActivity(args[0],Number(args[2])),out=resolve(args[4]);await mkdir(out);const reportBytes=Buffer.from(JSON.stringify(result.report,null,2)+'\n');await writeFile(join(out,'audio-activity.json'),reportBytes,{flag:'wx'});await writeFile(join(out,'analysis.json'),JSON.stringify(result.analysis,null,2)+'\n',{flag:'wx'});await writeFile(join(out,'decode.log'),result.stderr,{flag:'wx'});console.log(JSON.stringify({out,sourceSha256:result.report.source.sha256,reportSha256:hash(reportBytes),events:result.analysis.events.length,windows:result.analysis.windows.length,gaps:result.analysis.gaps.length}));}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(String(error));process.exitCode=1;});
