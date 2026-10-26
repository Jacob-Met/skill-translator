// Conditional identity proposals with one selected point outside the distance model.
import {importSpatialCorrespondence,inspectSpatialCorrespondence,SPATIAL_CORRESPONDENCE_FORMAT} from './spatial-correspondence.mjs';
import {GeometryError} from './geometry.mjs';
export const INDEPENDENT_POINT_CORRESPONDENCE_FORMAT='skill-translator.independent-point-correspondence/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function importIndependentPointCorrespondence(raw){
 check(raw?.format===INDEPENDENT_POINT_CORRESPONDENCE_FORMAT,'Open the declared one-independent-point model.');
 check(raw.model===undefined,'This format cannot silently substitute another correspondence model.');
 // Admission is on COMPLETE original sources, never only the reduced subsets.
 const full=importSpatialCorrespondence({format:SPATIAL_CORRESPONDENCE_FORMAT,reference:raw.reference,observation:raw.observation,deviationMm:raw.deviationMm,maxStates:raw.maxStates});
 check(full.reference.landmarks.length>=4&&full.reference.landmarks.length===full.observation.landmarks.length,'Use equal original sets of 4–7 points; missing or extra points are not inferred.');
 check(typeof raw.referencePointId==='string'&&full.reference.landmarks.some(m=>m.id===raw.referencePointId),'Select an original reference point for the independent-point hypothesis.');
 return {format:INDEPENDENT_POINT_CORRESPONDENCE_FORMAT,reference:full.reference,observation:full.observation,referencePointId:raw.referencePointId,deviationMm:full.deviationMm,maxStates:full.maxStates};
}
export function inspectIndependentPointCorrespondence(raw){
 const study=importIndependentPointCorrespondence(raw),reference=structuredClone(study.reference);
 reference.landmarks=reference.landmarks.filter(m=>m.id!==study.referencePointId);
 const rows=[];let states=0,complete=true,foundMappingCount=0;
 for(const point of study.observation.landmarks){
  if(states>=study.maxStates){complete=false;break;}
  const observation=structuredClone(study.observation);observation.landmarks=observation.landmarks.filter(m=>m.id!==point.id);
  const report=inspectSpatialCorrespondence({format:SPATIAL_CORRESPONDENCE_FORMAT,reference,observation,deviationMm:study.deviationMm,maxStates:study.maxStates-states});
  states+=report.states;foundMappingCount+=report.foundMappingCount;
  rows.push({observationPointId:point.id,auxiliaryStatus:report.status,complete:report.complete,states:report.states,foundMappingCount:report.foundMappingCount,completeMappingCount:report.completeMappingCount,witnessAuxiliaryMappings:report.witnessMappings});
  if(!report.complete){complete=false;break;}
 }
 const possibleObservationIds=complete?rows.filter(r=>r.completeMappingCount>0).map(r=>r.observationPointId):[];
 const status=!complete?'budget-unresolved':possibleObservationIds.length===0?'no-compatible-assignment':possibleObservationIds.length===1?'forced-selected-point':'ambiguous-selected-point';
 return {study,status,complete,states,foundMappingCount,completeMappingCount:complete?foundMappingCount:null,rows,possibleObservationIds,
  forcedPair:status==='forced-selected-point'?{referenceId:study.referencePointId,observationId:possibleObservationIds[0]}:null,
  unevaluatedObservationIds:study.observation.landmarks.slice(rows.length).map(m=>m.id),
  boundary:'One explicitly selected reference point is exempt from every pair-distance constraint. All remaining original points must be present and admit a complete pair-distance-compatible bijection within the supplied bound plus the maintained numerical slack. Every possible observed selected point is considered under one shared search-state budget. A forced selected point can coexist with ambiguous auxiliary identities. This is a conditional annotation model, not evidence that a physical point is independent, a rigid body exists, or semantic task identity is known. Reflections and approximate pair-distance agreement remain possible. Original coordinates are not fitted, transformed, deleted or changed; auxiliary subsets are internal comparisons only.'};
}
export function reviewIndependentPointChoice(raw,{independentPointModelConfirmed=false,semanticCorrespondenceConfirmed=false}={}){
 check(independentPointModelConfirmed===true,'Review the selected-point exemption and pair-distance assumption for every other original point.');
 check(semanticCorrespondenceConfirmed===true,'Review whether the forced selected pair denotes the same task point.');
 const result=inspectIndependentPointCorrespondence(raw);check(result.status==='forced-selected-point'&&result.complete,'A completely searched forced selected point is required; partial search or ambiguity cannot be promoted.');
 return {study:result.study,pair:result.forcedPair,independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true,
  completeAssignmentCount:result.completeMappingCount,auxiliaryIdentitiesUnique:result.completeMappingCount===1};
}
