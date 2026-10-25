import {validateSequence} from './demonstration-sequence.mjs';
import {inspectNarrationClock,mapNarrationTime} from './narration-clock.mjs';

export const INSTRUMENT_TRACE_FORMAT='skill-translator.instrument-trace/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const text=(value,label,max=1600)=>{check(typeof value==='string'&&value.trim()&&value.length<=max,label+' requires bounded text');return value.trim();};
const bounded=(value,min,max,label)=>{check(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,label+' is outside its finite bound');return value;};
// Reuse maintained clock admission/map rather than inventing a second mapper.
// The adapter only renames the independent instrument's timestamp field.
const clockInput=clock=>({anchors:clock?.anchors?.map(p=>({transcriptSeconds:p.instrumentSeconds,clipSeconds:p.clipSeconds})),
 verification:clock?.verification?{transcriptSeconds:clock.verification.instrumentSeconds,clipSeconds:clock.verification.clipSeconds}:undefined,
 toleranceSeconds:clock?.toleranceSeconds,basis:clock?.basis});
const clockOutput=clock=>({anchors:clock.anchors.map(p=>({instrumentSeconds:p.transcriptSeconds,clipSeconds:p.clipSeconds})),
 verification:{instrumentSeconds:clock.verification.transcriptSeconds,clipSeconds:clock.verification.clipSeconds},
 toleranceSeconds:clock.toleranceSeconds,basis:clock.basis});

export function importInstrumentTrace(sequence,input){
 check(input?.format===INSTRUMENT_TRACE_FORMAT,'Open a source-bound scalar instrument trace');
 const source=validateSequence(sequence);
 check(same(source,validateSequence(input.source)),'The original demonstrated source changed');
 check(['authored-example','reported-measurement'].includes(input.evidenceClass),'Declare authored example or reported measurement');
 const instrument={name:text(input.instrument?.name,'Instrument name',160),quantity:text(input.instrument?.quantity,'Supplied quantity',160),unit:text(input.instrument?.unit,'Supplied unit',80),calibrationBasis:text(input.instrument?.calibrationBasis,'Supplied calibration account')};
 check(Array.isArray(input.samples)&&input.samples.length>=2&&input.samples.length<=4096,'Retain 2–4096 original scalar samples');
 let previous=-1;
 const samples=input.samples.map(sample=>{
  const timeSeconds=bounded(sample?.timeSeconds,0,21600,'Original instrument time');
  check(timeSeconds>previous,'Original instrument times must strictly increase; do not drop or sort duplicates');previous=timeSeconds;
  return {timeSeconds,value:bounded(sample.value,-1e12,1e12,'Scalar reading')};
 });
 const normalizedClock=inspectNarrationClock(clockInput(input.clock),source.clip.durationSeconds).clock;
 const settings={threshold:bounded(input.settings?.threshold,-1e12,1e12,'Declared threshold'),direction:input.settings?.direction,
  maximumGapSeconds:bounded(input.settings?.maximumGapSeconds,Number.MIN_VALUE,3600,'Declared maximum adjacent-sample gap'),minimumSamples:input.settings?.minimumSamples};
 check(['at-or-above','at-or-below'].includes(settings.direction),'Declare at-or-above or at-or-below threshold');
 check(Number.isSafeInteger(settings.minimumSamples)&&settings.minimumSamples>=2&&settings.minimumSamples<=4096,'Require 2–4096 consecutive qualifying samples');
 return {format:INSTRUMENT_TRACE_FORMAT,source,instrument,evidenceClass:input.evidenceClass,samples,clock:clockOutput(normalizedClock),settings};
}

export function inspectInstrumentTrace(sequence,input){
 const trace=importInstrumentTrace(sequence,input),clock=clockInput(trace.clock);
 const clockReport=inspectNarrationClock(clock,trace.source.clip.durationSeconds);
 const settings=trace.settings,gaps=[],runs=[];
 let current=[];
 const flush=()=>{if(current.length>=settings.minimumSamples)runs.push(current);current=[];};
 for(let i=0;i<trace.samples.length;i++){
  const sample=trace.samples[i],prior=trace.samples[i-1];
  if(prior&&sample.timeSeconds-prior.timeSeconds>settings.maximumGapSeconds){
   gaps.push({beforeIndex:i-1,afterIndex:i,startInstrumentSeconds:prior.timeSeconds,endInstrumentSeconds:sample.timeSeconds});flush();
  }
  const qualifies=settings.direction==='at-or-above'?sample.value>=settings.threshold:sample.value<=settings.threshold;
  if(qualifies)current.push(i);else flush();
 }
 flush();
 const candidates=runs.map((indexes,index)=>{
  const start=trace.samples[indexes[0]].timeSeconds,end=trace.samples[indexes.at(-1)].timeSeconds;
  let navigation={available:false,reason:'clock-check-failed',startSeconds:null,endSeconds:null,extrapolated:null};
  if(clockReport.checkPassed){
   const a=mapNarrationTime(clock,trace.source.clip.durationSeconds,start),b=mapNarrationTime(clock,trace.source.clip.durationSeconds,end);
   const extrapolated=a.extrapolated||b.extrapolated;
   const inside=a.seconds>=0&&b.seconds<=trace.source.clip.durationSeconds&&b.seconds>a.seconds;
   navigation={available:inside&&!extrapolated,reason:!inside?'outside-original-clip':extrapolated?'outside-clock-anchors':null,startSeconds:a.seconds,endSeconds:b.seconds,extrapolated};
  }
  const values=indexes.map(i=>trace.samples[i].value);
  return {id:'run-'+index,sampleIndexes:indexes,startInstrumentSeconds:start,endInstrumentSeconds:end,
   sampleCount:indexes.length,minimum:Math.min(...values),maximum:Math.max(...values),navigation};
 });
 return {trace,clock:{checkPassed:clockReport.checkPassed,slope:clockReport.slope,residualSeconds:clockReport.residualSeconds},gaps,candidates,
  boundary:'These are consecutive supplied samples satisfying a declared scalar threshold. Sample intervals are not measured threshold-crossing times or proof of continuous state, contact, force calibration, task purpose or success. Missing coverage is not interpolated. Units, instrument account and clock correspondences are supplied declarations; the separate clock check is not authenticated synchronization.'};
}

export function selectInstrumentRun(sequence,input,candidateId){
 const report=inspectInstrumentTrace(sequence,input);
 check(report.candidates.some(row=>row.id===candidateId),'Choose a retained scalar threshold run');
 return {format:'skill-translator.instrument-selection/v1',trace:report.trace,candidateId};
}
export function instrumentPlaybackRange(sequence,input,selection){
 const report=inspectInstrumentTrace(sequence,input);
 check(selection?.format==='skill-translator.instrument-selection/v1'&&same(report.trace,selection.trace),'The selected trace, units, clock, source or threshold declaration changed; select again');
 const candidate=report.candidates.find(row=>row.id===selection.candidateId);
 check(candidate,'Choose a retained scalar threshold run');
 check(candidate.navigation.available,'The complete run lacks supported original-clip timing: '+candidate.navigation.reason);
 return {startSeconds:candidate.navigation.startSeconds,endSeconds:candidate.navigation.endSeconds,
  candidateId:selection.candidateId,sampleIndexes:candidate.sampleIndexes};
}
