import {importCueStudy,inspectCueStudy} from './cue-sufficiency.mjs';

/** Retrospective categorical support, never an action rule or accuracy estimate. */
export function inspectCueSupport(value,{withhold='original-evidence'}={}){
 if(!['original-evidence','original-clip'].includes(withhold))throw Error('Choose original evidence or whole original clip withholding');
 const study=importCueStudy(value);
 const identities=study.comparison.examples.map(({source,stepId})=>{
  const step=source.steps.find(s=>s.id===stepId);
  if(withhold==='original-clip')return source.clip.sha256;
  return JSON.stringify([source.clip.sha256,...[step.beforeMomentId,step.afterMomentId].map(id=>{
   const moment=source.moments.find(m=>m.id===id);
   return [moment.image.sha256,moment.origin.mediaTimeSeconds];
  })]);
 });
 return {withhold,omissions:study.rows.map((held,index)=>{
  const omittedIndexes=identities.flatMap((identity,i)=>identity===identities[index]?[i]:[]);
  const indexes=study.rows.map((_,i)=>i).filter(i=>!omittedIndexes.includes(i));
  if(indexes.length<2)return {index,omittedIndexes,status:'insufficient-other-examples',heldDecision:held.decision,combinations:[]};
  const training={...study,comparison:{...study.comparison,examples:indexes.map(i=>study.comparison.examples[i])},rows:indexes.map(i=>study.rows[i])};
  const findings=inspectCueStudy(training);
  const combinations=findings.minimalCueSets.map(cueIds=>{
   const columns=cueIds.map(id=>study.cues.findIndex(c=>c.id===id));
   const exact=[],unknownCompatible=[],excluded=[];
   for(const i of indexes){
    const row=study.rows[i];
    const differing=columns.filter(j=>held.values[j]!==null&&row.values[j]!==null&&held.values[j]!==row.values[j]);
    const unknown=columns.filter(j=>held.values[j]===null||row.values[j]===null);
    const witness={index:i,decision:row.decision,differingCueIds:differing.map(j=>study.cues[j].id),unknownCueIds:unknown.map(j=>study.cues[j].id)};
    if(differing.length)excluded.push(witness);
    else if(unknown.length)unknownCompatible.push(witness);
    else exact.push(witness);
   }
   const labels=[...new Set(exact.map(r=>r.decision))];
   const comparison=held.decision===null?'held-label-unknown':!exact.length?'no-exact-support':labels.every(label=>label===held.decision)?'same-declared-label':'opposing-declared-label';
   return {cueIds:[...cueIds],exact,unknownCompatible,excluded,exactLabels:labels,comparison};
  });
  return {index,omittedIndexes,status:findings.status,heldDecision:held.decision,combinations};
 }),withholdingBoundary:withhold==='original-clip'?'Every retained interval from the same declared original clip digest is withheld. Different clips can still share a demonstrator, scene or recording session; independence is not established.':'Only identical ordered original frame evidence is grouped; other intervals from the same clip can remain.',boundary:'Each example and renamed copies of its original clip, ordered frame hashes and presented times are omitted together from the categorical separation calculation. Different evidence may still be correlated. Exact matches are other retained declarations, not independent measurements, predictions, evidence of causation or a guarantee for unseen situations. Unknown-compatible rows provide no exact support. No learning or physical-skill score is calculated.'};
}


