import {importPhotoFocus,photoFocusedPractice} from './photo-focus.mjs';
import {importPractice,createPractice,observePractice} from './practice.mjs';
import {createReview} from './practice-review.mjs';
import {createPhotoRoundFeedback} from './photo-round-feedback.mjs';
import {photoReadingSource,createPhotoCalibrationReadings,inspectPhotoCalibrationReadings} from './photo-calibration-readings.mjs';
export const PHOTO_FOCUS_RETURN_SCHEMA='skill-translator-photo-focus-return/v1';
export const PHOTO_FOCUS_RETURN_BYTES=10000000;
const fail=(ok,message)=>{if(!ok)throw Error(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const roundFor=(session,n)=>n===session.round?session:session.history.find(r=>r.round===n);
const stripReading=({id,label,basis,corners})=>({id,label,basis,corners});
function admit(focus,session,round,declaration,readings){
 const accepted=importPhotoFocus(focus),setup=photoFocusedPractice(accepted),received=importPractice(setup.demo,setup.widthMm,setup.heightMm,session);
 fail(Number.isInteger(round)&&round>=1&&round<=received.round,'Choose a retained returned-session photo round');
 const selected=roundFor(received,round);fail(selected.photoObservation,'The returned round needs retained photo evidence');
 for(const id of accepted.selectedIds){fail(selected.attempts.some(p=>p.id===id)&&selected.photoObservation.points.some(p=>p.id===id),`Returned photo is missing selected mark ${id}`);fail(!selected.detachedPhotoMarks?.includes(id),`Returned annotation ${id} is detached`);}
 fail(Array.isArray(readings)&&readings.length<=3,'Use at most three returned-photo corner alternatives');
 // Reuse maintained admission and exact bounds through a transient vehicle only.
 const baseline=photoReadingSource(accepted.investigation.source,'after'),project=observation=>({...structuredClone(observation),points:observation.points.filter(p=>accepted.selectedIds.includes(p.id)).map(p=>structuredClone(p))});
 let vehicle=createPractice(setup.demo,setup.widthMm,setup.heightMm);
 for(const observation of [project(baseline.observation),project(selected.photoObservation)])vehicle=observePractice(setup.demo,setup.widthMm,setup.heightMm,vehicle,observation);
 const base=createPhotoRoundFeedback(createReview(setup.demo,vehicle),{before:accepted.investigation.source.declarations.after,after:declaration});
 const matrix=createPhotoCalibrationReadings(base,{before:accepted.investigation.readings.after.map(stripReading),after:readings.map(stripReading)}),report=inspectPhotoCalibrationReadings(matrix);
 fail(same([...report.commonMarks].sort(),[...accepted.selectedIds].sort()),'Every explicitly selected mark must remain in every comparison');
 const raw={schema:PHOTO_FOCUS_RETURN_SCHEMA,focus:accepted,session:received,round,declaration:base.declarations.after,readings:matrix.readings.after.map(stripReading)};
 raw.reference={selectedIds:[...accepted.selectedIds],baseline:structuredClone(baseline),returned:{round,observation:structuredClone(selected.photoObservation)},practice:structuredClone(received.reference)};
 return {raw,report,matrix,baseline,selected};
}
export function createPhotoFocusReturn(focus,session,round,declaration,readings=[]){return admit(focus,session,round,declaration,readings).raw;}
export function importPhotoFocusReturn(raw){fail(raw?.schema===PHOTO_FOCUS_RETURN_SCHEMA,'Unsupported linked photo return');const next=admit(raw.focus,raw.session,raw.round,raw.declaration,raw.readings);fail(same(raw.reference,next.raw.reference),'Linked photo sources differ from their saved reference');return next.raw;}
export function inspectPhotoFocusReturn(input){const raw=importPhotoFocusReturn(input),{report,baseline,selected}=admit(raw.focus,raw.session,raw.round,raw.declaration,raw.readings);return {...report,baselineRound:baseline.round,returnedRound:raw.round,selectedIds:[...raw.focus.selectedIds],reusedImage:baseline.observation.image.sha256.toLowerCase()===selected.photoObservation.image.sha256.toLowerCase(),semantics:report.semantics+' Original baseline and returned session are separate records. Selection does not prove a drill occurred. Conditional placement ordering does not establish learning or practice effectiveness.'};}
export function photoFocusReturnSources(input){const raw=importPhotoFocusReturn(input);return {before:photoReadingSource(raw.focus.investigation.source,'after').observation,after:structuredClone(roundFor(raw.session,raw.round).photoObservation)};}
export function exportPhotoFocusReturn(raw){const text=JSON.stringify(importPhotoFocusReturn(raw),null,2);fail(new TextEncoder().encode(text).length<=PHOTO_FOCUS_RETURN_BYTES,'Linked photo return exceeds 10 MB');return text;}
