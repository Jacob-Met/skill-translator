// Timing between explicitly corresponding retained samples, not continuous motion.
import {importSequencePath,inspectSequencePath} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';
export const PATH_TIMING_FORMAT='skill-translator.path-timing/v1';
export const MAX_PATH_TIMING_BYTES=8500000;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const text=(value,label,max=1200)=>{check(typeof value==='string'&&value.trim()&&value.length<=max,`${label} requires text within ${max} characters.`);return value.trim();};
const finite=value=>{check(Number.isFinite(value),'Comparison exceeds finite calculation capacity.');return value;};
function interval(value,path,previousEnd,label){
 check(value&&typeof value.fromMomentId==='string'&&typeof value.toMomentId==='string',`${label} needs two retained sample identities.`);
 const start=path.samples.findIndex(s=>s.momentId===value.fromMomentId),end=path.samples.findIndex(s=>s.momentId===value.toMomentId);
 check(start>=0&&end>start,`${label} must run forward between two selected samples.`);
 check(start>=previousEnd,`${label} intervals must be ordered and must not overlap.`);
 return {value:{fromMomentId:value.fromMomentId,toMomentId:value.toMomentId},end};
}
export function createPathTiming(left,right,correspondences){
 const paths={left:importSequencePath(left),right:importSequencePath(right)};
 check(Array.isArray(correspondences)&&correspondences.length>=1&&correspondences.length<=11,'Declare 1–11 corresponding intervals.');
 let leftEnd=-1,rightEnd=-1;
 const rows=correspondences.map(row=>{
  check(row&&typeof row==='object','Supply an explicit interval correspondence.');
  const a=interval(row.left,paths.left,leftEnd,'First demonstration'),b=interval(row.right,paths.right,rightEnd,'Second demonstration');
  leftEnd=a.end;rightEnd=b.end;
  return {label:text(row.label,'Interval label',160),basis:text(row.basis,'Correspondence basis'),left:a.value,right:b.value};
 });
 const result={format:PATH_TIMING_FORMAT,paths,correspondences:rows};
 check(new TextEncoder().encode(JSON.stringify(result)).length<=MAX_PATH_TIMING_BYTES,'Keep both complete paths and comparison within 8.5 MB.');
 return result;
}
export function importPathTiming(value){
 check(value?.format===PATH_TIMING_FORMAT,'Open a complete path-timing comparison.');
 check(new TextEncoder().encode(JSON.stringify(value)).length<=MAX_PATH_TIMING_BYTES,'Keep the complete comparison within 8.5 MB.');
 return createPathTiming(value.paths?.left,value.paths?.right,value.correspondences);
}
function summarize(finding,range){
 const start=finding.samples.findIndex(s=>s.momentId===range.fromMomentId),end=finding.samples.findIndex(s=>s.momentId===range.toMomentId);
 const samples=finding.samples.slice(start,end+1),segments=finding.segments.slice(start,end);
 const startSeconds=samples[0].presentedSeconds,endSeconds=samples.at(-1).presentedSeconds;
 const elapsedSeconds=finite(endSeconds-startSeconds);
 check(elapsedSeconds>0,'An interval needs positive elapsed presented time.');
 const complete=samples.every(s=>s.position!==null);
 const coveredChordDistanceMm=finite(segments.reduce((sum,s)=>sum+(s.distanceMm??0),0));
 const observedTimeSeconds=finite(segments.reduce((sum,s)=>sum+(s.status==='observed-chord'?s.elapsedSeconds:0),0));
 const unselectedMoments=finding.unselectedMoments.filter(m=>m.presentedSeconds>startSeconds&&m.presentedSeconds<endSeconds);
 return {...range,startSeconds,endSeconds,elapsedSeconds,complete,samples,segments,unselectedMoments,
  coveredChordDistanceMm,observedTimeSeconds,
  missingSampleIds:samples.filter(s=>s.position===null).map(s=>s.momentId),
  sampledChordDistanceMm:complete?coveredChordDistanceMm:null,
  sampledChordDistancePerSecond:complete?finite(coveredChordDistanceMm/elapsedSeconds):null};
}
export function inspectPathTiming(value){
 const study=importPathTiming(value);
 const findings={left:inspectSequencePath(study.paths.left),right:inspectSequencePath(study.paths.right)};
 const rows=study.correspondences.map(row=>{
  const left=summarize(findings.left,row.left),right=summarize(findings.right,row.right);
  return {...row,left,right,elapsedDifferenceSeconds:finite(right.elapsedSeconds-left.elapsedSeconds),
   elapsedRatio:finite(right.elapsedSeconds/left.elapsedSeconds),
   sampledChordDifferenceMm:left.complete&&right.complete?finite(right.sampledChordDistanceMm-left.sampledChordDistanceMm):null};
 });
 const totals={left:finite(rows.reduce((sum,row)=>sum+row.left.elapsedSeconds,0)),right:finite(rows.reduce((sum,row)=>sum+row.right.elapsedSeconds,0))};
 for(const row of rows){row.left.shareOfMatchedTime=finite(row.left.elapsedSeconds/totals.left);row.right.shareOfMatchedTime=finite(row.right.elapsedSeconds/totals.right);}
 return {rows,matchedElapsedSeconds:totals,
  references:{left:study.paths.left.reference,right:study.paths.right.reference},
  sourceTitles:{left:study.paths.left.sequence.title,right:study.paths.right.sequence.title},
  correspondenceBasis:'user-declared',physicalSkillEstablished:false,
  boundary:'Correspondences are explicitly supplied, not inferred. Times use retained presented-frame timestamps. Shares cover only the matched intervals, not the whole activity. Chord geometry depends on each source calibration and sampling; missing samples break geometric coverage. Unselected frames and motion between samples remain unobserved. Chord distance per elapsed second is not instantaneous speed or full travelled distance. Different timing or geometry does not establish better technique, efficiency, task success or skill. A zero chord sum does not exclude unobserved motion or loops.'};
}
