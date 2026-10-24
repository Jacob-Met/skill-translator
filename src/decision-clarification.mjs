// Explicit author-supplied account amendments, preserving the learner's question.
import {upsertStep} from './demonstration-sequence.mjs';
import {createDecisionPractice,importDecisionPractice,decisionPracticeFindings} from './decision-practice.mjs';
import {GeometryError} from './geometry.mjs';
export const CLARIFICATION_FORMAT='skill-translator.decision-clarification/v1';
const fields=['intent','visibleChange','sensoryCue','recoveryCue'];
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function text(value,label,max){check(typeof value==='string'&&value.length<=max&&value.trim(),`${label} must contain text within ${max} characters`);return value.trim();}
export function clarificationQuestions(source,practice){
  const accepted=importDecisionPractice(source,practice),findings=decisionPracticeFindings(source,accepted);
  return findings.steps.filter(s=>s.reflection?.reconsideration?.question).map(s=>({stepId:s.id,
    question:s.reflection.reconsideration.question,firstResponse:structuredClone(s.response),
    reconsideredJudgment:s.reflection.reconsideration.judgment,
    evidence:structuredClone(s.evidence),fields:s.reflection.reconsideration.anchors.filter(k=>fields.includes(k))}));
}
export function createClarification(source,practice,input){
  const accepted=importDecisionPractice(source,practice),question=clarificationQuestions(source,accepted).find(q=>q.stepId===input?.stepId);
  check(question,'Choose an actual retained learner question');
  check(question.fields.includes(input.field),'Choose an authored account field referenced by this question');
  check(input.authorConfirmed===true,'The supplied clarification must be explicitly adopted as an authored amendment');
  const clarification=text(input.clarification,'Supplied clarification',1800);
  const step=accepted.source.steps.find(s=>s.id===input.stepId);
  check(clarification!==step[input.field],'Supply a changed account before making an amendment');
  return {format:CLARIFICATION_FORMAT,practice:accepted,stepId:input.stepId,field:input.field,clarification,
    suppliedBy:text(input.suppliedBy,'Declared author or source',160),basis:text(input.basis,'How the clarification was supplied',1200),authorConfirmed:true};
}
export function importClarification(source,value){
  check(value?.format===CLARIFICATION_FORMAT,'Unsupported clarification format');
  return createClarification(source,value.practice,value);
}
export function inspectClarification(source,value){
  const accepted=importClarification(source,value),original=accepted.practice.source;
  const step=original.steps.find(s=>s.id===accepted.stepId),amendedSource=upsertStep(original,{...step,[accepted.field]:accepted.clarification});
  return {amendment:accepted,question:clarificationQuestions(original,accepted.practice).find(q=>q.stepId===accepted.stepId),
    originalText:step[accepted.field],amendedSource,
    retry:createDecisionPractice(amendedSource,[step.id],'seen-before'),
    authorIdentityAuthenticated:false,learningEffectEstablished:false};
}
