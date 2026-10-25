import {importCueStudy,inspectCueStudy} from './cue-sufficiency.mjs';

/** Retrospective categorical support, never an action rule or accuracy estimate. */
export function inspectCueSupport(value){
 const study=importCueStudy(value);
 return {omissions:study.rows.map((held,index)=>{
  if(study.rows.length<3)return {index,status:'insufficient-other-examples',heldDecision:held.decision,combinations:[]};
  const indexes=study.rows.map((_,i)=>i).filter(i=>i!==index);
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
  return {index,status:findings.status,heldDecision:held.decision,combinations};
 }),boundary:'Each example is omitted from the categorical separation calculation. Exact matches are other retained declarations, not independent measurements, predictions, evidence of causation or a guarantee for unseen situations. Unknown-compatible rows provide no exact support. No learning or physical-skill score is calculated.'};
}

