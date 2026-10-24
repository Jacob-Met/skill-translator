/** Exhaustive outcome-subset diagnosis under one unchanged, source-bound training family. */
import {analyzeRawAffineChallenge} from './raw-affine-challenge.mjs';
import {analyzeResponseStudy} from './response-family.mjs';
export const OUTCOME_CONFLICT_FORMAT='skill-translator-affine-outcome-conflicts/v1';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
export function diagnoseAffineOutcomeConflicts(input,{maxSubsetEvaluations=63}={}){
 if(!Number.isInteger(maxSubsetEvaluations)||maxSubsetEvaluations<1||maxSubsetEvaluations>63)fail('CONFLICT_BUDGET','Declare an exhaustive subset budget of 1–63 evaluations.');
 const received=analyzeRawAffineChallenge(input),{account,challenge}=received,training=challenge.training;
 const outcomes=challenge.plan.flatMap(p=>{const result=challenge.results.find(r=>r.id===p.id);return result?[result]:[];});
 const n=outcomes.length,needed=(1<<n)-1;
 if(needed>maxSubsetEvaluations)fail('CONFLICT_BUDGET',`Conflict analysis incomplete: ${needed} outcome subsets are required but only ${maxSubsetEvaluations} were allowed. No complete conflict list was returned.`);
 const subsets=[{mask:0,compatible:true,axes:{x:true,y:true}}];
 for(let mask=1;mask<=needed;mask++){
  const selected=outcomes.filter((_,i)=>mask&(1<<i));
  const result=analyzeResponseStudy({...training,observations:[...training.observations,...selected]});
  if(!['supported','incompatible'].includes(result.status))fail('CONFLICT_UNAVAILABLE','Conflict analysis unavailable: subset support was not decided. No complete conflict list was returned.');
  subsets.push({mask,compatible:result.status==='supported',axes:{x:result.axes.x.status==='supported',y:result.axes.y.status==='supported'}});
 }
 const ids=mask=>outcomes.filter((_,i)=>mask&(1<<i)).map(r=>r.id);
 const groups=subsets.filter(s=>s.mask&&!s.compatible&&outcomes.every((_,i)=>!(s.mask&(1<<i))||subsets[s.mask&~(1<<i)].compatible)).map(s=>({
  outcomeIds:ids(s.mask),contradictedAxes:['x','y'].filter(axis=>!s.axes[axis]),
  deletionChecks:outcomes.flatMap((row,i)=>s.mask&(1<<i)?[{omittedOutcomeId:row.id,remainingOutcomeIds:ids(s.mask&~(1<<i)),compatible:subsets[s.mask&~(1<<i)].compatible}]:[])
 })).sort((a,b)=>a.outcomeIds.length-b.outcomeIds.length||a.outcomeIds.join('\0').localeCompare(b.outcomeIds.join('\0')));
 const status=!n?'no-received-outcomes':groups.length?'conflicts':'compatible';
 return {format:OUTCOME_CONFLICT_FORMAT,status,complete:true,evaluatedSubsets:needed,maxSubsetEvaluations,
  received:outcomes.length,planned:challenge.plan.length,missingOutcomeIds:challenge.plan.filter(p=>!outcomes.some(r=>r.id===p.id)).map(p=>p.id),
  groups,outcomes:outcomes.map(r=>({id:r.id,label:r.label,widthMm:r.widthMm,heightMm:r.heightMm,individuallyCompatible:subsets[1<<outcomes.indexOf(r)].compatible})),
  originalFirstPrefixContradiction:received.analysis.firstJointContradiction,
  account,limitations:[
   'Every nonempty subset of the received outcomes was evaluated against the same frozen training, source reading, coefficient domain and declared bounds.',
   'Inclusion-minimal means the group contradicts the frozen family but removing any one member makes that group compatible. It does not mean the group has the smallest possible cardinality.',
   'Compatibility after a deletion concerns only that group and unchanged training; it does not imply that the remaining complete account is compatible.',
   'A conflicting group identifies incompatible supplied constraints, not a bad measurement, a causal fault or a recommended removal. Training, calibration, correspondence, dimensions, bounds or the affine model can be wrong.',
   'Missing outcomes are untested. An empty complete conflict list with received outcomes means one conditional model satisfies those outcomes; it does not establish physical transfer or measurement accuracy.'
  ]};
}
