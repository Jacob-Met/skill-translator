// Reuse complete reviewed identities; never infer them from saved basis prose.
import {importSequencePath,createSequencePath,inspectSequencePath} from './sequence-path.mjs';
import {reviewedSpatialMappingForSources} from './spatial-correspondence.mjs';
import {GeometryError} from './geometry.mjs';
export const REVIEWED_POINT_PATHS_FORMAT='skill-translator.reviewed-point-paths/v1';
export const MAX_REVIEWED_POINT_PATH_BYTES=32*1024*1024;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createReviewedPointPaths(seed,reviews){return importReviewedPointPaths({format:REVIEWED_POINT_PATHS_FORMAT,seed,reviews});}
export function importReviewedPointPaths(raw){
 check(raw?.format===REVIEWED_POINT_PATHS_FORMAT,'Open a complete retained point-mapping account.');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_REVIEWED_POINT_PATH_BYTES,'Retain the complete original mapping account within32 MiB.');
 const seed=importSequencePath(raw.seed);
 check(seed.samples.every(s=>s.markId!==null),'Complete selected point identities are required; missing observations are not filled.');
 check(Array.isArray(raw.reviews)&&raw.reviews.length===seed.samples.length-1,'Retain exactly one complete reviewed mapping per non-anchor selected moment.');
 const first=raw.reviews[0],anchorId=first?.anchor?.momentId,anchorMark=first?.anchor?.markId,moments=new Map(seed.sequence.moments.map(m=>[m.id,m])),selected=new Map(seed.samples.map(s=>[s.momentId,s]));
 check(typeof anchorId==='string'&&selected.get(anchorId)?.markId===anchorMark,'The original review anchor must agree with the accepted seed point.');
 const anchor=moments.get(anchorId),seen=new Set();
 const reviews=raw.reviews.map(review=>{
  const id=review.sample?.momentId;
  check(review.anchor?.momentId===anchorId&&review.anchor?.markId===anchorMark&&id!==anchorId&&selected.has(id)&&!seen.has(id),'Retain distinct selected target moments with one consistent original anchor.');seen.add(id);
  const reviewedMapping=reviewedSpatialMappingForSources(review.reviewedMapping,anchor.calibratedTask,moments.get(id).calibratedTask);
  const paired=reviewedMapping.pairs.find(p=>p.referenceId===anchorMark)?.observationId;
  check(paired===selected.get(id).markId&&review.sample.markId===paired,'The accepted point choices and retained complete mapping disagree.');
  return {anchor:{momentId:anchorId,markId:anchorMark},sample:{momentId:id,markId:paired},reviewedMapping};
 }).sort((a,b)=>seed.samples.findIndex(s=>s.momentId===a.sample.momentId)-seed.samples.findIndex(s=>s.momentId===b.sample.momentId));
 return {format:REVIEWED_POINT_PATHS_FORMAT,seed,reviews};
}
export function inspectReviewedPointPaths(raw){
 const study=importReviewedPointPaths(raw),{seed,reviews}=study,anchorId=reviews[0].anchor.momentId,anchorMark=reviews[0].anchor.markId,anchor=seed.sequence.moments.find(m=>m.id===anchorId);
 const pairsByMoment=new Map(reviews.map(r=>[r.sample.momentId,new Map(r.reviewedMapping.pairs.map(p=>[p.referenceId,p.observationId]))]));
 const paths=anchor.calibratedTask.landmarks.filter(mark=>mark.id!==anchorMark).map(mark=>{
  const path=createSequencePath(seed.sequence,{label:mark.label,reference:seed.reference,samples:seed.samples.map(sample=>({momentId:sample.momentId,markId:sample.momentId===anchorId?mark.id:pairsByMoment.get(sample.momentId).get(mark.id),basis:'Point identity reused from the retained source-bound complete mapping already reviewed for this frame. The accepted seed supplies only the separately declared fixed reference, not this point’s task role.'}))});
  return {referenceMarkId:mark.id,path,findings:inspectSequencePath(path)};
 });
 return {study,anchorMomentId:anchorId,anchorMarkId:anchorMark,reviewedMappingCount:reviews.length,paths,boundary:'These additional point identities reuse complete original mappings already reviewed as the same task points. The accepted seed supplies only its separately declared common plane and corner meanings. Original coordinates are not fitted, transformed or rescaled; each point keeps its own original identity and label. No additional task role, physical motion between frames or skill is inferred.'};
}
