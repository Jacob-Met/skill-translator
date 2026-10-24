// Source-bound composition of maintained typed task criteria.
import {importPractice,evaluatePractice} from './practice.mjs';
import {validateRelationships,evaluateRelationships} from './task-relationships.mjs';
import {validateGuideRule,evaluateGuideAlignment} from './guide-alignment.mjs';
import {createCornerAngle,inspectCornerAngle} from './corner-angle.mjs';
import {GeometryError} from './geometry.mjs';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export const CONDITION_SET_SCHEMA='skill-translator-condition-set/v1';
export function createConditionSet(source,session,conditions,selectedRound=session?.round){
 fail(session?.reference?.target,'Open a retained practice session');
 const {widthMm,heightMm}=session.reference.target,accepted=importPractice(source,widthMm,heightMm,session);
 fail(Array.isArray(conditions)&&conditions.length<=12,'Declare at most 12 task conditions');const ids=new Set();
 const checked=Array.from(conditions,c=>{
  fail(c&&typeof c.id==='string'&&c.id.length>0&&c.id.length<=80&&!ids.has(c.id),'Each condition needs a unique nonempty ID');ids.add(c.id);
  fail(['pair','guide','corner'].includes(c.kind),'Unsupported condition kind');
  fail(typeof c.rule?.basis==='string'&&c.rule.basis.trim().length>0&&c.rule.basis.length<=1600,'Declare the basis for each condition');
  const rule=c.kind==='pair'?{...validateRelationships(source,[{...c.rule,id:c.id}])[0],basis:c.rule.basis.trim()}:c.kind==='guide'?validateGuideRule(source,c.rule):createCornerAngle(source,accepted,c.rule,selectedRound).rule;
  return {id:c.id,kind:c.kind,rule};
 });
 fail(Number.isInteger(selectedRound)&&selectedRound>=1&&selectedRound<=accepted.round,'Choose a retained practice round');
 const bundle={schema:CONDITION_SET_SCHEMA,source:JSON.parse(JSON.stringify(source)),session:accepted,conditions:checked,selectedRound};
 fail(new TextEncoder().encode(JSON.stringify(bundle)).length<=2*1024*1024,'Condition set exceeds 2 MiB');return bundle;
}
export function importConditionSet(raw){fail(raw?.schema===CONDITION_SET_SCHEMA,'Unsupported condition-set review');return createConditionSet(raw.source,raw.session,raw.conditions,raw.selectedRound);}
export function inspectConditionSet(raw){
 const accepted=importConditionSet(raw),{widthMm,heightMm}=accepted.session.reference.target,round=accepted.selectedRound===accepted.session.round?accepted.session:accepted.session.history[accepted.selectedRound-1],practice=evaluatePractice(accepted.source,widthMm,heightMm,round.attempts);
 const conditions=accepted.conditions.map(c=>{
  const evaluated=c.kind==='pair'?evaluateRelationships(accepted.source,widthMm,heightMm,round.attempts,[c.rule]).results[0]:c.kind==='guide'?evaluateGuideAlignment(accepted.source,widthMm,heightMm,round.attempts,c.rule):inspectCornerAngle(accepted.source,widthMm,heightMm,round.attempts,c.rule);
  const {practice:ignored,...result}=evaluated;return {...c,result};
 });
 const counts=Object.fromEntries(['within','outside','incomplete','unresolved'].map(s=>[s,conditions.filter(c=>c.result.status===s).length]));
 const complete=conditions.length>0&&counts.incomplete===0&&counts.unresolved===0;
 return {round:accepted.selectedRound,practice,conditions,counts,complete,status:conditions.length===0?'undeclared':counts.outside?'outside':!complete?'unavailable':'within'};
}
