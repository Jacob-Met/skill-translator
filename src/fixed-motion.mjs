/** Fixed declared proper orientation; exact common translation, not all-motion feasibility. */
import {sharedMotionInputs} from './shared-motion-groups.mjs';
import {fitProperPointPattern} from './point-pattern-fit.mjs';
import {solveCommonDisks} from './common-disk-certificate.mjs';
import {rational as q,add,sub,mul,div,neg,serial,enclosure} from '../vendor/chronos/exact-halfplanes.mjs';
const sq=x=>mul(x,x), shown=x=>({exact:serial(x),...enclosure(x)});
export function declaredProperOrientation(raw){
 if(!raw||!Number.isSafeInteger(raw.a)||!Number.isSafeInteger(raw.b)||Math.abs(raw.a)>1000000||Math.abs(raw.b)>1000000||(!raw.a&&!raw.b))throw Error('Declare integer orientation parameters a and b within ±1000000, not both zero.');
 const a=q(raw.a),b=q(raw.b),den=add(sq(a),sq(b));
 return {c:div(sub(sq(a),sq(b)),den),s:div(mul(q(2),mul(a,b)),den)};
}
export function inspectFixedMotion(raw,selection,{maxWork=100000}={}){
 const {study,rows}=sharedMotionInputs(raw);
 if(!selection||!Array.isArray(selection.ids)||selection.ids.length<2||selection.ids.length>12||new Set(selection.ids).size!==selection.ids.length)throw Error('Select 2–12 distinct corresponding point IDs.');
 const from=rows.find(r=>r.id===selection.fromSourceId),to=rows.find(r=>r.id===selection.toSourceId);
 if(!from||!to||from===to)throw Error('Choose two distinct retained source IDs.');
 const ids=[...selection.ids].sort();
 if(ids.some(id=>!from.points.has(id)||!to.points.has(id)))throw Error('Every selected point must be observed in both chosen sources; missing positions are not imputed.');
 const {c,s}=declaredProperOrientation(selection.orientation),radius=q(study.deviationMm);
 const disks=ids.map(id=>{
  const p=from.points.get(id),v=to.points.get(id),x=q(p.xMm),y=q(p.yMm);
  return {row:{id},c:[sub(q(v.xMm),sub(mul(c,x),mul(s,y))),sub(q(v.yMm),add(mul(s,x),mul(c,y)))],r2:sq(radius)};
 });
 const certificate=solveCommonDisks(disks,{maxWork});
 const leastSquares=fitProperPointPattern(ids.map(id=>({id,target:from.points.get(id),attempt:to.points.get(id)})));
 return {method:'fixed-proper-orientation-common-translation/v1',fromSourceId:from.id,toSourceId:to.id,selectedIds:ids,thresholdMm:study.deviationMm,
 orientation:{parameters:{a:selection.orientation.a,b:selection.orientation.b},cosine:shown(c),sine:shown(s)},leastSquares,
 ...certificate,
 limitation:'Exact closed translation disks use the supplied binary64 calibrated positions and threshold, without the separate least-squares numerical slack. Orientation is explicitly declared, not inferred or the rounded least-squares angle. Incompatibility rules out only this fixed orientation and selected source pair. It does not rule out another proper orientation, establish a partition, physical rigidity, cause or successful skill. Work/arithmetic exhaustion is unresolved. Original sources, fitted groups and practice scores remain unchanged.'};
}
