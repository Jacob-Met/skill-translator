import {GeometryError} from './geometry.mjs';
import {importPractice} from './practice.mjs';
import {inspectFeaturePlacements} from './feature-placement.mjs';
import {reopenFeatureClearance} from './feature-clearance.mjs';
export const FEATURE_PRACTICE_SCHEMA='skill-translator-feature-practice/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createFeaturePractice(comparison,session,selectedRound=session?.round){
 const {bundle}=reopenFeatureClearance(comparison);
 const target=session?.reference?.target;
 fail(target&&bundle.workpieces.some(s=>s.widthMm===target.widthMm&&s.heightMm===target.heightMm),
  'Practice dimensions must exactly match a declared workpiece size');
 const accepted=importPractice(bundle.source,target.widthMm,target.heightMm,session);
 fail(Number.isInteger(selectedRound)&&selectedRound>=1&&selectedRound<=accepted.round,'Select a retained practice round');
 return {schema:FEATURE_PRACTICE_SCHEMA,comparison:bundle,session:accepted,selectedRound};
}
export function importFeaturePractice(raw){
 fail(raw?.schema===FEATURE_PRACTICE_SCHEMA,'Unsupported feature-practice review schema');
 return createFeaturePractice(raw.comparison,raw.session,raw.selectedRound??NaN);
}
export function reviewFeaturePractice(raw){
 const accepted=importFeaturePractice(raw),{comparison,session,selectedRound}=accepted;
 const round=selectedRound===session.round?session:session.history[selectedRound-1];
 const {widthMm,heightMm}=session.reference.target;
 const {practice,pairs,complete,meetsAll}=inspectFeaturePlacements(comparison.source,widthMm,heightMm,comparison.features,comparison.requiredGapMm,round.attempts);
 return {widthMm,heightMm,selectedRound,currentRound:session.round,practice,pairs,
  complete,meetsAll,
  photoObservation:round.photoObservation??null,detachedPhotoMarks:round.detachedPhotoMarks??[]};
}

