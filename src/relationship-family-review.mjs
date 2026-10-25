/** Compare inferred alternatives with actual native practice, without inventing a tolerance. */
import {importPractice,evaluatePractice} from './practice.mjs';
import {predictRelationshipFamilies} from './relationship-families.mjs';
import {importRelationshipDiscovery} from './relationship-discovery.mjs';
export const FAMILY_REVIEW_FORMAT='skill-translator.relationship-family-review/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
function accept(raw,pairId,target,session){
 const study=importRelationshipDiscovery(raw),inference=predictRelationshipFamilies(study,target);
 check(inference.pairs.some(p=>p.id===pairId),'Choose an automatically enumerated source pair and relation');
 const result={format:FAMILY_REVIEW_FORMAT,study,pairId,target:inference.target,session};
 check(new TextEncoder().encode(JSON.stringify(result)).length<=2_000_000,'Complete family review exceeds 2 MB; no source is discarded');return result;
}
export function createRelationshipFamilyReview(raw,pairId,session){
 const study=importRelationshipDiscovery(raw),source=study.demonstrations[0].annotation,target=session?.reference?.target;
 check(target,'Supply an actual native practice session');
 return accept(study,pairId,target,importPractice(source,target.widthMm,target.heightMm,session));
}
export function createFreshRelationshipFamilyReview(study,pairId,target){return accept(study,pairId,target,null);}
export function importRelationshipFamilyReview(raw){
 check(raw?.format===FAMILY_REVIEW_FORMAT,'Unsupported relationship-family review');
 if(raw.session===null)return createFreshRelationshipFamilyReview(raw.study,raw.pairId,raw.target);
 const review=createRelationshipFamilyReview(raw.study,raw.pairId,raw.session);
 check(raw.target?.widthMm===review.target.widthMm&&raw.target?.heightMm===review.target.heightMm,'Retained actual practice and comparison dimensions differ');return review;
}
export function assessRelationshipFamilyReview(raw){
 const review=importRelationshipFamilyReview(raw),source=review.study.demonstrations[0].annotation,target=review.target;
 const inference=predictRelationshipFamilies(review.study,target),pair=inference.pairs.find(p=>p.id===review.pairId);
 const measure=(a,b)=>pair.kind==='distance'?Math.hypot(b.xMm-a.xMm,b.yMm-a.yMm):pair.kind==='horizontal'?b.xMm-a.xMm:b.yMm-a.yMm;
 const retained=review.session?[...review.session.history,{round:review.session.round,attempts:review.session.attempts,
  ...(review.session.photoObservation?{photoObservation:review.session.photoObservation}:{}),
  ...(review.session.detachedPhotoMarks?{detachedPhotoMarks:review.session.detachedPhotoMarks}:{})}]:[];
 const rounds=retained.map(round=>{
  const originalPractice=evaluatePractice(source,target.widthMm,target.heightMm,round.attempts),a=originalPractice.results.find(p=>p.id===pair.from),b=originalPractice.results.find(p=>p.id===pair.to),missing=[a,b].filter(p=>!p.placed).map(p=>p.id),observedMm=missing.length?null:measure(a.attempt,b.attempt);
  return {round:round.round,originalPractice,observedMm,missing,
   ...(round.photoObservation?{photoObservation:round.photoObservation}:{}),
   ...(round.detachedPhotoMarks?{detachedPhotoMarks:round.detachedPhotoMarks}:{}),
   alternatives:pair.predictions.map(prediction=>({...prediction,differenceMm:observedMm===null?null:observedMm-prediction.expectedMm,status:observedMm===null?'incomplete':'observed'}))};
 });
 return {review,pair,rounds,limitation:'Differences compare the same retained actual placements with every surviving source-conditioned hypothesis. No relationship execution tolerance was inferred or supplied, so these residuals do not pass or fail the skill. Existing point scores remain separate and unchanged; a closer prediction does not establish learner intent or physical necessity.'};
}
