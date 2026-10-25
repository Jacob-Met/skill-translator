// An attributed reply is supplied testimony, not authenticated source evidence.
import {importAccountQuestion} from './account-question.mjs';
import {importDecisionComparison} from './decision-comparison.mjs';
import {upsertStep} from './demonstration-sequence.mjs';
import {GeometryError} from './geometry.mjs';
export const ACCOUNT_REPLY_FORMAT='skill-translator.account-reply/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function text(v,label,max){check(typeof v==='string'&&v.trim()&&v.length<=max,`${label} requires text within ${max} characters`);return v.trim();}
export function createAccountReply(comparison,question,input){
 const retained=importAccountQuestion(comparison,question);
 check(retained.exampleIndices.includes(input?.exampleIndex),'Reply must identify an example referenced by the question');
 check(['explanation','proposed-amendment','withdrawal'].includes(input.kind),'Explicitly distinguish explanation from proposed amendment');
 const reply={format:ACCOUNT_REPLY_FORMAT,question:retained,exampleIndex:input.exampleIndex,kind:input.kind,
  answer:text(input.answer,'Supplied answer',2000),suppliedBy:text(input.suppliedBy,'Declared author',160),basis:text(input.basis,'How the answer was supplied',1200)};
 if(input.kind!=='explanation'){
  check(input.authorConfirmed===true,'Explicitly confirm the supplied account amendment');
  if(input.kind==='withdrawal')check(['visibleChange','sensoryCue','recoveryCue'].includes(retained.field),'Only optional source account fields can be withdrawn');
  reply.replacement=input.kind==='withdrawal'?'':text(input.replacement,'Replacement account',1800);reply.authorConfirmed=true;
  const row=importDecisionComparison(comparison).examples[input.exampleIndex],step=row.source.steps.find(s=>s.id===row.stepId);
  check(reply.replacement!==step[retained.field],'A proposed amendment must change the selected account');
 }
 check(new TextEncoder().encode(JSON.stringify(reply)).length<=1024*1024,'Reply exceeds the 1 MiB reopen limit');
 return reply;
}
export function importAccountReply(comparison,value){
 check(value?.format===ACCOUNT_REPLY_FORMAT,'Unsupported account reply format');
 return createAccountReply(comparison,value.question,value);
}
export function inspectAccountReply(comparison,value){
 const original=importDecisionComparison(comparison),reply=importAccountReply(original,value),row=original.examples[reply.exampleIndex],step=row.source.steps.find(s=>s.id===row.stepId);
 const result={reply,originalText:step[reply.question.field],originalSource:row.source,authorIdentityAuthenticated:false};
 if(reply.kind!=='explanation'){
  result.amendedSource=upsertStep(row.source,{...step,[reply.question.field]:reply.replacement});
  result.amendedComparison=importDecisionComparison({...original,examples:original.examples.map((e,i)=>i===reply.exampleIndex?{...e,source:result.amendedSource}:e),relationship:'unresolved',explanation:''});
 }
 return result;
}
