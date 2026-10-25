import {importAccountQuestion} from './account-question.mjs';
import {importAccountReply,inspectAccountReply,ACCOUNT_REPLY_FORMAT} from './account-reply.mjs';
import {GeometryError} from './geometry.mjs';
export const REPLY_COMPARISON_FORMAT='skill-translator.reply-comparison/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const dense=rows=>Array.isArray(rows)&&rows.length>=2&&rows.length<=6&&Array.from({length:rows.length},(_,i)=>Object.hasOwn(rows,i)).every(Boolean);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function createReplyComparison(comparison,question,replies){
 const retained=importAccountQuestion(comparison,question);
 check(dense(replies),'Compare two to six attributed replies');
 const seen=new Set();
 const rows=replies.map(value=>{
  const accepted=importAccountReply(comparison,value);
  check(same(accepted.question,retained),'Every reply must answer the exact same retained question');
  const {question:ignored,format,...row}=accepted,key=JSON.stringify(row);
  check(!seen.has(key),'The identical supplied reply is already retained');seen.add(key);return row;
 });
 const result={format:REPLY_COMPARISON_FORMAT,question:retained,replies:rows};
 check(new TextEncoder().encode(JSON.stringify(result)).length<=1024*1024,'Reply comparison exceeds the 1 MiB reopen limit');
 return result;
}
export function importReplyComparison(comparison,value){
 check(value?.format===REPLY_COMPARISON_FORMAT,'Unsupported reply comparison format');
 check(dense(value.replies),'Retain two to six complete original replies');
 return createReplyComparison(comparison,value.question,value.replies.map(row=>({...row,format:ACCOUNT_REPLY_FORMAT,question:value.question})));
}
export function inspectReplyComparison(comparison,value){
 const accepted=importReplyComparison(comparison,value);
 return {source:accepted,alternatives:accepted.replies.map(row=>inspectAccountReply(comparison,{...row,format:ACCOUNT_REPLY_FORMAT,question:accepted.question})),
  authorIdentityAuthenticated:false,preferredReply:null,semanticAgreementEstablished:false};
}
export function selectComparedReply(comparison,value,index){
 const accepted=importReplyComparison(comparison,value);
 check(Number.isInteger(index)&&index>=0&&index<accepted.replies.length,'Choose an existing reply explicitly');
 return importAccountReply(comparison,{...accepted.replies[index],format:ACCOUNT_REPLY_FORMAT,question:accepted.question});
}
