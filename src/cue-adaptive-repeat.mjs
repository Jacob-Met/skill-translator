import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectReadingWithdrawals} from './cue-reading-withdrawals.mjs';
import {adaptiveRepeatPolicy} from './adaptive-repeat-core.mjs';
export function planAdaptiveCueReadings(raw,inputs,planning){
 if(!planning||typeof planning!=='object'||Array.isArray(planning)||Object.keys(planning).sort().join(',')!=='basis,maxAdditional'||typeof planning.basis!=='string'||!planning.basis.trim()||planning.basis.length>1000||!Number.isInteger(planning.maxAdditional)||planning.maxAdditional<0||planning.maxAdditional>6)throw Error('Declare a planning basis and at most six future readings');
 const study=importCueStudy(raw),account=inspectReadingWithdrawals(study,inputs);
 const retained=account.rows.filter(r=>r.compatible).map(r=>({index:r.index,values:[...study.rows[r.index].values],decision:study.rows[r.index].decision,remaining:inputs.maxErrors-r.disagreements.length}));
 const plan=adaptiveRepeatPolicy(retained,study.cues.length,planning.maxAdditional);
 const historyCapacity={newIdentities:30-inputs.events.filter(e=>e.kind==='record').length,newEvents:90-inputs.events.length};
 historyCapacity.maximumNewReadings=Math.min(historyCapacity.newIdentities,historyCapacity.newEvents);
 plan.historyCapacity=historyCapacity;
 if(plan.policy&&plan.minimumWorstAdditional>historyCapacity.maximumNewReadings){plan.status='insufficient-history-capacity';plan.policy=null;}
 function bind(node){
  if(node.depth===0)return {...node,retained:node.retained.map(i=>retained[i].index)};
  return {...node,cue:study.cues[node.cue].id,label:study.cues[node.cue].label,branches:node.branches.map(b=>b.next?{...b,next:bind(b.next)}:{...b})};
 }
 return {...plan,policy:plan.policy?bind(plan.policy):null,planning:structuredClone(planning),retained:retained.map(r=>({index:r.index,decision:r.decision,remaining:r.remaining})),boundary:'This adaptive hypothetical policy uses one declared TOTAL mismatch bound, including active past readings. A repeated inspection is not assumed independent or more physically reliable. Guarantees concern represented decisions only while at least one retained example fits all answers. Unknown source cells remain compatible without confirming an answer; outside-evidence branches remain outside evidence. This is neither an effort-optimal policy nor a physical instruction.'};
}

/** Replay supplied answers against one frozen baseline and horizon; never refill it. */
export function executeAdaptiveCueReadings(raw,inputs,planning,answers){
 if(!Array.isArray(answers)||answers.length>6)throw Error('At most six explicit policy answers required');
 const study=importCueStudy(raw),plan=planAdaptiveCueReadings(study,inputs,planning);
 if(answers.length>planning.maxAdditional)throw Error('Declared future-reading horizon exhausted');
 const current=structuredClone(inputs),steps=[];let node=plan.policy;
 function fresh(prefix){let n=0;while(current.events.some(e=>e.id===prefix+n||e.readingId===prefix+n))n++;return prefix+n;}
 for(const [i,answer]of answers.entries()){
  if(!node||node.depth===0)throw Error('No further question in this policy');
  if(!answer||typeof answer!=='object'||Array.isArray(answer)||Object.keys(answer).sort().join(',')!=='cue,provenance,value'||answer.cue!==node.cue)throw Error('Answer must address the current policy cue with explicit provenance');
  const event={id:fresh('adaptive-event-'),readingId:fresh('adaptive-reading-'),kind:'record',entry:structuredClone(answer)};
  current.events.push(event);const account=inspectReadingWithdrawals(study,current);
  const branch=node.branches.find(b=>!b.other&&b.answer===answer.value)??node.branches.find(b=>b.other);
  if(!branch)throw Error('Policy answer branch missing');
  node=branch.next??null;
  steps.push({position:i,event:structuredClone(event),outsideEvidence:!!branch.outsideEvidence,indexes:account.indexes,labels:account.labels});
 }
 const account=inspectReadingWithdrawals(study,current);
 return {plan,node,account,steps,used:answers.length,remainingHorizon:planning.maxAdditional-answers.length,
  status:!plan.policy?plan.status:!node?'outside-evidence':node.depth===0?'decision-resolved':'question-ready',
  boundary:'Each supplied answer is a new reading and spends one position from the original declared future horizon. Baseline corrections and withdrawals remain retained. Revising that baseline requires a separate new policy; replay never refills the horizon or treats repeated answers as independent.'};
}
