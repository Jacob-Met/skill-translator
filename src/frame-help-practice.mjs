import {createCuePractice,importCuePractice,inspectCuePractice} from './cue-practice.mjs';
export const FRAME_HELP_FORMAT='skill-translator.frame-help-practice/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function interiorHelpFrames(source,stepId){
 const step=source.steps.find(s=>s.id===stepId);check(step,'Select a retained target step');
 const time=id=>source.moments.find(m=>m.id===id)?.origin.mediaTimeSeconds;
 const start=time(step.beforeMomentId),end=time(step.afterMomentId);
 return source.moments.filter(m=>m.origin.mediaTimeSeconds>start&&m.origin.mediaTimeSeconds<end);
}
export function createFrameHelpPractice(source,stepIds,priorFamiliarity='unspecified'){
 const base=createCuePractice(source,stepIds,priorFamiliarity);
 return {...base,format:FRAME_HELP_FORMAT};
}
function replay(source,value){
 check(value?.format===FRAME_HELP_FORMAT,'Unsupported original-frame assistance format');
 const base=createCuePractice(source,value.stepIds,value.priorFamiliarity);
 // Reuse maintained source identity and all cue/ordinary event admission.
 const cueBase=importCuePractice(source,{...base,source:value.source});
 check(Array.isArray(value.events)&&value.events.length<=144,'Frame help exceeds its bounded history');
 const ordinary=[],timeline=[],requests=[];
 const current=()=>({...cueBase,events:ordinary});
 for(const event of value.events){
  if(event?.type==='request-frame'){
   const findings=inspectCuePractice(source,current()),state=findings.steps[findings.currentIndex];
   check(event.stepId===state.id&&!state.revealed,'Request a frame for the current unrevealed target');
   const frame=interiorHelpFrames(base.source,state.id).find(m=>m.id===event.momentId);
   check(frame&&event.imageSha256===frame.image.sha256,'Request an exact retained strictly interior original frame');
   check(!requests.some(r=>r.stepId===state.id&&r.momentId===frame.id),'This original frame was already disclosed');
   const normalized={type:'request-frame',stepId:state.id,momentId:frame.id,imageSha256:frame.image.sha256};
   requests.push({...normalized,beforeAnswer:!state.response,frame});timeline.push({request:normalized});
  }else{timeline.push({ordinary:ordinary.length});ordinary.push(event);}
 }
 const practice=importCuePractice(source,current()),findings=inspectCuePractice(source,practice);
 return {session:{...practice,format:FRAME_HELP_FORMAT,events:timeline.map(t=>t.request??practice.events[t.ordinary])},findings:{...findings,steps:findings.steps.map(step=>({...step,frameRequests:requests.filter(r=>r.stepId===step.id),preAnswerFrameRequests:requests.filter(r=>r.stepId===step.id&&r.beforeAnswer)}))}};
}
export const importFrameHelpPractice=(source,value)=>replay(source,value).session;
export const inspectFrameHelpPractice=(source,value)=>replay(source,value).findings;
export function recordFrameHelpAction(source,value,action){
 const accepted=importFrameHelpPractice(source,value);let event=action;
 if(action?.type==='request-frame'){
  const frame=source.moments.find(m=>m.id===action.momentId);
  event={...action,imageSha256:action.imageSha256??frame?.image.sha256};
 }
 return importFrameHelpPractice(source,{...accepted,events:[...accepted.events,structuredClone(event)]});
}
