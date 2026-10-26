/** Compose separately supported marks; inference stays with raw-rule-proposals. */
import {inspectRawRuleProposals} from './raw-rule-proposals.mjs';
import {validateDemonstrationResponse} from './response-demonstrations.mjs';
import {derive,adapt} from './geometry.mjs';
export const RAW_TASK_FORMAT='skill-translator.raw-task-proposals/v1';
export const MAX_RAW_TASK_BYTES=2_000_000;
const copy=value=>structuredClone(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const identity=value=>JSON.stringify(canonical(value));
function bounded(raw){if(new TextEncoder().encode(JSON.stringify(raw)).length>MAX_RAW_TASK_BYTES)throw Error('Complete task account exceeds 2 MB; no supporting source was discarded.');}
export function importRawTask(input){
 if(input?.format!==RAW_TASK_FORMAT)throw Error('Unsupported raw task proposal account.');
 bounded(input);
 if(!Array.isArray(input.accounts)||input.accounts.length<1||input.accounts.length>12)throw Error('Supply 1–12 complete raw demonstration accounts.');
 const target=input.target;
 if(!target||!['widthMm','heightMm'].every(key=>typeof target[key]==='number'&&Number.isFinite(target[key])&&target[key]>=1&&target[key]<=10000))throw Error('Task target dimensions must be 1–10000 mm.');
 const accounts=input.accounts.map(validateDemonstrationResponse),original=identity(accounts[0].referenceStudy.source),marks=new Set();
 for(const account of accounts){
  if(identity(account.referenceStudy.source)!==original)throw Error('Every account must retain the same complete original task, including rules, tolerances and source context.');
  const id=account.referenceStudy.landmarkId;
  if(marks.has(id))throw Error('Supply only one complete account per reference mark; combine observations in Demonstration Sources first.');
  marks.add(id);
 }
 const accepted={format:RAW_TASK_FORMAT,target:{widthMm:target.widthMm,heightMm:target.heightMm},accounts};bounded(accepted);return accepted;
}
export function createRawTask(accounts,target){return importRawTask({format:RAW_TASK_FORMAT,accounts,target});}
export function inspectRawTask(input){
 const account=importRawTask(input),originalSource=account.accounts[0].referenceStudy.source;
 const findings=account.accounts.map(raw=>{
  const result=inspectRawRuleProposals(raw),landmarkId=result.response.landmarkId,mark=originalSource.landmarks.find(m=>m.id===landmarkId);
  return {landmarkId,label:mark.label,originalRule:mark.kind==='fraction'?'fraction':mark.edge,...result};
 });
 const supported=findings.filter(f=>f.proposal),source=copy(originalSource);
 for(const finding of supported){
  const mark=source.landmarks.find(m=>m.id===finding.landmarkId);
  mark.kind=finding.proposal==='fraction'?'fraction':'edge_offset_mm';
  if(finding.proposal==='fraction')delete mark.edge;else mark.edge=finding.proposal;
  mark.why=`Inferred ${finding.proposal} proposal from five geometric rules under retained demonstration x/y bounds. Original rule: ${finding.originalRule}.`;
 }
 const unresolved=findings.filter(f=>!f.proposal).map(f=>f.landmarkId),unexamined=source.landmarks.filter(m=>!findings.some(f=>f.landmarkId===m.id)).map(m=>m.id);
 let proposedSource=null,proposedTarget=null,targetError=null;
 if(supported.length){
  source.provenance=String(source.provenance||'')+' | Composed evidence-conditioned raw-demonstration proposals; unresolved and unexamined marks retain original rules. Not verified physical skill.';
  try{proposedTarget=adapt(derive(source),account.target.widthMm,account.target.heightMm);proposedSource=source;}catch(error){targetError=error.message;}
 }
 return {account,originalSource:copy(originalSource),findings,supported: supported.map(f=>f.landmarkId),unresolved,unexamined,proposedSource,proposedTarget,targetError,
  limitation:'Each mark is tested separately against its own retained sources and rectangular bounds. Combining unique geometric proposals does not test joint physical feasibility or interactions between marks. Unresolved and unexamined marks keep their original authored rules; these are not evidence-supported proposals. Save the complete task account to retain every original source. Practice evaluates diagram placement, not physical skill.'};
}
export function exportRawTask(input){return importRawTask(input);}
