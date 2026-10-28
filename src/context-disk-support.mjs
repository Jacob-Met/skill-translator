import {solveCommonDisks} from './common-disk-certificate.mjs';
/** Common-position certificates for exact, closed, explicitly declared disks. */
import {contextRows} from './context-consistency.mjs';
import {minimumConvexQuadratic,MAX_CIRCLE_CERTIFICATE_WORK} from '../vendor/chronos/exact-circle-support.mjs';
import {rational as q,add,sub,mul,div,neg,cmp,serial,enclosure} from '../vendor/chronos/exact-halfplanes.mjs';
const ZERO=q(0),ONE=q(1),TWO=q(2),sq=a=>mul(a,a),dot=(a,b)=>add(mul(a[0],b[0]),mul(a[1],b[1])),minus=(a,b)=>[sub(a[0],b[0]),sub(a[1],b[1])];
const shown=r=>({exact:serial(r),...enclosure(r)});
export const CONTEXT_DISK_METHOD='exact-comparable-context-disks/v1';
const limitations=[
 'Equal sheet dimensions do not establish equal materials, tools or other relevant conditions. Comparability is an explicit supplied declaration, not an inference.',
 'These are exact closed disks at the supplied binary64 coordinates and radii, not probabilities or calibrated measurement accuracy. Existing five-rule scores retain their separate 1e-9 mm numerical guard.',
 'Incompatibility rules out a common position under this declaration and these bounds. It does not identify a faulty record, physical cause, necessary action, or which assumption to change.',
 'A common point is mathematical compatibility, not evidence that an unknown rule, physical skill or transfer succeeds. Original source rules and observations remain unchanged.',
 'A contradiction witness uses at most three retained records; it need not be a smallest conflicting group. Work or arithmetic exhaustion makes no partial compatibility claim.'
];
export function analyzeContextDisks(value,{maxWork=MAX_CIRCLE_CERTIFICATE_WORK}={}){
 const {account,rows}=contextRows(value);
 const base={method:CONTEXT_DISK_METHOD,selectedIds:rows.map(o=>o.id),dimensions:{widthMm:rows[0].widthMm,heightMm:rows[0].heightMm},limitations};
 const disks=rows.map(row=>({row,c:[q(row.xMm),q(row.yMm)],r2:sq(q(row.uncertaintyMm))}));
 const result=solveCommonDisks(disks,{maxWork,verifyPoint:point=>{
 if(cmp(point[0],ZERO)<0||cmp(point[1],ZERO)<0||cmp(point[0],q(rows[0].widthMm))>0||cmp(point[1],q(rows[0].heightMm))>0)throw Error('The common point is outside the declared sheet.');
 }});
 return {...base,...result};
}
