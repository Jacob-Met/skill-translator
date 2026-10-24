// Geometric completion evidence reuses the maintained practice contract.
// An author explicitly binds a check; matching labels never imply identity.
import {momentTask,validateSequence} from './demonstration-sequence.mjs';
import {createPractice,importPractice,evaluatePractice} from './practice.mjs';
export const PRACTICE_EVENT_BYTES=1_000_000;
export function readinessPracticeTask(sequence,stepId,placement){
  const source=validateSequence(sequence),step=source.steps.find(s=>s.id===stepId);
  if(!step||!placement)throw Error('Choose a demonstrated step and declared practice dimensions');
  const demo=momentTask(source,step.afterMomentId);
  const {widthMm,heightMm}=placement;
  // The maintained transfer/practice admission owns valid dimensions and rules.
  createPractice(demo,widthMm,heightMm);
  return {demo,widthMm,heightMm,momentId:step.afterMomentId};
}
export function inspectReadinessPractice(sequence,stepId,placement,input){
  if(new TextEncoder().encode(JSON.stringify(input)).length>PRACTICE_EVENT_BYTES)throw Error('Keep each retained practice session below 1 MB');
  const context=readinessPracticeTask(sequence,stepId,placement);
  const session=importPractice(context.demo,context.widthMm,context.heightMm,input);
  const evaluation=evaluatePractice(context.demo,context.widthMm,context.heightMm,session.attempts);
  const failed=evaluation.results.filter(r=>r.placed&&!r.evaluation.within);
  const value=failed.length?'fail':evaluation.complete?'pass':'unknown';
  const photoIds=new Set(session.photoObservation?.points.map(p=>p.id)||[]),detached=new Set(session.detachedPhotoMarks||[]);
  const results=evaluation.results.map(r=>({...r,provenance:!r.placed?'missing':photoIds.has(r.id)&&!detached.has(r.id)?'retained photo annotation':'manual placement'}));
  return {session,value,evaluation:{...evaluation,results},momentId:context.momentId,
    boundary:'Computed placement tolerances from retained annotations or manual coordinates. This does not establish physical completion, authenticated observation, or mastery.'};
}
