// Ordered nominal sample comparison. No registration or continuous trajectory inference.
import {importSequencePath,inspectSequencePath,MAX_PATH_BYTES} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';
export const PATH_COMPARISON_FORMAT='skill-translator.path-comparison/v1';
export const MAX_COMPARISON_BYTES=2*MAX_PATH_BYTES+8192;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function declaration(raw){
 check(raw?.samePointAndCoordinates===true,'Explicitly declare the same point meaning and common coordinate meanings across both paths.');
 check(typeof raw.basis==='string'&&raw.basis.trim()&&raw.basis.length<=2400,'Explain the cross-demonstration correspondence within 2400 characters.');
 return {samePointAndCoordinates:true,basis:raw.basis.trim()};
}
export function createPathComparison(first,second,declared){
 const paths=[importSequencePath(first),importSequencePath(second)];
 const result={format:PATH_COMPARISON_FORMAT,paths,declaration:declaration(declared)};
 check(new TextEncoder().encode(JSON.stringify(result)).length<=MAX_COMPARISON_BYTES,'Keep the complete comparison within its bounded source budget.');
 return result;
}
export function importPathComparison(raw,expectedPaths){
 check(raw?.format===PATH_COMPARISON_FORMAT&&Array.isArray(raw.paths)&&raw.paths.length===2,'Open a complete two-path comparison.');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_COMPARISON_BYTES,'Keep the complete comparison within its bounded source budget.');
 const accepted=createPathComparison(...raw.paths,raw.declaration);
 if(expectedPaths!==undefined)check(Array.isArray(expectedPaths)&&expectedPaths.length===2&&expectedPaths.every((p,i)=>same(importSequencePath(p),accepted.paths[i])),'The original paths changed; reopen their matching comparison.');
 return accepted;
}
export function inspectPathComparison(raw){
 const study=importPathComparison(raw),paths=study.paths.map(inspectSequencePath);
 check(paths.every(p=>p.complete),'A complete comparison needs every selected sample in both paths. Missing observations cannot be bridged.');
 const dimensions=study.paths.map(p=>{const s=p.samples[0],m=p.sequence.moments.find(m=>m.id===s.momentId);return {widthMm:m.calibratedTask.source.widthMm,heightMm:m.calibratedTask.source.heightMm};});
 check(same(...dimensions),'Both paths need identical declared reference dimensions. No rescaling or plane registration is inferred.');
 const [a,b]=paths.map(p=>p.samples),n=a.length,m=b.length;
 const distances=a.map(x=>b.map(y=>Math.hypot(x.position.xMm-y.position.xMm,x.position.yMm-y.position.yMm)));
 check(distances.every(row=>row.every(Number.isFinite)),'Paired distances exceed finite arithmetic capacity.');
 // Every coupling starts at (0,0), ends at (n-1,m-1), and advances one
 // or both indices. The recurrence minimizes its largest paired distance.
 // Stable diagonal/first/second predecessor order selects one witness among ties.
 const cost=Array.from({length:n},()=>Array(m).fill(Infinity)),previous=Array.from({length:n},()=>Array(m).fill(null));
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){
  if(i===0&&j===0){cost[i][j]=distances[i][j];continue;}
  const candidates=[[i-1,j-1],[i-1,j],[i,j-1]].filter(([x,y])=>x>=0&&y>=0);
  let best=candidates[0];for(const c of candidates)if(cost[c[0]][c[1]]<cost[best[0]][best[1]])best=c;
  cost[i][j]=Math.max(distances[i][j],cost[best[0]][best[1]]);previous[i][j]=best;
 }
 const indices=[];for(let cell=[n-1,m-1];cell;cell=previous[cell[0]][cell[1]])indices.push(cell);indices.reverse();
 const distanceMm=cost[n-1][m-1];
 const coupling=indices.map(([i,j])=>({firstIndex:i,secondIndex:j,firstMomentId:a[i].momentId,secondMomentId:b[j].momentId,firstPresentedSeconds:a[i].presentedSeconds,secondPresentedSeconds:b[j].presentedSeconds,distanceMm:distances[i][j],bottleneck:distances[i][j]===distanceMm}));
 return {distanceMm,coupling,paths,dimensions:dimensions[0],pairedDistancesMm:distances,
  boundary:'The minimum largest separation is a discrete Frechet comparison of nominal selected samples under the declared point and coordinate correspondence. The coupling preserves order but may repeat a sample; it is not a synchronized timeline, inferred physical correspondence, continuous path distance, speed, technique score or evidence of learning. Different sampling can change the result. No mirroring, rotation, translation or rescaling is fitted. Missing and unselected motion remains unobserved. One deterministic optimal coupling is shown; alternatives may exist. Calibration and numerical errors are not bounded by this value.'};
}
