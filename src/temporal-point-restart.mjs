import {receiveTemporalProposal,acceptTrace,initialChoices,correctChoice} from './temporal-point-proposals.mjs';
import {validateChoices} from './temporal-choice-state.mjs';
import {createSequencePath,importSequencePath} from './sequence-path.mjs';
const check=(ok,m)=>{if(!ok)throw Error(m);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export const RESTART_INPUT='skill-translator.temporal-restart-input/v1';
export const RESTART_OUTPUT='skill-translator.temporal-restart-proposals/v1';
export function createRestartRequest(parentReport,choices,anchorMomentId,basis,acceptedParent){
 const parent=receiveTemporalProposal(parentReport),accepted=validateChoices(parent.report.rows,choices),i=accepted.findIndex(c=>c.momentId===anchorMomentId);
 check(i>0&&i<accepted.length-1,'Restart after the first sample and retain at least one later original');
 check(accepted[i].origin==='manual'&&accepted[i].sourcePx,'Apply an explicit authored point correction before restarting');
 check(accepted.slice(0,i).some(c=>c.sourcePx===null),'Retain an explicit missing observation before the restart');
 check(typeof basis==='string'&&basis.trim()&&basis.length<=1200,'Explain the independently authored restart');
 const study=importSequencePath(acceptedParent);
 check(same(study.samples.map(s=>s.momentId),parent.query.momentIds),'Accepted parent selection differs');
 const stripped=structuredClone(study.sequence);
 for(const original of parent.sequence.moments){
  const current=stripped.moments.find(m=>m.id===original.id);check(current,'Accepted original moment missing');
  if(original.calibratedTask){check(current.calibratedTask&&same(current.calibratedTask.landmarks.slice(0,original.calibratedTask.landmarks.length),original.calibratedTask.landmarks),'Earlier original annotations changed');current.calibratedTask.landmarks=structuredClone(original.calibratedTask.landmarks);}
 }
 check(same(stripped,parent.sequence),'Accepted parent changed original source or calibration');
 for(const c of accepted){const sample=study.samples.find(s=>s.momentId===c.momentId),moment=study.sequence.moments.find(m=>m.id===c.momentId),mark=moment.calibratedTask?.landmarks.find(m=>m.id===sample.markId);check(same(mark?.sourcePx??null,moment.calibratedTask?c.sourcePx:null)&&sample.basis===c.basis,'Accepted parent does not retain these authored choices');}
 const request={format:RESTART_INPUT,parentReport:parent.report,choices:accepted,anchorMomentId,basis:basis.trim(),acceptedParent:study};
 check(new TextEncoder().encode(JSON.stringify(request)).length<=48*1024*1024,'Complete restart account exceeds48MiB');return request;
}
export function importRestartRequest(raw){check(raw?.format===RESTART_INPUT,'Open a complete authored restart request');return createRestartRequest(raw.parentReport,raw.choices,raw.anchorMomentId,raw.basis,raw.acceptedParent);}
export function restartProducerInput(raw){
 const request=importRestartRequest(raw),i=request.choices.findIndex(c=>c.momentId===request.anchorMomentId),point=request.choices[i].sourcePx;
 return {format:'skill-translator.temporal-point-input/v1',sourceBundle:{...structuredClone(request.parentReport.sourceBundle),sequence:structuredClone(request.acceptedParent.sequence)},query:{momentIds:request.choices.slice(i).map(c=>c.momentId),anchor:{momentId:request.anchorMomentId,sourcePx:{...point},patchCenterIndex:{x:Math.floor(point.x),y:Math.floor(point.y)}}}};
}
export function receiveRestartProposal(raw){
 check(raw?.format===RESTART_OUTPUT,'Open a complete restart proposal');const request=importRestartRequest(raw.request),expected=restartProducerInput(request),tail=receiveTemporalProposal(raw.proposal);
 check(same(tail.report.sourceBundle,expected.sourceBundle)&&same(tail.query,expected.query),'Returned tail differs from the original restart source or anchor');
 let choices=initialChoices(tail.report);
 // Later independent authored decisions override a newly generated suggestion.
 // Each override retires dependent automatic successors through the maintained API.
 for(const old of request.choices.filter(c=>c.origin==='manual'&&c.momentId!==request.anchorMomentId)){
  if(choices.some(c=>c.momentId===old.momentId))choices=correctChoice(tail.report,choices,old.momentId,old.sourcePx,old.basis);
 }
 return {request,proposal:tail.report,choices,boundary:'New explicitly authored anchor; the retained missing interval remains a gap. Tail appearance proposals require original-frame semantic review.'};
}
export function acceptRestart(raw,tailChoices,options){
 const received=receiveRestartProposal(raw);check(options?.reviewedOriginalFrames===true,'Review every original in the restarted tail');
 const admitted=validateChoices(received.proposal.rows,tailChoices);
 check(same(admitted[0],received.choices[0]),'Restart anchor is fixed by the accepted prefix; author a new restart request to change it');
 // A caller cannot silently discard a retained independent later correction.
 for(const old of received.request.choices.filter(c=>c.origin==='manual'&&c.momentId!==received.request.anchorMomentId)){
  const current=tailChoices.find(c=>c.momentId===old.momentId);if(current)check(current.origin==='manual'&&same(current.sourcePx,old.sourcePx)&&current.basis===old.basis,'Retained independent correction changed; author a new restart request');
 }
 const parent=received.request.acceptedParent;
 check(same(options.reference,parent.reference),'Retain the independently accepted common frame');
 const tail=acceptTrace(received.proposal,tailChoices,options),anchor=received.request.anchorMomentId,i=parent.samples.findIndex(s=>s.momentId===anchor),sequence=structuredClone(parent.sequence),independent=new Set(received.request.choices.filter(c=>c.origin==='manual').map(c=>c.momentId));
 const tailSamples=tail.samples.slice(1).map(sample=>independent.has(sample.momentId)?parent.samples.find(s=>s.momentId===sample.momentId):sample);
 for(const sample of tailSamples)if(!independent.has(sample.momentId)){const m=sequence.moments.find(m=>m.id===sample.momentId),replacement=tail.sequence.moments.find(x=>x.id===m.id);if(replacement.calibratedTask)m.calibratedTask=structuredClone(replacement.calibratedTask);}
 return createSequencePath(sequence,{label:parent.label,reference:parent.reference,samples:[...parent.samples.slice(0,i+1),...tailSamples]});
}
