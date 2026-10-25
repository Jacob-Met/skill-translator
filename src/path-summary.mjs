// Compact explanation of sampled geometry; never changes original evidence.
import {importSequencePath,inspectSequencePath} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';

/** Minimum retained original samples in each contiguous observed run, under
 * time-parametrized positional discrepancy at EVERY original selected sample.
 * A straight spatial line can contain a return or a pause: timestamps matter.
 * This is nominal floating-point geometry, not a certified uncertainty bound. */
export function proposePathSummary(raw,maximumDeviationMm){
 if(typeof maximumDeviationMm!=='number'||!Number.isFinite(maximumDeviationMm)||maximumDeviationMm<0)
  throw new GeometryError('Supply a finite nonnegative maximum sample deviation in millimetres.');
 const study=importSequencePath(raw), findings=inspectSequencePath(study), samples=findings.samples;
 const retained=new Set(), intervals=[], runs=[];
 let start=0;
 while(start<samples.length){
  if(!samples[start].position){retained.add(start++);continue;}
  let end=start;while(end+1<samples.length&&samples[end+1].position)end++;
  const edges=new Map();
  for(let a=start;a<=end;a++)for(let b=a+1;b<=end;b++){
   const first=samples[a],last=samples[b],duration=last.presentedSeconds-first.presentedSeconds;
   const residuals=[];
   for(let k=a+1;k<b;k++){
    const fraction=(samples[k].presentedSeconds-first.presentedSeconds)/duration;
    const x=first.position.xMm+(last.position.xMm-first.position.xMm)*fraction;
    const y=first.position.yMm+(last.position.yMm-first.position.yMm)*fraction;
    const deviationMm=Math.hypot(samples[k].position.xMm-x,samples[k].position.yMm-y);
    if(!Number.isFinite(deviationMm))throw new GeometryError('Sample summary exceeds finite calculation capacity.');
    residuals.push({sampleIndex:k,momentId:samples[k].momentId,presentedSeconds:samples[k].presentedSeconds,deviationMm});
   }
   if(residuals.every(r=>r.deviationMm<=maximumDeviationMm))edges.set(`${a}:${b}`,residuals);
  }
  // DP over the acyclic original-sample order; ties choose the earliest next
  // retained sample. Adjacent observed samples always supply a valid fallback.
  const count=Array(samples.length).fill(Infinity),next=Array(samples.length).fill(null);count[end]=1;
  for(let a=end-1;a>=start;a--)for(let b=a+1;b<=end;b++)if(edges.has(`${a}:${b}`)&&1+count[b]<count[a]){count[a]=1+count[b];next[a]=b;}
  const indices=[];for(let a=start;;a=next[a]){retained.add(a);indices.push(a);if(a===end)break;const b=next[a];intervals.push({fromIndex:a,toIndex:b,fromMomentId:samples[a].momentId,toMomentId:samples[b].momentId,residuals:edges.get(`${a}:${b}`)});}
  runs.push({fromIndex:start,toIndex:end,retainedIndices:indices,minimumObservedSamples:count[start]});start=end+1;
 }
 const retainedIndices=[...retained].sort((a,b)=>a-b),retainedMomentIds=retainedIndices.map(i=>samples[i].momentId);
 return {maximumDeviationMm,originalSampleCount:samples.length,retainedIndices,retainedMomentIds,
  omittedIndices:samples.map((_,i)=>i).filter(i=>!retained.has(i)),runs,intervals,
  missingMomentIds:samples.filter(s=>!s.position).map(s=>s.momentId),
  maximumOmittedDeviationMm:Math.max(0,...intervals.flatMap(x=>x.residuals.map(r=>r.deviationMm))),
  boundary:'A minimum-size proposal among the selected original samples, conditional on their supplied calibrations, point correspondences and times. Every omitted selected position is checked against interpolation at its own original time. Missing readings split runs and remain retained. Unselected frames and motion between samples remain unknown. Nominal floating-point discrepancy is not a measurement-accuracy bound, inferred task phase, physical trajectory or learning score. The complete original account is unchanged.'};
}
