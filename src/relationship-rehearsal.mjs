// Retain raw rehearsal custody and reuse the maintained pair evaluator.
import {GeometryError} from './geometry.mjs';
import {importRehearsal,inspectRehearsal} from './transfer-rehearsal.mjs';
import {validateRelationships,evaluateRelationships,importRelationshipReview} from './task-relationships.mjs';
export const RELATIONSHIP_REHEARSAL_SCHEMA='skill-translator-relationship-rehearsal/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export function createRelationshipRehearsal(rehearsal,rules=[]){
 const session=importRehearsal(rehearsal),checked=validateRelationships(session.source,rules);
 const bundle={schema:RELATIONSHIP_REHEARSAL_SCHEMA,rehearsal:session,rules:checked};
 fail(new TextEncoder().encode(JSON.stringify(bundle)).length<=2*1024*1024,'Relationship rehearsal exceeds 2 MiB');
 return bundle;
}
export function importRelationshipRehearsal(raw){
 fail(raw?.schema===RELATIONSHIP_REHEARSAL_SCHEMA,'Unsupported relationship rehearsal schema');
 fail(new TextEncoder().encode(JSON.stringify(raw)).length<=2*1024*1024,'Relationship rehearsal exceeds 2 MiB');
 return createRelationshipRehearsal(raw.rehearsal,raw.rules);
}
export const exportRelationshipRehearsal=raw=>JSON.stringify(importRelationshipRehearsal(raw));
export function applyRehearsalRelationshipReview(raw,review){
 const bundle=importRelationshipRehearsal(raw),accepted=importRelationshipReview(review);
 fail(JSON.stringify(canonical(bundle.rehearsal.source))===JSON.stringify(canonical(accepted.source)),'Relationship criteria must match the complete original rehearsal source');
 return createRelationshipRehearsal(bundle.rehearsal,accepted.rules);
}
export function reviewRelationshipRehearsal(raw){
 const bundle=importRelationshipRehearsal(raw),state=inspectRehearsal(bundle.rehearsal);
 return {complete:state.complete,trials:state.trials.map((trial,index)=>({index:index+1,widthMm:trial.widthMm,heightMm:trial.heightMm,started:trial.started,submitted:trial.submitted,assistance:trial.assistance,reveals:structuredClone(trial.reveals),assessment:trial.submitted?evaluateRelationships(bundle.rehearsal.source,trial.widthMm,trial.heightMm,trial.attempts,bundle.rules):null})),limitations:[...state.limitations,'Relationship criteria may have been selected after seeing placements; their timing is not authenticated.','Pair relationships and original positional scores are separate criteria.']};
}
