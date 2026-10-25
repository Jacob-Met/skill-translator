import {GeometryError} from './geometry.mjs';
import {createRelationshipReview,evaluateRelationships} from './task-relationships.mjs';
export const PAIR_INTERPRETATIONS_SCHEMA='skill-translator-pair-interpretations/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createPairInterpretations(source,session,pair,basis){
 fail(typeof basis==='string'&&basis.trim().length>0&&basis.length<=2000,'State a basis for comparing these two interpretations (up to 2000 characters)');
 fail(pair?.kind==='distance','Compare a nominal pair distance');
 const accepted=createRelationshipReview(source,session,[pair]);
 return {schema:PAIR_INTERPRETATIONS_SCHEMA,source:accepted.source,session:accepted.session,pair:accepted.rules[0],basis};
}
export function importPairInterpretations(raw){
 fail(raw?.schema===PAIR_INTERPRETATIONS_SCHEMA,'Unsupported pair interpretation record');
 return createPairInterpretations(raw.source,raw.session,raw.pair,raw.basis);
}
export function assessPairInterpretations(raw){
 const accepted=importPairInterpretations(raw),{source,session,pair,basis}=accepted;
 // Obtain nominal source distance using the maintained target calculation at
 // the original sheet dimensions. Never admit actual placements on that sheet:
 // their bounds and source custody belong to the retained practice session.
 const original=evaluateRelationships(source,source.source.widthMm,source.source.heightMm,[],[pair]);
 const sourceExpectedMm=original.results[0].expectedMm;
 const {widthMm,heightMm}=session.reference.target;
 const rounds=[...session.history,{round:session.round,attempts:session.attempts,
  ...(session.photoObservation?{photoObservation:session.photoObservation}:{}),
  ...(session.detachedPhotoMarks?{detachedPhotoMarks:session.detachedPhotoMarks}:{})}].map(round=>{
  const native=evaluateRelationships(source,widthMm,heightMm,round.attempts,[pair]),adapted=native.results[0];
  const differenceMm=adapted.observedMm===null?null:adapted.observedMm-sourceExpectedMm;
  // Same nominal 1e-9 comparison allowance as task-relationships/v1; this is
  // numerical comparison policy, not a calibration uncertainty bound.
  const fixed={...adapted,expectedMm:sourceExpectedMm,differenceMm,
   status:adapted.missing.length?'incomplete':Math.abs(differenceMm)<=pair.toleranceMm+1e-9?'within':'outside'};
  return {round:round.round,originalPractice:native.practice,adapted,fixed,
   ...(round.photoObservation?{photoObservation:round.photoObservation}:{}),
   ...(round.detachedPhotoMarks?{detachedPhotoMarks:round.detachedPhotoMarks}:{}),
   assessmentRelation:fixed.status==='incomplete'?'incomplete':fixed.status===adapted.status?'same-assessment':'different-assessments'};
 });
 return {basis,pair,sourceExpectedMm,adaptedExpectedMm:rounds[0].adapted.expectedMm,
  expectationsCoincide:sourceExpectedMm===rounds[0].adapted.expectedMm,
  sourcePoints:original.practice.results.filter(p=>p.id===pair.from||p.id===pair.to),rounds,
  limitations:[
   'These are two conditional interpretations of the same actual placements. Neither is automatically adopted or established necessary for the physical task.',
   'Distances are nominal calibrated values; no annotation or calibration uncertainty is propagated. The numerical comparison allowance is not an uncertainty certificate.',
   'Equal expected distances cannot distinguish these interpretations. Equal within/outside assessments can also occur for different expectations.',
   'Original per-mark rules, placement scores, missing endpoints and admitted photo/manual provenance remain separate. No correction or learner-intent inference is made.',
   'A basis may be declared after seeing outcomes; declaration timing is not authenticated.'
  ]};
}
