import {fitInstrumentChangeModels} from './instrument-change-models.mjs';
const check=(ok,message)=>{if(!ok)throw Error(message);};
/** Descriptive finite-family comparison of supplied observations, never a physical-event detector. */
export function proposeInstrumentChanges(samples,{maximumGapSeconds}={}){
 check(Array.isArray(samples)&&samples.length>=2&&samples.length<=4096,'Retain 2–4096 original scalar samples');
 check(typeof maximumGapSeconds==='number'&&Number.isFinite(maximumGapSeconds)&&maximumGapSeconds>0&&maximumGapSeconds<=3600,'Declare a finite positive adjacency limit at most3600seconds');
 let previous=-1;const original=samples.map(s=>{check(s&&typeof s.timeSeconds==='number'&&Number.isFinite(s.timeSeconds)&&s.timeSeconds>=0&&s.timeSeconds<=21600&&s.timeSeconds>previous,'Retain strictly increasing bounded original timestamps');previous=s.timeSeconds;check(typeof s.value==='number'&&Number.isFinite(s.value)&&Math.abs(s.value)<=1e12,'Retain bounded finite original readings');return {timeSeconds:s.timeSeconds,value:s.value};});
 const groups=[[]],gaps=[];for(let i=0;i<original.length;i++){if(i&&original[i].timeSeconds-original[i-1].timeSeconds>maximumGapSeconds){gaps.push({beforeIndex:i-1,afterIndex:i});groups.push([]);}groups.at(-1).push(i);}
 const inquiries=groups.map(indexes=>{
  if(indexes.length<6)return {sampleIndexes:indexes,status:'insufficient',reason:'At least three observed samples on each side are needed; gaps are never bridged.'};
  const selected=indexes.map(i=>original[i]),deltas=selected.slice(1).map((s,i)=>s.timeSeconds-selected[i].timeSeconds);
  if(Math.min(...deltas)/Math.max(...deltas)<1e-10)return {sampleIndexes:indexes,status:'numerically-unresolved',reason:'Timestamp-spacing ratios exceed the supported covariance calculation; no white-noise fallback is claimed.'};
  const fit=fitInstrumentChangeModels(selected);
  if(!Number.isFinite(fit.step.score)||Object.values(fit.alternatives).some(m=>!Number.isFinite(m.score)))return {sampleIndexes:indexes,status:'numerically-unresolved',reason:'Not every competing covariance model could be evaluated.'};
  const guard=Math.log(indexes.length),status=fit.improvement>guard?'preferred':fit.improvement>0?'weakly-separated':'alternative-preferred',beforeIndex=indexes[fit.step.split-1],afterIndex=indexes[fit.step.split];
  return {sampleIndexes:indexes,status,fit,oneCoefficientCost:guard,boundary:{beforeIndex,afterIndex,beforeSeconds:original[beforeIndex].timeSeconds,afterSeconds:original[afterIndex].timeSeconds},
   leftIndexes:indexes.slice(0,fit.step.split),rightIndexes:indexes.slice(fit.step.split)};
 });
 return {samples:original,maximumGapSeconds,gaps,inquiries,limitation:'Finite descriptive model comparison of supplied scalar samples. Flat, linear, isolated-spike, periodic and decaying-excursion explanations compete with a level change under the same positive OU covariance family. The finite correlation/frequency grids and score costs are built-in modeling assumptions, not calibrated physical uncertainty. A preferred proposal exceeds alternatives by the assigned cost of one coefficient; weaker advantages remain explicit. Slow decay and a lasting level change can remain weakly distinguishable. Quadratic scores remain fallible under heavy-tailed residuals; no robustness or physical false-positive rate is established. No p-value, physical event, threshold crossing, continuous plateau, cause, contact, force calibration, task purpose or skill success is established. Boundaries lie between retained observed samples; missing intervals are never filled.'};
}
