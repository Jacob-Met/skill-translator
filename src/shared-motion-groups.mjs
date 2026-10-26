/** Complete subset enumeration for a declared, deterministic fitted-motion test. */
import {importRelationshipDiscovery} from './relationship-discovery.mjs';
import {derive} from './geometry.mjs';
import {fitProperPointPattern} from './point-pattern-fit.mjs';
export const MAX_MOTION_GROUP_POINTS=12;
export const MOTION_FIT_SLACK_MM=1e-9;
const count=mask=>{let n=0;for(;mask;mask&=mask-1)n++;return n;};
const boundary='Groups pass a least-squares proper-rotation and translation fit between every supplied source pair. Every fitted point residual must be within the exploratory threshold plus 1e-9 mm numerical slack. This is complete enumeration of that fitted-model test, not a search over all threshold-feasible transformations. Overlapping maximal groups are alternatives, not an object partition. Calibrations and point identities remain supplied; fitted agreement does not establish physical object identity, rigidity, contact, causal necessity, continuous motion or skill. Degenerate fits stay unresolved; missing points are never imputed.';
export function sharedMotionInputs(raw){
  const study=importRelationshipDiscovery(raw);
  const rows=study.demonstrations.map(row=>{
    const d=derive(row.annotation),original=new Map(d.landmarks.map(m=>[m.id,{id:m.id,label:m.label,xMm:m.uv.u*d.source.widthMm,yMm:m.uv.v*d.source.heightMm}]));
    const points=row.spatialMapping?new Map(row.spatialMapping.pairs.map(p=>[p.referenceId,original.get(p.observationId)])):original;
    return {id:row.id,points};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const referenceIds=study.demonstrations[0].annotation.landmarks.map(m=>m.id).sort();
  const missing=referenceIds.map(id=>({id,sourceIds:rows.filter(row=>!row.points.has(id)).map(row=>row.id)})).filter(x=>x.sourceIds.length);
  return {study,rows,referenceIds,missing};
}
export function inspectSharedMotionGroups(raw){
  const {study,rows,referenceIds,missing}=sharedMotionInputs(raw);
  const ids=referenceIds.filter(id=>!missing.some(m=>m.id===id)),n=ids.length;
  const common={thresholdMm:study.deviationMm,numericalSlackMm:MOTION_FIT_SLACK_MM,completePointIds:ids,missing,sourceIds:rows.map(r=>r.id),
    selectionConditioned:study.demonstrations.some(r=>r.spatialMapping),boundary};
  if(n>MAX_MOTION_GROUP_POINTS)return {...common,status:'capacity',groups:[],subsets:[],work:{pointLimit:MAX_MOTION_GROUP_POINTS},reason:'Complete grouping needs at most 12 fully observed reference points; ordinary pair discovery remains available.'};
  if(n<2)return {...common,status:'insufficient',groups:[],subsets:[],work:{pointLimit:MAX_MOTION_GROUP_POINTS},reason:'Fewer than two reference points are observed in every source.'};
  const sourcePairs=[];for(let a=0;a<rows.length;a++)for(let b=a+1;b<rows.length;b++)sourcePairs.push([rows[a],rows[b]]);
  const subsets=[],accepted=[];let fits=0,pointFits=0;
  const fitSubset=(members,full=false)=>{
    const motions=[];let maxResidualMm=0;
    for(const [a,b] of sourcePairs){
      const {fit,unavailable}=fitProperPointPattern(members.map(id=>({id,target:a.points.get(id),attempt:b.points.get(id)})));
      fits++;pointFits+=members.length;
      if(!fit)return {status:'unresolved-orientation',witness:{fromSourceId:a.id,toSourceId:b.id,reason:unavailable}};
      const maximum=Math.max(...fit.residuals.map(r=>r.errorMm));maxResidualMm=Math.max(maxResidualMm,maximum);
      if(maximum>study.deviationMm+MOTION_FIT_SLACK_MM)return {status:'outside-fit-threshold',witness:{fromSourceId:a.id,toSourceId:b.id,maxResidualMm:maximum,remainingRmsMm:fit.remainingRmsMm}};
      if(full)motions.push({fromSourceId:a.id,toSourceId:b.id,...fit,maxResidualMm:maximum});
    }
    return {status:'supported',maxResidualMm,...(full?{motions}:{})};
  };
  // Do not prune by immediate subset results: the maximum-residual test on an
  // L2-optimal fit is not hereditary. Every admitted subset is evaluated.
  for(let mask=1;mask<(1<<n);mask++){
    if(count(mask)<2)continue;
    const members=ids.filter((_,i)=>mask&(1<<i)),finding=fitSubset(members);
    const result={ids:members,...finding};subsets.push(result);
    if(finding.status==='supported')accepted.push({mask,result});
  }
  const maximal=accepted.filter(candidate=>!accepted.some(other=>other.mask!==candidate.mask&&(other.mask&candidate.mask)===candidate.mask))
    .sort((a,b)=>b.result.ids.length-a.result.ids.length||a.result.ids.join('\0').localeCompare(b.result.ids.join('\0')));
  const groups=maximal.map(({result})=>({ids:result.ids,...fitSubset(result.ids,true)}));
  const represented=new Set(groups.flatMap(g=>g.ids));
  return {...common,status:'complete',groups,subsets,ungroupedPointIds:ids.filter(id=>!represented.has(id)),
    counts:{evaluated:subsets.length,supported:accepted.length,maximal:groups.length,outsideFitThreshold:subsets.filter(s=>s.status==='outside-fit-threshold').length,unresolvedOrientation:subsets.filter(s=>s.status==='unresolved-orientation').length},
    work:{pointLimit:MAX_MOTION_GROUP_POINTS,sourcePairs:sourcePairs.length,fits,pointFits,maxSubsetFits:((1<<n)-n-1)*sourcePairs.length,maxSubsetPointFits:n*((1<<(n-1))-1)*sourcePairs.length}};
}
