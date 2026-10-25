import {importCueStudy} from './cue-sufficiency.mjs';
const check=(ok,message)=>{if(!ok)throw Error(message);};
/** Exact worst-case question count over this finite declared table, not a policy for physical action. */
function inspectQuestions(value,readings=[],plan=null){
 const study=importCueStudy(value),n=study.rows.length,k=study.cues.length;
 check(Array.isArray(readings)&&readings.length<=k,'Supply at most one reading per cue');
 const used=new Set();let mask=(1<<n)-1,available=(1<<k)-1;
 const costs=plan?importCueQuestionPlan(study,plan).cues.map(c=>c.available?c.effort:null):study.cues.map(()=>1);
 costs.forEach((cost,i)=>{if(cost===null)available&=~(1<<i);});
 const accepted=readings.map(reading=>{
  const c=study.cues.findIndex(cue=>cue.id===reading?.cueId);
  check(c>=0&&!used.has(c),'Readings must name distinct retained cues');used.add(c);
  check(typeof reading.value==='string'&&reading.value.trim().length>0&&reading.value.length<=160,'Supply a nonempty categorical reading');
  const answer=reading.value.trim();available&=~(1<<c);
  for(let i=0;i<n;i++)if(study.rows[i].values[c]!==null&&study.rows[i].values[c]!==answer)mask&=~(1<<i);
  return {cueId:study.cues[c].id,value:answer};
 });
 const indexes=m=>study.rows.flatMap((_,i)=>m&(1<<i)?[i]:[]);
 const decisions=m=>[...new Set(indexes(m).map(i=>study.rows[i].decision))];
 const branches=(m,c)=>{
  const known=[...new Set(indexes(m).map(i=>study.rows[i].values[c]).filter(v=>v!==null))];
  const hasUnknown=indexes(m).some(i=>study.rows[i].values[c]===null);
  return [...known.map(answer=>({answer,kind:'declared-category'})),...(hasUnknown?[{answer:null,kind:'other-category'}]:[])].map(branch=>({...branch,mask:indexes(m).reduce((a,i)=>study.rows[i].values[c]===null||study.rows[i].values[c]===branch.answer?a|(1<<i):a,0)}));
 };
 const memo=new Map();
 function solve(m,a){
  const key=m*256+a;if(memo.has(key))return memo.get(key);
  const labels=decisions(m);
  if(!m)return {cost:null,status:'outside-retained-evidence',options:[]};
  if(labels.length===1&&labels[0]!==null)return {cost:0,status:'one-retained-label',options:[]};
  if(labels.includes(null))return {cost:null,status:'unknown-decision',options:[]};
  const options=[];
  for(let c=0;c<k;c++)if(a&(1<<c)){
   const outcomes=branches(m,c).map(b=>({...b,remaining:solve(b.mask,a&~(1<<c)).cost}));
   const cost=outcomes.some(b=>b.remaining===null)?null:costs[c]+Math.max(...outcomes.map(b=>b.remaining));
   options.push({cueId:study.cues[c].id,cost,outcomes:outcomes.map(b=>({answer:b.answer,kind:b.kind,exampleIndexes:indexes(b.mask),remainingQuestions:b.remaining}))});
  }
  const finite=options.filter(o=>o.cost!==null),cost=finite.length?Math.min(...finite.map(o=>o.cost)):null;
  const result={cost,status:cost===null?'unresolved':'distinguishable',options};memo.set(key,result);return result;
 }
 const result=solve(mask,available);
 return {readings:accepted,compatibleExampleIndexes:indexes(mask),retainedLabels:decisions(mask),status:result.status,
  worstCaseQuestions:result.cost,questions:result.options,bestFirstCueIds:result.cost===null?[]:result.options.filter(o=>o.cost===result.cost).map(o=>o.cueId),
  boundary:'Counts concern declared categorical questions over these retained examples only. Unknown readings remain compatible in every applicable branch; an unrecorded answer can leave no retained evidence. Equal labels are declarations, not instructions or predictions. No probabilities, physical effort, causal rule or learning effect is estimated.'};
}


export const CUE_QUESTION_PLAN='skill-translator.cue-question-plan/v1';
/** Availability and effort are explicit supplied assumptions, never inferred capabilities. */
export function importCueQuestionPlan(value,raw){
 const study=importCueStudy(value);
 check(raw?.format===CUE_QUESTION_PLAN,'Open a supported cue question plan');
 check(Array.isArray(raw.cues)&&raw.cues.length===study.cues.length,'Declare availability and effort for every retained cue');
 const seen=new Set();
 const cues=raw.cues.map(c=>{
  check(c&&study.cues.some(s=>s.id===c.cueId)&&!seen.has(c.cueId),'Plan must name each retained cue exactly once');seen.add(c.cueId);
  check(typeof c.available==='boolean','Declare cue availability explicitly');
  check(Number.isSafeInteger(c.effort)&&c.effort>=1&&c.effort<=1000,'Declare integer effort from 1 to 1000 for each cue');
  check(typeof c.basis==='string'&&c.basis.trim()&&c.basis.length<=1000,'Supply an availability and effort basis of at most 1000 characters');
  return {cueId:c.cueId,available:c.available,effort:c.effort,basis:c.basis.trim()};
 });
 return {format:CUE_QUESTION_PLAN,cues:study.cues.map(c=>cues.find(p=>p.cueId===c.id))};
}
export function inspectCueQuestions(value,readings=[]){return inspectQuestions(value,readings);}
/** Exact minimax additive effort. A plan applies only to remaining questions. */
export function inspectCueEffort(value,readings=[],raw){
 const plan=importCueQuestionPlan(value,raw),result=inspectQuestions(value,readings,plan);
 return {readings:result.readings,plan,compatibleExampleIndexes:result.compatibleExampleIndexes,
  retainedLabels:result.retainedLabels,status:result.status,worstCaseEffort:result.worstCaseQuestions,
  bestFirstCueIds:result.bestFirstCueIds,
  questions:result.questions.map(q=>({cueId:q.cueId,effort:q.cost,outcomes:q.outcomes.map(b=>({answer:b.answer,kind:b.kind,exampleIndexes:b.exampleIndexes,remainingEffort:b.remainingQuestions}))})),
  unavailableCueIds:plan.cues.filter(c=>!c.available).map(c=>c.cueId),
  boundary:'Effort units and cue availability are supplied assumptions for remaining questions over retained examples. Costs add along a branch; the largest branch total is minimized. Recorded readings remain evidence even when a cue is now unavailable. Unknown-compatible rows do not become exact support. This does not infer physical accessibility, safety, reliability, a correct target action or learning benefit.'};
}
