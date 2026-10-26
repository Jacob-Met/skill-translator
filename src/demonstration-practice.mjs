/** Actual retained practice compared with every raw-demonstration survivor. */
import {inspectRawRuleProposals,createRawRuleProposal,importRawRuleProposal,RAW_RULE_PROPOSAL_FORMAT} from './raw-rule-proposals.mjs';
import {importPractice,evaluatePractice} from './practice.mjs';
import {derive,evaluate,GeometryError} from './geometry.mjs';
import {predictInterpretation} from './hypotheses.mjs';
export const DEMONSTRATION_PRACTICE_FORMAT='skill-translator.demonstration-practice/v1';
export function inspectDemonstrationPractice(raw,session){
 const findings=inspectRawRuleProposals(raw?.format===RAW_RULE_PROPOSAL_FORMAT?importRawRuleProposal(raw).account:raw),original=findings.response.source;
 const widthMm=session?.reference?.target?.widthMm,heightMm=session?.reference?.target?.heightMm;
 const candidates=[{basis:'original-annotation',source:original}];
 if(findings.proposal){
  try{candidates.push({basis:'unique-raw-proposal',source:createRawRuleProposal({...findings.account,referenceStudy:{...findings.account.referenceStudy,target:{widthMm,heightMm}}}).source});}catch(error){if(!(error instanceof GeometryError))throw error;}
 }
 let accepted=null,matched=null,lastError;
 for(const candidate of candidates)try{accepted=importPractice(candidate.source,widthMm,heightMm,session);matched=candidate;break;}catch(error){if(!(error instanceof GeometryError))throw error;lastError=error;}
 if(!accepted)throw lastError||Error('Practice must retain the original source or the recomputed unique raw proposal.');
 return compareDemonstrationPracticeMark(findings,matched.source,accepted,matched.basis);
}
/** Shared comparison only; callers must admit the exact source-bound session first. */
export function compareDemonstrationPracticeMark(findings,practiceSource,accepted,practiceBasis){
 const {widthMm,heightMm}=accepted.reference.target;
 const original=findings.response.source;
 const task=derive(original),mark=task.landmarks.find(m=>m.id===findings.response.landmarkId);
 const predictions=findings.compatibleRules.map(rule=>{try{return {rule,predicted:predictInterpretation(mark,task.source,widthMm,heightMm,rule),reason:null};}catch(error){if(!(error instanceof GeometryError))throw error;return {rule,predicted:null,reason:error.message};}});
 const rounds=[...accepted.history,{round:accepted.round,attempts:accepted.attempts}].map(round=>{
  const actual=round.attempts.find(p=>p.id===mark.id)||null;
  const alternatives=predictions.map(p=>({...p,evaluation:actual&&p.predicted?evaluate({...mark,...p.predicted},actual):null}));
  const available=alternatives.filter(a=>a.evaluation),within=available.filter(a=>a.evaluation.within);
  const status=!actual?'missing-placement':!predictions.length?'no-supported-relationship':available.length!==alternatives.length?'unavailable-target':within.length===available.length?'within-all':within.length?'within-some':'within-none';
  return {round:round.round,actual:structuredClone(actual),status,alternatives,
   originalScore:evaluatePractice(practiceSource,widthMm,heightMm,round.attempts),withinRules:within.map(a=>a.rule)};
 });
 return {format:DEMONSTRATION_PRACTICE_FORMAT,account:findings.account,session:accepted,practiceBasis,
  landmarkId:mark.id,toleranceMm:mark.toleranceMm,sourceStatus:findings.status,compatibleRules:findings.compatibleRules,rounds,
  boundary:'Actual placements are compared with every retained five-rule survivor at this workpiece, using the original authored positional tolerance. This does not select a rule or change the original practice score. Target agreement can disappear at another size. Missing placements and rules that cannot form a target remain unavailable. Conditional geometric agreement is not physical correctness, expert intent or learning benefit.'};
}
export function exportDemonstrationPractice(raw,session){const value=inspectDemonstrationPractice(raw,session);const output={format:DEMONSTRATION_PRACTICE_FORMAT,account:value.account,session:value.session};if(new TextEncoder().encode(JSON.stringify(output)).length>2_000_000)throw Error('Complete comparison exceeds2MB; no source was discarded.');return output;}
export function importDemonstrationPractice(raw){if(raw?.format!==DEMONSTRATION_PRACTICE_FORMAT)throw Error('Unsupported demonstrated-practice comparison.');return inspectDemonstrationPractice(raw.account,raw.session);}

