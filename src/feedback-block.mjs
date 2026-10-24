// Fresh block-feedback course; maintained reducers own placement, judgment and score.
import {GeometryError} from './geometry.mjs';
import {createRehearsal,importRehearsal,inspectRehearsal,placeRehearsal,revealRehearsal,submitRehearsal,advanceRehearsal} from './transfer-rehearsal.mjs';
import {createJudgmentStudy,importJudgmentStudy,replaceJudgmentRehearsal,recordPlacementJudgment,inspectPlacementJudgments} from './rehearsal-judgment.mjs';
export const FEEDBACK_BLOCK_SCHEMA='skill-translator-feedback-block/v1';
export const FEEDBACK_BLOCK_POLICY='review-after-complete-block';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function importFeedbackBlock(raw){
 fail(raw?.schema===FEEDBACK_BLOCK_SCHEMA,'Open a complete feedback-block record; ordinary reviewed rehearsals cannot be reclassified as unseen.');
 fail(raw.policy===FEEDBACK_BLOCK_POLICY,'Feedback policy must remain fixed for the whole fresh block.');
 fail(new TextEncoder().encode(JSON.stringify(raw)).length<=2*1024*1024,'Feedback block exceeds 2 MiB.');
 const study=importJudgmentStudy(raw.study),state=inspectRehearsal(study.rehearsal);let review=null;
 fail(raw.review===null||raw.review&&typeof raw.review==='object'&&!Array.isArray(raw.review),'Retain an explicit absent or final review action.');
 if(raw.review!==null){fail(state.complete&&Number.isInteger(raw.review.atEvent)&&raw.review.atEvent===study.rehearsal.events.length,'Review must occur after the final commitment at its exact action boundary.');review={atEvent:raw.review.atEvent};}
 return {schema:FEEDBACK_BLOCK_SCHEMA,policy:FEEDBACK_BLOCK_POLICY,study,review};
}
export function createFeedbackBlock(source,plan){return importFeedbackBlock({schema:FEEDBACK_BLOCK_SCHEMA,policy:FEEDBACK_BLOCK_POLICY,study:createJudgmentStudy(createRehearsal(source,plan)),review:null});}
function operate(raw,operation){const accepted=importFeedbackBlock(raw);fail(accepted.review===null,'A reviewed block is complete and cannot be revised.');return importFeedbackBlock({...accepted,study:replaceJudgmentRehearsal(accepted.study,operation(accepted.study.rehearsal))});}
export const placeFeedbackBlock=(raw,id,point)=>operate(raw,r=>placeRehearsal(r,id,point));
export const requestFeedbackBlockTargets=raw=>operate(raw,revealRehearsal);
export const commitFeedbackBlock=raw=>operate(raw,submitRehearsal);
export const advanceFeedbackBlock=raw=>operate(raw,advanceRehearsal);
export function judgeFeedbackBlock(raw,prediction,reason=''){const accepted=importFeedbackBlock(raw);fail(accepted.review===null,'A reviewed block is complete and cannot be revised.');return importFeedbackBlock({...accepted,study:recordPlacementJudgment(accepted.study,prediction,reason)});}
export function reviewFeedbackBlock(raw){const accepted=importFeedbackBlock(raw);fail(accepted.review===null,'The final review action is already retained.');fail(inspectRehearsal(accepted.study.rehearsal).complete,'Commit every planned sheet before reviewing block outcomes.');return importFeedbackBlock({...accepted,review:{atEvent:accepted.study.rehearsal.events.length}});}
export function inspectFeedbackBlock(raw){
 const accepted=importFeedbackBlock(raw),state=inspectRehearsal(accepted.study.rehearsal),reviewed=accepted.review!==null;
 const judgments=inspectPlacementJudgments(accepted.study).map(j=>({...j,actualAdequate:reviewed?j.actualAdequate:null,agreement:reviewed?j.agreement:null}));
 return {...state,reviewed,judgments,trials:state.trials.map(t=>({...t,result:reviewed?t.result:null})),limitations:[...state.limitations,'This application defers outcome feedback; source files and other consumers can expose answers. It is not a security or proctoring boundary.','Requested current-sheet targets remain real recorded help. No claim is made about outside help, unseen source knowledge or educational effectiveness.']};
}
export const exportFeedbackBlock=raw=>JSON.stringify(importFeedbackBlock(raw));
// Explicit interoperability export. Standard consumers reveal committed scores.
export const exportScoredRehearsal=raw=>JSON.stringify(importRehearsal(importFeedbackBlock(raw).study.rehearsal));
