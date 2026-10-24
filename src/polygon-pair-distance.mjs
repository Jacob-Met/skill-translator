// Exact predicates on supplied mapped binary64 vertices, after maintained mapping admission.
// Existing CHRONOS rational core owns arithmetic/enclosure; no calibration duplication.
import {rational as q,add,sub,mul,div,cmp,enclosure,serial} from '../vendor/chronos/exact-halfplanes.mjs';
const zero=q(0),one=q(1),dot=(a,b)=>add(mul(a.x,b.x),mul(a.y,b.y)),delta=(a,b)=>({x:sub(a.x,b.x),y:sub(a.y,b.y)}),cross=(a,b)=>sub(mul(a.x,b.y),mul(a.y,b.x));
const at=(a,v,t)=>({x:add(a.x,mul(v.x,t)),y:add(a.y,mul(v.y,t))});
const distance=(a,b)=>dot(delta(a,b),delta(a,b));
const inside=(p,polygon)=>polygon.length>=3&&[1,-1].some(sign=>polygon.every((a,i)=>cmp(cross(delta(polygon[(i+1)%polygon.length],a),delta(p,a)),zero)*sign>=0));
function project(p,a,b){const v=delta(b,a),length=dot(v,v);if(!cmp(length,zero))return a;let t=div(dot(delta(p,a),v),length);if(cmp(t,zero)<0)t=zero;if(cmp(t,one)>0)t=one;return at(a,v,t);}
function intersection(a,b,c,d){const u=delta(b,a),v=delta(d,c),den=cross(u,v);if(!cmp(den,zero))return null;const w=delta(c,a),t=div(cross(w,v),den),s=div(cross(w,u),den);return cmp(t,zero)>=0&&cmp(t,one)<=0&&cmp(s,zero)>=0&&cmp(s,one)<=0?at(a,u,t):null;}
export function polygonPairDistance(first,second){
 const polygons=[first,second].map(ps=>{if(!Array.isArray(ps)||!ps.length||ps.length>4)throw Error('Use one to four admitted convex mapped vertices');return ps.map(p=>({x:q(p.x),y:q(p.y)}));}),[a,b]=polygons;
 for(const ps of polygons)if(ps.length>=3){const turns=ps.map((p,i)=>cmp(cross(delta(ps[(i+1)%ps.length],p),delta(ps[(i+2)%ps.length],ps[(i+1)%ps.length])),zero));if(!turns.every(s=>s===1)&&!turns.every(s=>s===-1))throw Error('Area vertices must be strictly convex in boundary order; use a segment for a degenerate region');}
 // Admission/convexity remains owned by inspectAnnotationBound; standalone experiment callers supply admitted regions.
 let minimum=null,maximum=null;
 const consider=(p,r)=>{const value=distance(p,r),witness=[p,r];if(!minimum||cmp(value,minimum.value)<0)minimum={value,witness};if(!maximum||cmp(value,maximum.value)>0)maximum={value,witness};};
 for(const p of a)for(const r of b)consider(p,r);
 for(const p of a){if(inside(p,b))consider(p,p);for(let i=0;i<b.length;i++)consider(p,project(p,b[i],b[(i+1)%b.length]));}
 for(const p of b){if(inside(p,a))consider(p,p);for(let i=0;i<a.length;i++)consider(project(p,a[i],a[(i+1)%a.length]),p);}
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=intersection(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]);if(p)consider(p,p);}
 const out=r=>({squared:serial(r.value),squaredBounds:enclosure(r.value),witness:r.witness.map(p=>({x:serial(p.x),y:serial(p.y)}))});
 return {minimum:out(minimum),maximum:out(maximum)};
}
