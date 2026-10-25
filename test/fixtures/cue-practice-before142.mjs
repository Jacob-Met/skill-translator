// Test-only baseline: commit2dfb8c3, blob80051607c7634b328bdf0de94d3baa1f117f3ec5.
// Only the relative import path changes; production never imports this file.
// Selective requests for supplied cues retain their assistance chronology.
import {createDecisionPractice,importDecisionPractice,recordDecisionAction,decisionPracticeFindings} from '../../src/decision-practice.mjs';
export const CUE_PRACTICE_FORMAT='skill-translator.cue-practice/v1';
const FORMAT=CUE_PRACTICE_FORMAT;
export function createCuePractice(source,stepIds,priorFamiliarity='unspecified'){
 const base=createDecisionPractice(source,stepIds,priorFamiliarity);
 return {format:FORMAT,source:base.source,stepIds:base.stepIds,priorFamiliarity:base.priorFamiliarity,events:[]};
}
function replay(source,value){
 if(value?.format!==FORMAT)throw Error('Unsupported cue practice');
 const base=createCuePractice(source,value.stepIds,value.priorFamiliarity);
 let practice=importDecisionPractice(source,{...createDecisionPractice(source,value.stepIds,value.priorFamiliarity),source:value.source});
 if(!Array.isArray(value.events)||value.events.length>144)throw Error('Cue practice exceeds its bounded history');
 const events=[],requests=[];
 for(const event of value.events){
  const current=decisionPracticeFindings(source,practice),state=current.steps[current.currentIndex];
  if(event?.type==='request-cue'){
   if(event.stepId!==state.id||!['sensoryCue','recoveryCue'].includes(event.field)||state.revealed||requests.some(r=>r.stepId===state.id&&r.field===event.field))throw Error('Choose one undisclosed cue for the current step');
   const account=base.source.steps.find(s=>s.id===state.id),text=account[event.field];
   requests.push({stepId:state.id,field:event.field,beforeAnswer:!state.response,available:!!text,text});
   events.push({type:'request-cue',stepId:state.id,field:event.field});
  }else{
   practice=recordDecisionAction(source,practice,event);events.push(structuredClone(practice.events.at(-1)));
  }
 }
 const findings=decisionPracticeFindings(source,practice);
 return {session:{...base,events},findings:{...findings,steps:findings.steps.map(step=>({...step,
  cueRequests:requests.filter(r=>r.stepId===step.id),
  preAnswerCueRequests:requests.filter(r=>r.stepId===step.id&&r.beforeAnswer),
  preAnswerCueDisclosures:requests.filter(r=>r.stepId===step.id&&r.beforeAnswer&&r.available)}))}};
}
export const importCuePractice=(source,value)=>replay(source,value).session;
export const inspectCuePractice=(source,value)=>replay(source,value).findings;
export function recordCueAction(source,value,action){const accepted=importCuePractice(source,value);return importCuePractice(source,{...accepted,events:[...accepted.events,structuredClone(action)]});}
