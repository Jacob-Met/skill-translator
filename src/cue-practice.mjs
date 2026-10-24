// Selective requests for supplied cues retain their assistance chronology.
import {createDecisionPractice,importDecisionPractice,decisionPracticeFindings,DECISION_PRACTICE_FORMAT,EVIDENCE_PRACTICE_FORMAT} from './decision-practice.mjs';
export const CUE_PRACTICE_FORMAT='skill-translator.cue-practice/v1';
const FORMAT=CUE_PRACTICE_FORMAT;
export function createCuePractice(source,stepIds,priorFamiliarity='unspecified'){
 const base=createDecisionPractice(source,stepIds,priorFamiliarity);
 return {format:FORMAT,source:base.source,stepIds:base.stepIds,priorFamiliarity:base.priorFamiliarity,events:[]};
}
function replay(source,value){
 if(value?.format!==FORMAT)throw Error('Unsupported cue practice');
 const base=createCuePractice(source,value.stepIds,value.priorFamiliarity);
 const ordinaryBase=importDecisionPractice(source,{...createDecisionPractice(source,value.stepIds,value.priorFamiliarity),source:value.source});
 if(!Array.isArray(value.events)||value.events.length>144)throw Error('Cue practice exceeds its bounded history');
 // Validate ordinary prefixes only where a cue needs their state. The final replay
 // still admits every ordinary event before any normalized session is returned.
 const ordinary=[],timeline=[],requests=[];let format=DECISION_PRACTICE_FORMAT;
 const normal=()=>({...ordinaryBase,format,events:ordinary});
 for(const event of value.events){
  if(event?.type==='request-cue'){
   const current=decisionPracticeFindings(source,normal()),state=current.steps[current.currentIndex];
   if(event.stepId!==state.id||!['sensoryCue','recoveryCue'].includes(event.field)||state.revealed||requests.some(r=>r.stepId===state.id&&r.field===event.field))throw Error('Choose one undisclosed cue for the current step');
   const account=base.source.steps.find(s=>s.id===state.id),text=account[event.field];
   requests.push({stepId:state.id,field:event.field,beforeAnswer:!state.response,available:!!text,text});
   timeline.push({request:{type:'request-cue',stepId:state.id,field:event.field}});
  }else{
   if(event&&Object.hasOwn(event,'reconsideration'))format=EVIDENCE_PRACTICE_FORMAT;
   timeline.push({ordinary:ordinary.length});ordinary.push(event);
  }
 }
 const practice=importDecisionPractice(source,normal()),findings=decisionPracticeFindings(source,practice);
 const events=timeline.map(item=>item.request??practice.events[item.ordinary]);
 return {session:{...base,events},findings:{...findings,steps:findings.steps.map(step=>({...step,
  cueRequests:requests.filter(r=>r.stepId===step.id),
  preAnswerCueRequests:requests.filter(r=>r.stepId===step.id&&r.beforeAnswer),
  preAnswerCueDisclosures:requests.filter(r=>r.stepId===step.id&&r.beforeAnswer&&r.available)}))}};
}
export const importCuePractice=(source,value)=>replay(source,value).session;
export const inspectCuePractice=(source,value)=>replay(source,value).findings;
export function recordCueAction(source,value,action){const accepted=importCuePractice(source,value);return importCuePractice(source,{...accepted,events:[...accepted.events,structuredClone(action)]});}
