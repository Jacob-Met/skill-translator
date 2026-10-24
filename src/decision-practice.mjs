// A replayable learner account of a demonstrated decision, never an NLP grade.
import {validateSequence} from './demonstration-sequence.mjs';
import {GeometryError} from './geometry.mjs';
export const DECISION_PRACTICE_FORMAT='skill-translator.decision-practice/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function text(value,label,max=1200){check(typeof value==='string'&&value.length<=max,`${label} must be text of at most ${max} characters`);return value.trim();}
function response(value){check(value&&typeof value.uncertain==='boolean','Declare whether the prediction is uncertain');const next={expectedChange:text(value.expectedChange,'Expected change'),cue:text(value.cue,'Decision cue'),recovery:text(value.recovery,'Recovery judgment'),uncertain:value.uncertain};check(next.uncertain||next.expectedChange||next.cue||next.recovery,'Describe a prediction or explicitly mark it uncertain');return next;}
export function createDecisionPractice(sequence,stepIds=sequence?.steps?.map(s=>s.id),priorFamiliarity='unspecified'){
  const source=validateSequence(sequence);check(Array.isArray(stepIds)&&stepIds.length>0&&stepIds.length<=24&&new Set(stepIds).size===stepIds.length&&stepIds.every(id=>source.steps.some(s=>s.id===id)),'Choose one or more distinct authored steps');
  check(['unspecified','seen-before','not-seen-before'].includes(priorFamiliarity),'Choose a declared prior-familiarity value');
  return {format:DECISION_PRACTICE_FORMAT,source,stepIds:[...stepIds],priorFamiliarity,events:[]};
}
function replay(sequence,bundle){
  check(bundle?.format===DECISION_PRACTICE_FORMAT,'Unsupported decision-practice format');
  const base=createDecisionPractice(sequence,bundle.stepIds,bundle.priorFamiliarity);
  check(same(base.source,validateSequence(bundle.source)),'The source frames or authored account changed; use the matching demonstration');
  check(Array.isArray(bundle.events)&&bundle.events.length<=96,'Decision history exceeds the bounded lesson');
  const steps=base.stepIds.map(id=>({id,response:null,revealed:false,revealedBeforeAnswer:false,reflection:null}));let current=0;
  const events=[];
  for(const event of bundle.events){
    const step=steps[current];check(event&&step&&event.stepId===step.id,'Decision actions must follow the selected current step');
    if(event.type==='answer'){
      check(!step.response,'The first submitted prediction stays retained');step.response=response(event.response);events.push({type:'answer',stepId:step.id,response:structuredClone(step.response)});
    }else if(event.type==='reveal'){
      check(!step.revealed,'The source account is already revealed');step.revealed=true;step.revealedBeforeAnswer=!step.response;events.push({type:'reveal',stepId:step.id});
    }else if(event.type==='reflect'){
      check(step.response&&step.revealed&&!step.reflection,'Submit a prediction and inspect the source before self-comparison');
      check(['consistent','different','unsure'].includes(event.comparison),'Choose a self-comparison, not an automatic score');
      step.reflection={comparison:event.comparison,note:text(event.note,'Self-comparison note',1600)};events.push({type:'reflect',stepId:step.id,...step.reflection});
    }else if(event.type==='advance'){
      check(step.reflection&&current<steps.length-1,'Compare this step before advancing to an available next step');events.push({type:'advance',stepId:step.id});current++;
    }else throw new GeometryError('Unsupported decision-practice action');
  }
  const complete=steps.every(s=>s.reflection!==null);
  return {session:{...base,events},steps,currentStepId:steps[current].id,currentIndex:current,complete,
    answered:steps.filter(s=>s.response).length,revealedBeforeAnswer:steps.filter(s=>s.revealedBeforeAnswer).map(s=>s.id),
    selfComparisons:steps.filter(s=>s.reflection).map(s=>({stepId:s.id,...s.reflection})),
    priorFamiliarity:base.priorFamiliarity,correctnessAssessed:false,physicalSkillEstablished:false};
}
export function importDecisionPractice(sequence,bundle){return replay(sequence,bundle).session;}
export function decisionPracticeFindings(sequence,bundle){const {session,...findings}=replay(sequence,bundle);return findings;}
export function recordDecisionAction(sequence,bundle,action){const accepted=importDecisionPractice(sequence,bundle);return importDecisionPractice(sequence,{...accepted,events:[...accepted.events,structuredClone(action)]});}
