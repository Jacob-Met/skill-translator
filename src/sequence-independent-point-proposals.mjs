import {validateSequence} from './demonstration-sequence.mjs';
import {INDEPENDENT_POINT_CORRESPONDENCE_FORMAT,importIndependentPointCorrespondence,inspectIndependentPointCorrespondence,reviewIndependentPointChoice} from './independent-point-correspondence.mjs';
export function proposeSequenceIndependentPointChoices(sequence,{anchorMomentId,anchorMarkId,momentIds,deviationMm,maxStates=20000}={}){
 const source=validateSequence(sequence),moments=new Map(source.moments.map(m=>[m.id,m]));
 if(!Array.isArray(momentIds)||momentIds.length<2||new Set(momentIds).size!==momentIds.length||!momentIds.includes(anchorMomentId)||momentIds.some(id=>!moments.has(id)))throw Error('Select distinct original moments including the anchor.');
 const reference=moments.get(anchorMomentId).calibratedTask;
 if(!reference?.landmarks.some(m=>m.id===anchorMarkId))throw Error('Choose an existing point in the calibrated original anchor frame.');
 const study=observation=>({format:INDEPENDENT_POINT_CORRESPONDENCE_FORMAT,reference,observation,referencePointId:anchorMarkId,deviationMm,maxStates});
 importIndependentPointCorrespondence(study(reference));
 const rows=source.moments.filter(m=>momentIds.includes(m.id)).map(moment=>{
  if(moment.id===anchorMomentId)return {momentId:moment.id,status:'anchor',markId:anchorMarkId};
  const observation=moment.calibratedTask;
  if(!observation||observation.landmarks.length<4||observation.landmarks.length>7)return {momentId:moment.id,status:'unavailable-original-constellation',markId:null};
  if(observation.landmarks.length!==reference.landmarks.length)return {momentId:moment.id,status:'different-original-point-count',markId:null};
  const report=inspectIndependentPointCorrespondence(study(observation));
  return {momentId:moment.id,status:report.status,markId:report.forcedPair?.observationId??null,report};
 });
 return {source,query:{anchorMomentId,anchorMarkId,momentIds:[...momentIds],deviationMm,maxStates},rows};
}
export function reviewSequenceIndependentPointChoice(sequence,query,momentId,confirmations={}){
 const proposal=proposeSequenceIndependentPointChoices(sequence,query),row=proposal.rows.find(r=>r.momentId===momentId);
 if(!row?.markId||!row.report?.complete)throw Error('A completely searched forced selected point is required for this original moment.');
 const independentPointReview=reviewIndependentPointChoice(row.report.study,confirmations);
 return {independentPointReview,
  anchor:{momentId:query.anchorMomentId,markId:query.anchorMarkId,basis:'Original selected reference point explicitly chosen by the author.'},
  sample:{momentId,markId:row.markId,basis:'Authored point choice after reviewing the one-independent-selected-point hypothesis and this semantic point identity. Only auxiliary pair distances were constrained; the selected point was exempt. This does not establish a complete rigid mapping or physical independence. The common fixed plane and corner meanings are independently declared.'}};
}
