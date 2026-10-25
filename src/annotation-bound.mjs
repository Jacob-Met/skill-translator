// Conditional geometry of a declared learner-pixel rectangle. No calibration
// uncertainty, probability, physical accuracy or changed practice verdict.
import {derive,adapt,calibrate,fromImage,evaluate,GeometryError} from './geometry.mjs';
import {normalizeLearnerObservation} from './learner-observation.mjs';
import {importPractice} from './practice.mjs';
// Shared numerical policy only: not a measurement or calibration uncertainty.
// Callers first admit finite physical dimensions through the maintained setup.
export function nominalGeometryPolicy(widthMm,heightMm){
 const scale=Math.max(1,widthMm,heightMm),guardMm=scale*1e-9;
 return {scale,guardMm};
}
export const ANNOTATION_BOUND_SCHEMA='skill-translator-annotation-bound/v1';
const fail=(ok,s)=>{if(!ok)throw new GeometryError(s);};
const copy=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function annotationContext(setup,observation){
 fail(setup&&typeof setup==='object','Supply the retained practice setup');
 const {demo,widthMm,heightMm}=setup,target=adapt(derive(demo),widthMm,heightMm);
 const session=importPractice(demo,widthMm,heightMm,setup.session);
 const received=normalizeLearnerObservation(target,observation);
 return {setup:{...copy(setup),session},target,observation:received.record,attempts:received.attempts};
}
function distanceToSegment(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
 const t=d===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d));
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function cross(a,b,p){return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);}
export function inspectAnnotationBound(setup,observation,input){
 const context=annotationContext(setup,observation),{target}=context;
 fail(input&&typeof input.id==='string','Select a retained annotation');
 const point=context.observation.points.find(p=>p.id===input.id),mark=target.landmarks.find(m=>m.id===input.id);
 fail(point&&mark,'Selected mark has no retained photo annotation');
 for(const k of ['halfWidthPx','halfHeightPx'])fail(typeof input[k]==='number'&&Number.isFinite(input[k])&&input[k]>=0&&input[k]<=1000,'Pixel half widths must be finite within 0–1000');
 const {halfWidthPx:rx,halfHeightPx:ry}=input,{x,y}=point.pixel;
 const rectangle={xMin:x-rx,xMax:x+rx,yMin:y-ry,yMax:y+ry};
 const image=context.observation.image;
 fail(rectangle.xMin>=0&&rectangle.yMin>=0&&rectangle.xMax<=image.widthPx&&rectangle.yMax<=image.heightPx,'The full declared region must remain inside the source image; no clipping is performed');
 const vertices=rx===0&&ry===0?[{x,y}]:rx===0?[{x,y:y-ry},{x,y:y+ry}]:ry===0?[{x:x-rx,y},{x:x+rx,y}]:[{x:x-rx,y:y-ry},{x:x+rx,y:y-ry},{x:x+rx,y:y+ry},{x:x-rx,y:y+ry}];
 const h=calibrate(context.observation.calibration.corners),[a,b,,d,e,,g,k]=h;
 // The inverse homogeneous denominator is affine in image coordinates.
 // Same well-separated sign at every rectangle vertex excludes a pole
 // throughout the convex region. Do not rely on endpoint finite values alone.
 const denominators=vertices.map(p=>{const terms=[a*e,-b*d,p.x*(k*d-g*e),p.y*(b*g-a*k)];return {v:terms.reduce((s,n)=>s+n,0),scale:terms.reduce((s,n)=>s+Math.abs(n),0)};});
 const sign=Math.sign(denominators[0].v);
 fail(denominators.every(q=>Math.sign(q.v)===sign&&Math.abs(q.v)>Math.max(1e-12,q.scale*1e-10)),'Region reaches a singular or numerically unsupported perspective mapping');
 const polygon=vertices.map(p=>{const q=fromImage(h,p);fail(q.u>=0&&q.u<=1&&q.v>=0&&q.v<=1,'The full declared region must remain inside the calibrated workpiece; no clipping is performed');return {x:q.u*target.widthMm,y:q.v*target.heightMm};});
 const {scale,guardMm}=nominalGeometryPolicy(target.widthMm,target.heightMm);
 if(polygon.length===4){const turns=polygon.map((p,i)=>cross(p,polygon[(i+1)%4],polygon[(i+2)%4]));fail(turns.every(n=>n>scale*scale*1e-12)||turns.every(n=>n< -scale*scale*1e-12),'Mapped region is too thin or numerically nonconvex; use an explicit segment or point');}
 const goal={x:mark.xMm,y:mark.yMm};
 const distances=polygon.map(p=>Math.hypot(p.x-goal.x,p.y-goal.y));
 let minDistanceMm=polygon.length===1?distances[0]:Math.min(...polygon.map((p,i)=>distanceToSegment(goal,p,polygon[(i+1)%polygon.length])));
 if(polygon.length===4){const sides=polygon.map((p,i)=>cross(p,polygon[(i+1)%4],goal));if(sides.every(n=>n>=0)||sides.every(n=>n<=0))minDistanceMm=0;}
 const maxDistanceMm=Math.max(...distances),nominal=evaluate(mark,context.attempts.find(p=>p.id===input.id));
 // Preserve exact maintained point semantics at zero region. For nonzero
 // regions, a numerical guard makes near-tangent decisions unresolved.
 const status=polygon.length===1?(nominal.within?'all-within':'all-outside'):
 maxDistanceMm<mark.toleranceMm-guardMm?'all-within':minDistanceMm>mark.toleranceMm+guardMm?'all-outside':'unresolved';
 return {id:input.id,rectangle,vertices,polygon,dimension:polygon.length===1?'point':polygon.length===2?'segment':'area',target:goal,toleranceMm:mark.toleranceMm,nominal,minDistanceMm,maxDistanceMm,guardMm,status,
 missing:target.landmarks.filter(m=>!context.observation.points.some(p=>p.id===m.id)).map(m=>m.id)};
}
export function createAnnotationBound(setup,observation,input){
 const c=annotationContext(setup,observation);inspectAnnotationBound(c.setup,c.observation,input);
 return {schema:ANNOTATION_BOUND_SCHEMA,setup:c.setup,observation:c.observation,
 reference:{practice:c.setup.session.reference,observation:copy(c.observation)},
 declaration:{id:input.id,halfWidthPx:input.halfWidthPx,halfHeightPx:input.halfHeightPx}};
}
export function importAnnotationBound(raw,expected=null){
 fail(raw?.schema===ANNOTATION_BOUND_SCHEMA,'Unsupported annotation-bound notebook');
 const accepted=createAnnotationBound(raw.setup,raw.observation,raw.declaration);
 fail(same(raw.reference,accepted.reference),'Notebook source or observation differs from its retained reference');
 if(expected){const c=annotationContext(expected.setup,expected.observation);fail(same(accepted.reference,{practice:c.setup.session.reference,observation:c.observation}),'Notebook belongs to a different source observation');}
 return accepted;
}
