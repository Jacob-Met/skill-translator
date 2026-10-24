// Compare declared criteria on retained rounds using the maintained evaluator.
import {importConditionSet,inspectConditionSet} from './condition-set.mjs';
import {GeometryError} from './geometry.mjs';

const available=status=>status==='within'||status==='outside';
function transition(before,after){
 if(before===after)return 'unchanged';
 if(!available(before)&&!available(after))return 'availability-changed';
 if(!available(before))return 'became-evaluable';
 if(!available(after))return 'became-unavailable';
 return after==='within'?'entered-tolerance':'left-tolerance';
}
export function inspectConditionChanges(raw,fromRound,toRound=raw?.selectedRound){
 const accepted=importConditionSet(raw);
 for(const round of [fromRound,toRound])if(!Number.isInteger(round)||round<1||round>accepted.session.round)
  throw new GeometryError('Choose two existing retained practice rounds');
 if(fromRound===toRound)throw new GeometryError('Choose two different retained practice rounds');
 const before=inspectConditionSet({...accepted,selectedRound:fromRound});
 const after=inspectConditionSet({...accepted,selectedRound:toRound});
 const conditions=before.conditions.map((condition,index)=>({
  id:condition.id,kind:condition.kind,rule:condition.rule,
  before:condition.result,after:after.conditions[index].result,
  transition:transition(condition.result.status,after.conditions[index].result.status)
 }));
 const counts=Object.fromEntries(['unchanged','entered-tolerance','left-tolerance','became-evaluable','became-unavailable','availability-changed'].map(kind=>[kind,conditions.filter(c=>c.transition===kind).length]));
 return {fromRound,toRound,before,after,conditions,counts,
  basis:'same-declared-conditions',learningEstablished:false};
}
