/** Actual complete-task attempts returned to their retained demonstrated rules. */
import {inspectRawTask,importRawTask,MAX_RAW_TASK_BYTES} from './raw-task-proposals.mjs';
import {compareDemonstrationPracticeMark} from './demonstration-practice.mjs';
import {importPractice,evaluatePractice} from './practice.mjs';
import {GeometryError} from './geometry.mjs';
export const RAW_TASK_PRACTICE_FORMAT='skill-translator.raw-task-practice/v1';
function bounded(raw){if(new TextEncoder().encode(JSON.stringify(raw)).length>MAX_RAW_TASK_BYTES)throw Error('Complete task and actual practice exceed 2 MB; no source or round was discarded.');}
export function inspectRawTaskPractice(raw,session){
 bounded({task:raw,session});
 const declaredTask=importRawTask(raw),widthMm=session?.reference?.target?.widthMm,heightMm=session?.reference?.target?.heightMm;
 // Reconstruct the source at the actual receiving size; preserve the original
 // planned dimensions in the saved task even when that plan cannot fit.
 const task=inspectRawTask({...declaredTask,target:{widthMm,heightMm}});
 const candidates=[{basis:'original-annotation',source:task.originalSource},...(task.proposedSource?[{basis:'composed-raw-proposals',source:task.proposedSource}]:[])];
 let accepted=null,matched=null,lastError;
 for(const candidate of candidates)try{accepted=importPractice(candidate.source,widthMm,heightMm,session);matched=candidate;break;}catch(error){if(!(error instanceof GeometryError))throw error;lastError=error;}
 if(!accepted)throw lastError||Error('Practice must retain the original task or its complete recomputed proposals.');
 const marks=task.findings.map(finding=>compareDemonstrationPracticeMark(finding,matched.source,accepted,matched.basis));
 const rounds=[...accepted.history,{round:accepted.round,attempts:accepted.attempts}].map(round=>({round:round.round,originalScore:evaluatePractice(matched.source,widthMm,heightMm,round.attempts),marks:marks.map(mark=>{const comparison=mark.rounds.find(r=>r.round===round.round);return {landmarkId:mark.landmarkId,sourceStatus:mark.sourceStatus,status:comparison.status,withinRules:comparison.withinRules};}),unexamined:[...task.unexamined]}));
 const input={format:RAW_TASK_PRACTICE_FORMAT,task:declaredTask,session:accepted};bounded(input);
 return {...input,practiceBasis:matched.basis,marks,rounds,unexamined:task.unexamined,
  boundary:'Every examined mark is compared with all five-rule survivors from its own original demonstrations. Unexamined marks receive no demonstrated-rule assessment. Comparisons use the original positional tolerances, supplied calibration and correspondence. Missing placements and unformable targets remain unassessed. Original whole-task placement scores and all actual rounds remain unchanged. Per-mark agreement does not establish a jointly feasible physical process, expert intention or learning benefit. Additional evidence can change these conditional comparisons without rewriting the retained attempt.'};
}
export function exportRawTaskPractice(raw,session){const result=inspectRawTaskPractice(raw,session);return {format:RAW_TASK_PRACTICE_FORMAT,task:result.task,session:result.session};}
export function importRawTaskPractice(raw){if(raw?.format!==RAW_TASK_PRACTICE_FORMAT)throw Error('Unsupported complete-task practice comparison.');bounded(raw);return inspectRawTaskPractice(raw.task,raw.session);}
