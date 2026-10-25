import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectCueQuestions} from './cue-questions.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
export const TARGET_CUE_FORMAT='skill-translator.target-cue-study/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
function stepIdentity(source,step){
 const frames=[step.beforeMomentId,step.afterMomentId].map(id=>{const m=source.moments.find(m=>m.id===id);return [m.image.sha256,m.origin.mediaTimeSeconds];});
 return JSON.stringify([source.clip.sha256,...frames]);
}
export function importTargetCueStudy(value){
 check(value?.format===TARGET_CUE_FORMAT,'Open a source-bound target cue study');
 const reference=importCueStudy(value.reference),source=validateSequence(value.target?.source),step=source.steps.find(s=>s.id===value.target.stepId);
 check(step,'Choose a retained target demonstration step');
 const identity=stepIdentity(source,step);
 check(reference.comparison.examples.every(example=>stepIdentity(example.source,example.source.steps.find(s=>s.id===example.stepId))!==identity),'Target before/after evidence must be separate from reference examples; renaming a step does not separate its evidence');
 check(Array.isArray(value.readings)&&value.readings.length<=reference.cues.length,'Retain at most one attributed reading per cue');
 const readings=value.readings.map(row=>{
  check(row&&[step.beforeMomentId,step.afterMomentId].includes(row.momentId),'Anchor each reading to the selected target before or after frame');
  check(['visible-category','supplied-account'].includes(row.basisKind),'Declare whether the category is a visual interpretation or supplied account');
  check(typeof row.basis==='string'&&row.basis.trim()&&row.basis.length<=1000,'Attribute the reading in at most 1000 characters');
  return {cueId:row.cueId,value:row.value,momentId:row.momentId,basisKind:row.basisKind,basis:row.basis.trim()};
 });
 const normalized=inspectCueQuestions(reference,readings.map(({cueId,value})=>({cueId,value}))).readings;
 return {format:TARGET_CUE_FORMAT,reference,target:{source,stepId:step.id},readings:readings.map((r,i)=>({...r,...normalized[i]}))};
}
export function inspectTargetCueStudy(value){
 const study=importTargetCueStudy(value);
 const report=inspectCueQuestions(study.reference,study.readings.map(({cueId,value})=>({cueId,value})));
 return {report,readings:study.readings.map(row=>({
  ...row,frame:study.target.source.moments.find(m=>m.id===row.momentId),
  categoryBasis:'user-supplied, not inferred from pixels or validated by this comparison',
 })),referenceWasRefitted:false,targetDecisionInferred:false,
 boundary:'Target categories are attributed interpretations of separate retained evidence. Reference examples and labels are unchanged. Compatible labels describe reference records, not the correct action or outcome in this target situation.'};
}
