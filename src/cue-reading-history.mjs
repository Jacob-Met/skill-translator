import {inspectReadingWithdrawals} from './cue-reading-withdrawals.mjs';
/** Retrospective replay under one declared current budget, not a record of past beliefs. */
export function explainReadingHistory(study,inputs){
 const final=inspectReadingWithdrawals(study,inputs);
 const initial=inspectReadingWithdrawals(study,{...inputs,events:[]});
 let prior=initial.indexes;const stages=[];
 for(let i=0;i<inputs.events.length;i++){
  const current=inspectReadingWithdrawals(study,{...inputs,events:inputs.events.slice(0,i+1)});
  const indexes=[...current.indexes];
  stages.push({eventIndex:i,event:structuredClone(inputs.events[i]),status:current.status,labels:[...current.labels],indexes,entered:indexes.filter(x=>!prior.includes(x)),removed:prior.filter(x=>!indexes.includes(x)),active:current.active.map(x=>({readingId:x.readingId,revision:x.revision})),withdrawnCount:current.withdrawn.length});
  prior=indexes;
 }
 return {initial:{status:initial.status,labels:[...initial.labels],indexes:[...initial.indexes]},stages,final,boundary:'Each event prefix is recomputed under the same currently declared total mismatch bound and retained source. This shows changes in represented possibilities, not past beliefs, physical causes, or verified decision truth. Correction replaces a transcript; withdrawal excludes a reading without erasing its history.'};
}
