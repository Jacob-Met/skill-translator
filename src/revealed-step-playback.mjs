import {importCuePractice,inspectCuePractice} from './cue-practice.mjs';
export function revealedStepInterval(source,session){
 const accepted=importCuePractice(source,session),findings=inspectCuePractice(source,accepted),state=findings.steps[findings.currentIndex];
 if(!state?.revealed)return null;
 const step=accepted.source.steps.find(s=>s.id===state.id),before=accepted.source.moments.find(m=>m.id===step.beforeMomentId),after=accepted.source.moments.find(m=>m.id===step.afterMomentId);
 const startSeconds=before.origin.mediaTimeSeconds,endSeconds=after.origin.mediaTimeSeconds;
 if(!Number.isFinite(startSeconds)||!Number.isFinite(endSeconds)||startSeconds<0||endSeconds<=startSeconds||endSeconds>accepted.source.clip.durationSeconds)throw Error('The complete revealed step must lie inside its original clip.');
 return {stepId:step.id,startSeconds,endSeconds,beforeMomentId:before.id,afterMomentId:after.id,clip:structuredClone(accepted.source.clip)};
}
