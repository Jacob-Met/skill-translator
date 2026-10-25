/** Complete bounded pair-distance correspondence proposals; never semantic identity. */
import {derive,GeometryError} from './geometry.mjs';
import {validateCapturedDemo} from './capture.mjs';
export const SPATIAL_CORRESPONDENCE_FORMAT='skill-translator.spatial-correspondence/v1';
export const REVIEWED_SPATIAL_MAPPING_FORMAT='skill-translator.reviewed-spatial-mapping/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function points(annotation){const task=annotation?.source?.image?validateCapturedDemo(annotation):derive(annotation);return task.landmarks.map(m=>({id:m.id,x:m.uv.u*task.source.widthMm,y:m.uv.v*task.source.heightMm}));}
export function importSpatialCorrespondence(raw){
 check(raw?.format===SPATIAL_CORRESPONDENCE_FORMAT,'Unsupported spatial correspondence study');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=2_000_000,'Keep complete original annotations within 2 MB');
 check(typeof raw.deviationMm==='number'&&Number.isFinite(raw.deviationMm)&&raw.deviationMm>=0&&raw.deviationMm<=1000,'Pair-distance discrepancy must be 0–1000 mm');
 const maxStates=raw.maxStates??20000;check(Number.isInteger(maxStates)&&maxStates>=1&&maxStates<=20000,'Search budget must be 1–20000 states');
 const first=points(raw.reference),second=points(raw.observation);
 check([first.length,second.length].every(n=>n>=3&&n<=7),'Use 3–7 annotated points in each source; partial point sets are not inferred');
 return {format:SPATIAL_CORRESPONDENCE_FORMAT,reference:structuredClone(raw.reference),observation:structuredClone(raw.observation),deviationMm:raw.deviationMm,maxStates};
}
export function inspectSpatialCorrespondence(raw){
 const study=importSpatialCorrespondence(raw),a=points(study.reference),b=points(study.observation),possible=a.map(()=>new Set()),examples=[];
 let states=0,found=0,exhausted=false;
 const matrix=p=>p.map(x=>p.map(y=>Math.hypot(x.x-y.x,x.y-y.y))),left=matrix(a),right=matrix(b);
 function visit(prefix,used){
  if(exhausted)return;
  if(states>=study.maxStates){exhausted=true;return;}states++;
  const i=prefix.length;
  if(i===a.length){found++;prefix.forEach((j,k)=>possible[k].add(j));if(examples.length<8)examples.push(prefix.map((j,k)=>({referenceId:a[k].id,observationId:b[j].id})));return;}
  for(let j=0;j<b.length;j++){
   if(used.has(j))continue;
   if(prefix.some((k,n)=>Math.abs(left[i][n]-right[j][k])>study.deviationMm+1e-9))continue;
   visit([...prefix,j],new Set([...used,j]));if(exhausted)return;
  }
 }
 if(a.length===b.length)visit([],new Set());
 const complete=a.length===b.length&&!exhausted;
 const status=a.length!==b.length?'different-point-count':exhausted?'budget-unresolved':found===0?'no-compatible-mapping':found===1?'unique':'ambiguous';
 return {study,status,complete,states,foundMappingCount:found,completeMappingCount:complete?found:null,witnessMappings:examples,
  forcedPairs:complete&&found?possible.flatMap((set,i)=>set.size===1?[{referenceId:a[i].id,observationId:b[[...set][0]].id}]:[]):[],
  possibleMatches:complete&&found?possible.map((set,i)=>({referenceId:a[i].id,observationIds:[...set].sort((x,y)=>x-y).map(j=>b[j].id)})):[],
  limitation:'These are complete bijections compatible with the supplied pair-distance discrepancy bound in calibrated physical millimetres. Approximate pair-distance agreement is not a certified rigid-transform fit, semantic point identity, or proof of task necessity. Different workpiece scales are not normalized or silently fitted. Budget-unresolved results establish no forced correspondence; original annotations and IDs remain unchanged.'};
}
export function createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed=false,sourceEvidenceClass=null}={}){
 check(semanticCorrespondenceConfirmed===true,'Review whether the proposed complete mapping represents the same task points');
 check(sourceEvidenceClass===null||['authored-example','reported-demonstration'].includes(sourceEvidenceClass),'Use an explicit source evidence category');
 const result=inspectSpatialCorrespondence(raw);check(result.complete&&result.status==='unique','A complete uniquely compatible mapping is required; ambiguity or incomplete search cannot be promoted');
 const reviewed={format:REVIEWED_SPATIAL_MAPPING_FORMAT,study:result.study,pairs:result.witnessMappings[0],semanticCorrespondenceConfirmed:true,sourceEvidenceClass};
 check(new TextEncoder().encode(JSON.stringify(reviewed)).length<=2_000_000,'Complete reviewed mapping exceeds 2 MB; no original source is discarded');return reviewed;
}
export function importReviewedSpatialMapping(raw){
 check(raw?.format===REVIEWED_SPATIAL_MAPPING_FORMAT,'Unsupported reviewed spatial mapping');
 const checked=createReviewedSpatialMapping(raw.study,{semanticCorrespondenceConfirmed:raw.semanticCorrespondenceConfirmed,sourceEvidenceClass:raw.sourceEvidenceClass??null});
 check(same(raw.pairs,checked.pairs),'Reviewed pairs differ from the complete recomputed geometric proposal');return checked;
}
export function reviewedSpatialMappingForSources(raw,reference,observation){
 const checked=importReviewedSpatialMapping(raw);
 check(same(checked.study.reference,reference)&&same(checked.study.observation,observation),'Reviewed mapping is bound to different original source annotations');return checked;
}
