// A retained comparison supports practice; it never certifies unfamiliarity.
import {importDecisionComparison} from './decision-comparison.mjs';
import {createDecisionPractice,importDecisionPractice,recordDecisionAction,decisionPracticeFindings} from './decision-practice.mjs';
import {GeometryError} from './geometry.mjs';
export const DECISION_TRANSFER_FORMAT='skill-translator.decision-transfer/v1';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const binding=(comparison,referenceIndex,targetIndex)=>JSON.stringify(canonical({comparison,referenceIndex,targetIndex}));
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createDecisionTransfer(comparison,referenceIndex,targetIndex,priorFamiliarity){
 const accepted=importDecisionComparison(comparison);
 check([referenceIndex,targetIndex].every(i=>Number.isInteger(i)&&i>=0&&i<accepted.examples.length)&&referenceIndex!==targetIndex,'Select distinct retained reference and target examples');
 check(['unspecified','seen-before','not-seen-before'].includes(priorFamiliarity),'Explicitly declare target familiarity');
 const target=accepted.examples[targetIndex];
 return {format:DECISION_TRANSFER_FORMAT,comparison:accepted,referenceIndex,targetIndex,sourceBinding:binding(accepted,referenceIndex,targetIndex),
  practice:createDecisionPractice(target.source,[target.stepId],priorFamiliarity)};
}
export function importDecisionTransfer(value){
 check(value?.format===DECISION_TRANSFER_FORMAT,'Unsupported decision transfer format');
 const base=createDecisionTransfer(value.comparison,value.referenceIndex,value.targetIndex,value.practice?.priorFamiliarity);
 check(value.sourceBinding===base.sourceBinding,'The retained comparison or selected correspondence changed');
 const target=base.comparison.examples[base.targetIndex];
 const practice=importDecisionPractice(target.source,value.practice);
 check(practice.stepIds.length===1&&practice.stepIds[0]===target.stepId,'Practice must retain exactly the selected comparison step');
 return {...base,practice};
}
export function recordTransferAction(value,action){
 const accepted=importDecisionTransfer(value),target=accepted.comparison.examples[accepted.targetIndex];
 return {...accepted,practice:recordDecisionAction(target.source,accepted.practice,{...action,stepId:target.stepId})};
}
export function inspectDecisionTransfer(value){
 const accepted=importDecisionTransfer(value),reference=accepted.comparison.examples[accepted.referenceIndex],target=accepted.comparison.examples[accepted.targetIndex];
 return {reference,target,findings:decisionPracticeFindings(target.source,accepted.practice),
  priorFamiliarityIsDeclared:true,learningEffectEstablished:false};
}
