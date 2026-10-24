// Explicit correspondences preserve authored accounts; no semantic inference.
import {validateSequence} from './demonstration-sequence.mjs';
import {createDecisionPractice} from './decision-practice.mjs';
import {GeometryError} from './geometry.mjs';
export const DECISION_COMPARISON_FORMAT='skill-translator.decision-comparison/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function importDecisionComparison(value){
 check(value?.format===DECISION_COMPARISON_FORMAT,'Unsupported decision comparison format');
 check(Array.isArray(value.examples)&&value.examples.length>=2&&value.examples.length<=6,'Explicitly match 2–6 demonstrated steps');
 const seen=new Set();
 const examples=value.examples.map(row=>{
  const source=validateSequence(row?.source);
  const step=source.steps.find(s=>s.id===row.stepId);
  check(step,'Each correspondence must name an existing source step');
  const identity=JSON.stringify([source.clip.sha256,step.beforeMomentId,step.afterMomentId,step.id]);
  check(!seen.has(identity),'Do not count the same source step twice');seen.add(identity);
  return {source,stepId:step.id};
 });
 check(['unresolved','shared','different','mixed'].includes(value.relationship),'Declare a relationship or uncertainty');
 check(typeof value.explanation==='string'&&value.explanation.length<=4000,'Explanation must be text of at most 4000 characters');
 check(value.relationship==='unresolved'||value.explanation.trim(),'Explain the declared relationship');
 return {format:DECISION_COMPARISON_FORMAT,examples,relationship:value.relationship,explanation:value.explanation.trim()};
}
export function compareDecisionAccounts(value){
 const study=importDecisionComparison(value);
 return {relationship:study.relationship,explanation:study.explanation,relationshipBasis:'user-declared',examples:study.examples.map(({source,stepId})=>{
  const step=source.steps.find(s=>s.id===stepId);
  return {title:source.title,context:source.context,clip:source.clip,stepId,titleOfStep:step.title,
   before:source.moments.find(m=>m.id===step.beforeMomentId),after:source.moments.find(m=>m.id===step.afterMomentId),
   account:Object.fromEntries(['intent','visibleChange','sensoryCue','recoveryCue'].map(key=>[key,{text:step[key],status:step[key]?'supplied':'not-supplied'}]))};
 }),invariantEstablished:false,physicalSkillEstablished:false};
}
export function rehearseDecisionExample(value,index){
 const study=importDecisionComparison(value);
 check(Number.isInteger(index)&&index>=0&&index<study.examples.length,'Choose an existing comparison example');
 const {source,stepId}=study.examples[index];
 // Comparison exposes the account, so handoff must declare prior familiarity.
 return createDecisionPractice(source,[stepId],'seen-before');
}
