// Questions describe declared comparisons, never inferred agreement or causation.
import {importDecisionComparison,compareDecisionAccounts} from './decision-comparison.mjs';
import {GeometryError} from './geometry.mjs';
export const ACCOUNT_QUESTION_FORMAT='skill-translator.account-question/v1';
export const ACCOUNT_FIELDS=['intent','visibleChange','sensoryCue','recoveryCue'];
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const binding=value=>JSON.stringify(canonical(value));
const text=(v,label,max)=>{check(typeof v==='string'&&v.trim()&&v.length<=max,`${label} requires text within ${max} characters`);return v.trim();};
export function createAccountQuestion(comparison,input){
 const source=importDecisionComparison(comparison);
 check(ACCOUNT_FIELDS.includes(input?.field),'Choose an original account field');
 check(Array.isArray(input.exampleIndices)&&input.exampleIndices.length>=2&&input.exampleIndices.length<=source.examples.length,'Select at least two retained examples');
 const indices=[...input.exampleIndices];
 check(indices.every(i=>Number.isInteger(i)&&i>=0&&i<source.examples.length)&&new Set(indices).size===indices.length,'Select distinct existing examples');
 check(['shared','different','unresolved'].includes(input.judgment),'Declare shared, different or unresolved');
 const accepted={format:ACCOUNT_QUESTION_FORMAT,sourceBinding:binding(source),field:input.field,exampleIndices:indices,
  judgment:input.judgment,basis:text(input.basis,'Your comparison basis',2000),question:text(input.question,'Question for the author',2000)};
 check(new TextEncoder().encode(JSON.stringify(accepted)).length<=1024*1024,'Question account exceeds the 1 MiB reopen limit');
 return accepted;
}
export function importAccountQuestion(comparison,value){
 check(value?.format===ACCOUNT_QUESTION_FORMAT,'Unsupported account question format');
 const accepted=createAccountQuestion(comparison,value);
 check(value.sourceBinding===accepted.sourceBinding,'The original comparison changed; retain the old comparison to reopen this question');
 return accepted;
}
export function inspectAccountQuestion(comparison,value){
 const accepted=importAccountQuestion(comparison,value),accounts=compareDecisionAccounts(comparison);
 return {question:accepted,anchors:accepted.exampleIndices.map(index=>{
  const row=accounts.examples[index];return {exampleIndex:index,title:row.title,stepId:row.stepId,titleOfStep:row.titleOfStep,
   clip:row.clip,field:accepted.field,account:row.account[accepted.field],before:row.before,after:row.after};
 }),judgmentBasis:'user-declared',invariantEstablished:false,authorAnswerSupplied:false};
}
