import {GeometryError} from './geometry.mjs';
import {reopenFeatureClearance} from './feature-clearance.mjs';
import {createRehearsal,importRehearsal,inspectRehearsal} from './transfer-rehearsal.mjs';
import {inspectFeaturePlacements} from './feature-placement.mjs';
export const FEATURE_REHEARSAL_SCHEMA='skill-translator-feature-rehearsal/v1';
export const FEATURE_REHEARSAL_LIMIT=2*1024*1024;
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function createFeatureRehearsal(comparison,rehearsal,selectedTrial=1){
 const {bundle}=reopenFeatureClearance(comparison),session=importRehearsal(rehearsal);
 fail(same(bundle.source,session.source),'Rehearsal source, annotations, rules and tolerances must exactly match the feature comparison');
 fail(same(bundle.workpieces,session.plan),'The complete ordered rehearsal plan must exactly match every declared comparison size');
 fail(Number.isInteger(selectedTrial)&&selectedTrial>=1&&selectedTrial<=session.plan.length,'Select one retained rehearsal trial');
 const result={schema:FEATURE_REHEARSAL_SCHEMA,comparison:bundle,rehearsal:session,selectedTrial};
 fail(new TextEncoder().encode(JSON.stringify(result)).byteLength<=FEATURE_REHEARSAL_LIMIT,'Complete feature-rehearsal inputs exceed 2 MiB');return result;
}
export function importFeatureRehearsal(raw){fail(raw?.schema===FEATURE_REHEARSAL_SCHEMA,'Unsupported feature-rehearsal schema');return createFeatureRehearsal(raw.comparison,raw.rehearsal,raw.selectedTrial);}
export function exportFeatureRehearsal(raw){return JSON.stringify(importFeatureRehearsal(raw));}
export function reviewFeatureRehearsal(raw){
 const bundle=importFeatureRehearsal(raw),state=inspectRehearsal(bundle.rehearsal),c=bundle.comparison;
 const trials=state.trials.map((trial,index)=>({index:index+1,widthMm:trial.widthMm,heightMm:trial.heightMm,started:trial.started,submitted:trial.submitted,assistance:trial.assistance,reveals:structuredClone(trial.reveals),
  // Do not compute or expose target/actual pair feedback before commitment.
  assessment:trial.submitted?inspectFeaturePlacements(c.source,trial.widthMm,trial.heightMm,c.features,c.requiredGapMm,trial.attempts):null}));
 return {selectedTrial:bundle.selectedTrial,complete:state.complete,trials,limitations:state.limitations};
}
export function featureRehearsalInput(comparison){const {bundle}=reopenFeatureClearance(comparison);return createRehearsal(bundle.source,bundle.workpieces);}
