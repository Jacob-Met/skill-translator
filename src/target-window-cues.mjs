import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectCueQuestions} from './cue-questions.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
import {importTargetCueStudy as importEndpointStudy,TARGET_CUE_FORMAT as ENDPOINT_FORMAT} from './target-cue-study.mjs';
export const TARGET_WINDOW_FORMAT='skill-translator.target-window-cues/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
function stepIdentity(source,step){
 const frames=[step.beforeMomentId,step.afterMomentId].map(id=>{const m=source.moments.find(m=>m.id===id);return [m.image.sha256,m.origin.mediaTimeSeconds];});
 return JSON.stringify([source.clip.sha256,...frames]);
}
export function importTargetWindowCues(value){
 check(value?.format===TARGET_WINDOW_FORMAT,'Open a source-bound target cue study');
 check(value.windowDeclaration==='retained-moments-within-step','Declare retained moments inside the original selected step');
 const carrier=importEndpointStudy({...value,format:ENDPOINT_FORMAT,readings:[]});
 const reference=carrier.reference,source=carrier.target.source,step=source.steps.find(s=>s.id===carrier.target.stepId);
 check(step,'Choose a retained target demonstration step');
 const identity=stepIdentity(source,step);
 check(reference.comparison.examples.every(example=>stepIdentity(example.source,example.source.steps.find(s=>s.id===example.stepId))!==identity),'Target before/after evidence must be separate from reference examples; renaming a step does not separate its evidence');
 check(Array.isArray(value.readings)&&value.readings.length<=reference.cues.length,'Retain at most one attributed reading per cue');
 const before=source.moments.find(m=>m.id===step.beforeMomentId),after=source.moments.find(m=>m.id===step.afterMomentId);
 check(before.origin.mediaTimeSeconds<=after.origin.mediaTimeSeconds,'Original step must define a forward presented-time interval');
 const readings=value.readings.map(row=>{
  const moment=source.moments.find(m=>m.id===row?.momentId);
  check(moment&&moment.origin.mediaTimeSeconds>=before.origin.mediaTimeSeconds&&moment.origin.mediaTimeSeconds<=after.origin.mediaTimeSeconds,'Anchor each reading to an original retained moment inside the selected step');
  check(['visible-category','supplied-account'].includes(row.basisKind),'Declare whether the category is a visual interpretation or supplied account');
  check(typeof row.basis==='string'&&row.basis.trim()&&row.basis.length<=1000,'Attribute the reading in at most 1000 characters');
  return {cueId:row.cueId,value:row.value,momentId:row.momentId,basisKind:row.basisKind,basis:row.basis.trim()};
 });
 const normalized=inspectCueQuestions(reference,readings.map(({cueId,value})=>({cueId,value}))).readings;
 return {format:TARGET_WINDOW_FORMAT,windowDeclaration:'retained-moments-within-step',reference,target:{source,stepId:step.id},readings:readings.map((r,i)=>({...r,...normalized[i]}))};
}
export function inspectTargetWindowCues(value){
 const study=importTargetWindowCues(value);
 const report=inspectCueQuestions(study.reference,study.readings.map(({cueId,value})=>({cueId,value})));
 return {report,readings:study.readings.map(row=>({
  ...row,frame:study.target.source.moments.find(m=>m.id===row.momentId),
  categoryBasis:'user-supplied, not inferred from pixels or validated by this comparison',
 })),referenceWasRefitted:false,targetDecisionInferred:false,
 boundary:'Target categories are attributed interpretations anchored to original retained moments inside the original selected step. No endpoints or frames are manufactured. Reference examples and labels are unchanged. Compatible labels describe reference records, not the correct action or outcome in this target situation.'};
}
