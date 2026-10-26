import {spatialSourcePoints} from './spatial-source-geometry.mjs';
import {exactAxisCandidates} from './axis-distance-support.mjs';
export const AXIS_SPATIAL_CORRESPONDENCE_FORMAT='skill-translator.spatial-correspondence/v3';
export const AXIS_SCALE_MODEL='independent-reference-axis-magnitudes';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function importAxisSpatialCorrespondence(raw){
 check(raw?.format===AXIS_SPATIAL_CORRESPONDENCE_FORMAT&&raw.model===AXIS_SCALE_MODEL,'Use the explicit independent-axis spatial model');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=2_000_000,'Keep complete original annotations within2MB');
 check(typeof raw.deviationMm==='number'&&Number.isFinite(raw.deviationMm)&&raw.deviationMm>=0&&raw.deviationMm<=1000,'Pair-distance discrepancy must be0–1000mm');
 const maxStates=raw.maxStates??20000,maxConstraintWork=raw.maxConstraintWork??200000;
 check(Number.isInteger(maxStates)&&maxStates>=1&&maxStates<=20000,'Search budget must be1–20000states');
 check(Number.isInteger(maxConstraintWork)&&maxConstraintWork>=1&&maxConstraintWork<=200000,'Exact constraint budget must be1–200000');
 const a=spatialSourcePoints(raw.reference),b=spatialSourcePoints(raw.observation);
 check([a.length,b.length].every(n=>n>=3&&n<=7),'Use3–7 annotated points in each original source');
 return {format:AXIS_SPATIAL_CORRESPONDENCE_FORMAT,model:AXIS_SCALE_MODEL,reference:structuredClone(raw.reference),observation:structuredClone(raw.observation),deviationMm:raw.deviationMm,maxStates,maxConstraintWork};
}
const limitation='This model infers positive stretch magnitudes along the reference workpiece axes from all pair distances. It does not infer axis signs, orientation, semantic task identity, calibration corrections or a certified coordinate transform. Possible mappings use conservative norm bounds; a qualified unique mapping also needs an exact inner witness. Scale combinations remain correlated polygons, not independent ranges or a selected best scale. An axis absent from the reference geometry remains unconstrained; witness values are not inferred scales. Distances used for correspondence selection are not independent tests of fixed or proportional rules. Original sources are never normalized or renamed. The declared discrepancy is in observation millimetres with a separate1e-9mm computational slack; it is not an execution tolerance.';
export function inspectAxisSpatialCorrespondence(raw){
 const study=importAxisSpatialCorrespondence(raw),a=spatialSourcePoints(study.reference),b=spatialSourcePoints(study.observation);
 if(a.length!==b.length)return {study,status:'different-point-count',complete:false,states:0,constraintWork:0,foundMappingCount:0,completeMappingCount:null,witnessMappings:[],witnessAxisSupports:[],forcedPairs:[],possibleMatches:[],supportCountKind:'outer-possible-mappings',limitation};
 const result=exactAxisCandidates(a.map(p=>[p.x,p.y]),b.map(p=>[p.x,p.y]),{deviationMm:study.deviationMm,maxStates:study.maxStates,maxWork:study.maxConstraintWork});
 const pairs=mapping=>mapping.map((j,i)=>({referenceId:a[i].id,observationId:b[j].id}));
 return {study,status:result.status==='unique-with-conservative-witness'?'unique':result.status==='incompatible'?'no-compatible-mapping':result.status,complete:result.complete,states:result.states,constraintWork:result.work,
  foundMappingCount:result.foundMappingCount,completeMappingCount:result.count,completeWitnessedMappingCount:result.conservativeWitnessCount,foundWitnessedMappingCount:result.foundConservativeWitnessCount,
  witnessMappings:result.mappings.map(row=>pairs(row.mapping)),witnessAxisSupports:result.mappings.map(({mapping,...support})=>support),
  forcedPairs:result.forced.map(([i,j])=>({referenceId:a[i].id,observationId:b[j].id})),possibleMatches:result.possibleMatches.map((js,i)=>({referenceId:a[i].id,observationIds:js.map(j=>b[j].id)})),
  supportCountKind:'outer-possible-mappings',numericalSlackMm:1e-9,limitation};
}
