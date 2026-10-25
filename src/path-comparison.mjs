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
 const coupling=couplingRecords(indices,paths,distances,distanceMm);
 return {distanceMm,coupling,paths,dimensions:dimensions[0],pairedDistancesMm:distances,
  boundary:'The minimum largest separation is a discrete Frechet comparison of nominal selected samples under the declared point and coordinate correspondence. The coupling preserves order but may repeat a sample; it is not a synchronized timeline, inferred physical correspondence, continuous path distance, speed, technique score or evidence of learning. Different sampling can change the result. No mirroring, rotation, translation or rescaling is fitted. Missing and unselected motion remains unobserved. One deterministic optimal coupling is shown; alternatives may exist. Calibration and numerical errors are not bounded by this value.'};
}

function couplingRecords(indices,paths,distances,limit){
 const [a,b]=paths.map(p=>p.samples);
 return indices.map(([i,j])=>({firstIndex:i,secondIndex:j,firstMomentId:a[i].momentId,secondMomentId:b[j].momentId,firstPresentedSeconds:a[i].presentedSeconds,secondPresentedSeconds:b[j].presentedSeconds,distanceMm:distances[i][j],bottleneck:distances[i][j]===limit}));
}

/** Inspect alternatives at the unchanged nominal optimum, not inferred timing. */
export function inspectPathCouplingAlternatives(raw,choice=null){
 const original=inspectPathComparison(raw),d=original.pairedDistancesMm,limit=original.distanceMm,n=d.length,m=d[0].length;
 const forward=Array.from({length:n},()=>Array(m).fill(0n)),backward=Array.from({length:n},()=>Array(m).fill(0n));
 // Every accepted cell has separation <= the original global minimum. Count
 // all monotone prefixes and suffixes; their product counts paths through it.
 for(let i=0;i<n;i++)for(let j=0;j<m;j++)if(d[i][j]<=limit)forward[i][j]=i===0&&j===0?1n:(forward[i-1]?.[j]??0n)+(forward[i]?.[j-1]??0n)+(forward[i-1]?.[j-1]??0n);
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)if(d[i][j]<=limit)backward[i][j]=i===n-1&&j===m-1?1n:(backward[i+1]?.[j]??0n)+(backward[i]?.[j+1]??0n)+(backward[i+1]?.[j+1]??0n);
 const total=forward[n-1][m-1];check(total>0n,'No minimizing coupling could be reproduced from the original comparison.');
 const pairs=[];
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){
  const through=forward[i][j]*backward[i][j];if(through===0n)continue;
  pairs.push({firstIndex:i,secondIndex:j,firstMomentId:original.paths[0].samples[i].momentId,secondMomentId:original.paths[1].samples[j].momentId,distanceMm:d[i][j],couplingsThrough:String(through),requiredInEveryOptimalCoupling:through===total});
 }
 let selectedCoupling=original.coupling;
 if(choice!==null){
  check(choice&&typeof choice==='object'&&!Array.isArray(choice),'Choose a paired sample from the minimizing alternatives.');
  const i=choice.firstIndex,j=choice.secondIndex;
  check(Number.isInteger(i)&&Number.isInteger(j)&&i>=0&&j>=0&&i<n&&j<m&&forward[i][j]>0n&&backward[i][j]>0n,'Choose a pair belonging to a minimizing coupling.');
  // A possible pair alone is not a complete comparison. Recover a full
  // minimizing witness through it, rather than combine incompatible choices.
  const prefix=[];let cell=[i,j];
  while(cell){prefix.push(cell);const [x,y]=cell;cell=[[x-1,y-1],[x-1,y],[x,y-1]].find(([a,b])=>a>=0&&b>=0&&forward[a][b]>0n)??null;}prefix.reverse();
  const suffix=[];cell=[i,j];
  while(cell){const [x,y]=cell;cell=[[x+1,y+1],[x+1,y],[x,y+1]].find(([a,b])=>a<n&&b<m&&backward[a][b]>0n)??null;if(cell)suffix.push(cell);}
  selectedCoupling=couplingRecords([...prefix,...suffix],original.paths,d,limit);
 }
 return {original,optimalCouplings:String(total),pairs,selectedCoupling,
  boundary:'These alternatives are exact for the computed nominal sample distances and the unchanged minimum. Counts describe monotone sampled pairings, not probabilities or physical correspondence. A pair required by every computed optimum does not establish synchronized time. Possible pairs cannot necessarily be combined in one pairing; inspect a complete witness. Tiny calibration arithmetic changes may alter ties. No tolerance is silently applied.'};
}
