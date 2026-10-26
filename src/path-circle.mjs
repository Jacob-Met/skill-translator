// Descriptive circular reference inferred from existing calibrated samples.
import {inspectSequencePath} from './sequence-path.mjs';
import {qrSolve} from '../vendor/materialtruth/photometric.mjs';

export const MIN_CIRCLE_COVERAGE_DEGREES=90;
const distance=(a,b)=>Math.hypot(a.xMm-b.xMm,a.yMm-b.yMm);
function fit(points,guard){
 if(points.length<3)return {status:'insufficient-observations'};
 const origin={xMm:points.reduce((s,p)=>s+p.xMm,0)/points.length,yMm:points.reduce((s,p)=>s+p.yMm,0)/points.length};
 const scale=Math.max(...points.map(p=>distance(p,origin)));
 if(scale<=guard)return {status:'unresolved-coincident'};
 const q=points.map(p=>({x:(p.xMm-origin.xMm)/scale,y:(p.yMm-origin.yMm)/scale}));
 // Center and scale before solving to avoid coordinate-origin conditioning.
 // This is algebraic least squares; it does not minimize radial residuals.
 const solved=qrSolve(q.map(p=>[2*p.x,2*p.y,1]),q.map(p=>p.x*p.x+p.y*p.y),1e-8);
 if(!solved)return {status:'unresolved-collinear'};
 const [x,y,c]=solved.solution,radiusSquared=c+x*x+y*y;
 if(!Number.isFinite(radiusSquared)||radiusSquared<=0)return {status:'unresolved-numerical'};
 const center={xMm:origin.xMm+scale*x,yMm:origin.yMm+scale*y},radiusMm=scale*Math.sqrt(radiusSquared);
 if(![center.xMm,center.yMm,radiusMm,solved.qrPivotRatio].every(Number.isFinite)||radiusMm<=guard)return {status:'unresolved-numerical'};
 if(points.some(p=>distance(p,center)<=guard))return {status:'unresolved-central-sample'};
 const angles=points.map(p=>Math.atan2(p.yMm-center.yMm,p.xMm-center.xMm)).sort((a,b)=>a-b);
 const gaps=angles.map((a,i)=>(i+1<angles.length?angles[i+1]:angles[0]+2*Math.PI)-a);
 const coverageDegrees=(2*Math.PI-Math.max(...gaps))*180/Math.PI;
 // A disclosed minimum-spread policy, not a statistical confidence interval.
 // No usable center/radius is returned for a short-arc estimate.
 if(coverageDegrees+1e-9<MIN_CIRCLE_COVERAGE_DEGREES)return {status:'insufficient-angular-support',coverageDegrees};
 return {status:'resolved',center,radiusMm,coverageDegrees,qrPivotRatio:solved.qrPivotRatio};
}

export function inspectPathCircle(raw){
 const path=inspectSequencePath(raw),known=path.samples.filter(s=>s.position),guard=path.numericalLengthGuardMm;
 const circle=known.length<4?{status:'insufficient-observations'}:fit(known.map(s=>s.position),guard);
 const rows=path.samples.map(s=>{
  if(!s.position)return {momentId:s.momentId,status:'missing-observation',residualMm:null,heldOutResidualMm:null,heldOutCenterShiftMm:null,heldOutStatus:'missing-observation'};
  const omitted=fit(known.filter(k=>k.momentId!==s.momentId).map(k=>k.position),guard);
  return {momentId:s.momentId,status:circle.status,
   residualMm:circle.status==='resolved'?distance(circle.center,s.position)-circle.radiusMm:null,
   heldOutResidualMm:omitted.status==='resolved'?Math.abs(distance(omitted.center,s.position)-omitted.radiusMm):null,
   heldOutCenterShiftMm:omitted.status==='resolved'&&circle.status==='resolved'?distance(omitted.center,circle.center):null,
   heldOutStatus:omitted.status};
 });
 const residuals=rows.filter(r=>r.residualMm!==null).map(r=>r.residualMm);
 const heldOut=rows.filter(r=>r.heldOutResidualMm!==null),shifts=rows.filter(r=>r.heldOutCenterShiftMm!==null);
 return {circle,rows,path,observedCount:known.length,selectedCount:path.samples.length,
  rmsResidualMm:residuals.length?Math.hypot(...residuals)/Math.sqrt(residuals.length):null,
  maxResidualMm:residuals.length?Math.max(...residuals.map(Math.abs)):null,
  heldOutResolvedCount:heldOut.length,maxHeldOutResidualMm:heldOut.length?Math.max(...heldOut.map(r=>r.heldOutResidualMm)):null,
  maxHeldOutCenterShiftMm:shifts.length?Math.max(...shifts.map(r=>r.heldOutCenterShiftMm)):null,
  boundary:'A descriptive circular-reference proposal from all observed selected nominal points, weighted equally. Normalized algebraic least squares fits squared-distance equations; it is not a minimum-radial-error fit. At least four observations and 90 degrees of fitted angular coverage are required by this support policy, not a physical confidence guarantee. Every original point is retained, including disagreements. Each held-out check refits at least three other points with the same angular-support policy; it is not an independent demonstration. Its residual is absolute, while the full-fit residual is signed. Positive residuals are outside the proposed radius. The dashed circle is a reference hypothesis, not observed intervening travel, a rotation center, contact, task invariant or success criterion. Missing and unselected samples remain unknown. Calibration uncertainty, physical circularity and learning benefit are not established. No source annotation, authored guide, tolerance or score changes.'};
}
