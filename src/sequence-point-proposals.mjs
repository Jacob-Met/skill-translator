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
  const forced=report.complete?report.forcedPairs.find(p=>p.referenceId===anchorMarkId):null;
  return {momentId:moment.id,status:report.status,markId:forced?.observationId??null,
   proposalKind:forced?(report.status==='unique'?'complete-mapping':'forced-anchor'):null,report};
 });
 return {source,query:{anchorMomentId,anchorMarkId,momentIds:[...momentIds],deviationMm,maxStates},rows};
}
export function reviewSequencePointChoice(sequence,query,momentId,{semanticCorrespondenceConfirmed=false}={}){
 if(semanticCorrespondenceConfirmed!==true)throw Error('Review whether the offered point correspondence denotes the same task point.');
 const proposal=proposeSequencePointChoices(sequence,query),row=proposal.rows.find(r=>r.momentId===momentId);
 if(!row?.markId||!row.report?.complete)throw Error('A completely searched forced point correspondence for a selected non-anchor moment is required.');
 if(row.proposalKind==='forced-anchor')return {
  anchorOnlyReview:{referenceId:query.anchorMarkId,observationId:row.markId,completeMappingCount:row.report.completeMappingCount},
  anchor:{momentId:query.anchorMomentId,markId:query.anchorMarkId,basis:'Original anchor point explicitly selected by the author.'},
  sample:{momentId:row.momentId,markId:row.markId,basis:'Authored point choice after review of the selected anchor correspondence shared by every compatible complete pair-distance mapping. Other point identities remain ambiguous; no complete mapping was reviewed. The common fixed plane and corner meanings are independently declared.'}
 };
 const reviewedMapping=createReviewedSpatialMapping(row.report.study,{semanticCorrespondenceConfirmed:true});
 return {reviewedMapping,anchor:{momentId:query.anchorMomentId,markId:query.anchorMarkId,basis:'Original anchor point explicitly selected by the author.'},sample:{momentId:row.momentId,markId:row.markId,basis:'Authored point choice after review of a complete unique pair-distance mapping of the original annotations. The common fixed plane and corner meanings are independently declared.'}};
}

export function reviewSequenceForcedSubset(sequence,query,momentId,{semanticForcedPairsConfirmed=false}={}){
 if(semanticForcedPairsConfirmed!==true)throw Error('Review every offered forced pair as the same task points, not only the selected anchor.');
 const proposal=proposeSequencePointChoices(sequence,query),row=proposal.rows.find(r=>r.momentId===momentId);
 if(!row?.markId||!row.report?.complete)throw Error('A completely searched forced anchor is required before retaining the reviewed subset.');
 const choice=reviewSequencePointChoice(sequence,query,momentId,{semanticCorrespondenceConfirmed:true});
 return {...choice,forcedSubsetQuery:{anchorMomentId:query.anchorMomentId,deviationMm:query.deviationMm,maxStates:query.maxStates??20000},forcedSubsetReview:{momentId,semanticForcedPairsConfirmed:true,pairs:row.report.forcedPairs}};
}
