// A fixed declared reference line across selected retained samples. The maintained
// guide evaluator receives a transient geometry projection, never a practice history.
import {importSequencePath,inspectSequencePath} from './sequence-path.mjs';
import {validateCapturedDemo} from './capture.mjs';
import {validateGuideRule,evaluateGuideAlignment} from './guide-alignment.mjs';
export const PATH_GUIDE_FORMAT='skill-translator.path-guide/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function createPathGuide(path,referenceMomentId,rule,fixedGuideInReferencePlane){
 const accepted=importSequencePath(path);
 check(fixedGuideInReferencePlane===true,'Explicitly declare the guide line fixed in the shared reference plane.');
 const sample=accepted.samples.find(s=>s.momentId===referenceMomentId);
 check(sample?.markId!==null&&sample!==undefined,'Choose a selected reference moment with an observed matched point.');
 const moment=accepted.sequence.moments.find(m=>m.id===referenceMomentId),normalized=validateGuideRule(moment.calibratedTask,rule);
 check(normalized.point===sample.markId,'The guide reference point must be the explicitly matched path point in that moment.');
 return {format:PATH_GUIDE_FORMAT,path:accepted,referenceMomentId,rule:normalized,fixedGuideInReferencePlane:true};
}
export function importPathGuide(raw){check(raw?.format===PATH_GUIDE_FORMAT,'Open a complete sampled guide account.');return createPathGuide(raw.path,raw.referenceMomentId,raw.rule,raw.fixedGuideInReferencePlane);}
export function inspectPathGuide(raw){
 const account=importPathGuide(raw),path=inspectSequencePath(account.path),moment=account.path.sequence.moments.find(m=>m.id===account.referenceMomentId),task=moment.calibratedTask,derived=validateCapturedDemo(task),{widthMm,heightMm}=derived.source;
 const anchors=[account.rule.from,account.rule.to].map(id=>{const mark=derived.landmarks.find(m=>m.id===id);return {id,xMm:mark.uv.u*widthMm,yMm:mark.uv.v*heightMm};});
 const samples=path.samples.map(sample=>{
  if(!sample.position)return {momentId:sample.momentId,position:null,status:'missing-observation',observed:null,differenceMm:null};
  const result=evaluateGuideAlignment(task,widthMm,heightMm,[...anchors,{id:account.rule.point,...sample.position}],account.rule);
  return {momentId:sample.momentId,position:sample.position,status:result.status,observed:result.observed,differenceMm:result.differenceMm};
 });
 const referenceFinding=evaluateGuideAlignment(task,widthMm,heightMm,[],account.rule),reference=referenceFinding.reference;
 return {referenceMomentId:account.referenceMomentId,rule:account.rule,anchors,reference,samples,numericalGuardMm:referenceFinding.guardMm,
  observedViolations:samples.filter(s=>s.status==='outside').map(s=>s.momentId),
  selectedEvidenceStatus:samples.some(s=>s.status==='outside')?'outside':samples.every(s=>s.status==='within')?'within-selected-samples':'unresolved',
  path,
  boundary:'The anchors define one explicitly fixed unbounded line in the declared common plane; this does not track a moving physical guide. Offset changes use the maintained geometric guide evaluator and its numerical guard. Missing samples remain unobserved. Agreement at every selected sample cannot establish agreement between frames, contact, safe technique, physical success or learning. No practice history or learner score is created.'};
}
