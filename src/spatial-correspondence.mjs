/** Complete bounded pair-distance correspondence proposals; never semantic identity. */
import {GeometryError} from './geometry.mjs';
import {spatialSourcePoints as points} from './spatial-source-geometry.mjs';
import {AXIS_SPATIAL_CORRESPONDENCE_FORMAT,importAxisSpatialCorrespondence,inspectAxisSpatialCorrespondence} from './axis-spatial-correspondence.mjs';
export {AXIS_SPATIAL_CORRESPONDENCE_FORMAT,AXIS_SCALE_MODEL} from './axis-spatial-correspondence.mjs';
export const SPATIAL_CORRESPONDENCE_FORMAT='skill-translator.spatial-correspondence/v1';
export const REVIEWED_SPATIAL_MAPPING_FORMAT='skill-translator.reviewed-spatial-mapping/v1';
export const SCALED_SPATIAL_CORRESPONDENCE_FORMAT='skill-translator.spatial-correspondence/v2';
export const REVIEWED_SCALED_SPATIAL_MAPPING_FORMAT='skill-translator.reviewed-spatial-mapping/v2';
export const REVIEWED_AXIS_SPATIAL_MAPPING_FORMAT='skill-translator.reviewed-spatial-mapping/v3';
export const COMMON_SCALE_MODEL='common-positive-pair-distance-scale';
const numericalSlackMm=1e-9;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function importSpatialCorrespondence(raw){
 if(raw?.format===AXIS_SPATIAL_CORRESPONDENCE_FORMAT)return importAxisSpatialCorrespondence(raw);
 const scaled=raw?.format===SCALED_SPATIAL_CORRESPONDENCE_FORMAT;
 check(scaled||raw?.format===SPATIAL_CORRESPONDENCE_FORMAT,'Unsupported spatial correspondence study');
 check(scaled?raw.model===COMMON_SCALE_MODEL:raw.model===undefined,'A scale model requires its explicit v2 study format; fixed v1 cannot ignore it');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=2_000_000,'Keep complete original annotations within 2 MB');
 check(typeof raw.deviationMm==='number'&&Number.isFinite(raw.deviationMm)&&raw.deviationMm>=0&&raw.deviationMm<=1000,'Pair-distance discrepancy must be 0–1000 mm');
 const maxStates=raw.maxStates??20000;check(Number.isInteger(maxStates)&&maxStates>=1&&maxStates<=20000,'Search budget must be 1–20000 states');
 const first=points(raw.reference),second=points(raw.observation);
 check([first.length,second.length].every(n=>n>=3&&n<=7),'Use 3–7 annotated points in each source; partial point sets are not inferred');
 return {format:raw.format,...(scaled?{model:COMMON_SCALE_MODEL}:{}),reference:structuredClone(raw.reference),observation:structuredClone(raw.observation),deviationMm:raw.deviationMm,maxStates};
}
export function inspectSpatialCorrespondence(raw){
 if(raw?.format===AXIS_SPATIAL_CORRESPONDENCE_FORMAT)return inspectAxisSpatialCorrespondence(raw);
 const study=importSpatialCorrespondence(raw),a=points(study.reference),b=points(study.observation),possible=a.map(()=>new Set()),examples=[];
 const scaled=study.format===SCALED_SPATIAL_CORRESPONDENCE_FORMAT,scaleIntervals=[],bound=study.deviationMm+numericalSlackMm;
 let states=0,found=0,exhausted=false;
 const matrix=p=>p.map(x=>p.map(y=>Math.hypot(x.x-y.x,x.y-y.y))),left=matrix(a),right=matrix(b);
 function visit(prefix,used,low=0,high=Infinity){
  if(exhausted)return;
  if(states>=study.maxStates){exhausted=true;return;}states++;
  const i=prefix.length;
  if(i===a.length){found++;prefix.forEach((j,k)=>possible[k].add(j));if(examples.length<8){examples.push(prefix.map((j,k)=>({referenceId:a[k].id,observationId:b[j].id})));if(scaled)scaleIntervals.push({lower:low,lowerInclusive:low>0,upper:Number.isFinite(high)?high:null,includesUnitScale:low<=1&&high>=1});}return;}
  for(let j=0;j<b.length;j++){
   if(used.has(j))continue;
   let nextLow=low,nextHigh=high,compatible=true;
   for(let n=0;n<prefix.length;n++){
    const source=left[i][n],target=right[j][prefix[n]];
    if(!scaled){if(Math.abs(source-target)>bound){compatible=false;break;}}
    else if(source===0){if(target>bound){compatible=false;break;}}
    else{const pairLow=Math.max(0,(target-bound)/source),pairHigh=(target+bound)/source;check(Number.isFinite(pairLow)&&Number.isFinite(pairHigh),'Scale bounds exceed finite numeric support; no complete correspondence claim is available');nextLow=Math.max(nextLow,pairLow);nextHigh=Math.min(nextHigh,pairHigh);if(nextLow>nextHigh||nextHigh<=0){compatible=false;break;}}
   }
   if(!compatible)continue;
   visit([...prefix,j],new Set([...used,j]),nextLow,nextHigh);if(exhausted)return;
  }
 }
 if(a.length===b.length)visit([],new Set());
 const complete=a.length===b.length&&!exhausted;
 const status=a.length!==b.length?'different-point-count':exhausted?'budget-unresolved':found===0?'no-compatible-mapping':found===1?'unique':'ambiguous';
 return {study,status,complete,states,foundMappingCount:found,completeMappingCount:complete?found:null,witnessMappings:examples,...(scaled?{witnessScaleIntervals:scaleIntervals,numericalSlackMm}:{}),
  forcedPairs:complete&&found?possible.flatMap((set,i)=>set.size===1?[{referenceId:a[i].id,observationId:b[[...set][0]].id}]:[]):[],
  possibleMatches:complete&&found?possible.map((set,i)=>({referenceId:a[i].id,observationIds:[...set].sort((x,y)=>x-y).map(j=>b[j].id)})):[],
  limitation:scaled?'Every complete bijection must admit one positive scale shared by all its pair distances: |scale × reference distance − observation distance| ≤ the supplied bound in observation millimetres, plus 1e-9 mm numerical slack. All supported mappings remain; fixed scale 1 is included where compatible, never preferred. Scale intervals describe this pair-distance model, not a certified similarity transform, workpiece scaling rule, semantic identity or acquisition calibration. Original annotations are not normalized. Geometry used to select a correspondence cannot independently validate a response family. An unbounded upper scale is represented by null; zero lower endpoints are open. Budget-unresolved results establish no forced correspondence.':'These are complete bijections compatible with the supplied pair-distance discrepancy bound in calibrated physical millimetres. Approximate pair-distance agreement is not a certified rigid-transform fit, semantic point identity, or proof of task necessity. Different workpiece scales are not normalized or silently fitted. Budget-unresolved results establish no forced correspondence; original annotations and IDs remain unchanged.'};
}
export function createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed=false,sourceEvidenceClass=null}={}){
 check(semanticCorrespondenceConfirmed===true,'Review whether the proposed complete mapping represents the same task points');
 check(sourceEvidenceClass===null||['authored-example','reported-demonstration'].includes(sourceEvidenceClass),'Use an explicit source evidence category');
 const result=inspectSpatialCorrespondence(raw);check(result.complete&&result.status==='unique','A complete uniquely compatible mapping is required; ambiguity or incomplete search cannot be promoted');
 const scaled=result.study.format===SCALED_SPATIAL_CORRESPONDENCE_FORMAT,axis=result.study.format===AXIS_SPATIAL_CORRESPONDENCE_FORMAT;
 const reviewed={format:axis?REVIEWED_AXIS_SPATIAL_MAPPING_FORMAT:scaled?REVIEWED_SCALED_SPATIAL_MAPPING_FORMAT:REVIEWED_SPATIAL_MAPPING_FORMAT,study:result.study,pairs:result.witnessMappings[0],...(axis?{axisSupport:result.witnessAxisSupports[0]}:scaled?{scaleInterval:result.witnessScaleIntervals[0]}:{}),semanticCorrespondenceConfirmed:true,sourceEvidenceClass};
 check(new TextEncoder().encode(JSON.stringify(reviewed)).length<=2_000_000,'Complete reviewed mapping exceeds 2 MB; no original source is discarded');return reviewed;
}
export function importReviewedSpatialMapping(raw){
 const scaled=raw?.format===REVIEWED_SCALED_SPATIAL_MAPPING_FORMAT,axis=raw?.format===REVIEWED_AXIS_SPATIAL_MAPPING_FORMAT;
 check(axis||scaled||raw?.format===REVIEWED_SPATIAL_MAPPING_FORMAT,'Unsupported reviewed spatial mapping');
 check(axis?raw.study?.format===AXIS_SPATIAL_CORRESPONDENCE_FORMAT&&raw.scaleInterval===undefined:raw.axisSupport===undefined&&(scaled?raw.study?.format===SCALED_SPATIAL_CORRESPONDENCE_FORMAT:raw.study?.format===SPATIAL_CORRESPONDENCE_FORMAT&&raw.scaleInterval===undefined),'Reviewed model format cannot ignore scale provenance');
 const checked=createReviewedSpatialMapping(raw.study,{semanticCorrespondenceConfirmed:raw.semanticCorrespondenceConfirmed,sourceEvidenceClass:raw.sourceEvidenceClass??null});
 check(same(raw.pairs,checked.pairs),'Reviewed pairs differ from the complete recomputed geometric proposal');
 if(scaled)check(same(raw.scaleInterval,checked.scaleInterval),'Reviewed scale interval differs from the complete recomputed geometric proposal');
 if(axis)check(same(raw.axisSupport,checked.axisSupport),'Reviewed axis support differs from the complete recomputed geometric proposal');return checked;
}
export function reviewedSpatialMappingForSources(raw,reference,observation){
 const checked=importReviewedSpatialMapping(raw);
 check(same(checked.study.reference,reference)&&same(checked.study.observation,observation),'Reviewed mapping is bound to different original source annotations');return checked;
}
