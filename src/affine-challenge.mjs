/** Prospective receiving against one source-conditioned affine family. */
import {validateResponseStudy,analyzeResponseStudy,createResponseObservation} from './response-family.mjs';
export const MAX_AFFINE_CHALLENGE_BYTES=2_000_000;
const assertCapacity=value=>{if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_AFFINE_CHALLENGE_BYTES)throw Error('Complete affine challenge exceeds2MB; previous results must be retained');};
export const AFFINE_CHALLENGE_SCHEMA='skill-translator-affine-challenge/v1';
const copy=v=>JSON.parse(JSON.stringify(v));
const fail=m=>{throw Error(m);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const dimension=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<1||n>10000)fail(label+' must be 1–10000 mm');return n;};
function validatePlan(input){
 if(input?.schema!==AFFINE_CHALLENGE_SCHEMA)fail('Unsupported affine challenge');
 const training=validateResponseStudy(input.training);
 if(!training.observations.length||training.observations.length>50)fail('Freeze 1–50 training observations');
 if(analyzeResponseStudy(training).status!=='supported')fail('The training family must be nonempty before freezing a challenge');
 if(input.outcomesNotUsed!==true)fail('Explicitly declare that challenge outcomes were not used to choose the plan');
 if(!Array.isArray(input.plan)||!input.plan.length||input.plan.length>6)fail('Plan 1–6 separate workpieces');
 const ids=new Set(),sizes=new Set([`${training.source.source.widthMm}/${training.source.source.heightMm}`,...training.observations.map(r=>`${r.widthMm}/${r.heightMm}`)]);
 const plan=input.plan.map(row=>{
  if(typeof row?.id!=='string'||!/^challenge-[a-z0-9-]{1,30}$/.test(row.id)||ids.has(row.id))fail('Each challenge needs a distinct challenge-prefixed id');ids.add(row.id);
  if(training.observations.some(r=>r.id===row.id))fail('Challenge and training ids must be distinct');
  if(typeof row.label!=='string'||!row.label.trim()||row.label.trim().length>160)fail('Name each planned workpiece');
  const widthMm=dimension(row.widthMm,'Planned width'),heightMm=dimension(row.heightMm,'Planned height'),key=`${widthMm}/${heightMm}`;
  if(sizes.has(key))fail('Each challenge size must differ from source, training and other planned sizes');sizes.add(key);
  return {id:row.id,label:row.label.trim(),widthMm,heightMm};
 });
 return {schema:AFFINE_CHALLENGE_SCHEMA,training,plan,outcomesNotUsed:true};
}
export function freezeAffineChallenge(training,plan,outcomesNotUsed){return validateAffineChallenge({schema:AFFINE_CHALLENGE_SCHEMA,training,plan,outcomesNotUsed,results:[]});}
export function validateAffineChallenge(input){
 assertCapacity(input);
 const accepted=validatePlan(input);
 if(!Array.isArray(input.results)||input.results.length>accepted.plan.length)fail('Supply at most one result per planned workpiece');
 const ids=new Set();
 const results=input.results.map(raw=>{
  const planned=accepted.plan.find(p=>p.id===raw?.id);
  if(!planned||ids.has(raw.id))fail('Result must refer to one distinct planned workpiece');ids.add(raw.id);
  if(raw.widthMm!==planned.widthMm||raw.heightMm!==planned.heightMm)fail('Result size differs from the frozen plan');
  const row=createResponseObservation(accepted.training.source,accepted.training.landmarkId,raw);
  if(!same(row.sourceReference,raw.sourceReference))fail('Result refers to another frozen source reading');
  return row;
 });
 const normalized={...accepted,results};assertCapacity(normalized);return normalized;
}
export function receiveAffineResult(input,challengeId,reading){
 const accepted=validateAffineChallenge(input),planned=accepted.plan.find(p=>p.id===challengeId);if(!planned)fail('Choose a frozen workpiece');
 const row=createResponseObservation(accepted.training.source,accepted.training.landmarkId,{...reading,id:planned.id,widthMm:planned.widthMm,heightMm:planned.heightMm});
 return validateAffineChallenge({...accepted,results:[...accepted.results.filter(r=>r.id!==challengeId),row]});
}
export function analyzeAffineChallenge(input){
 const accepted=validateAffineChallenge(input),training=accepted.training,rows=[];let prefix=[...training.observations],firstJointContradiction=null;
 for(const planned of accepted.plan){
  const frozen=analyzeResponseStudy({...training,target:{widthMm:planned.widthMm,heightMm:planned.heightMm}}),result=accepted.results.find(r=>r.id===planned.id);
  let individuallyCompatible=null,jointlyCompatible=null;
  if(result){
   individuallyCompatible=analyzeResponseStudy({...training,observations:[...training.observations,result]}).status==='supported';
   prefix.push(result);jointlyCompatible=analyzeResponseStudy({...training,observations:prefix}).status==='supported';
   if(!jointlyCompatible&&firstJointContradiction===null)firstJointContradiction=planned.id;
  }
  rows.push({id:planned.id,label:planned.label,widthMm:planned.widthMm,heightMm:planned.heightMm,frozenPrediction:{x:frozen.axes.x.prediction,y:frozen.axes.y.prediction},result:result?copy(result):null,individuallyCompatible,jointlyCompatible});
 }
 return {status:firstJointContradiction?'contradicted':accepted.results.length===accepted.plan.length?'compatible-complete':accepted.results.length?'compatible-incomplete':'awaiting-results',
  received:accepted.results.length,planned:accepted.plan.length,firstJointContradiction,rows,
  limitations:['Training, source and the finite coefficient domain remain frozen; results cannot refit them or revive an explanation excluded by training.','One coefficient assignment per coordinate must satisfy all received results together. Individual envelope agreement is insufficient.','Missing results are untested; a known joint contradiction remains visible even when another result is missing.','The prospective declaration is user-reported, not a trusted timestamp or signed acquisition record.','Coordinate bounds and affine relationships remain supplied assumptions, not physical skill, causal necessity or validated measurement uncertainty.']};
}
export function exportAffineChallenge(input){return validateAffineChallenge(input);}

/** The emitted compact encoding is the same representation admission bounds. */
export function encodeAffineChallenge(input){return JSON.stringify(validateAffineChallenge(input));}
