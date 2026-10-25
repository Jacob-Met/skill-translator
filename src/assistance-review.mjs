// Read-only review of the maintained rehearsal's retained target-request events.
// Feedback is available only once a trial has been committed.
import {importRehearsal,inspectRehearsal} from './transfer-rehearsal.mjs';
import {evaluatePractice} from './practice.mjs';

export function createAssistanceReview(raw) {
  // The original producer format is also the export format. Scores are derived.
  return importRehearsal(raw);
}

function compareCheckpoint(before, after) {
  const rows=before.results.map(previous=>{
    const current=after.results.find(row=>row.id===previous.id);
    const paired=previous.placed&&current.placed;
    return {id:previous.id,label:previous.label,
      before:previous.attempt,after:current.attempt,
      beforeErrorMm:previous.evaluation?.errorMm??null,
      afterErrorMm:current.evaluation?.errorMm??null,
      beforeWithin:previous.evaluation?.within??null,
      afterWithin:current.evaluation?.within??null,
      change:!previous.placed?(current.placed?'added_after_request':'still_missing'):
        !current.placed?'missing_at_commit':
        previous.attempt.xMm===current.attempt.xMm&&previous.attempt.yMm===current.attempt.yMm?'unchanged':'moved',
      movementMm:paired?Math.hypot(current.attempt.xMm-previous.attempt.xMm,current.attempt.yMm-previous.attempt.yMm):null,
      errorChangeMm:paired?current.evaluation.errorMm-previous.evaluation.errorMm:null};
  });
  const paired=rows.filter(row=>row.movementMm!==null);
  const rms=key=>paired.length?Math.sqrt(paired.reduce((sum,row)=>sum+row[key]**2,0)/paired.length):null;
  return {rows,pairedCount:paired.length,beforePairedRmsMm:rms('beforeErrorMm'),afterPairedRmsMm:rms('afterErrorMm'),
    added:rows.filter(row=>row.change==='added_after_request').map(row=>row.id),
    missing:rows.filter(row=>row.after===null).map(row=>row.id)};
}

export function inspectAssistanceReview(raw) {
  const accepted=createAssistanceReview(raw),state=inspectRehearsal(accepted);
  const trials=state.trials.map((trial,index)=>{
    const base={index,widthMm:trial.widthMm,heightMm:trial.heightMm,started:trial.started,
      submitted:trial.submitted,requestCount:trial.reveals.length,assistance:trial.assistance};
    if(!trial.submitted)return {...base,result:null,checkpoints:[]};
    return {...base,result:trial.result,checkpoints:trial.reveals.map((reveal,requestIndex)=>{
      const before=evaluatePractice(accepted.source,trial.widthMm,trial.heightMm,reveal.priorAttempts);
      return {requestIndex,actionIndex:reveal.actionIndex,firstRequest:requestIndex===0,
        before,comparison:compareCheckpoint(before,trial.result)};
    })};
  });
  return {trials,complete:state.complete,limitations:[...state.limitations,
    'Before the first target request means only before help recorded here; later checkpoints already follow recorded help.',
    'Changes after a target request do not establish that help caused the change.',
    'Paired error summaries use only marks placed both at that checkpoint and at commitment; missing marks are not zero error.']};
}
