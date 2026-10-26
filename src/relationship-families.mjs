/** Descriptive competing dimension-response hypotheses for demonstrated pairs. */
import {derive,GeometryError} from './geometry.mjs';
import {discoverRelationships} from './relationship-discovery.mjs';
export const RELATIONSHIP_FAMILIES=Object.freeze(['fixed','width-proportional','height-proportional','diagonal-proportional']);
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function scale(family,reference,size){
 return family==='fixed'?1:family==='width-proportional'?size.widthMm/reference.widthMm:family==='height-proportional'?size.heightMm/reference.heightMm:
  Math.hypot(size.widthMm,size.heightMm)/Math.hypot(reference.widthMm,reference.heightMm);
}
/** The original reference reading anchors each transparent hypothesis.
 * A small normalized spread is descriptive compatibility, not a fitted rule.
 */
export function inspectRelationshipFamilies(raw){
 const discovery=discoverRelationships(raw),study=discovery.study,reference=study.demonstrations[0].annotation.source;
 const sizes=new Map(study.demonstrations.map(row=>[row.id,derive(row.annotation).source]));
 const pairs=discovery.candidates.map(candidate=>{
  const hypotheses=RELATIONSHIP_FAMILIES.map(family=>{
   const readings=candidate.readings.map(reading=>{
    const factor=scale(family,reference,sizes.get(reading.demonstrationId));
    return {...reading,scale:factor,referenceEquivalentMm:reading.valueMm===null?null:reading.valueMm/factor};
   });
   const observed=readings.filter(r=>r.referenceEquivalentMm!==null),minMm=Math.min(...observed.map(r=>r.referenceEquivalentMm)),maxMm=Math.max(...observed.map(r=>r.referenceEquivalentMm)),spreadMm=maxMm-minMm;
   const status=spreadMm>study.deviationMm+1e-9?'contradicted':observed.length!==readings.length?'incomplete':'compatible';
   return {family,status,readings,minReferenceEquivalentMm:minMm,maxReferenceEquivalentMm:maxMm,spreadReferenceEquivalentMm:spreadMm,
    witnesses:{minimum:observed.find(r=>r.referenceEquivalentMm===minMm).demonstrationId,maximum:observed.find(r=>r.referenceEquivalentMm===maxMm).demonstrationId}};
  });
  const compatibleFamilies=hypotheses.filter(h=>h.status==='compatible').map(h=>h.family);
  return {id:candidate.id,from:candidate.from,to:candidate.to,kind:candidate.kind,referenceMm:candidate.readings[0].valueMm,hypotheses,compatibleFamilies,
   status:compatibleFamilies.length>1?'ambiguous':compatibleFamilies.length===1?'single-compatible':hypotheses.some(h=>h.status==='incomplete')?'incomplete':'none-compatible'};
 });
 return {study,pairs,limitation:'Four transparent pair-response hypotheses are tested against the supplied calibrated annotations. The exploratory threshold is applied to each model after readings are expressed in reference-workpiece millimetres. Spatial mappings selected by pair-distance agreement condition the evidence; repeated distances in those sources are not independent validation of a fixed or proportional rule. Multiple survivors stay ambiguous; a single survivor is only unique inside this tested family. No execution tolerance, causal constraint or physical success is inferred.'};
}
export function predictRelationshipFamilies(raw,{widthMm,heightMm}){
 check([widthMm,heightMm].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=1&&x<=10000),'Target dimensions must be 1–10000 mm');
 const result=inspectRelationshipFamilies(raw),reference=result.study.demonstrations[0].annotation.source;
 return {...result,target:{widthMm,heightMm},pairs:result.pairs.map(pair=>({...pair,predictions:pair.compatibleFamilies.map(family=>{
  const factor=scale(family,reference,{widthMm,heightMm}),expectedMm=pair.referenceMm*factor,maxMm=pair.kind==='distance'?Math.hypot(widthMm,heightMm):pair.kind==='horizontal'?widthMm:heightMm;
  return {family,expectedMm,scale:factor,outsideNominalSheet:Math.abs(expectedMm)>maxMm+1e-9};
 })}))};
}
