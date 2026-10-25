import {importPhotoCalibrationReadings,inspectPhotoCalibrationReadings} from './photo-calibration-readings.mjs';
import {focusedPractice} from './practice-review.mjs';
export const PHOTO_FOCUS_SCHEMA='skill-translator-photo-focus/v1';
export const PHOTO_FOCUS_BYTES=6000000;
const fail=(ok,message)=>{if(!ok)throw Error(message);};
const summarize=values=>values.every(v=>v.status==='all-within')?'all-named-within':values.every(v=>v.status==='all-outside')?'all-named-outside':'not-established';
export function inspectPhotoFocus(raw){
 const investigation=importPhotoCalibrationReadings(raw),report=inspectPhotoCalibrationReadings(investigation),demo=investigation.source.review.demo;
 const marks=report.commonMarks.map(id=>{const mark=demo.landmarks.find(m=>m.id===id),sides={};
  for(const [side,index]of [['before',0],['after',1]]){
   // Each reading appears once, even though it occurs in several matrix pairs.
   const readings=report.readings[side].map(reading=>{const scenario=report.scenarios.find(s=>s[side+'Id']===reading.id),result=scenario.rounds[index].marks.find(m=>m.id===id);return {readingId:reading.id,label:reading.label,basis:reading.basis,status:result.region.status,dimension:result.region.dimension,guardMm:result.region.guardMm,exactSquaredExtrema:result.exactSquaredExtrema};});
   sides[side]={status:summarize(readings),readings};
  }
  return {id,label:mark.label,toleranceMm:mark.toleranceMm,...sides};
 });
 return {aggregateStatus:report.status,marks,missingMarks:report.excludedMissingMarks,semantics:'Every label refers only to the named finite readings and complete declared annotation regions. A repeated appearance in the scenario matrix is not another observation or vote. Per-mark tolerance findings do not establish learning, cause, or that a chosen drill will help. Missing marks have no photo finding.'};
}
export function createPhotoFocus(investigation,selectedIds=[]){
 const source=importPhotoCalibrationReadings(investigation),report=inspectPhotoFocus(source);
 fail(Array.isArray(selectedIds)&&selectedIds.length<=report.marks.length&&new Set(selectedIds).size===selectedIds.length&&selectedIds.every(id=>report.marks.some(m=>m.id===id)),'Choose distinct marks from this fixed common photo set');
 return {schema:PHOTO_FOCUS_SCHEMA,investigation:source,selectedIds:[...selectedIds]};
}
export function importPhotoFocus(raw){fail(raw?.schema===PHOTO_FOCUS_SCHEMA&&Array.isArray(raw.selectedIds),'Unsupported photo focus file or missing explicit selection');return createPhotoFocus(raw.investigation,raw.selectedIds);}
export function photoFocusedPractice(raw){const accepted=importPhotoFocus(raw);fail(accepted.selectedIds.length>0,'Explicitly select at least one mark before opening a fresh drill');return focusedPractice({...accepted.investigation.source.review,selectedIds:accepted.selectedIds});}
export function exportPhotoFocus(raw){const text=JSON.stringify(importPhotoFocus(raw),null,2);fail(new TextEncoder().encode(text).length<=PHOTO_FOCUS_BYTES,'Photo focus file exceeds 6 MB');return text;}
