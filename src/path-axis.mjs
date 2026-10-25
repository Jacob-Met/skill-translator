// An explanatory straight-axis hypothesis from retained nominal samples.
// No physical guide, task criterion or point correspondence is inferred.
import {inspectSequencePath} from './sequence-path.mjs';

function fit(points, guardMm) {
  if(points.length < 2) return {status:'insufficient-observations'};
  const center={xMm:points.reduce((s,p)=>s+p.xMm,0)/points.length,
    yMm:points.reduce((s,p)=>s+p.yMm,0)/points.length};
  let xx=0,xy=0,yy=0;
  for(const p of points){const x=p.xMm-center.xMm,y=p.yMm-center.yMm;xx+=x*x;xy+=x*y;yy+=y*y;}
  xx/=points.length;xy/=points.length;yy/=points.length;
  const trace=xx+yy,gap=Math.hypot(xx-yy,2*xy);
  if(trace<=guardMm*guardMm) return {status:'unresolved-coincident',center};
  // A relative eigengap guard refuses numerically unstable orientation. It is
  // not a physical uncertainty bound or a threshold for calling motion straight.
  if(gap<=Math.max(guardMm*guardMm,trace*1e-10))return {status:'unresolved-direction',center};
  const angle=.5*Math.atan2(2*xy,xx-yy),direction={x:Math.cos(angle),y:Math.sin(angle)};
  const along=points.map(p=>(p.xMm-center.xMm)*direction.x+(p.yMm-center.yMm)*direction.y);
  const endpoint=t=>({xMm:center.xMm+t*direction.x,yMm:center.yMm+t*direction.y});
  return {status:'resolved',center,direction,angleDegrees:angle*180/Math.PI,
    endpoints:[endpoint(Math.min(...along)),endpoint(Math.max(...along))],
    relativeEigenGap:gap/trace};
}
const offset=(axis,p)=>axis.direction.x*(p.yMm-axis.center.yMm)-axis.direction.y*(p.xMm-axis.center.xMm);

export function inspectPathAxis(raw){
  const path=inspectSequencePath(raw),known=path.samples.filter(s=>s.position),guard=path.numericalLengthGuardMm;
  const axis=known.length<3?{status:'insufficient-observations'}:fit(known.map(s=>s.position),guard);
  const rows=path.samples.map(s=>{
    if(!s.position)return {momentId:s.momentId,status:'missing-observation',residualMm:null,heldOutResidualMm:null,heldOutStatus:'missing-observation'};
    const heldOut=fit(known.filter(k=>k.momentId!==s.momentId).map(k=>k.position),guard);
    return {momentId:s.momentId,status:axis.status,residualMm:axis.status==='resolved'?offset(axis,s.position):null,
      heldOutResidualMm:heldOut.status==='resolved'?Math.abs(offset(heldOut,s.position)):null,heldOutStatus:heldOut.status};
  });
  const residuals=rows.filter(r=>r.residualMm!==null).map(r=>r.residualMm);
  const heldOut=rows.filter(r=>r.heldOutResidualMm!==null).map(r=>r.heldOutResidualMm);
  return {axis,rows,path,observedCount:known.length,selectedCount:path.samples.length,
    rmsResidualMm:residuals.length?Math.hypot(...residuals)/Math.sqrt(residuals.length):null,
    maxResidualMm:residuals.length?Math.max(...residuals.map(Math.abs)):null,
    heldOutResolvedCount:heldOut.length,maxHeldOutResidualMm:heldOut.length?Math.max(...heldOut):null,
    boundary:'This total-least-squares line minimizes summed squared perpendicular distances to all observed selected nominal points, weighted equally per sample. It is an inferred geometric hypothesis, not an observed guide, contact, task invariant or success criterion. No point is removed as an outlier. Each held-out check fits the other observed samples and measures the excluded point; these reuse one demonstration and are not independent trials. Missing and unselected samples remain unobserved, and the line does not bridge them as evidence. Residuals have no supplied physical uncertainty bound. Axis sign is a numerical convention, not motion direction. No source annotation, authored guide, tolerance or score changes.'};
}
