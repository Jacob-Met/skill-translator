// Hypothetical revised-evidence consequences; maintained readiness owns replay.
import {importReadiness,recordReadiness,readinessFindings} from './task-readiness.mjs';
export const REASSESSMENT_FORMAT='skill-translator.reassessment-rehearsal/v1';
const FORMAT=REASSESSMENT_FORMAT;
const require=(condition,message)=>{if(!condition)throw Error(message);};
export function createReassessment(source,study,observation,priorFamiliarity='unspecified'){
 require(['unspecified','seen-before','not-seen-before'].includes(priorFamiliarity),'Declare prior familiarity');
 const original=importReadiness(source,study);
 require(['observe','practice'].includes(observation?.type),'Choose one hypothetical revised observation');
 const hypothetical=recordReadiness(source,original,observation);
 return {format:FORMAT,original,observation:hypothetical.events.at(-1),priorFamiliarity,events:[]};
}
function replay(source,input){
 require(input?.format===FORMAT,'Unsupported reassessment rehearsal');
 const base=createReassessment(source,input.original,input.observation,input.priorFamiliarity);
 require(Array.isArray(input.events)&&input.events.length<=2,'Retain one response and one reveal');
 let prediction=null,revealed=false,revealedBeforeAnswer=false;const events=[];
 for(const event of input.events){
  if(event?.type==='predict'){
   require(!prediction,'The first prediction is retained');
   require(Array.isArray(event.stepIds)&&event.stepIds.length<=24&&new Set(event.stepIds).size===event.stepIds.length&&event.stepIds.every(id=>base.original.source.steps.some(s=>s.id===id)),'Select distinct retained steps');
   require(typeof event.uncertain==='boolean'&&typeof event.reason==='string'&&event.reason.trim()&&event.reason.length<=1600,'Retain a reason and explicit uncertainty');
   prediction={stepIds:[...event.stepIds],uncertain:event.uncertain,reason:event.reason.trim()};events.push({type:'predict',...prediction});
  }else if(event?.type==='reveal'){
   require(!revealed,'Consequences were already revealed');revealed=true;revealedBeforeAnswer=!prediction;events.push({type:'reveal'});
  }else throw Error('Unsupported rehearsal action');
 }
 return {session:{...base,events},prediction,revealed,revealedBeforeAnswer};
}
export const importReassessment=(source,input)=>replay(source,input).session;
export function recordReassessment(source,input,event){const accepted=importReassessment(source,input);return importReassessment(source,{...accepted,events:[...accepted.events,event]});}
export function inspectReassessment(source,input){
 const result=replay(source,input),{original,observation}=result.session;
 if(!result.revealed)return {...result,consequences:null};
 const before=readinessFindings(source,original),hypothetical=recordReadiness(source,original,observation),after=readinessFindings(source,hypothetical);
 const lost=after.journal.find(e=>e.type==='invalidation'&&e.eventIndex===original.events.length)?.stepIds??[],chosen=result.prediction?.stepIds??[];
 return {...result,consequences:{hypothetical,invalidated:lost.map(id=>({stepId:id,checks:before.steps.find(s=>s.stepId===id).checks.filter(c=>c.observation),sourceStep:original.source.steps.find(s=>s.id===id)})),
 comparison:result.prediction?{omitted:lost.filter(id=>!chosen.includes(id)),extra:chosen.filter(id=>!lost.includes(id)),uncertain:result.prediction.uncertain}:null,
 boundary:'Consequences of revised evidence under declared dependencies; not a physical correction recommendation, authenticated observation or learning assessment. Original frames illustrate the demonstration, not the hypothetical revision.'}};
}
