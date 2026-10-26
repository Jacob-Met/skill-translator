import {importInstrumentObservations} from './instrument-trace.mjs';
import {inspectNarrationClock,mapNarrationTime} from './narration-clock.mjs';
import {proposeInstrumentChanges} from './instrument-change-proposals.mjs';
export const INSTRUMENT_CHANGE_FORMAT='skill-translator.instrument-change-study/v1';
export const INSTRUMENT_OBSERVATIONS_FORMAT='skill-translator.instrument-observations/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const mappedClock=clock=>({anchors:clock.anchors.map(a=>({transcriptSeconds:a.instrumentSeconds,clipSeconds:a.clipSeconds})),verification:{transcriptSeconds:clock.verification.instrumentSeconds,clipSeconds:clock.verification.clipSeconds},toleranceSeconds:clock.toleranceSeconds,basis:clock.basis});
export function pairInstrumentChangeObservations(sequence,raw){
 check(raw?.format===INSTRUMENT_OBSERVATIONS_FORMAT,'Open explicitly unbound instrument-observations/v1');
 // A source already supplied by the caller must match, never be overwritten.
 return importInstrumentChangeStudy(sequence,{...raw,format:INSTRUMENT_CHANGE_FORMAT,source:raw.source===undefined?sequence:raw.source});
}
export function importInstrumentChangeStudy(sequence,raw){
 check(raw?.format===INSTRUMENT_CHANGE_FORMAT,'Open a threshold-free instrument change study');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=2_000_000,'Retain the complete original change study within 2 MB');
 const accepted=importInstrumentObservations(sequence,raw);
 check(typeof raw.maximumGapSeconds==='number'&&Number.isFinite(raw.maximumGapSeconds)&&raw.maximumGapSeconds>0&&raw.maximumGapSeconds<=3600,'Declare a finite positive adjacency limit at most3600seconds');
 return {format:INSTRUMENT_CHANGE_FORMAT,...accepted,maximumGapSeconds:raw.maximumGapSeconds};
}
export function inspectInstrumentChangeStudy(sequence,raw){
 const study=importInstrumentChangeStudy(sequence,raw),result=proposeInstrumentChanges(study.samples,{maximumGapSeconds:study.maximumGapSeconds}),clock=mappedClock(study.clock),clockReport=inspectNarrationClock(clock,study.source.clip.durationSeconds);
 const inquiries=result.inquiries.map((q,index)=>{
  if(!q.boundary)return {...q,index,navigation:{available:false,reason:q.status}};
  const contextIndexes=[...q.leftIndexes.slice(-3),...q.rightIndexes.slice(0,3)],startInstrumentSeconds=study.samples[contextIndexes[0]].timeSeconds,endInstrumentSeconds=study.samples[contextIndexes.at(-1)].timeSeconds;
  let navigation={available:false,reason:'clock-check-failed',startSeconds:null,endSeconds:null,contextIndexes};
  if(clockReport.checkPassed){const start=mapNarrationTime(clock,study.source.clip.durationSeconds,startInstrumentSeconds),end=mapNarrationTime(clock,study.source.clip.durationSeconds,endInstrumentSeconds),inside=start.seconds>=0&&end.seconds<=study.source.clip.durationSeconds&&end.seconds>start.seconds,covered=!start.extrapolated&&!end.extrapolated;
   navigation={available:inside&&covered,reason:!inside?'outside-original-clip':!covered?'outside-clock-anchors':null,startSeconds:start.seconds,endSeconds:end.seconds,contextIndexes};}
  return {...q,index,navigation};
 });
 return {study,clock:{checkPassed:clockReport.checkPassed,residualSeconds:clockReport.residualSeconds,slope:clockReport.slope},gaps:result.gaps,inquiries,limitation:result.limitation+' Playback shows three retained samples on each side as context, using the existing independently checked source clock. It does not locate an observed continuous transition.'};
}
export function selectInstrumentChange(sequence,raw,index){const report=inspectInstrumentChangeStudy(sequence,raw);check(Number.isInteger(index)&&report.inquiries[index]&&['preferred','weakly-separated'].includes(report.inquiries[index].status),'Choose an inspectable proposed change, retaining its uncertainty');return {format:'skill-translator.instrument-change-selection/v1',study:report.study,index};}
export function instrumentChangePlaybackRange(sequence,raw,selection){const report=inspectInstrumentChangeStudy(sequence,raw);check(selection?.format==='skill-translator.instrument-change-selection/v1'&&same(report.study,selection.study),'The original source, samples, units, clock or gap declaration changed; select again');const q=report.inquiries[selection.index];check(Number.isInteger(selection.index)&&q&&['preferred','weakly-separated'].includes(q.status),'Choose an inspectable proposed change');check(q.navigation.available,'The complete context lacks supported clip timing: '+q.navigation.reason);return {startSeconds:q.navigation.startSeconds,endSeconds:q.navigation.endSeconds,sampleIndexes:q.navigation.contextIndexes,inquiryIndex:q.index};}
