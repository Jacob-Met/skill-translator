/** Target-specific, on-sheet distinguishability of explicitly declared sizes. */
import {validateDemonstrationResponse,responseFromDemonstrations} from './response-demonstrations.mjs';
import {analyzeResponseStudy} from './response-family.mjs';
import {freezeRawAffineChallenge} from './raw-affine-challenge.mjs';
import {derive} from './geometry.mjs';
import {rational as r,add,sub,mul,neg,cmp,clip,enclosure,serial} from '../vendor/chronos/exact-halfplanes.mjs';
export const AFFINE_CANDIDATES_SCHEMA='skill-translator-affine-candidates/v1';
export const MAX_CANDIDATE_BYTES=2_000_000,MAX_CANDIDATE_WORK=200000;
const ZERO=r(0),TWO=r(2),fail=m=>{throw Error(m);};
function capacity(value){if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_CANDIDATE_BYTES)fail('Complete candidate account exceeds 2 MB; no source is discarded.');}
const number=(v,lo,hi,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)fail(`${name} must be ${lo}–${hi}.`);return v;};
export function validateAffineCandidates(input){
 if(input?.schema!==AFFINE_CANDIDATES_SCHEMA)fail('Unsupported affine candidate account.');capacity(input);
 const trainingAccount=validateDemonstrationResponse(input.trainingAccount),training=responseFromDemonstrations(trainingAccount);
 if(!training.observations.length||training.observations.length>50)fail('Retain 1–50 training observations for a prospective comparison.');
 const target={widthMm:number(input.target?.widthMm,1,10000,'Target width'),heightMm:number(input.target?.heightMm,1,10000,'Target height')};
 if(!Array.isArray(input.candidates)||!input.candidates.length||input.candidates.length>6)fail('Declare 1–6 candidate workpieces.');
 const ids=new Set(),sizes=new Set([`${training.source.source.widthMm}/${training.source.source.heightMm}`,...training.observations.map(v=>`${v.widthMm}/${v.heightMm}`)]);
 const candidates=input.candidates.map(v=>{
  if(typeof v?.id!=='string'||! /^[a-z0-9-]{1,24}$/.test(v.id)||ids.has(v.id))fail('Give each candidate a distinct lowercase id of 1–24 letters, digits or hyphens.');ids.add(v.id);
  if(typeof v.label!=='string'||!v.label.trim()||v.label.trim().length>160)fail('Name each candidate in 1–160 characters.');
  const widthMm=number(v.widthMm,1,10000,'Candidate width'),heightMm=number(v.heightMm,1,10000,'Candidate height'),key=`${widthMm}/${heightMm}`;
  if(sizes.has(key))fail('Candidate sizes must differ from source, training and other candidates.');sizes.add(key);
  return {id:v.id,label:v.label.trim(),widthMm,heightMm,xBoundMm:number(v.xBoundMm,0,1000,'Prospective x bound'),yBoundMm:number(v.yBoundMm,0,1000,'Prospective y bound')};
 });
 const account={schema:AFFINE_CANDIDATES_SCHEMA,trainingAccount,target,candidates};capacity(account);return account;
}
export function createAffineCandidates(trainingAccount,target,candidates){return validateAffineCandidates({schema:AFFINE_CANDIDATES_SCHEMA,trainingAccount,target,candidates});}
export function encodeAffineCandidates(input){return JSON.stringify(validateAffineCandidates(input));}
const dot=(p,v)=>add(mul(p[0],v[0]),mul(p[1],v[1]));
const unseal=q=>[BigInt(q.numerator),BigInt(q.denominator)];
function tick(work){if(++work.count>work.limit)fail('Candidate comparison work capacity exhausted; no complete ranking is returned.');}
function hull(points,work){
 const order=(a,b)=>{tick(work);return cmp(a[0],b[0])||cmp(a[1],b[1]);};points.sort(order);
 const unique=points.filter((p,i)=>!i||order(p,points[i-1]));if(unique.length<3)return unique;
 const cross=(a,b,c)=>{tick(work);return sub(mul(sub(b[0],a[0]),sub(c[1],a[1])),mul(sub(b[1],a[1]),sub(c[0],a[0])));};
 const half=rows=>{const out=[];for(const p of rows){while(out.length>=2&&cmp(cross(out.at(-2),out.at(-1),p),ZERO)<=0)out.pop();out.push(p);}out.pop();return out;};
 return [...half(unique),...half([...unique].reverse())];
}
function extrema(polygon,direction){const values=polygon.map(p=>dot(p,direction));return {min:values.reduce((a,b)=>cmp(a,b)<0?a:b),max:values.reduce((a,b)=>cmp(a,b)>0?a:b)};}
function ambiguity(polygon,direction){const ex=extrema(polygon,direction);return sub(ex.max,ex.min);}
function outcomeAxis(polygon,origin,extent,delta,target,bound,work){
 // A model admits some on-sheet reading iff its interval meets [0, extent].
 const feasible=clip(clip(polygon,delta[0],delta[1],sub(add(extent,bound),origin),work),neg(delta[0]),neg(delta[1]),add(origin,bound),work);
 if(!feasible.length)return {status:'no-on-sheet-reading',value:null,details:{feasibleVertices:0}};
 const differences=[];for(const p of feasible)for(const q of feasible){tick(work);differences.push([sub(p[0],q[0]),sub(p[1],q[1])]);}
 if(differences.length>12544)fail('Candidate difference-pair capacity exhausted; no complete ranking is returned.');
 const difference=hull(differences,work),twice=mul(TWO,bound);
 const shared=clip(clip(difference,delta[0],delta[1],twice,work),neg(delta[0]),neg(delta[1]),twice,work);
 if(!shared.length)fail('Internal shared-reading support was unexpectedly empty.');
 const maximum=extrema(shared,target).max;
 return {status:'supported',value:maximum,details:{feasibleVertices:feasible.length,differenceVertices:difference.length,sharedVertices:shared.length}};
}
export function compareAffineCandidates(input,{maxWork=MAX_CANDIDATE_WORK}={}){
 if(!Number.isSafeInteger(maxWork)||maxWork<1||maxWork>MAX_CANDIDATE_WORK)fail('Declare a finite candidate work budget of 1–200000.');
 const account=validateAffineCandidates(input),training=responseFromDemonstrations(account.trainingAccount),analysis=analyzeResponseStudy(training);
 if(analysis.status!=='supported')fail('The unchanged training family must be nonempty before comparing candidates.');
 const task=derive(training.source),mark=task.landmarks.find(m=>m.id===training.landmarkId),source=task.source,target=[sub(r(account.target.widthMm),r(source.widthMm)),sub(r(account.target.heightMm),r(source.heightMm))],work={count:0,limit:maxWork};
 const polygons=Object.fromEntries(['x','y'].map(axis=>[axis,analysis.axes[axis].vertices.map(v=>v.exact.map(unseal))]));
 const baseline=Object.fromEntries(['x','y'].map(axis=>{const value=ambiguity(polygons[axis],target);return [axis,{exact:serial(value),...enclosure(value)}];}));
 const internal=account.candidates.map(candidate=>{const delta=[sub(r(candidate.widthMm),r(source.widthMm)),sub(r(candidate.heightMm),r(source.heightMm))],axes={};for(const axis of ['x','y'])axes[axis]=outcomeAxis(polygons[axis],r(axis==='x'?mark.uv.u*source.widthMm:mark.uv.v*source.heightMm),r(axis==='x'?candidate.widthMm:candidate.heightMm),delta,target,r(candidate[axis+'BoundMm']),work);return {candidate,axes,feasible:['x','y'].every(a=>axes[a].status==='supported')};});
 const rows=internal.map(row=>({candidate:row.candidate,status:row.feasible?'comparable':'no-on-sheet-reading',axes:Object.fromEntries(['x','y'].map(axis=>{const a=row.axes[axis];return [axis,{status:a.status,...a.details,remainingTargetSpread:a.value===null?null:{exact:serial(a.value),...enclosure(a.value)}}];})),dominatedBy:row.feasible?internal.filter(other=>other!==row&&other.feasible&&['x','y'].every(a=>cmp(other.axes[a].value,row.axes[a].value)<=0)&&['x','y'].some(a=>cmp(other.axes[a].value,row.axes[a].value)<0)).map(other=>other.candidate.id):[]}));
 return {account,status:rows.some(v=>v.status==='comparable')?'compared':'no-feasible-candidates',complete:true,work:work.count,workLimit:maxWork,baseline,rows,limitations:[
  'Worst same-reading target separation is computed over the unchanged affine family with the supplied prospective coordinate bounds and on-sheet candidate readings.',
  'Dominance compares only the explicitly supplied finite list and both coordinates. No candidate is automatically selected; ties remain ties.',
  'A smaller value is conditional distinguishability, not expected information, probability, physical acquisition success or validated skill transfer.',
  'Source calibration, correspondence, training, coefficient domain and discrepancy bounds remain supplied assumptions. Farther extrapolation can appear more distinguishing without being physically credible.',
  'No-on-sheet-reading candidates are incompatible with the declared family and bounds, not maximally informative. Refusal or work exhaustion supplies no complete ranking.',
  'Comparison bounds remain in this account. The existing prospective challenge requires actual outcome bounds to be declared independently; it does not enforce these planning assumptions.'
 ]};
}
export function freezeComparedCandidate(input,candidateId,outcomesNotUsed){
 if(outcomesNotUsed!==true)fail('Explicitly declare that outcomes were not used to choose this candidate.');
 const report=compareAffineCandidates(input),row=report.rows.find(r=>r.candidate.id===candidateId);if(!row)fail('Explicitly select a declared candidate.');if(row.status!=='comparable')fail('This candidate admits no on-sheet reading under the supplied family and bounds.');
 const training=responseFromDemonstrations(report.account.trainingAccount),used=new Set(training.observations.map(r=>r.id));let i=1;while(used.has('challenge-candidate-'+i))i++;
 return freezeRawAffineChallenge(report.account.trainingAccount,[{id:'challenge-candidate-'+i,label:row.candidate.label,widthMm:row.candidate.widthMm,heightMm:row.candidate.heightMm}],true);
}
