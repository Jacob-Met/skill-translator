export const OPUS_CLOCK_PROFILE='ffmpeg-6.1.1-opus-millisecond/v1';
const check=(v,m)=>{if(!v)throw Error(m);};
const floor=(n,d)=>n>=0n?n/d:-((-n+d-1n)/d);
const ceil=(n,d)=>-floor(-n,d);
const integer=(v)=>typeof v==='string'&&/^-?(0|[1-9][0-9]{0,15})$/.test(v)&&Number.isSafeInteger(Number(v));
// FFmpeg n6.1.1 audio_ts_process + av_rescale_delta, qualified only for the
// constant48kHz Opus/1ms path. These are decoder positions, never source repairs.
export function replayOpusClock(frames){
 check(Array.isArray(frames)&&frames.length>0&&frames.length<=20000,'Clock profile requires1..20000 original frames');
 let last=null,previous=null,duration=0n,total=0;const result=[];
 for(const [index,f]of frames.entries()){
  check(integer(f.pts)&&Number.isSafeInteger(f.samples)&&f.samples>0&&f.samples<=1000000,'Invalid original clock frame');
  total+=f.samples;check(total<=48000*60,'Clock profile exceeds60seconds');
  const pts=BigInt(f.pts),count=BigInt(f.samples);check(pts>=-86400000n&&pts<=86400000n,'Clock timestamp outside bounded profile');
  const gapReset=previous!==null&&pts>ceil(previous+duration,48n);
  if(gapReset)last=null;
  let selected;
  if(last===null)selected=pts*48n;
  else{
   const a=(2n*pts-1n)*24n,b=(2n*pts+1n)*24n;
   selected=last<2n*a-b||last>2n*b-a?pts*48n:last<a?a:last>b?b:last;
  }
  result.push({index,pts:String(selected),samples:f.samples,gapReset});last=selected+count;previous=selected;duration=count;
 }
 return result;
}
export function verifyOpusClock({stream,frames,decoder}){
 check(stream.codec==='opus'&&stream.timeBase==='1/1000'&&stream.sampleRate===48000&&[1,2].includes(stream.channels),'Decoder clock profile requires original Opus48kHz mono/stereo with1ms ticks');
 for(const name of ['ffmpeg','ffprobe'])check(typeof decoder[name]==='string'&&new RegExp('^'+name+' version 6\\.1\\.1-3ubuntu5 ').test(decoder[name]),'Decoder clock profile requires qualified FFmpeg/FFprobe6.1.1-3ubuntu5');
 const probe=decoder.originalProbe;check(probe?.streams?.length===1&&Array.isArray(probe.frames)&&probe.frames.length===frames.length,'Retain complete original probe clock ledger');
 const source=probe.streams[0];check(source.index===stream.index&&source.codec_type==='audio'&&source.codec_name===stream.codec&&source.time_base===stream.timeBase&&Number(source.sample_rate)===stream.sampleRate&&source.channels===stream.channels,'Original probe stream differs from clock declaration');
 for(let i=0;i<frames.length;i++){const p=probe.frames[i],f=frames[i];check(p&&String(p.pts)===f.pts&&p.nb_samples===f.samples&&p.channels===stream.channels&&(!p.sample_rate||Number(p.sample_rate)===48000),'Original probe frame differs at'+i);}
 const predicted=replayOpusClock(frames),observed=decoder.filterFrames;
 check(Array.isArray(observed)&&observed.length===predicted.length,'Decoder clock ledger frame count differs');
 for(let i=0;i<predicted.length;i++){
  const a=observed[i],p=predicted[i];check(a&&a.index===i&&a.pts===p.pts&&a.samples===p.samples&&a.rate===48000&&a.channels===stream.channels&&a.format==='flt','Exact decoder clock replay differs at frame'+i);
 }
 return {profile:OPUS_CLOCK_PROFILE,originalTimeBase:'1/1000',originalTickSeconds:.001,decoderTimeBase:'1/48000',replayedFrames:predicted.length,gapResetFrames:predicted.filter(f=>f.gapReset).map(f=>f.index),qualification:'Original frame timestamps and gaps remain unchanged. Decoder sample positions are separately replayed, not physical source timing. Original timestamps have1ms ticks; sub-tick source timing and browser alignment are not established.'};
}
