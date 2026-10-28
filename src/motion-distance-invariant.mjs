/** A necessary distance condition only; passing does not establish proper motion. */
import {sharedMotionInputs} from './shared-motion-groups.mjs';
import {inspectFixedMotion} from './fixed-motion.mjs';
import {rational as q,add,sub,mul,cmp,serial} from '../vendor/chronos/exact-halfplanes.mjs';
const sq=x=>mul(x,x),distance2=(a,b)=>add(sq(sub(q(a.xMm),q(b.xMm))),sq(sub(q(a.yMm),q(b.yMm))));
export function inspectMotionWithDistance(raw,selection){
 const fixed=inspectFixedMotion(raw,selection);
 try{return {...fixed,distanceInvariant:inspectMotionDistanceInvariant(raw,selection)};}
 catch(error){if(!/Exact arithmetic capacity exhausted/.test(error.message))throw error;
  return {...fixed,distanceInvariant:{status:'unavailable',reason:'Exact arithmetic capacity exhausted; the independent distance check is unavailable. The completed fixed-orientation result is retained.'}};}
}
export function inspectMotionDistanceInvariant(raw,selection){
 const {study,rows}=sharedMotionInputs(raw);
 const ids=selection?.ids;
 if(!Array.isArray(ids)||ids.length<2||ids.length>12||new Set(ids).size!==ids.length)throw Error('Select 2–12 distinct corresponding points.');
 const a=rows.find(x=>x.id===selection.fromSourceId),b=rows.find(x=>x.id===selection.toSourceId);
 if(!a||!b||a===b||ids.some(id=>!a.points.has(id)||!b.points.has(id)))throw Error('Each selected point must occur in both distinct retained sources.');
 const order=[...ids].sort(),bound=mul(q(2),q(study.deviationMm)),pairs=[];
 for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){
  const u=order[i],v=order[j],A=distance2(a.points.get(u),a.points.get(v)),B=distance2(b.points.get(u),b.points.get(v)),D=sub(add(A,B),sq(bound)),gap=sub(sq(D),mul(q(4),mul(A,B)));
  // |sqrt(A)-sqrt(B)| > bound iff D>0 and D²>4AB. Strictness retains tangency.
  pairs.push({ids:[u,v],fromSquaredMm:serial(A),toSquaredMm:serial(B),D:serial(D),squaredComparisonGap:serial(gap),excluded:cmp(D,q(0))>0&&cmp(gap,q(0))>0});
 }
 return {method:'selected-point-distance-necessity/v1',selectedIds:order,fromSourceId:a.id,toSourceId:b.id,perPointBoundMm:study.deviationMm,pairBound:serial(bound),pairs,excluded:pairs.some(p=>p.excluded),pairCount:pairs.length,pairLimit:66,limitation:'A violated pair excludes every Euclidean isometry under this shared per-point bound, including reflections. Finding no violated pair is inconclusive: distances alone do not prove a proper rotation/translation or joint feasibility. These are exact supplied calibrated coordinates, not physical accuracy, rigidity or skill. The fixed-orientation inquiry remains separate.'};
}
