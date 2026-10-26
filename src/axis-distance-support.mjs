/** Bounded pair-distance support under independent reference-axis magnitudes. */
import {rational as q,add,sub,mul,div,neg,cmp,enclosure,serial,clip} from '../vendor/chronos/exact-halfplanes.mjs';
const zero=q(0),square=x=>mul(x,x),min=(a,b)=>cmp(a,b)<0?a:b,max=(a,b)=>cmp(a,b)>0?a:b;
function adjacent(value,direction){const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);view.setBigUint64(0,view.getBigUint64(0)+(direction>0?1n:-1n));return view.getFloat64(0);}
export function sqrtEnclosure(value){
 if(cmp(value,zero)<0)throw Error('Negative squared distance');
 if(!cmp(value,zero))return {lower:zero,upper:zero};
 let estimate=Math.sqrt(enclosure(value).upper),side=cmp(square(q(estimate)),value);
 if(!side)return {lower:q(estimate),upper:q(estimate)};
 for(let step=0;step<4;step++){
  const next=adjacent(estimate,side<0?1:-1);if(!Number.isFinite(next)||next<0)break;
  const nextSide=cmp(square(q(next)),value);
  if(side<0&&nextSide>=0)return {lower:q(estimate),upper:q(next)};
  if(side>0&&nextSide<=0)return {lower:q(next),upper:q(estimate)};
  estimate=next;side=nextSide;
 }
 throw Error('Squared-distance root exceeds bounded numerical enclosure support');
}
const squaredComponents=(a,b)=>[square(sub(q(a[0]),q(b[0]))),square(sub(q(a[1]),q(b[1])))];
function positive(polygon){return polygon.some(p=>cmp(p[0],zero)>0)&&polygon.some(p=>cmp(p[1],zero)>0);}
function bandClip(polygon,dx2,dy2,low,high,work){return clip(clip(polygon,dx2,dy2,high,work),neg(dx2),neg(dy2),neg(low),work);}
function intervalClip(interval,coefficient,low,high,work){
 if(!interval)return null;
 if(++work.count>work.limit)throw Error('Constraint work capacity exhausted; no partial support is returned');
 if(!cmp(coefficient,zero))return cmp(low,zero)>0?null:interval;
 const lower=max(interval.lower,div(low,coefficient)),upper=interval.upper?min(interval.upper,div(high,coefficient)):div(high,coefficient);
 return cmp(upper,zero)>0&&cmp(lower,upper)<=0?{lower,upper}:null;
}
const serializedInterval=interval=>({lower:serial(interval.lower),lowerInclusive:cmp(interval.lower,zero)>0,upper:interval.upper?serial(interval.upper):null});
const intervalWitness=interval=>interval.upper?div(add(interval.lower,interval.upper),q(2)):add(interval.lower,q(1));
export function exactAxisCandidates(reference,observation,{deviationMm=.001,maxWork=200000,maxStates=20000}={}){
 if(!Array.isArray(reference)||!Array.isArray(observation)||reference.length!==observation.length||reference.length<3||reference.length>7)throw Error('Use equal 3–7 point sets');
 if(![...reference,...observation].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))throw Error('Use finite original point coordinates');
 if(!Number.isFinite(deviationMm)||deviationMm<0||deviationMm>1000)throw Error('Invalid discrepancy');
 if(!Number.isSafeInteger(maxStates)||maxStates<1||maxStates>20000)throw Error('Invalid finite state budget');
 if(!Number.isSafeInteger(maxWork)||maxWork<1||maxWork>200000)throw Error('Exact constraint budget must be1–200000');
 const n=reference.length,tolerance=add(q(deviationMm),q(1e-9)),ref=reference.map(a=>reference.map(b=>squaredComponents(a,b))),bands=observation.map(a=>observation.map(b=>{
  const ds=squaredComponents(a,b),root=sqrtEnclosure(add(...ds));
  return {outerLow:square(max(zero,sub(root.lower,tolerance))),outerHigh:square(add(root.upper,tolerance)),innerLow:square(max(zero,sub(root.upper,tolerance))),innerHigh:square(add(root.lower,tolerance))};
 }));
 const xMax=ref.flat().reduce((v,p)=>max(v,p[0]),zero),yMax=ref.flat().reduce((v,p)=>max(v,p[1]),zero);
 const work={count:0,limit:maxWork};let initial,extend,hasWitness,encode;
 if(cmp(xMax,zero)&&cmp(yMax,zero)){
  const cap=bands.flat().reduce((v,b)=>max(v,b.outerHigh),zero),xCap=div(cap,xMax),yCap=div(cap,yMax),polygon=[[zero,zero],[xCap,zero],[xCap,yCap],[zero,yCap]];
  initial={outer:polygon,inner:polygon};hasWitness=s=>positive(s.inner);
  extend=(support,prefix,j)=>{let {outer,inner}=support;const i=prefix.length;for(let k=0;k<i;k++){const [dx2,dy2]=ref[i][k],b=bands[j][prefix[k]];outer=bandClip(outer,dx2,dy2,b.outerLow,b.outerHigh,work);if(!positive(outer))return null;inner=bandClip(inner,dx2,dy2,b.innerLow,b.innerHigh,work);}return {outer,inner};};
  encode=(s,witnessed)=>({supportKind:'two-observed-axes',unconstrainedAxes:[],outerSquaredScalePolygon:s.outer.map(p=>p.map(serial)),innerSquaredScalePolygon:s.inner.map(p=>p.map(serial)),witnessSquaredScales:witnessed?[0,1].map(axis=>serial(div(s.inner.reduce((sum,p)=>add(sum,p[axis]),zero),q(s.inner.length)))):null});
 }else{
  // An unobserved reference axis contributes zero to every pair. Retain its
  // complete positive unbounded domain; a display/witness value never fits it.
  const axis=cmp(xMax,zero)?0:cmp(yMax,zero)?1:null,free={lower:zero,upper:null};
  initial={outer:free,inner:free};hasWitness=s=>s.inner!==null;
  extend=(support,prefix,j)=>{let {outer,inner}=support;const i=prefix.length;for(let k=0;k<i;k++){const coefficient=axis===null?zero:ref[i][k][axis],b=bands[j][prefix[k]];outer=intervalClip(outer,coefficient,b.outerLow,b.outerHigh,work);if(!outer)return null;inner=intervalClip(inner,coefficient,b.innerLow,b.innerHigh,work);}return {outer,inner};};
  encode=(s,witnessed)=>({supportKind:axis===null?'no-observed-axis':'one-observed-axis',unconstrainedAxes:['horizontal','vertical'].filter((_,i)=>i!==axis),outerSquaredScaleIntervals:[0,1].map(i=>serializedInterval(i===axis?s.outer:free)),innerSquaredScaleIntervals:witnessed?[0,1].map(i=>serializedInterval(i===axis?s.inner:free)):null,witnessSquaredScales:witnessed?[0,1].map(i=>serial(i===axis?intervalWitness(s.inner):q(1))):null});
 }
 const mappings=[],possibilities=reference.map(()=>new Set());let states=0,complete=true,count=0,innerCount=0;
 function visit(prefix,support){
  if(states>=maxStates){complete=false;return;}states++;
  if(prefix.length===n){count++;const witnessed=hasWitness(support);if(witnessed)innerCount++;prefix.forEach((j,i)=>possibilities[i].add(j));if(mappings.length<8)mappings.push({mapping:prefix,...encode(support,witnessed),hasConservativeWitness:witnessed});return;}
  for(let j=0;j<n;j++)if(!prefix.includes(j)){
   const next=extend(support,prefix,j);if(next)visit([...prefix,j],next);if(!complete)return;
  }
 }
 visit([],initial);
 return {status:!complete?'budget-unresolved':count===0?'incompatible':count===1&&innerCount===1?'unique-with-conservative-witness':count===1?'boundary-unresolved':'ambiguous',complete,states,work:work.count,count:complete?count:null,foundMappingCount:count,conservativeWitnessCount:complete?innerCount:null,foundConservativeWitnessCount:innerCount,mappings,forced:complete&&count&&innerCount?possibilities.flatMap((s,i)=>s.size===1?[[i,[...s][0]]]:[]):[],possibleMatches:complete&&count?possibilities.map(s=>[...s].sort((a,b)=>a-b)):[],numericalSlackMm:1e-9,
  qualification:'Exact CHRONOS clipping and one-dimensional interval intersection over mapped binary64 coordinate differences. Adjacent certified norm enclosures give outer support and inner witnesses; no orientation, sign, certified transform, calibration or semantic identity is inferred. Polygon correlation is retained. Axes absent from the reference geometry remain positive and unbounded; witness values are not inferred scales.'};
}
