// Candidate low-displacement spans of selected observations, not continuous rest.
import {inspectSequencePath} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';

export function proposeSampledDwells(raw,maximumDiameterMm,minimumDurationSeconds){
 for(const [value,label] of [[maximumDiameterMm,'Maximum diameter'],[minimumDurationSeconds,'Minimum duration']])
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new GeometryError(`${label} must be finite and nonnegative.`);
 const findings=inspectSequencePath(raw),samples=findings.samples,candidates=[];
 // Enumerate intervals, admitting every pair rather than only adjacent chords:
 // a slowly drifting path must not be mistaken for a stable spatial cluster.
 for(let start=0;start<samples.length;start++){
  if(!samples[start].position)continue;
  let diameterMm=0,witness=null;
  for(let end=start+1;end<samples.length;end++){
   if(!samples[end].position)break;
   for(let i=start;i<end;i++){
    const a=samples[i].position,b=samples[end].position,d=Math.hypot(a.xMm-b.xMm,a.yMm-b.yMm);
    if(witness===null||d>diameterMm){diameterMm=d;witness=[i,end];}
   }
   if(diameterMm>maximumDiameterMm)break;
   const durationSeconds=samples[end].presentedSeconds-samples[start].presentedSeconds;
   if(durationSeconds>=minimumDurationSeconds)candidates.push({startIndex:start,endIndex:end,durationSeconds,diameterMm,diameterWitnessIndices:[...witness]});
  }
 }
 const intervals=candidates.filter(a=>!candidates.some(b=>b!==a&&b.startIndex<=a.startIndex&&b.endIndex>=a.endIndex)).map(a=>({...a,
  momentIds:samples.slice(a.startIndex,a.endIndex+1).map(s=>s.momentId),
  startSeconds:samples[a.startIndex].presentedSeconds,endSeconds:samples[a.endIndex].presentedSeconds,
  diameterWitnessMomentIds:a.diameterWitnessIndices.map(i=>samples[i].momentId)}));
 return {maximumDiameterMm,minimumDurationSeconds,intervals,missingMomentIds:samples.filter(s=>!s.position).map(s=>s.momentId),
  boundary:'Maximal contiguous intervals of selected observed points whose every pair is within the supplied nominal diameter and whose selected endpoint times span the supplied duration. Overlapping alternatives are retained. Missing selected readings split intervals. Unselected frames and motion between samples remain unknown: these are candidate low-displacement intervals, not verified continuous pauses, contact, task phases or physical skill. Calibration and point correspondence remain supplied. Original evidence is unchanged.'};
}
