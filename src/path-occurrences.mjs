// Locate an entire sampled pattern without trimming either retained source.
import {importPathComparison,countMonotoneCouplings,MAX_COMPARISON_BYTES} from './path-comparison.mjs';
import {inspectSequencePath} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export const PATH_CLOSEST_FORMAT='skill-translator.path-closest/v1';
export const PATH_OCCURRENCES_FORMAT='skill-translator.path-occurrences/v1';
export const MAX_OCCURRENCE_BYTES=MAX_COMPARISON_BYTES+1024;
const bound=value=>{check(Number.isFinite(value)&&value>=0&&value<=1000,'Supply a nominal separation bound within 0–1000 mm.');return value;};
export function createPathOccurrenceStudy(comparison,maxDistanceMm){
 const study={format:PATH_OCCURRENCES_FORMAT,comparison:importPathComparison(comparison),maxDistanceMm:bound(maxDistanceMm)};
 check(new TextEncoder().encode(JSON.stringify(study)).length<=MAX_OCCURRENCE_BYTES,'Keep the complete occurrence study within its source budget.');
 return study;
}
export function importPathOccurrenceStudy(raw){
 check(raw?.format===PATH_OCCURRENCES_FORMAT,'Open a complete path-occurrence study.');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_OCCURRENCE_BYTES,'Keep the complete occurrence study within its source budget.');
 return createPathOccurrenceStudy(raw.comparison,raw.maxDistanceMm);
}

export function createClosestPathStudy(comparison){
 const study={format:PATH_CLOSEST_FORMAT,comparison:importPathComparison(comparison)};
 check(new TextEncoder().encode(JSON.stringify(study)).length<=MAX_OCCURRENCE_BYTES,'Keep the complete closest-span study within its source budget.');
 return study;
}
export function importClosestPathStudy(raw){
 check(raw?.format===PATH_CLOSEST_FORMAT,'Open a complete closest-span study.');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_OCCURRENCE_BYTES,'Keep the complete closest-span study within its source budget.');
 return createClosestPathStudy(raw.comparison);
}
// A finite monotone grid's minimum largest separation is one of its actual
// cell distances. Reuse the maintained monotone admission/counting kernel;
// binary search introduces no new coupling solver or numerical tolerance.
function minimumBound(grid){
 const values=[...new Set(grid.flat())].sort((a,b)=>a-b);let lo=0,hi=values.length-1;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);if(countMonotoneCouplings(grid,values[mid]).total>0n)hi=mid;else lo=mid+1;}
 return values[lo];
}
export function inspectClosestPathOccurrences(raw){return inspectIntervals(raw,null);}

/** Every candidate visits every first-path sample and every sample of one
 * contiguous second-path interval. Counts refer to discrete pairings only.
 * Missing second-path observations split support; they cannot be skipped.
 */
export function inspectPathOccurrences(raw,maxDistanceMm){return inspectIntervals(raw,bound(maxDistanceMm));}
function inspectIntervals(raw,maxDistanceMm){
 const closest=maxDistanceMm===null;
 const study=importPathComparison(raw),paths=study.paths.map(inspectSequencePath),[first,second]=paths;
 const boundary=closest?'Closest means smallest computed discrepancy, not an acceptance verdict. Exact nominal equality defines ties, which calibration arithmetic can change. Each span contains at least two selected samples and visits the entire first path in order. Missing observations split coverage; unselected frames supply no point observations. Point identity, common coordinates and calibration remain declared. No physical tolerance, continuous motion or skill is inferred.':'Intervals are all contiguous spans of at least two selected samples admitting the entire first path under the supplied nominal separation bound. Every sample in each span is visited in order; repeated pairings are allowed. Missing observations split coverage. Original unselected frames remain unobserved. Point identity, common coordinates and calibration are supplied, not inferred. A geometric occurrence does not establish the same action, purpose, continuous motion, synchronized time, physical success or skill. Overlapping intervals are alternatives, not independent repetitions.';
 const base={...(closest?{comparisonKind:'closest-only',minimumDistanceMm:null,closestIntervals:[],intervalScores:[]}:{maxDistanceMm,occurrences:[]}),paths,candidateCount:0,missingSecondMomentIds:second.samples.filter(s=>!s.position).map(s=>s.momentId),boundary};
 if(!first.complete)return {...base,status:'missing-pattern-observations'};
 const dimensions=study.paths.map(path=>{
  const known=path.samples.find(s=>s.markId!==null);
  if(!known)return null;
  const source=path.sequence.moments.find(m=>m.id===known.momentId).calibratedTask.source;
  return {widthMm:source.widthMm,heightMm:source.heightMm};
 });
 if(dimensions[1]===null)return {...base,status:'no-observed-interval'};
 check(dimensions[0].widthMm===dimensions[1].widthMm&&dimensions[0].heightMm===dimensions[1].heightMm,'Both paths need identical declared reference dimensions. No rescaling or plane registration is inferred.');
 const distances=first.samples.map(a=>second.samples.map(b=>b.position?Math.hypot(a.position.xMm-b.position.xMm,a.position.yMm-b.position.yMm):null));
 check(distances.every(row=>row.every(x=>x===null||Number.isFinite(x))),'Paired distances exceed finite arithmetic capacity.');
 const occurrences=[];let candidateCount=0;
 for(let start=0;start<second.samples.length-1;start++){
  if(!second.samples[start].position)continue;
  for(let end=start+1;end<second.samples.length;end++){
   if(!second.samples[end].position)break;
   candidateCount++;
   const grid=distances.map(row=>row.slice(start,end+1));
   const threshold=closest?minimumBound(grid):maxDistanceMm;
   const {forward,total}=countMonotoneCouplings(grid,threshold);
   if(total===0n)continue;
   const indices=[];let cell=[first.samples.length-1,end-start];
   while(cell){indices.push(cell);const [i,j]=cell;cell=[[i-1,j-1],[i-1,j],[i,j-1]].find(([x,y])=>x>=0&&y>=0&&forward[x][y]>0n)??null;}
   indices.reverse();
   const coupling=indices.map(([i,j])=>({firstIndex:i,secondIndex:start+j,firstMomentId:first.samples[i].momentId,secondMomentId:second.samples[start+j].momentId,firstPresentedSeconds:first.samples[i].presentedSeconds,secondPresentedSeconds:second.samples[start+j].presentedSeconds,distanceMm:grid[i][j]}));
   occurrences.push({...(closest?{minimumDistanceMm:threshold}:{}),startIndex:start,endIndex:end,fromMomentId:second.samples[start].momentId,toMomentId:second.samples[end].momentId,startSeconds:second.samples[start].presentedSeconds,endSeconds:second.samples[end].presentedSeconds,alignmentCount:String(total),coupling});
  }
 }
 if(closest){const minimumDistanceMm=occurrences.length?Math.min(...occurrences.map(row=>row.minimumDistanceMm)):null;return {...base,status:occurrences.length?'closest-only':'no-observed-interval',candidateCount,minimumDistanceMm,closestIntervals:occurrences.filter(row=>row.minimumDistanceMm===minimumDistanceMm),intervalScores:occurrences.map(({coupling,...score})=>score)};}
 return {...base,status:occurrences.length?'occurrences':candidateCount?'no-occurrence':'no-observed-interval',candidateCount,occurrences};
}
