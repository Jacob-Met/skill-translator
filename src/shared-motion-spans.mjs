/** Exhaustive contiguous-span inference on the original retained sequence. */
import {sequenceDiscoveryInputs} from './sequence-discovery.mjs';
import {sharedMotionInputs,MAX_MOTION_GROUP_POINTS,MOTION_FIT_SLACK_MM} from './shared-motion-groups.mjs';
import {fitProperPointPattern} from './point-pattern-fit.mjs';
import {GeometryError} from './geometry.mjs';
const count=mask=>{let n=0;for(;mask;mask&=mask-1)n++;return n;};
const boundary='Spans describe agreement among retained sampled moments under the same least-squares proper-rotation and translation test as whole-course groups. Every fitted point residual must fit the declared exploratory threshold plus 1e-9 mm numerical slack. All point sets and contiguous retained-moment intervals are tested within the stated bounds. Maximal point-set / time-span alternatives may overlap; they are not a unique segmentation or an inferred task step. Missing points and uncalibrated retained moments break support. Unsampled motion, physical contact, attachment, object identity, intent and skill remain unestablished. A failed least-squares fit does not exclude every threshold-feasible transformation.';
function inputs(raw){
 const evidence=sequenceDiscoveryInputs(raw),prepared=sharedMotionInputs(evidence.study);
 const rows=new Map(prepared.rows.map(r=>[r.id,r])),sources=new Map(evidence.sources.map(s=>[s.momentId,s]));
 const timeline=evidence.account.sequence.moments.map((moment,index)=>{
  const source=sources.get(moment.id),row=source&&rows.get(source.demonstrationId);
  return {index,momentId:moment.id,label:moment.label,presentedSeconds:moment.origin.mediaTimeSeconds,sourceId:row?.id,points:row?.points};
 });
 return {...prepared,evidence,timeline};
}
function pairFit(a,b,ids,thresholdMm,full=false){
 if(!a.points||!b.points)return {status:'uncalibrated-moment',momentIds:[a,b].filter(r=>!r.points).map(r=>r.momentId)};
 const missing=ids.filter(id=>!a.points.has(id)||!b.points.has(id));
 if(missing.length)return {status:'missing-point',ids:missing,fromMomentId:a.momentId,toMomentId:b.momentId};
 const {fit,unavailable}=fitProperPointPattern(ids.map(id=>({id,target:a.points.get(id),attempt:b.points.get(id)})));
 if(!fit)return {status:'unresolved-orientation',fromMomentId:a.momentId,toMomentId:b.momentId,reason:unavailable};
 const maxResidualMm=Math.max(...fit.residuals.map(r=>r.errorMm));
 return {status:maxResidualMm<=thresholdMm+MOTION_FIT_SLACK_MM?'supported':'outside-fit-threshold',
  fromMomentId:a.momentId,toMomentId:b.momentId,fromSourceId:a.sourceId,toSourceId:b.sourceId,maxResidualMm,remainingRmsMm:fit.remainingRmsMm,...(full?fit:{})};
}
function intervalFit(timeline,start,end,ids,thresholdMm,full=false){
 const motions=[];let maxResidualMm=0;
 for(let a=start;a<=end;a++)for(let b=a+1;b<=end;b++){
  const fit=pairFit(timeline[a],timeline[b],ids,thresholdMm,full);
  if(fit.status!=='supported')return {status:fit.status,witness:fit};
  maxResidualMm=Math.max(maxResidualMm,fit.maxResidualMm);if(full)motions.push(fit);
 }
 return {status:'supported',maxResidualMm,...(full?{motions}:{})};
}
export function inspectSharedMotionSpans(raw){
 const {study,referenceIds:ids,timeline}=inputs(raw),n=ids.length,m=timeline.length;
 const common={thresholdMm:study.deviationMm,numericalSlackMm:MOTION_FIT_SLACK_MM,pointIds:ids,boundary,
  referencePopulation:'Point identities from the first calibrated retained moment. Later new identities are not added to this reference population.',
  timeline:timeline.map(({points,...row})=>({...row,calibrated:Boolean(points)})),
  missing:ids.map(id=>({id,momentIds:timeline.filter(r=>!r.points?.has(id)).map(r=>r.momentId)})).filter(r=>r.momentIds.length)};
 if(n>MAX_MOTION_GROUP_POINTS)return {...common,status:'capacity',spans:[],work:{pointLimit:MAX_MOTION_GROUP_POINTS},reason:'Complete span inference needs at most 12 reference points; ordinary pair discovery and original sources remain available.'};
 if(n<2)return {...common,status:'insufficient',spans:[],work:{pointLimit:MAX_MOTION_GROUP_POINTS},reason:'Fewer than two reference points are available.'};
 const size=1<<n,intervals=[],byRange=new Map();
 for(let start=0;start<m-1;start++)for(let end=start+1;end<m;end++){
  const interval={start,end,supported:new Uint8Array(size),maximums:new Float64Array(size)};
  intervals.push(interval);byRange.set(start+':'+end,interval);
 }
 let fits=0,pointFits=0,supportedPointSetIntervals=0,missingPairTests=0,outsidePairTests=0,unresolvedPairTests=0;
 // A maximum residual of an L2-optimal fit is not hereditary in point sets.
 // Enumerate every point set; only fixed-set temporal extension can stop early.
 for(let mask=1;mask<size;mask++){
  const cardinality=count(mask);if(cardinality<2)continue;
  const members=ids.filter((_,i)=>mask&(1<<i)),matrix=new Float64Array(m*m).fill(NaN);
  for(let a=0;a<m;a++)for(let b=a+1;b<m;b++){
   const result=pairFit(timeline[a],timeline[b],members,study.deviationMm);
   if(result.status==='uncalibrated-moment'||result.status==='missing-point'){missingPairTests++;continue;}
   fits++;pointFits+=cardinality;
   if(result.status==='unresolved-orientation'){unresolvedPairTests++;continue;}
   if(result.status==='outside-fit-threshold'){outsidePairTests++;continue;}
   matrix[a*m+b]=result.maxResidualMm;
  }
  for(let start=0;start<m-1;start++){
   let maximum=0;
   for(let end=start+1;end<m;end++){
    let supported=true;
    for(let a=start;a<end;a++){
     const residual=matrix[a*m+end];if(!Number.isFinite(residual)){supported=false;break;}
     maximum=Math.max(maximum,residual);
    }
    if(!supported)break;
    const interval=byRange.get(start+':'+end);
    interval.supported[mask]=1;interval.maximums[mask]=maximum;supportedPointSetIntervals++;
   }
  }
 }
 const spans=[];
 for(const interval of intervals){
  const {start,end,supported,maximums}=interval,hasSuperset=new Uint8Array(supported);
  // Upward Boolean subset transform: accept every superset, not just immediate
  // passing subsets. This preserves nonhereditary fitted-model outcomes.
  for(let bit=0;bit<n;bit++)for(let mask=0;mask<size;mask++)if(!(mask&(1<<bit)))hasSuperset[mask]|=hasSuperset[mask|(1<<bit)];
  for(let mask=1;mask<size;mask++){
   if(!supported[mask])continue;
   let larger=false;for(let bit=0;bit<n;bit++)if(!(mask&(1<<bit))&&hasSuperset[mask|(1<<bit)]){larger=true;break;}
   if(larger||start>0&&byRange.get((start-1)+':'+end).supported[mask]||end<m-1&&byRange.get(start+':'+(end+1)).supported[mask])continue;
   const members=ids.filter((_,i)=>mask&(1<<i));
   spans.push({ids:members,startIndex:start,endIndex:end,startMomentId:timeline[start].momentId,endMomentId:timeline[end].momentId,
    startSeconds:timeline[start].presentedSeconds,endSeconds:timeline[end].presentedSeconds,sampleCount:end-start+1,
    momentIds:timeline.slice(start,end+1).map(r=>r.momentId),sourcePairCount:(end-start+1)*(end-start)/2,maxResidualMm:maximums[mask]});
  }
 }
 spans.sort((a,b)=>a.startIndex-b.startIndex||b.endIndex-a.endIndex||b.ids.length-a.ids.length||a.ids.join('\0').localeCompare(b.ids.join('\0')));
 return {...common,status:'complete',spans,
  counts:{pointSets:size-n-1,intervals:intervals.length,supportedPointSetIntervals,maximal:spans.length,missingPairTests,outsidePairTests,unresolvedPairTests},
  work:{pointLimit:MAX_MOTION_GROUP_POINTS,momentLimit:12,fits,pointFits,maxSubsetFits:(size-n-1)*m*(m-1)/2,maxSubsetPointFits:n*((1<<(n-1))-1)*m*(m-1)/2}};
}
/** Recompute selected-span evidence from source; never trust stored verdicts. */
export function inspectMotionSpan(raw,selection){
 const {study,referenceIds,timeline}=inputs(raw);
 if(!Array.isArray(selection?.ids)||selection.ids.length<2||selection.ids.length>MAX_MOTION_GROUP_POINTS||
    new Set(selection.ids).size!==selection.ids.length||selection.ids.some(id=>!referenceIds.includes(id)))throw new GeometryError('Choose two to twelve distinct original reference points.');
 const ids=[...selection.ids].sort(),start=timeline.findIndex(r=>r.momentId===selection.startMomentId),end=timeline.findIndex(r=>r.momentId===selection.endMomentId);
 if(start<0||end<=start)throw new GeometryError('Choose an increasing span of at least two retained moments.');
 const result=intervalFit(timeline,start,end,ids,study.deviationMm,true);
 if(result.status!=='supported')return {...result,ids,startMomentId:selection.startMomentId,endMomentId:selection.endMomentId};
 const extension=(a,b)=>a<0||b>=timeline.length?{status:'recording-edge'}:intervalFit(timeline,a,b,ids,study.deviationMm);
 return {...result,ids,momentIds:timeline.slice(start,end+1).map(r=>r.momentId),extensions:{before:extension(start-1,end),after:extension(start,end+1)}};
}
