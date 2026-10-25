/** Exact sufficient circle certificates over the maintained convex parameter polygons.
 * The bounded search may remain unresolved. No partial minimum proves exclusion.
 */
import {rational,add,sub,mul,div,neg,cmp,serial} from './exact-halfplanes.mjs';
const ZERO=[0n,1n],ONE=[1n,1n],TWO=[2n,1n];
export const MAX_CIRCLE_CERTIFICATE_WORK=100000;
export const MAX_CIRCLE_CERTIFICATE_ROUNDS=8;
const square=x=>mul(x,x);
function tick(work){
 const limit=work?.limit??MAX_CIRCLE_CERTIFICATE_WORK;
 if(!Number.isSafeInteger(limit)||limit<0||limit>MAX_CIRCLE_CERTIFICATE_WORK||
    !Number.isSafeInteger(work?.count)||work.count<0||work.count>limit)
  throw Error('A finite bounded exact-circle work counter is required');
 if(work.count===limit){const error=Error('Exact circle certificate work exhausted');error.code='EXACT_CIRCLE_WORK';throw error;}
 work.count++;
}
function valueAt(q,z){
 return add(sub(add(add(mul(q.A,square(z[0])),mul(TWO,mul(q.B,mul(z[0],z[1])))),mul(q.C,square(z[1]))),
  mul(TWO,add(mul(q.D,z[0]),mul(q.E,z[1])))),q.F);
}
const cross=(a,b)=>sub(mul(a[0],b[1]),mul(a[1],b[0]));
const difference=(a,b)=>[sub(a[0],b[0]),sub(a[1],b[1])];
function inside(polygon,point,orientation,work){
 for(let i=0;i<polygon.length;i++){
  tick(work);
  const side=cross(difference(polygon[(i+1)%polygon.length],polygon[i]),difference(point,polygon[i]));
  if(cmp(side,ZERO)*orientation<0)return false;
 }
 return true;
}
/** Minimum of z'Qz-2b'z+F on a compact convex polygon from exact-halfplanes.
 * Ordered point, segment and collinear polygons are supported without an interior.
 */
export function minimumConvexQuadratic(polygon,q,work){
 if(!Array.isArray(polygon)||!polygon.length||polygon.length>244)throw Error('A nonempty bounded convex parameter polygon is required');
 const determinant=sub(mul(q.A,q.C),square(q.B));
 if(cmp(q.A,ZERO)<0||cmp(q.C,ZERO)<0||cmp(determinant,ZERO)<0)throw Error('Quadratic form must be positive semidefinite');
 let best=null,area=ZERO;
 const visit=point=>{
  tick(work);const value=valueAt(q,point);
  if(!best||cmp(value,best.value)<0)best={point,value};
 };
 for(const point of polygon)visit(point);
 for(let i=0;i<polygon.length;i++){
  tick(work);
  const a=polygon[i],b=polygon[(i+1)%polygon.length],d=difference(b,a);
  area=add(area,cross(a,b));
  const alpha=add(add(mul(q.A,square(d[0])),mul(TWO,mul(q.B,mul(d[0],d[1])))),mul(q.C,square(d[1])));
  if(cmp(alpha,ZERO)<0)throw Error('Negative curvature on a declared convex quadratic');
  if(cmp(alpha,ZERO)===0)continue;
  const beta=add(mul(d[0],sub(add(mul(q.A,a[0]),mul(q.B,a[1])),q.D)),
    mul(d[1],sub(add(mul(q.B,a[0]),mul(q.C,a[1])),q.E)));
  const t=div(neg(beta),alpha);
  if(cmp(t,ZERO)>=0&&cmp(t,ONE)<=0)visit([add(a[0],mul(t,d[0])),add(a[1],mul(t,d[1]))]);
 }
 // For a singular PSD form any interior minimizer extends to the boundary.
 // Nonzero area prevents a segment's supporting line from admitting an outside point.
 if(cmp(determinant,ZERO)>0&&cmp(area,ZERO)!==0){
  const point=[div(sub(mul(q.C,q.D),mul(q.B,q.E)),determinant),
    div(sub(mul(q.A,q.E),mul(q.B,q.D)),determinant)];
  if(inside(polygon,point,cmp(area,ZERO),work))visit(point);
 }
 return best; // Returned only after the complete candidate set has been considered.
}
const emptyForm=()=>({A:ZERO,B:ZERO,C:ZERO,D:ZERO,E:ZERO,F:ZERO});
function formsFor(circles,weights,work){
 const forms={x:emptyForm(),y:emptyForm()};let radii=ZERO;
 for(let i=0;i<circles.length;i++){
  tick(work);const circle=circles[i],w=rational(weights[i]),t=circle.time;
  const radius=rational(circle.label.uncertainty_px);radii=add(radii,mul(w,square(radius)));
  for(const axis of ['x','y']){
   const q=forms[axis],center=rational(circle.label[axis]);
   q.A=add(q.A,w);q.B=add(q.B,mul(w,t));q.C=add(q.C,mul(w,square(t)));
   q.D=add(q.D,mul(w,center));q.E=add(q.E,mul(w,mul(t,center)));q.F=add(q.F,mul(w,square(center)));
  }
 }
 return {forms,radii};
}
export function serializeCirclePath(path){
 return Object.fromEntries(['x','y'].map(axis=>[axis,{
  position_at_origin_px:serial(path[axis][0]),velocity_px_s:serial(path[axis][1])
 }]));
}
/** Every positive certificate is exact; bounded reweighting is not complete. */
export function certifyCircleSupport(x,y,circles,work,{rounds=MAX_CIRCLE_CERTIFICATE_ROUNDS}={}){
 if(!Array.isArray(circles)||!circles.length||circles.length>120)throw Error('One to120 admitted circles are required');
 if(!Number.isInteger(rounds)||rounds<0||rounds>MAX_CIRCLE_CERTIFICATE_ROUNDS)throw Error('Invalid bounded certificate round count');
 const weights=circles.map(()=>1);let completed=0;
 try{
  for(let round=0;round<rounds;round++){
   const {forms,radii}=formsFor(circles,weights,work);
   const mx=minimumConvexQuadratic(x,forms.x,work),my=minimumConvexQuadratic(y,forms.y,work);
   const minimum=sub(add(mx.value,my.value),radii),path={x:mx.point,y:my.point};completed++;
   if(cmp(minimum,ZERO)>0)return {status:'contradicted',rounds:completed,certificate:{
    method:'exact-weighted-circle-quadratic/v1',weights:[...weights],
    minimum_weighted_violation_px2:serial(minimum),minimizer:serializeCirclePath(path)
   }};
   let worst=-1,violation=ZERO;
   for(let i=0;i<circles.length;i++){
    tick(work);const c=circles[i];
    const value=sub(['x','y'].map(axis=>square(sub(add(path[axis][0],mul(c.time,path[axis][1])),rational(c.label[axis])))).reduce(add,ZERO),
      square(rational(c.label.uncertainty_px)));
    if(cmp(value,violation)>0){worst=i;violation=value;}
   }
   if(worst<0)return {status:'witnessed',rounds:completed,witness:serializeCirclePath(path)};
   // Deterministic positive integer weights. No optimization result is trusted
   // without a complete exact minimum or a separate all-circle witness check.
   weights[worst]+=weights.reduce((sum,w)=>sum+w,0);
  }
 }catch(error){
  if(error.code==='EXACT_CIRCLE_WORK')return {status:'unresolved',rounds:completed,reason:'work-capacity'};
  throw error;
 }
 return {status:'unresolved',rounds:completed,reason:'round-capacity'};
}

