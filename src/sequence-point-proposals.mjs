// Propose existing local marks only; spatial-correspondence owns the complete matcher.
import {validateSequence} from './demonstration-sequence.mjs';
import {SPATIAL_CORRESPONDENCE_FORMAT,inspectSpatialCorrespondence,createReviewedSpatialMapping} from './spatial-correspondence.mjs';
export function proposeSequencePointChoices(sequence,{anchorMomentId,anchorMarkId,momentIds,deviationMm,maxStates=20000}={}){
 const source=validateSequence(sequence),moments=new Map(source.moments.map(m=>[m.id,m]));
 if(!Array.isArray(momentIds)||momentIds.length<2||new Set(momentIds).size!==momentIds.length||!momentIds.includes(anchorMomentId)||momentIds.some(id=>!moments.has(id)))throw Error('Select distinct original moments including the anchor.');
 const anchor=moments.get(anchorMomentId),reference=anchor.calibratedTask;
 if(!reference?.landmarks.some(m=>m.id===anchorMarkId))throw Error('Choose a mark in the original anchor frame.');
 // Native admission validates the reference and declared search bounds even if
 // every other selected frame is unavailable; no new matching rule lives here.
 inspectSpatialCorrespondence({format:SPATIAL_CORRESPONDENCE_FORMAT,reference,observation:reference,deviationMm,maxStates});
 const rows=source.moments.filter(m=>momentIds.includes(m.id)).map(moment=>{
  if(moment.id===anchorMomentId)return {momentId:moment.id,status:'anchor',markId:anchorMarkId};
  const observation=moment.calibratedTask;
  if(!observation||observation.landmarks.length<3||observation.landmarks.length>7)return {momentId:moment.id,status:'unavailable-constellation',markId:null};
  const report=inspectSpatialCorrespondence({format:SPATIAL_CORRESPONDENCE_FORMAT,reference,observation,deviationMm,maxStates});
  return {momentId:moment.id,status:report.status,markId:report.status==='unique'?report.forcedPairs.find(p=>p.referenceId===anchorMarkId).observationId:null,report};
 });
 return {source,query:{anchorMomentId,anchorMarkId,momentIds:[...momentIds],deviationMm,maxStates},rows};
}
export function reviewSequencePointChoice(sequence,query,momentId,{semanticCorrespondenceConfirmed=false}={}){
 if(semanticCorrespondenceConfirmed!==true)throw Error('Review whether this complete mapping denotes the same task points.');
 const proposal=proposeSequencePointChoices(sequence,query),row=proposal.rows.find(r=>r.momentId===momentId);
 if(row?.status!=='unique')throw Error('A complete unique mapping for a selected non-anchor moment is required.');
 const reviewedMapping=createReviewedSpatialMapping(row.report.study,{semanticCorrespondenceConfirmed:true});
 return {reviewedMapping,anchor:{momentId:query.anchorMomentId,markId:query.anchorMarkId,basis:'Original anchor point explicitly selected by the author.'},sample:{momentId:row.momentId,markId:row.markId,basis:'Authored point choice after review of a complete unique pair-distance mapping of the original annotations. The common fixed plane and corner meanings are independently declared.'}};
}
