import {GeometryError} from './geometry.mjs';
import {createRelationshipReview,evaluateRelationships} from './task-relationships.mjs';
import {discoverRelationships} from './relationship-discovery.mjs';
export const PAIR_INTERPRETATIONS_SCHEMA='skill-translator-pair-interpretations/v1';
export const DISCOVERED_PAIR_SCHEMA='skill-translator-pair-interpretations/v2';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export function createPairInterpretations(source,session,pair,basis,discoveryEvidence=null){
 fail(typeof basis==='string'&&basis.trim().length>0&&basis.length<=2000,'State a basis for comparing these two interpretations (up to 2000 characters)');
 fail(pair?.kind==='distance','Compare a nominal pair distance');
 const accepted=createRelationshipReview(source,session,[pair]);
 let discovery=null;
 if(discoveryEvidence!==null){
  const checked=discoverRelationships(discoveryEvidence.study),candidate=checked.candidates.find(c=>c.id===discoveryEvidence.candidateId);
  fail(candidate?.status==='repeatable'&&candidate.kind===pair.kind&&candidate.from===pair.from&&candidate.to===pair.to,'The selected discovered pair must still be repeatable and match this declaration');
  fail(JSON.stringify(canonical(checked.study.demonstrations[0].annotation))===JSON.stringify(canonical(source)),'Discovered pair reference differs from this practice source');
  discovery={study:checked.study,candidateId:candidate.id};
 }
 const result={schema:discovery?DISCOVERED_PAIR_SCHEMA:PAIR_INTERPRETATIONS_SCHEMA,source:accepted.source,session:accepted.session,pair:accepted.rules[0],basis,...(discovery?{discoveryEvidence:discovery}:{})};
 fail(!discovery||new TextEncoder().encode(JSON.stringify(result)).length<=2_000_000,'Complete discovered-pair record exceeds 2 MB; no original source is discarded');
 return result;
}
export function importPairInterpretations(raw){
 fail([PAIR_INTERPRETATIONS_SCHEMA,DISCOVERED_PAIR_SCHEMA].includes(raw?.schema),'Unsupported pair interpretation record');
 fail(raw.schema!==DISCOVERED_PAIR_SCHEMA||raw.discoveryEvidence,'A v2 discovered-pair record requires its original discovery evidence');
 fail(raw.schema!==PAIR_INTERPRETATIONS_SCHEMA||raw.discoveryEvidence===undefined,'Discovery evidence requires the v2 pair format');
 return createPairInterpretations(raw.source,raw.session,raw.pair,raw.basis,raw.discoveryEvidence??null);
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

