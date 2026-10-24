// A replayable learner account of a demonstrated decision, never an NLP grade.
import {validateSequence} from './demonstration-sequence.mjs';
import {GeometryError} from './geometry.mjs';
export const DECISION_PRACTICE_FORMAT='skill-translator.decision-practice/v1';
export const EVIDENCE_PRACTICE_FORMAT='skill-translator.decision-practice/v2';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function text(value,label,max=1200){check(typeof value==='string'&&value.length<=max,`${label} must be text of at most ${max} characters`);return value.trim();}
function response(value){check(value&&typeof value.uncertain==='boolean','Declare whether the prediction is uncertain');const next={expectedChange:text(value.expectedChange,'Expected change'),cue:text(value.cue,'Decision cue'),recovery:text(value.recovery,'Recovery judgment'),uncertain:value.uncertain};check(next.uncertain||next.expectedChange||next.cue||next.recovery,'Describe a prediction or explicitly mark it uncertain');return next;}
const evidenceKeys=['before','after','intent','visibleChange','sensoryCue','recoveryCue'];
export function decisionEvidence(sequence,stepId){
  const source=validateSequence(sequence),step=source.steps.find(s=>s.id===stepId);
  check(step,'Choose a retained source step');
  return evidenceKeys.map(key=>{
    if(key==='before'||key==='after'){
      const moment=source.moments.find(m=>m.id===step[key+'MomentId']);
      return {key,kind:'retained-frame',available:true,momentId:moment.id,image:structuredClone(moment.image),presentedSeconds:moment.origin.mediaTimeSeconds,note:moment.visibleState};
    }
    return {key,kind:'authored-account',available:!!step[key],text:step[key]};
  });
}
function reconsideration(value){
  check(value&&Array.isArray(value.anchors)&&value.anchors.length>0&&value.anchors.length<=6&&new Set(value.anchors).size===value.anchors.length&&value.anchors.every(k=>evidenceKeys.includes(k)),'Choose distinct retained evidence references');
  const result={anchors:[...value.anchors],judgment:text(value.judgment,'Reconsidered judgment',1600),question:text(value.question,'Remaining question',1600)};
  check(result.judgment||result.question,'Describe your reconsideration or remaining question');return result;
}
export function createDecisionPractice(sequence,stepIds=sequence?.steps?.map(s=>s.id),priorFamiliarity='unspecified'){
  const source=validateSequence(sequence);check(Array.isArray(stepIds)&&stepIds.length>0&&stepIds.length<=24&&new Set(stepIds).size===stepIds.length&&stepIds.every(id=>source.steps.some(s=>s.id===id)),'Choose one or more distinct authored steps');
  check(['unspecified','seen-before','not-seen-before'].includes(priorFamiliarity),'Choose a declared prior-familiarity value');
  return {format:DECISION_PRACTICE_FORMAT,source,stepIds:[...stepIds],priorFamiliarity,events:[]};
}
function replay(sequence,bundle){
  check([DECISION_PRACTICE_FORMAT,EVIDENCE_PRACTICE_FORMAT].includes(bundle?.format),'Unsupported decision-practice format');
  const base=createDecisionPractice(sequence,bundle.stepIds,bundle.priorFamiliarity);base.format=bundle.format;
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
      step.reflection={comparison:event.comparison,note:text(event.note,'Self-comparison note',1600)};
      if(Object.hasOwn(event,'reconsideration')){check(bundle.format===EVIDENCE_PRACTICE_FORMAT,'Evidence-linked reconsideration requires v2 practice');step.reflection.reconsideration=reconsideration(event.reconsideration);}
      events.push({type:'reflect',stepId:step.id,...step.reflection});
    }else if(event.type==='advance'){
      check(step.reflection&&current<steps.length-1,'Compare this step before advancing to an available next step');events.push({type:'advance',stepId:step.id});current++;
    }else throw new GeometryError('Unsupported decision-practice action');
  }
  for(const step of steps)if(step.reflection?.reconsideration)step.evidence=decisionEvidence(base.source,step.id).filter(e=>step.reflection.reconsideration.anchors.includes(e.key));
  const complete=steps.every(s=>s.reflection!==null);
  return {session:{...base,events},steps,currentStepId:steps[current].id,currentIndex:current,complete,
    answered:steps.filter(s=>s.response).length,revealedBeforeAnswer:steps.filter(s=>s.revealedBeforeAnswer).map(s=>s.id),
    selfComparisons:steps.filter(s=>s.reflection).map(s=>({stepId:s.id,...s.reflection})),
    priorFamiliarity:base.priorFamiliarity,correctnessAssessed:false,physicalSkillEstablished:false};
}
export function importDecisionPractice(sequence,bundle){return replay(sequence,bundle).session;}
export function decisionPracticeFindings(sequence,bundle){const {session,...findings}=replay(sequence,bundle);return findings;}
export function recordDecisionAction(sequence,bundle,action){const accepted=importDecisionPractice(sequence,bundle);return importDecisionPractice(sequence,{...accepted,format:Object.hasOwn(action,'reconsideration')?EVIDENCE_PRACTICE_FORMAT:accepted.format,events:[...accepted.events,structuredClone(action)]});}
