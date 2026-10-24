/** Retain additional source annotations behind derived response observations.
 * Original pixel admission is deliberately owned by the maintained image receiver.
 */
import {derive} from './geometry.mjs';
import {validateCapturedDemo} from './capture.mjs';
import {observationReference} from './evidence.mjs';
import {validateResponseStudy,createResponseObservation,analyzeResponseStudy} from './response-family.mjs';
export const MAX_DEMONSTRATION_RESPONSE_BYTES=2_000_000;
export const DEMONSTRATION_RESPONSE_SCHEMA='skill-translator-response-demonstrations/v1';
const copy=v=>JSON.parse(JSON.stringify(v));
const fail=m=>{throw Error(m);};
const byteLength=value=>new TextEncoder().encode(JSON.stringify(value)).length;
function boundedBytes(value){if(byteLength(value)>MAX_DEMONSTRATION_RESPONSE_BYTES)fail('Complete annotation account exceeds2MB; no source is discarded');}
function derivedRow(reference,raw){
 const task=raw.annotation?.source?.image?validateCapturedDemo(raw.annotation):derive(raw.annotation),mark=task.landmarks.find(m=>m.id===raw.landmarkId);if(!mark)fail('Choose an existing mark in the additional source annotation');
 observationReference(raw.annotation,raw.landmarkId);
 return createResponseObservation(reference.source,reference.landmarkId,{id:raw.id,label:raw.label,evidenceClass:raw.evidenceClass,
  widthMm:task.source.widthMm,heightMm:task.source.heightMm,xMm:mark.uv.u*task.source.widthMm,yMm:mark.uv.v*task.source.heightMm,
  xBoundMm:raw.xBoundMm,yBoundMm:raw.yBoundMm});
}
export function validateDemonstrationResponse(input){
 if(input?.schema!==DEMONSTRATION_RESPONSE_SCHEMA)fail('Unsupported demonstration-response account');
 boundedBytes(input);
 const referenceStudy=validateResponseStudy(input.referenceStudy);
 if(referenceStudy.source.source.image)validateCapturedDemo(referenceStudy.source);
 if(!Array.isArray(input.demonstrations)||referenceStudy.observations.length+input.demonstrations.length>60)fail('Retain at most60 original and demonstration-derived observations combined');
 const ids=new Set(referenceStudy.observations.map(r=>r.id));
 let expandedBytes=byteLength(referenceStudy),extraCount=0;
 const demonstrations=input.demonstrations.map(raw=>{
  if(!raw||typeof raw!=='object'||raw.correspondenceConfirmed!==true)fail('Explicitly confirm which additional mark corresponds to the reference relationship');
  const row=derivedRow(referenceStudy,raw);
  expandedBytes+=byteLength(row)+(referenceStudy.observations.length||extraCount?1:0);extraCount++;
  if(expandedBytes>MAX_DEMONSTRATION_RESPONSE_BYTES)fail('Derived numeric response exceeds2MB; no source is discarded');
  if(ids.has(row.id))fail('Every original and additional observation needs a distinct id');ids.add(row.id);
  return {id:row.id,label:row.label,evidenceClass:row.evidenceClass,annotation:copy(raw.annotation),landmarkId:raw.landmarkId,
   correspondenceConfirmed:true,xBoundMm:row.xBoundMm,yBoundMm:row.yBoundMm};
 });
 const accepted={schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy,demonstrations};boundedBytes(accepted);return accepted;
}
export function responseFromDemonstrations(input){
 const accepted=validateDemonstrationResponse(input),reference=accepted.referenceStudy;
 const response=validateResponseStudy({...reference,observations:[...reference.observations,...accepted.demonstrations.map(raw=>derivedRow(reference,raw))]});boundedBytes(response);return response;
}
export function analyzeDemonstrationResponse(input){
 const accepted=validateDemonstrationResponse(input),response=responseFromDemonstrations(accepted);
 return {response,analysis:analyzeResponseStudy(response),sources:accepted.demonstrations.map(raw=>({id:raw.id,landmarkId:raw.landmarkId,
  sourceReference:observationReference(raw.annotation,raw.landmarkId),derived:response.observations.find(r=>r.id===raw.id)})),
  limitations:['Correspondence is an explicit author declaration, never inferred from equal labels or visual similarity.',
   'The additional coordinates are derived from supplied planar annotations and dimensions; the declared coordinate bounds must account for their intended use.',
   'Retained image metadata is not verification of reattached original pixels. This module does not decode or admit media.',
   'Saving retains raw additional source annotations and recomputes their positions; a separately exported numeric response study does not contain those additional annotations.']};
}
export function exportDemonstrationResponse(input){return validateDemonstrationResponse(input);}
