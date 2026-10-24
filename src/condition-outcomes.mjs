import {importConditionSet,inspectConditionSet} from './condition-set.mjs';
import {GeometryError} from './geometry.mjs';
export const CONDITION_OUTCOMES_FORMAT='skill-translator.condition-outcomes/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function importConditionOutcomes(raw){
 check(raw?.format===CONDITION_OUTCOMES_FORMAT,'Unsupported condition outcome study');
 const conditions=importConditionSet(raw.conditions);
 check(typeof raw.includePointScore==='boolean','Explicitly choose whether to include the original point score');
 check(Array.isArray(raw.judgments)&&raw.judgments.length===conditions.session.round,'Supply one judgment for every retained round');
 const judgments=Array.from(raw.judgments,(j,i)=>{
  check(j&&j.round===i+1&&['acceptable','unacceptable','unknown'].includes(j.outcome),'Retain ordered round identities and an explicit outcome or uncertainty');
  check(typeof j.basis==='string'&&j.basis.length<=1600&&(j.outcome==='unknown'||j.basis.trim()),'Explain the basis of every supplied task-outcome judgment');
  return {round:i+1,outcome:j.outcome,basis:j.basis.trim()};
 });
 const accepted={format:CONDITION_OUTCOMES_FORMAT,conditions,includePointScore:raw.includePointScore,judgments};
 check(new TextEncoder().encode(JSON.stringify(accepted)).length<=3*1024*1024,'Outcome study exceeds3MiB');return accepted;
}
export function inspectConditionOutcomes(raw){
 const study=importConditionOutcomes(raw);
 const criteria=study.conditions.conditions.map(c=>({id:"condition/"+c.id,label:c.rule.label,basis:c.rule.basis,kind:c.kind}));
 if(study.includePointScore)criteria.push({id:'@original-point-score',label:'Original complete-task point score',basis:'Every original point tolerance; missing marks remain incomplete',kind:'original-points'});
 const rows=study.judgments.map(j=>{
  const finding=inspectConditionSet({...study.conditions,selectedRound:j.round});
  const statuses=finding.conditions.map(c=>c.result.status);
  if(study.includePointScore)statuses.push(!finding.practice.complete?'incomplete':finding.practice.passed?'within':'outside');
  return {...j,statuses,withinMask:statuses.reduce((m,s,i)=>m|(s==='within'?1<<i:0),0),outsideMask:statuses.reduce((m,s,i)=>m|(s==='outside'?1<<i:0),0)};
 });
 const contrast=rows.some(r=>r.outcome==='acceptable')&&rows.some(r=>r.outcome==='unacceptable');
 const hypotheses=[];
 for(let mask=1;mask<2**criteria.length;mask++){
  const contradicted=[],unresolved=[];
  for(const r of rows){
   if(r.outcome==='unknown')continue;
   const outside=!!(mask&r.outsideMask),within=(mask&r.withinMask)===mask;
   if(r.outcome==='acceptable'?outside:within)contradicted.push(r.round);
   else if(!outside&&!within)unresolved.push(r.round);
  }
  hypotheses.push({mask,criterionIds:criteria.filter((_,i)=>mask&(1<<i)).map(c=>c.id),status:contradicted.length?'contradicted':unresolved.length?'unresolved':contrast?'consistent':'insufficient-contrast',contradictedRounds:contradicted,unresolvedRounds:unresolved});
 }
 // Unlike categorical cue separation, an added conjunct can contradict an
 // acceptable outcome. Enumerate every conjunction before extracting minima.
 const consistent=hypotheses.filter(h=>h.status==='consistent');
 const minimal=consistent.filter(h=>!consistent.some(other=>other.mask!==h.mask&&(other.mask&h.mask)===other.mask));
 return {criteria,rows,hypotheses,minimal,contrast,counts:Object.fromEntries(['contradicted','unresolved','consistent','insufficient-contrast'].map(s=>[s,hypotheses.filter(h=>h.status===s).length])),boundary:'Finite consistency with supplied task-outcome judgments, not causal necessity, physical validation, or a rule for unseen tasks. Unknown outcomes provide no supporting vote.'};
}
