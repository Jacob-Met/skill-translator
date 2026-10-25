// Explicit finite learner-photo readings. Original rounds are never rewritten.
import {importPhotoRoundFeedback,inspectPhotoRoundFeedback,createPhotoRoundFeedback} from './photo-round-feedback.mjs';
import {annotationContext} from './annotation-bound.mjs';
import {createPractice,observePractice} from './practice.mjs';
import {createReview} from './practice-review.mjs';
export const PHOTO_READING_SCHEMA='skill-translator-photo-calibration-readings/v1';
export const PHOTO_READING_LIMITS=Object.freeze({alternativesPerPhoto:3,scenarios:16,bytes:6000000});
const fail=(ok,message)=>{if(!ok)throw Error(message);};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function photoReadingSource(base,side){
 fail(['before','after'].includes(side),'Choose the earlier or later photo');
 const r=base.review,n=side==='before'?r.baselineRound:r.comparisonRound,round=n===r.session.round?r.session:r.session.history.find(x=>x.round===n);
 return {round:n,observation:structuredClone(round.photoObservation)};
}
function setup(base){const {demo,session}=base.review;return {demo,session,...session.reference.target};}
function alternatives(base,side,inputs){
 fail(Array.isArray(inputs)&&inputs.length<=PHOTO_READING_LIMITS.alternativesPerPhoto,'Use at most three alternatives per photograph');const ids=new Set(['original']),source=photoReadingSource(base,side);
 return inputs.map(input=>{
  fail(input&&typeof input.id==='string'&&/^[a-z0-9-]{1,40}$/.test(input.id)&&!ids.has(input.id),'Use distinct reading IDs other than original');ids.add(input.id);
  fail(typeof input.label==='string'&&input.label.trim().length>0&&input.label.trim().length<=160,'Name each reading in 1–160 characters');
  fail(['proposed-reading','repeat-annotation'].includes(input.basis),'Declare a proposed reading or repeated annotation');
  fail(Array.isArray(input.corners)&&input.corners.length===4,'Supply four corners in TL, TR, BR, BL order');
  fail(input.corners.every(p=>p&&Object.keys(p).length===2&&Object.hasOwn(p,'x')&&Object.hasOwn(p,'y')),'Each corner must contain only x and y');
  const observation={...source.observation,calibration:{...source.observation.calibration,corners:input.corners}};
  const admitted=annotationContext(setup(base),observation).observation;
  fail(same(admitted.image,source.observation.image)&&same(admitted.points,source.observation.points),'A reading cannot change original image identity or annotation pixels');
  return {id:input.id,label:input.label.trim(),basis:input.basis,corners:admitted.calibration.corners,reference:source};
 });
}
function admit(base,readings){const source=importPhotoRoundFeedback(base);inspectPhotoRoundFeedback(source);return {schema:PHOTO_READING_SCHEMA,source,readings:{before:alternatives(source,'before',readings?.before??[]),after:alternatives(source,'after',readings?.after??[])}};}
export function createPhotoCalibrationReadings(base,readings={before:[],after:[]}){const accepted=admit(base,readings);evaluate(accepted);return accepted;}
function receive(raw){fail(raw?.schema===PHOTO_READING_SCHEMA,'Unsupported photo-calibration reading file');const accepted=admit(raw.source,raw.readings);for(const side of ['before','after']){fail(raw.readings?.[side]?.length===accepted.readings[side].length,'Retain complete reading lists');raw.readings[side].forEach((input,i)=>fail(same(input.reference,accepted.readings[side][i].reference),'Reading belongs to a different retained photo or round'));}return accepted;}
export function importPhotoCalibrationReadings(raw){const accepted=receive(raw);evaluate(accepted);return accepted;}
function readingList(input,side){const source=photoReadingSource(input.source,side);return [{id:'original',label:'Original retained corners',basis:'original',corners:source.observation.calibration.corners,reference:source},...input.readings[side]];}
function evaluate(input){
 const base=input.source,original=inspectPhotoRoundFeedback(base),lists={before:readingList(input,'before'),after:readingList(input,'after')};fail(lists.before.length*lists.after.length<=PHOTO_READING_LIMITS.scenarios,'Complete scenario matrix exceeds capacity');
 const {demo,session:retained}=base.review,{widthMm,heightMm}=retained.reference.target,scenarios=[];
 for(const before of lists.before)for(const after of lists.after){
  // A fresh in-memory calculation vehicle reuses maintained admission/aggregation.
  // It is not returned as practice, saved as an attempt, or installed in original state.
  let session=createPractice(demo,widthMm,heightMm);
  for(const reading of [before,after]){const observation=structuredClone(reading.reference.observation);observation.calibration.corners=structuredClone(reading.corners);session=observePractice(demo,widthMm,heightMm,session,observation);}
  const scenario=createPhotoRoundFeedback(createReview(demo,session),base.declarations),report=inspectPhotoRoundFeedback(scenario);
  fail(same(report.commonMarks,original.commonMarks),'Scenario must retain the exact original fixed common-mark set');
  scenarios.push({beforeId:before.id,afterId:after.id,status:report.status,rounds:report.rounds.map((round,i)=>({...round,round:i?base.review.comparisonRound:base.review.baselineRound}))});
 }
 const statuses=new Set(scenarios.map(s=>s.status)),status=statuses.size===1?(statuses.has('conditional-decrease')?'all-named-readings-decrease':statuses.has('conditional-increase')?'all-named-readings-increase':'all-unresolved'):statuses.has('conditional-increase')&&statuses.has('conditional-decrease')?'reading-sensitive':'direction-unresolved';
 return {status,commonMarks:original.commonMarks,excludedMissingMarks:original.excludedMissingMarks,readings:lists,scenarios,semantics:'Only these named finite corner readings were evaluated. Each photo uses one shared calibration across every common mark. Original image bytes, mark pixels and practice rounds are retained unchanged. No continuous calibration bound, probability, independent replication or learning effect is established. Mapping guards remain engineering allowances, not physical accuracy guarantees.'};
}
export function inspectPhotoCalibrationReadings(raw){return evaluate(receive(raw));}
export function exportPhotoCalibrationReadings(raw){const text=JSON.stringify(importPhotoCalibrationReadings(raw),null,2);fail(new TextEncoder().encode(text).length<=PHOTO_READING_LIMITS.bytes,'Reading file exceeds 6 MB');return text;}
