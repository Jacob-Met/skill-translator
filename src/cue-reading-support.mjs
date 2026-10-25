import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectCueQuestions} from './cue-questions.mjs';

/** Exact support of supplied readings in the retained categorical table.
 * Missing categories cannot exclude a row. No reading is removed or diagnosed.
 */
export function inspectCueReadingSupport(value,readings=[]){
 const study=importCueStudy(value),accepted=inspectCueQuestions(study,readings).readings;
 const all=(1<<study.rows.length)-1,columns=accepted.map(r=>study.cues.findIndex(c=>c.id===r.cueId));
 const excluded=accepted.map((r,j)=>study.rows.reduce((mask,row,i)=>row.values[columns[j]]!==null&&row.values[columns[j]]!==r.value?mask|(1<<i):mask,0));
 const covered=Array(1<<accepted.length).fill(0),minimal=[];
 for(let mask=1;mask<covered.length;mask++){
  const bit=mask&-mask,index=Math.log2(bit);covered[mask]=covered[mask^bit]|excluded[index];
  if(covered[mask]===all&&!minimal.some(prior=>(mask&prior)===prior))minimal.push(mask);
 }
 const rowIndexes=mask=>study.rows.flatMap((_,i)=>mask&(1<<i)?[i]:[]);
 const members=mask=>accepted.flatMap((_,i)=>mask&(1<<i)?[i]:[]);
 const minimalUnsupportedGroups=minimal.map(mask=>{
  const readingIndexes=members(mask);
  return {readingIndexes,cueIds:readingIndexes.map(i=>accepted[i].cueId),
   exampleWitnesses:study.rows.map((row,index)=>({index,decision:row.decision,
    exclusions:readingIndexes.flatMap(j=>row.values[columns[j]]!==null&&row.values[columns[j]]!==accepted[j].value?[{cueId:accepted[j].cueId,suppliedValue:accepted[j].value,retainedValue:row.values[columns[j]]}]:[]),
    unknownCueIds:readingIndexes.filter(j=>row.values[columns[j]]===null).map(j=>accepted[j].cueId)})),
   removalWitnesses:readingIndexes.map(j=>({cueId:accepted[j].cueId,remainingCueIds:readingIndexes.filter(i=>i!==j).map(i=>accepted[i].cueId),compatibleExampleIndexes:rowIndexes(all&~covered[mask^(1<<j)])}))};
 });
 const compatibleExampleIndexes=rowIndexes(all&~covered.at(-1));
 return {readings:accepted,compatibleExampleIndexes,minimalUnsupportedGroups,
  status:!accepted.length?'no-readings':compatibleExampleIndexes.length?'compatible-retained-examples':'unsupported-combination',
  boundary:'These are all inclusion-minimal groups of supplied readings with no compatible retained example. A known unequal category excludes a row; unknown source categories remain compatible and provide no positive support. Removal witnesses concern only the stated group. No reading is identified as faulty or removed, and no physical contradiction, correct action, independent evidence or learning benefit is established.'};
}
