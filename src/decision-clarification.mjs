import {EDGE_DECISION,importEdgeDecisionPractice,inspectEdgeDecisionPractice,edgeDecisionBasePractice,createEdgeDecisionPractice} from './edge-decision-practice.mjs';
// Explicit author-supplied account amendments, preserving the learner's question.
import {upsertStep} from './demonstration-sequence.mjs';
import {createDecisionPractice,importDecisionPractice,decisionPracticeFindings} from './decision-practice.mjs';
import {CUE_PRACTICE_FORMAT,importCuePractice,inspectCuePractice} from './cue-practice.mjs';
import {GeometryError} from './geometry.mjs';
export const CLARIFICATION_FORMAT='skill-translator.decision-clarification/v1';
const fields=['intent','visibleChange','sensoryCue','recoveryCue'];
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function text(value,label,max){check(typeof value==='string'&&value.length<=max&&value.trim(),`${label} must contain text within ${max} characters`);return value.trim();}
const practiceSource=value=>value.format===EDGE_DECISION?value.study.sequence:value.source;
export function importClarificationPractice(source,value){
  if(value?.format===EDGE_DECISION){const accepted=importEdgeDecisionPractice(value);importDecisionPractice(source,edgeDecisionBasePractice(accepted));return accepted;}
  return value?.format===CUE_PRACTICE_FORMAT?importCuePractice(source,value):importDecisionPractice(source,value);
}
export function clarificationQuestions(source,practice){
  const accepted=importClarificationPractice(source,practice),findings=accepted.format===EDGE_DECISION?inspectEdgeDecisionPractice(accepted):accepted.format===CUE_PRACTICE_FORMAT?inspectCuePractice(source,accepted):decisionPracticeFindings(source,accepted);
  return findings.steps.filter(s=>s.reflection?.reconsideration?.question).map(s=>({stepId:s.id,
    question:s.reflection.reconsideration.question,firstResponse:structuredClone(s.response),
    reconsideredJudgment:s.reflection.reconsideration.judgment,
    evidence:structuredClone(s.evidence),...(accepted.format===CUE_PRACTICE_FORMAT?{cueRequests:structuredClone(s.cueRequests),priorFamiliarity:findings.priorFamiliarity,fullRevealBeforeAnswer:s.revealedBeforeAnswer}:{}),fields:s.reflection.reconsideration.anchors.filter(k=>fields.includes(k)),...(accepted.format===EDGE_DECISION?{edgeDisclosures:structuredClone(findings.disclosures),candidateInspections:structuredClone(findings.candidateInspections),priorFamiliarity:findings.priorFamiliarity,fullRevealBeforeAnswer:s.revealedBeforeAnswer,edgeStudy:structuredClone(accepted.study)}:{})}));
}
export function createClarification(source,practice,input){
  const accepted=importClarificationPractice(source,practice),question=clarificationQuestions(source,accepted).find(q=>q.stepId===input?.stepId);
  check(question,'Choose an actual retained learner question');
  check(question.fields.includes(input.field),'Choose an authored account field referenced by this question');
  check(input.authorConfirmed===true,'The supplied clarification must be explicitly adopted as an authored amendment');
  const clarification=text(input.clarification,'Supplied clarification',1800);
  const step=practiceSource(accepted).steps.find(s=>s.id===input.stepId);
  check(clarification!==step[input.field],'Supply a changed account before making an amendment');
  return {format:CLARIFICATION_FORMAT,practice:accepted,stepId:input.stepId,field:input.field,clarification,
    suppliedBy:text(input.suppliedBy,'Declared author or source',160),basis:text(input.basis,'How the clarification was supplied',1200),authorConfirmed:true};
}
export function importClarification(source,value){
  check(value?.format===CLARIFICATION_FORMAT,'Unsupported clarification format');
  return createClarification(source,value.practice,value);
}
export function inspectClarification(source,value){
  const accepted=importClarification(source,value),original=practiceSource(accepted.practice);
  const step=original.steps.find(s=>s.id===accepted.stepId),amendedSource=upsertStep(original,{...step,[accepted.field]:accepted.clarification});
  return {amendment:accepted,question:clarificationQuestions(original,accepted.practice).find(q=>q.stepId===accepted.stepId),
    originalText:step[accepted.field],amendedSource,
    retry:createDecisionPractice(amendedSource,[step.id],'seen-before'),
    ...(accepted.practice.format===EDGE_DECISION?{edgeRetry:createEdgeDecisionPractice({...accepted.practice.study,sequence:amendedSource},step.id,'seen-before')} : {}),
    authorIdentityAuthenticated:false,learningEffectEstablished:false};
}
