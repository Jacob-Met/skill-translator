/** Cross-demonstration hypotheses, never inferred physical requirements. */
import {derive, adapt, GeometryError} from './geometry.mjs';
import {validateCapturedDemo} from './capture.mjs';
import {reviewedSpatialMappingForSources,importReviewedSpatialMapping} from './spatial-correspondence.mjs';
export const DISCOVERY_FORMAT='skill-translator.relationship-discovery/v1';
export const MAPPED_DISCOVERY_FORMAT='skill-translator.relationship-discovery/v2';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const copy=v=>structuredClone(v);
const measure=(a,b,kind)=>kind==='distance'?Math.hypot(b.xMm-a.xMm,b.yMm-a.yMm):kind==='horizontal'?b.xMm-a.xMm:b.yMm-a.yMm;
export function importRelationshipDiscovery(raw){
 check([DISCOVERY_FORMAT,MAPPED_DISCOVERY_FORMAT].includes(raw?.format),'Unsupported relationship discovery account');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=2_000_000,'Keep the complete annotation account within 2 MB');
 check(typeof raw.deviationMm==='number'&&Number.isFinite(raw.deviationMm)&&raw.deviationMm>=0&&raw.deviationMm<=1000,'Exploratory deviation must be 0–1000 mm');
 check(Array.isArray(raw.demonstrations)&&raw.demonstrations.length>=2&&raw.demonstrations.length<=12,'Supply 2–12 independently calibrated demonstrations');
 const ids=new Set();
 const demonstrations=raw.demonstrations.map((row,index)=>{
  check(row&&typeof row.id==='string'&&/^[a-z0-9-]{1,40}$/.test(row.id)&&!ids.has(row.id),'Demonstration IDs must be unique short identifiers');ids.add(row.id);
  check(row.correspondenceConfirmed===true,'Confirm that the declared point correspondences denote the same task points across these demonstrations');
  check(['authored-example','reported-demonstration'].includes(row.evidenceClass),'Declare authored example or reported demonstration');
  const derived=row.annotation?.source?.image?validateCapturedDemo(row.annotation):derive(row.annotation);check(derived.landmarks.length>=2,'Each demonstration needs at least two annotated points');
  let spatialMapping;
  if(row.spatialMapping!==undefined){
   check(raw.format===MAPPED_DISCOVERY_FORMAT&&index>0,'Reviewed spatial mappings require a v2 additional demonstration; the reference keeps its original IDs');
   spatialMapping=reviewedSpatialMappingForSources(row.spatialMapping,raw.demonstrations[0].annotation,row.annotation);
  }
  return {id:row.id,evidenceClass:row.evidenceClass,correspondenceConfirmed:true,annotation:copy(row.annotation),...(spatialMapping?{spatialMapping}:{})};
 });
 return {format:raw.format,deviationMm:raw.deviationMm,demonstrations};
}
export function discoveryFromReviewedSpatialMapping(raw,{deviationMm,evidenceClass}){
 const mapping=importReviewedSpatialMapping(raw);
 return importRelationshipDiscovery({format:MAPPED_DISCOVERY_FORMAT,deviationMm,demonstrations:[
  {id:'reference',annotation:mapping.study.reference,evidenceClass,correspondenceConfirmed:true},
  {id:'observation',annotation:mapping.study.observation,evidenceClass,correspondenceConfirmed:true,spatialMapping:mapping}
 ]});
}
export function discoverRelationships(raw){
 const study=importRelationshipDiscovery(raw);
 const tasks=study.demonstrations.map(row=>{const d=derive(row.annotation),original=new Map(d.landmarks.map(m=>[m.id,{xMm:m.uv.u*d.source.widthMm,yMm:m.uv.v*d.source.heightMm}]));return {...row,points:row.spatialMapping?new Map(row.spatialMapping.pairs.map(p=>[p.referenceId,original.get(p.observationId)])):original};});
 const marks=study.demonstrations[0].annotation.landmarks,candidates=[];
 for(let a=0;a<marks.length;a++)for(let b=a+1;b<marks.length;b++)for(const kind of ['horizontal','vertical','distance']){
  const from=marks[a].id,to=marks[b].id;
  const readings=tasks.map(t=>{const p=t.points.get(from),q=t.points.get(to);return {demonstrationId:t.id,evidenceClass:t.evidenceClass,valueMm:p&&q?measure(p,q,kind):null,missing:[from,to].filter(id=>!t.points.has(id)),...(t.spatialMapping?{sourcePointIds:{from:t.spatialMapping.pairs.find(p=>p.referenceId===from).observationId,to:t.spatialMapping.pairs.find(p=>p.referenceId===to).observationId}}:{})};});
  const observed=readings.filter(r=>r.valueMm!==null),minMm=Math.min(...observed.map(r=>r.valueMm)),maxMm=Math.max(...observed.map(r=>r.valueMm));
  // Full observed range, not residual around a fitted or selected convenient example.
  const spreadMm=maxMm-minMm;
  const status=spreadMm>study.deviationMm+1e-9?'contradicted':observed.length!==tasks.length?'incomplete':'repeatable';
  candidates.push({id:`${from}:${to}:${kind}`,from,to,kind,readings,minMm,maxMm,spreadMm,status,
   witnesses:{minimum:observed.find(r=>r.valueMm===minMm).demonstrationId,maximum:observed.find(r=>r.valueMm===maxMm).demonstrationId}});
 }
 return {study,candidates,counts:Object.fromEntries(['repeatable','contradicted','incomplete'].map(s=>[s,candidates.filter(c=>c.status===s).length])),
  limitation:'These are descriptive pair hypotheses from calibrated annotations and explicitly confirmed identities. Spatial mappings selected by pair-distance agreement make repeated distances selection-conditioned, not independent validation of an invariant. Repeatability does not establish task necessity, uncertainty coverage, causal relevance or successful physical skill. The deviation is an exploratory range threshold, not a learned execution tolerance.'};
}
export function compareDiscoveredTransfer(raw,widthMm,heightMm){
 const result=discoverRelationships(raw),reference=result.study.demonstrations[0].annotation;
 const adapted=adapt(derive(reference),widthMm,heightMm),points=new Map(adapted.landmarks.map(m=>[m.id,m]));
 return {...result,target:{widthMm,heightMm},candidates:result.candidates.map(c=>{
  const authoredTargetMm=measure(points.get(c.from),points.get(c.to),c.kind);
  return {...c,authoredTargetMm,outsideObservedRangeMm:Math.max(c.minMm-authoredTargetMm,authoredTargetMm-c.maxMm,0)};
 })};
}
