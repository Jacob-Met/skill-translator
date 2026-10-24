/** Source-conditioned affine response under explicit coordinate-wise bounds. */
import {derive,GeometryError} from './geometry.mjs';
import {observationReference} from './evidence.mjs';
import {rational as r,add,sub,mul,neg,cmp,enclosure,serial,unique,clip} from '../vendor/chronos/exact-halfplanes.mjs';
export const RESPONSE_SCHEMA='skill-translator-response-family/v1';
const copy=v=>JSON.parse(JSON.stringify(v));
const fail=message=>{throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function number(x,lo,hi,name){if(typeof x!=='number'||!Number.isFinite(x)||x<lo||x>hi)fail(`${name} must be ${lo}–${hi}`);return x;}
function text(x,max,name){if(typeof x!=='string'||!x.trim()||x.trim().length>max)fail(`${name} requires 1–${max} characters`);return x.trim();}
function source(demo,landmarkId){const task=derive(demo),mark=task.landmarks.find(m=>m.id===landmarkId);if(!mark)fail('Choose an original source mark');return {task,mark,anchor:observationReference(demo,landmarkId)};}
export function createResponseObservation(demo,landmarkId,input){
 const {anchor}=source(demo,landmarkId);if(!input||typeof input!=='object')fail('Supply an observation');
 const id=text(input.id,40,'Observation id');if(!/^[a-z0-9-]+$/.test(id))fail('Use lowercase letters, digits and hyphens in observation ids');
 if(!['authored-example','reported-measurement'].includes(input.evidenceClass))fail('Declare authored example or reported measurement');
 const widthMm=number(input.widthMm,1,10000,'Workpiece width'),heightMm=number(input.heightMm,1,10000,'Workpiece height');
 return {id,label:text(input.label,160,'Observation source'),evidenceClass:input.evidenceClass,widthMm,heightMm,
  xMm:number(input.xMm,0,widthMm,'Observed x'),yMm:number(input.yMm,0,heightMm,'Observed y'),
  xBoundMm:number(input.xBoundMm,0,1000,'Declared x bound'),yBoundMm:number(input.yBoundMm,0,1000,'Declared y bound'),sourceReference:anchor};
}
export function validateResponseStudy(input){
 if(input?.schema!==RESPONSE_SCHEMA)fail('Unsupported response-family study');
 const {mark}=source(input.source,input.landmarkId);
 const coefficientLimit=number(input.coefficientLimit,0.001,20,'Absolute coefficient limit');
 if(!Array.isArray(input.observations)||input.observations.length>60)fail('Supply at most 60 observations');
 const ids=new Set();const observations=input.observations.map(raw=>{const row=createResponseObservation(input.source,input.landmarkId,raw);if(ids.has(row.id))fail('Observation ids must be distinct');ids.add(row.id);if(!same(row.sourceReference,raw.sourceReference))fail('Observation belongs to a different source reading or mark');return row;});
 const target={widthMm:number(input.target?.widthMm,1,10000,'Target width'),heightMm:number(input.target?.heightMm,1,10000,'Target height')};
 return {schema:RESPONSE_SCHEMA,source:copy(input.source),landmarkId:mark.id,coefficientLimit,observations,target};
}
function range(values){return {lower:values.reduce((a,b)=>cmp(a,b)<0?a:b),upper:values.reduce((a,b)=>cmp(a,b)>0?a:b)};}
const numeric=q=>({lower:enclosure(q.lower).lower,upper:enclosure(q.upper).upper});
export function analyzeResponseStudy(input){
 const study=validateResponseStudy(input),{task,mark}=source(study.source,study.landmarkId),limit=r(study.coefficientLimit);
 const work={count:0,limit:200000};
 const deltas=study.observations.map(row=>({row,dw:sub(r(row.widthMm),r(task.source.widthMm)),dh:sub(r(row.heightMm),r(task.source.heightMm))}));
 let variationRank=0,first=null;for(const d of deltas){if(!d.dw[0]&&!d.dh[0])continue;if(!first){first=d;variationRank=1;}else if(cmp(mul(first.dw,d.dh),mul(first.dh,d.dw))!==0){variationRank=2;break;}}
 const axes={};
 for(const axis of ['x','y']){
  const origin=r(axis==='x'?mark.uv.u*task.source.widthMm:mark.uv.v*task.source.heightMm);
  let polygon=unique([[neg(limit),neg(limit)],[limit,neg(limit)],[limit,limit],[neg(limit),limit]]),firstContradiction=null;
  for(const {row,dw,dh} of deltas){
   const center=sub(r(row[axis+'Mm']),origin),bound=r(row[axis+'BoundMm']);
   polygon=clip(clip(polygon,dw,dh,add(center,bound),work,124),neg(dw),neg(dh),neg(sub(center,bound)),work,124);
   if(!polygon.length&&firstContradiction===null)firstContradiction=row.id;
  }
  if(!polygon.length){axes[axis]={status:'incompatible',firstContradiction,vertices:[],prediction:null};continue;}
  const dw=sub(r(study.target.widthMm),r(task.source.widthMm)),dh=sub(r(study.target.heightMm),r(task.source.heightMm));
  const prediction=numeric(range(polygon.map(p=>add(origin,add(mul(dw,p[0]),mul(dh,p[1]))))));
  axes[axis]={status:'supported',firstContradiction:null,vertices:polygon.map(p=>({width:enclosure(p[0]),height:enclosure(p[1]),exact:p.map(serial)})),
   widthCoefficient:numeric(range(polygon.map(p=>p[0]))),heightCoefficient:numeric(range(polygon.map(p=>p[1]))),prediction,
   extendsBeyondSheet:prediction.lower<0||prediction.upper>(axis==='x'?study.target.widthMm:study.target.heightMm)};
 }
 return {status:Object.values(axes).some(a=>a.status==='incompatible')?'incompatible':study.observations.length?'supported':'unobserved',variationRank,axes,
  observationCount:study.observations.length,constraintEvaluations:work.count,
  limitations:['The source calibration and marked location are conditioned on, not estimated.','Every coefficient is constrained by the explicit finite domain; empty support excludes only this declared affine family within that domain.','Coordinate-wise bounds are supplied assumptions, not circular uncertainty, probabilities or validated measurement errors.','Target ranges are marginal extrema of complete affine families; extrapolation may extend beyond the physical sheet.','The family describes geometry, not physical cause, contact, force, safe action or learned skill.']};
}
export function exportResponseStudy(study){return validateResponseStudy(study);}
