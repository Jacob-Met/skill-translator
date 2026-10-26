import {findAudioContrasts} from './audio-contrast.mjs';
export const AUDIO_ACTIVITY_FORMAT='skill-translator.audio-activity/v1';
export const AUDIO_SETTINGS=Object.freeze({windowMilliseconds:20,enterRms:.05,exitRms:.025,minimumWindows:2});
const MAX_SAMPLES=8_000_000,MAX_FRAMES=20000;
const fail=m=>{throw Error(m);};
const integer=(v,a,b,n)=>{if(!Number.isSafeInteger(v)||v<a||v>b)fail(n+' is outside the admitted integer range.');return v;};
const finite=(v,a,b,n)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)fail(n+' is outside the admitted finite range.');return v;};
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function closed(v,keys,n){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join('|')!==[...keys].sort().join('|'))fail(n+' has unsupported or missing fields.');}
function gcd(a,b){a=a<0n?-a:a;while(b){const t=a%b;a=b;b=t;}return a;}
function q(a,b=1n){if(b<=0n)fail('Invalid rational denominator.');const g=gcd(a,b);return [a/g,b/g];}
const add=(a,b)=>q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const cmp=(a,b)=>{const d=a[0]*b[1]-b[0]*a[1];return d<0n?-1:d>0n?1:0;};
const serial=a=>a[0]+'/'+a[1];
const seconds=a=>Number(a[0])/Number(a[1]);
const point=a=>({exactSeconds:serial(a),seconds:seconds(a)});
function signedInteger(v,name){if(typeof v!=='string'||! /^-?(0|[1-9][0-9]{0,15})$/.test(v)||!Number.isSafeInteger(Number(v)))fail(name+' must be an exact bounded integer string.');return BigInt(v);}
function timeBase(v){if(typeof v!=='string'||! /^[1-9][0-9]{0,8}\/[1-9][0-9]{0,8}$/.test(v))fail('Retain a positive rational stream time base.');const [a,b]=v.split('/').map(BigInt);return q(a,b);}
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function pcmBytes(text){if(typeof text!=='string'||text.length>Math.ceil(MAX_SAMPLES*4/3)*4||text.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))fail('Supply bounded canonical packed-float PCM.');const binary=atob(text);if(btoa(binary)!==text)fail('Noncanonical PCM encoding.');return Uint8Array.from(binary,c=>c.charCodeAt(0));}
export async function analyzeAudioActivity(raw){
 closed(raw,['format','source','stream','decoder','frames','pcm','settings'],'Audio report');
 if(raw.format!==AUDIO_ACTIVITY_FORMAT)fail('Unsupported audio activity format.');
 closed(raw.source,['name','sha256','sizeBytes'],'Original source');if(typeof raw.source.name!=='string'||!raw.source.name||raw.source.name.length>180||!hash(raw.source.sha256))fail('Retain original source name and SHA-256.');integer(raw.source.sizeBytes,1,128*1024*1024,'Original source bytes');
 closed(raw.stream,['index','timeBase','sampleRate','channels','codec'],'Audio stream');integer(raw.stream.index,0,100,'Audio stream index');const rate=integer(raw.stream.sampleRate,8000,96000,'Sample rate'),channels=integer(raw.stream.channels,1,2,'Channels'),tb=timeBase(raw.stream.timeBase);if(typeof raw.stream.codec!=='string'||!raw.stream.codec||raw.stream.codec.length>80)fail('Retain the original codec.');
 if(rate%50)fail('The initial profile requires an exact integer20ms window.');
 closed(raw.settings,Object.keys(AUDIO_SETTINGS),'Activity settings');for(const k of Object.keys(AUDIO_SETTINGS))if(raw.settings[k]!==AUDIO_SETTINGS[k])fail('This version uses the predeclared activity settings.');
 if(!raw.decoder||typeof raw.decoder!=='object'||Array.isArray(raw.decoder)||JSON.stringify(raw.decoder).length>2_000_000)fail('Retain bounded native decoder provenance.');
 closed(raw.pcm,['encoding','sha256','base64'],'PCM');if(raw.pcm.encoding!=='f32le-interleaved'||!hash(raw.pcm.sha256))fail('Retain packed little-endian float PCM identity.');const bytes=pcmBytes(raw.pcm.base64);if(bytes.length>MAX_SAMPLES*4||bytes.length%(4*channels)||!bytes.length)fail('PCM byte count is outside the complete work bound.');if(await digest(bytes)!==raw.pcm.sha256)fail('PCM hash mismatch.');
 if(!Array.isArray(raw.frames)||!raw.frames.length||raw.frames.length>MAX_FRAMES)fail('Retain1..20000 complete decoded frames.');
 const segments=[],gaps=[];let total=0,previousEnd=null,segment=null;
 for(const f of raw.frames){closed(f,['pts','samples'],'Decoded frame');const pts=signedInteger(f.pts,'Frame PTS'),samples=integer(f.samples,1,1000000,'Frame samples'),start=q(pts*tb[0],tb[1]),end=add(start,q(BigInt(samples),BigInt(rate)));if(Math.abs(seconds(start))>86400||Math.abs(seconds(end))>86400)fail('Decoded timestamps exceed the bounded profile.');
  const order=previousEnd===null?1:cmp(start,previousEnd);if(order<0)fail('Decoded frame intervals overlap or run backwards; this timestamp profile is unavailable.');
  if(previousEnd===null||order>0){if(previousEnd!==null)gaps.push({start:point(previousEnd),end:point(start)});segment={start,sampleOffset:total,samples:0};segments.push(segment);}segment.samples+=samples;total+=samples;previousEnd=end;
 }
 if(total*channels*4!==bytes.length)fail('Complete decoded ledger and PCM length disagree.');if(segments.reduce((s,x)=>s+x.samples,0)>rate*60)fail('The initial profile admits at most60seconds of decoded audio.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),windowSamples=rate/50,windows=[],partials=[],events=[];
 for(let i=0;i<total*channels;i++){const value=view.getFloat32(i*4,true);if(!Number.isFinite(value)||Math.abs(value)>1)fail('PCM requires finite full-scale samples in[-1,1]; no normalization is applied.');}
 for(let si=0;si<segments.length;si++){
  const s=segments[si],count=Math.floor(s.samples/windowSamples);let run=null;
  const finish=()=>{if(run&&run.windowCount>=AUDIO_SETTINGS.minimumWindows)events.push({...run,id:'audio-event-'+events.length});run=null;};
  for(let wi=0;wi<count;wi++){
   const offset=s.sampleOffset+wi*windowSamples,squares=Array(channels).fill(0);
   for(let j=0;j<windowSamples;j++)for(let c=0;c<channels;c++){const v=view.getFloat32(((offset+j)*channels+c)*4,true);squares[c]+=v*v;}
   const channelRms=squares.map(sum=>Math.sqrt(sum/windowSamples)),maximumRms=Math.max(...channelRms),start=add(s.start,q(BigInt(wi*windowSamples),BigInt(rate))),end=add(start,q(BigInt(windowSamples),BigInt(rate)));
   const window={index:windows.length,segment:si,sampleOffset:offset,samples:windowSamples,start:point(start),end:point(end),channelRms,maximumRms};windows.push(window);
   if(run&&maximumRms<AUDIO_SETTINGS.exitRms)finish();
   if(!run&&maximumRms>=AUDIO_SETTINGS.enterRms)run={segment:si,firstWindow:window.index,lastWindow:window.index,windowCount:0,start:window.start,end:window.end,peakRms:0};
   if(run){run.lastWindow=window.index;run.windowCount++;run.end=window.end;run.peakRms=Math.max(run.peakRms,maximumRms);}
  }
  finish();const remainder=s.samples-count*windowSamples;
  if(remainder)partials.push({segment:si,samples:remainder,start:point(add(s.start,q(BigInt(count*windowSamples),BigInt(rate)))),end:point(add(s.start,q(BigInt(s.samples),BigInt(rate))))});
 }
 return {format:AUDIO_ACTIVITY_FORMAT,source:structuredClone(raw.source),stream:structuredClone(raw.stream),settings:{...AUDIO_SETTINGS},decodedSamplesPerChannel:total,decodedDurationSeconds:total/rate,coverage:segments.map((s,i)=>({segment:i,start:point(s.start),end:point(add(s.start,q(BigInt(s.samples),BigInt(rate)))),samples:s.samples})),gaps,partials,windows,events,contrasts:findAudioContrasts(windows,channels,segments.length),boundary:'Native decoded PCM and original integer timestamps are supplied source artifacts. Analysis recomputes their declared activity; it does not independently authenticate decoding, identify a physical event or establish browser clock alignment.'};
}
export function mapAudioActivity(analysis,declaration,clip){
 closed(declaration,['sourceSha256','mediaOriginSeconds','basis'],'Media origin declaration');
 if(declaration.sourceSha256!==analysis.source.sha256||clip?.sha256!==analysis.source.sha256||clip?.sizeBytes!==analysis.source.sizeBytes)fail('Audio report and media origin must bind the exact original clip.');
 const origin=finite(declaration.mediaOriginSeconds,-86400,86400,'Declared media origin');finite(clip.durationSeconds,0,86400,'Original clip duration');if(typeof declaration.basis!=='string'||!declaration.basis.trim()||declaration.basis.length>1200)fail('Describe the basis for the container-to-browser origin.');
 return analysis.events.map(event=>{const startSeconds=event.start.seconds-origin,endSeconds=event.end.seconds-origin;return {...event,startSeconds,endSeconds,available:startSeconds>=0&&endSeconds>startSeconds&&endSeconds<=clip.durationSeconds};});
}
