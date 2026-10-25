import {importConditionOutcomes} from './condition-outcomes.mjs';
import {inspectUnjudgedFamily} from './condition-family.mjs';
export const JUDGMENT_SETS_FORMAT='skill-translator.condition-judgment-sets/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function importJudgmentSets(raw){
 check(raw?.format===JUDGMENT_SETS_FORMAT,'Unsupported judgment-set account');
 const original=importConditionOutcomes(raw.original),ids=new Set(),members=new Set();
 check(Array.isArray(raw.sets)&&raw.sets.length>=1&&raw.sets.length<=8,'Declare one to eight named sets');
 const available=new Set(original.judgments.filter(j=>j.outcome==='unknown').map(j=>j.round));
 const sets=Array.from(raw.sets,s=>{
  check(s&&typeof s.id==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(s.id)&&!ids.has(s.id),'Use unique short set identifiers');ids.add(s.id);
  check(typeof s.label==='string'&&s.label.trim()&&s.label.length<=120,'Supply a set name of at most120 characters');
  check(Array.isArray(s.rounds)&&s.rounds.length>=1&&s.rounds.length<=6,'Each set needs one to six unjudged rounds');
  const rounds=Array.from(s.rounds,r=>{check(Number.isSafeInteger(r)&&available.has(r),'Select retained unjudged round identities');return r;}).sort((a,b)=>a-b);
  check(new Set(rounds).size===rounds.length,'A round cannot occur twice');const key=rounds.join(',');check(!members.has(key),'Equivalent round sets cannot be repeated');members.add(key);
  return {id:s.id,label:s.label.trim(),rounds};
 });
 return {format:JUDGMENT_SETS_FORMAT,original,sets};
}
export function inspectJudgmentSets(raw){
 const account=importJudgmentSets(raw),finding=inspectUnjudgedFamily(account.original);
 const rows=new Map(finding.sourceRows.map(r=>[r.round,r]));
 const comparisons=account.sets.map(s=>{
  const patterns=finding.family.map(h=>{
   let known=0,holds=0;for(const [i,id]of s.rounds.entries()){const r=rows.get(id);if(h.mask&r.outsideMask)known|=1<<i;else if((h.mask&r.withinMask)===h.mask){known|=1<<i;holds|=1<<i;}}
   return {mask:h.mask,known,holds};
  });
  const branches=Array.from({length:2**s.rounds.length},(_,bits)=>({bits,remaining:patterns.reduce((n,p)=>n+((bits&p.known)===p.holds?1:0),0)}));
  return {...s,patterns,branches,worstRemaining:Math.max(...branches.map(b=>b.remaining)),emptyBranches:branches.filter(b=>b.remaining===0).length};
 });
 return {...finding,status:!finding.contrast?'insufficient-contrast':!finding.family.length?'no-compatible-conjunction':'compared',comparisons};
}
export function inspectJudgmentBranch(finding,setId,bits){
 const set=finding.comparisons.find(s=>s.id===setId);check(set&&Number.isSafeInteger(bits)&&bits>=0&&bits<set.branches.length,'Choose an explicit complete hypothetical branch');
 const remaining=set.patterns.filter(p=>(bits&p.known)===p.holds).map(p=>p.mask);
 return {judgments:set.rounds.map((round,i)=>({round,outcome:bits&(1<<i)?'acceptable':'unacceptable'})),remaining,status:remaining.length?'compatible':'contradicts-current-family'};
}
