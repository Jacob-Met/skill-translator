// Reuse explicitly reviewed forced subsets; never promote ambiguous full maps.
import {importSequencePath,createSequencePath,inspectSequencePath} from './sequence-path.mjs';
import {inspectSpatialCorrespondence,SPATIAL_CORRESPONDENCE_FORMAT} from './spatial-correspondence.mjs';
import {GeometryError} from './geometry.mjs';
export const REVIEWED_FORCED_POINT_PATHS_FORMAT='skill-translator.reviewed-forced-point-paths/v1';
export const MAX_REVIEWED_FORCED_POINT_PATH_BYTES=32*1024*1024;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const pairKey=p=>JSON.stringify([p.referenceId,p.observationId]);
export function createReviewedForcedPointPaths(seed,{anchorMomentId,deviationMm,maxStates=20000},reviews){
 return importReviewedForcedPointPaths({format:REVIEWED_FORCED_POINT_PATHS_FORMAT,seed,anchorMomentId,deviationMm,maxStates,reviews});
}
export function importReviewedForcedPointPaths(raw){
 check(raw?.format===REVIEWED_FORCED_POINT_PATHS_FORMAT,'Open a retained reviewed forced-point account.');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_REVIEWED_FORCED_POINT_PATH_BYTES,'Retain complete original forced-point evidence within 32 MiB.');
 const seed=importSequencePath(raw.seed),moments=new Map(seed.sequence.moments.map(m=>[m.id,m])),selected=new Map(seed.samples.map(s=>[s.momentId,s]));
 check(seed.samples.every(s=>s.markId!==null),'Complete selected seed identities are required; missing observations are not filled.');
 const anchor=selected.get(raw.anchorMomentId);
 check(anchor,'Retain one selected original anchor moment.');
 check(Array.isArray(raw.reviews)&&raw.reviews.length===seed.samples.length-1,'Retain one explicit forced-subset review per non-anchor selected moment.');
 const seen=new Set();
 const reviews=raw.reviews.map(review=>{
  const id=review?.momentId;
  check(id!==raw.anchorMomentId&&selected.has(id)&&!seen.has(id),'Review distinct selected non-anchor moments.');seen.add(id);
  check(review.semanticForcedPairsConfirmed===true,'Explicitly review every offered forced pair as the same task points.');
  const report=inspectSpatialCorrespondence({format:SPATIAL_CORRESPONDENCE_FORMAT,reference:moments.get(raw.anchorMomentId).calibratedTask,observation:moments.get(id).calibratedTask,deviationMm:raw.deviationMm,maxStates:raw.maxStates});
  check(report.complete&&report.forcedPairs.length>0,'Complete search must support at least one forced pair; no unresolved search or missing point is promoted.');
  check(Array.isArray(review.pairs)&&review.pairs.length===report.forcedPairs.length&&new Set(review.pairs.map(pairKey)).size===review.pairs.length&&review.pairs.map(pairKey).sort().join('\n')===report.forcedPairs.map(pairKey).sort().join('\n'),'Reviewed pairs must equal every recomputed forced pair; unresolved identities cannot be added.');
  const paired=report.forcedPairs.find(p=>p.referenceId===anchor.markId)?.observationId;
  check(paired===selected.get(id).markId,'Accepted seed choices must agree with the reviewed forced pairs.');
  return {momentId:id,semanticForcedPairsConfirmed:true,pairs:report.forcedPairs};
 }).sort((a,b)=>seed.samples.findIndex(s=>s.momentId===a.momentId)-seed.samples.findIndex(s=>s.momentId===b.momentId));
 return {format:REVIEWED_FORCED_POINT_PATHS_FORMAT,seed,anchorMomentId:raw.anchorMomentId,deviationMm:raw.deviationMm,maxStates:raw.maxStates??20000,reviews};
}
export function inspectReviewedForcedPointPaths(raw){
 const study=importReviewedForcedPointPaths(raw),{seed,reviews,anchorMomentId}=study,anchor=seed.sequence.moments.find(m=>m.id===anchorMomentId),anchorMarkId=seed.samples.find(s=>s.momentId===anchorMomentId).markId;
 const byMoment=new Map(reviews.map(r=>[r.momentId,new Map(r.pairs.map(p=>[p.referenceId,p.observationId]))]));
 const shared=anchor.calibratedTask.landmarks.filter(mark=>reviews.every(r=>byMoment.get(r.momentId).has(mark.id)));
 const paths=shared.filter(m=>m.id!==anchorMarkId).map(mark=>{
  const path=createSequencePath(seed.sequence,{label:mark.label,reference:seed.reference,samples:seed.samples.map(sample=>({momentId:sample.momentId,markId:sample.momentId===anchorMomentId?mark.id:byMoment.get(sample.momentId).get(mark.id),basis:'Point identity reused only from the original forced subset explicitly reviewed for this frame. Unresolved complete-map identities are excluded; the accepted seed supplies the separately declared fixed reference.'}))});
  return {referenceMarkId:mark.id,path,findings:inspectSequencePath(path)};
 });
 return {study,anchorMomentId,anchorMarkId,reviewedFrameCount:reviews.length,sharedForcedReferenceIds:shared.map(m=>m.id),excludedReferenceIds:anchor.calibratedTask.landmarks.filter(m=>!shared.some(s=>s.id===m.id)).map(m=>m.id),paths,
  boundary:'Only point identities forced in every completely searched original mapping and explicitly reviewed in every selected frame are reused. Complete-map ambiguity remains; unforced points are excluded. The seed contributes its independently declared common plane and corner meanings, not another point’s task role. Original coordinates are not fitted or transformed. Pair-distance agreement and a supplied review do not establish physical identity, intervening travel or skill.'};
}
