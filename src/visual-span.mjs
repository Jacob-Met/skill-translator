import {inspectVisualScan,compareSamplePixels} from './visual-scan.mjs';
/** Separate endpoint evidence from the complete sampled appearance path. */
export function inspectVisualSpan(plan,samples,{firstIndex,lastIndex}){
 const scan=inspectVisualScan(plan,samples);
 if(!Number.isInteger(firstIndex)||!Number.isInteger(lastIndex)||firstIndex<0||lastIndex>=scan.frames.length||lastIndex<=firstIndex)throw Error('Choose distinct chronological sampled endpoints within this scan');
 const before=scan.frames[firstIndex],after=scan.frames[lastIndex],intervals=scan.intervals.slice(firstIndex,lastIndex);
 let endpoint;
 if(before.status!=='sampled'||after.status!=='sampled')endpoint={status:'missing-frame'};
 else if(after.presentedSeconds<=before.presentedSeconds)endpoint={status:after.presentedSeconds===before.presentedSeconds?'same-presented-frame':'out-of-order-frame'};
 else if(before.widthPx!==after.widthPx||before.heightPx!==after.heightPx)endpoint={status:'changed-frame-size'};
 else endpoint={status:'compared',elapsedSeconds:after.presentedSeconds-before.presentedSeconds,...compareSamplePixels(samples[firstIndex],samples[lastIndex])};
 const compared=intervals.filter(i=>i.status==='compared'),knownRawChange=compared.reduce((sum,i)=>sum+i.meanAbsoluteChange,0);
 return {plan:scan.plan,firstIndex,lastIndex,before,after,endpoint,intervals,
  adjacent:{comparedCount:compared.length,totalCount:intervals.length,complete:compared.length===intervals.length,knownRawChange,totalRawChange:compared.length===intervals.length?knownRawChange:null},
  boundary:'Endpoint appearance and the sum of sampled adjacent raw RGB changes answer different questions. An unchanged endpoint can accompany substantial intervening appearance changes. Missing or reversed samples prevent a complete sampled-path sum. Neither value measures physical motion, action boundaries, task completion, contact, force or skill; intervening unsampled frames and details lost in resizing remain unknown.'};
}
