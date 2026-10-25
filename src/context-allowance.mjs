/** Exact minimum hypothetical uniform squared-radius allowance; original disks unchanged. */
import {contextRows} from './context-consistency.mjs';
import {minimumConvexQuadratic,MAX_CIRCLE_CERTIFICATE_WORK} from '../vendor/chronos/exact-circle-support.mjs';
import {rational as q,add,sub,mul,div,neg,cmp,serial,enclosure} from '../vendor/chronos/exact-halfplanes.mjs';
const ZERO=q(0),ONE=q(1),TWO=q(2),sq=a=>mul(a,a),dot=(a,b)=>add(mul(a[0],b[0]),mul(a[1],b[1])),minus=(a,b)=>[sub(a[0],b[0]),sub(a[1],b[1])];
const shown=r=>({exact:serial(r),...enclosure(r)});
export const CONTEXT_ALLOWANCE_METHOD='exact-context-squared-allowance/v1';
const limitations=[
 'The hypothetical allowance is max(0, min over positions of the largest original squared disk residual), in mm². It is added equally to squared radii, not equally to radii; no original bound is changed.',
 'An exact optimum requires a nonnegative-weighted lower bound and an equal all-record feasible upper bound. Negative optimum means zero additional allowance; it is not a physical accuracy estimate.',
 'Equal sheet dimensions do not establish equal materials, tools or other relevant conditions. Comparability is an explicit supplied declaration, not an inference.',
 'Arithmetic uses the supplied binary64 coordinates and radii exactly. Original five-rule scores retain their separate 1e-9 mm numerical guard.',
 'The result does not identify a faulty record, physical cause, appropriate correction, or successful skill transfer. Original observations and the original context contradiction remain unchanged.',
 'No optimum or allowance is returned without a matching certificate and a point checked against every selected record. Work or arithmetic exhaustion is unresolved.'
];
function* supports(n){if(n===2){yield [0,1,0];return;}for(let i=0;i<n-2;i++)for(let j=i+1;j<n-1;j++)for(let k=j+1;k<n;k++)yield [i,j,k];}
export function analyzeContextAllowance(value,{maxWork=MAX_CIRCLE_CERTIFICATE_WORK}={}){
 const {account,rows}=contextRows(value);
 if(!Number.isSafeInteger(maxWork)||maxWork<0||maxWork>MAX_CIRCLE_CERTIFICATE_WORK)throw Error('Context work budget must be an integer from 0 to 100000.');
 const work={count:0,limit:maxWork};let examinedSupports=0;
 const base={method:CONTEXT_ALLOWANCE_METHOD,selectedIds:rows.map(o=>o.id),dimensions:{widthMm:rows[0].widthMm,heightMm:rows[0].heightMm},limitations};
 const charge=()=>{if(work.count===work.limit){const e=Error('Context disk work exhausted; no complete certificate is returned.');e.code='CONTEXT_DISK_WORK';throw e;}work.count++;};
 try{
  const disks=rows.map(row=>{charge();return {row,c:[q(row.xMm),q(row.yMm)],r2:sq(q(row.uncertaintyMm))};});
  for(const ids of supports(disks.length)){
   charge();const [a,b,c]=ids.map(i=>disks[i]),d=minus(b.c,a.c),e=minus(c.c,a.c),A=dot(d,d),B=dot(d,e),C=dot(e,e),D=div(add(A,sub(a.r2,b.r2)),TWO),E=div(add(C,sub(a.r2,c.r2)),TWO);
   // Negative dual objective over a complete weight simplex. The maintained
   // polygon solver handles boundaries, singular/collinear and point supports.
   const minimum=minimumConvexQuadratic([[ZERO,ZERO],[ONE,ZERO],[ZERO,ONE]],{A,B,C,D,E,F:a.r2},work);examinedSupports++;
   const [u,v]=minimum.point,weights=[sub(sub(ONE,u),v),u,v];
   if(weights.some(w=>cmp(w,ZERO)<0))throw Error('A nonnegative certificate could not be verified.');
   const point=[0,1].map(axis=>ids.reduce((sum,id,i)=>add(sum,mul(weights[i],disks[id].c[axis])),ZERO));
   // Verify the certificate independently of the quadratic's returned value.
   let lower=ZERO;for(let i=0;i<3;i++){charge();const disk=disks[ids[i]];lower=add(lower,mul(weights[i],sub(dot(disk.c,disk.c),disk.r2)));}lower=sub(lower,dot(point,point));
   if(cmp(lower,neg(minimum.value))!==0)throw Error('The weighted certificate did not reconcile with the maintained solver.');
   const support=new Map();for(let i=0;i<3;i++)support.set(ids[i],add(support.get(ids[i])??ZERO,weights[i]));
   const certificate=[...support].filter(([,w])=>cmp(w,ZERO)>0).map(([i,w])=>({observationId:rows[i].id,weight:shown(w)}));
   const checks=[];let common=true;
   for(const disk of disks){charge();const residual=sub(dot(minus(point,disk.c),minus(point,disk.c)),disk.r2);if(cmp(residual,lower)>0){common=false;break;}checks.push({observationId:disk.row.id,squaredResidual:shown(residual),optimalityMargin:shown(sub(lower,residual))});}
   if(common){
    if(cmp(point[0],ZERO)<0||cmp(point[1],ZERO)<0||cmp(point[0],q(rows[0].widthMm))>0||cmp(point[1],q(rows[0].heightMm))>0)throw Error('The common point is outside the declared sheet.');
    return {...base,status:'optimal',optimumSquaredResidual:shown(lower),allowanceSquaredMm:shown(cmp(lower,ZERO)>0?lower:ZERO),certificate:{support:certificate,weightedSquaredResidualLowerBound:shown(lower)},point:{xMm:shown(point[0]),yMm:shown(point[1])},checks,work:work.count,workLimit:maxWork,examinedSupports};
   }
  }
  // No partial extrema or failed search is promoted to incompatibility.
  return {...base,status:'unresolved',reason:'No matching lower-bound and all-record feasible-point certificate was obtained from the completed support search.',work:work.count,workLimit:maxWork,examinedSupports};
 }catch(error){
  if(['EXACT_CIRCLE_WORK','CONTEXT_DISK_WORK'].includes(error.code)||/Exact arithmetic capacity exhausted/.test(error.message))return {...base,status:'unresolved',reason:error.message,work:work.count,workLimit:maxWork,examinedSupports};
  throw error;
 }
}
