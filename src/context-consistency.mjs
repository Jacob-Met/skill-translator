/** Explicit comparable-context declarations over unchanged source-bound evidence. */
import {derive} from './geometry.mjs';
import {validateCapturedDemo} from './capture.mjs';
import {importEvidence,exportEvidence,analyzeEvidence} from './evidence.mjs';
export const CONTEXT_SCHEMA='skill-translator-context-consistency/v1';
export const CONTEXT_INPUT_SCHEMA='skill-translator-context-input/v1';
export const MAX_CONTEXT_BYTES=2_000_000;
const fail=m=>{throw Error(m);};
const copy=v=>JSON.parse(JSON.stringify(v));
function capacity(v){if(new TextEncoder().encode(JSON.stringify(v)).length>MAX_CONTEXT_BYTES)fail('The complete context account exceeds 2 MB; no records are discarded.');}
function text(v,n,name){if(typeof v!=='string'||!v.trim()||v.trim().length>n)fail(`${name} needs 1–${n} characters.`);return v.trim();}
export function readContextInput(value){
 if(!value||![CONTEXT_SCHEMA,CONTEXT_INPUT_SCHEMA,'skill-translator-task-space/v1'].includes(value.schema))fail('Choose an original task-space export or saved context account.');
 capacity(value);const source=copy(value.source);const task=derive(source);if(source.source?.image)validateCapturedDemo(source);
 const observationEvidence=exportEvidence(source,importEvidence(source,value.observationEvidence));
 if(value.selectedMark!==undefined&&!task.landmarks.some(m=>m.id===value.selectedMark))fail('The selected mark is not in the retained source.');
 const input={schema:CONTEXT_INPUT_SCHEMA,source,observationEvidence,...(value.selectedMark!==undefined?{selectedMark:value.selectedMark}:{})};
 if(value.schema===CONTEXT_SCHEMA)return createContextStudy(input,value.group);
 return input;
}
export function createContextStudy(input,raw){
 // Normalize input only; avoid recursively admitting an existing saved group.
 const base=readContextInput({schema:CONTEXT_INPUT_SCHEMA,source:input.source,observationEvidence:input.observationEvidence});
 if(raw?.comparable!==true)fail('Explicitly declare that the selected records represent comparable conditions.');
 const label=text(raw.label,160,'Context label'),basis=text(raw.basis,1600,'Basis for treating the conditions as comparable');
 if(!Array.isArray(raw.observationIds)||raw.observationIds.length<2||raw.observationIds.length>60||new Set(raw.observationIds).size!==raw.observationIds.length)fail('Select 2–60 distinct retained observations.');
 const rows=base.observationEvidence.observations,map=new Map(rows.map(o=>[o.id,o]));
 const selected=raw.observationIds.map(id=>map.get(id));if(selected.some(o=>!o))fail('Every selected observation must belong to the retained source evidence.');
 const first=selected[0];
 if(typeof raw.landmarkId!=='string'||selected.some(o=>o.landmarkId!==raw.landmarkId))fail('Select observations of one declared source landmark.');
 if(selected.some(o=>o.widthMm!==first.widthMm||o.heightMm!==first.heightMm))fail('A comparable context requires exactly equal declared sheet dimensions.');
 const account={schema:CONTEXT_SCHEMA,source:base.source,observationEvidence:base.observationEvidence,group:{label,basis,comparable:true,landmarkId:raw.landmarkId,observationIds:[...raw.observationIds].sort()}};
 capacity(account);return account;
}
export function validateContextStudy(value){if(value?.schema!==CONTEXT_SCHEMA)fail('Choose a saved comparable-context account.');return readContextInput(value);}
export function contextRows(value){const account=validateContextStudy(value),ids=new Set(account.group.observationIds);return {account,rows:account.observationEvidence.observations.filter(o=>ids.has(o.id)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};}
export function contextOriginalRules(value){const {account}=contextRows(value);return analyzeEvidence(account.source,account.group.landmarkId,account.observationEvidence.observations);}
