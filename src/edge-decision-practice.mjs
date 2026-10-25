import {importEdgeStudy} from './sequence-edge-study.mjs';
import {createDecisionPractice,importDecisionPractice,recordDecisionAction,decisionPracticeFindings} from './decision-practice.mjs';
export const EDGE_DECISION='skill-translator.edge-decision-practice/v1';
export function createEdgeDecisionPractice(study,stepId,priorFamiliarity='unspecified'){
 const accepted=importEdgeStudy(study),practice=createDecisionPractice(accepted.sequence,[stepId],priorFamiliarity);
 return {format:EDGE_DECISION,study:accepted,stepId:practice.stepIds[0],priorFamiliarity:practice.priorFamiliarity,events:[]};
}
function replay(raw){
 if(raw?.format!==EDGE_DECISION)throw Error('Open an edge-supported decision exercise');
 const base=createEdgeDecisionPractice(raw.study,raw.stepId,raw.priorFamiliarity),source=base.study.sequence;
 if(!Array.isArray(raw.events)||raw.events.length>64)throw Error('The exercise retains at most64 source-bound actions');
 let practice=createDecisionPractice(source,[base.stepId],base.priorFamiliarity);const events=[],disclosures=[],candidateInspections=[];
 const step=source.steps.find(s=>s.id===base.stepId);
 for(const event of raw.events){
  if(event?.type==='inspect-edge-evidence'){
   const state=decisionPracticeFindings(source,practice).steps[0],anchor=event.anchor;
   if(event.stepId!==base.stepId||!['before','after'].includes(anchor)||disclosures.some(d=>d.anchor===anchor))throw Error('Request each source anchor once for the chosen step');
   if(anchor==='after'&&!state.revealed)throw Error('Reveal the source before inspecting after-frame evidence');
   const momentId=step[anchor+'MomentId'],entry=base.study.entries.find(e=>e.report.momentId===momentId);
   disclosures.push({anchor,momentId,beforeAnswer:!state.response,available:!!entry,status:entry?.selection.status??'uninspected'});
   events.push({type:'inspect-edge-evidence',stepId:base.stepId,anchor});
  }else if(event?.type==='inspect-edge-candidate'){
   if(candidateInspections.length>=59)throw Error('At most59 explicit candidate inspections; remaining slots preserve both disclosures and the complete prediction/reveal/reflection path');
   const disclosure=disclosures.find(d=>d.anchor===event.anchor);
   if(event.stepId!==base.stepId||!disclosure)throw Error('Disclose this source report before inspecting a candidate');
   const entry=base.study.entries.find(e=>e.report.momentId===disclosure.momentId);
   if(!entry?.report.candidates.some(c=>c.id===event.segmentId))throw Error('Choose an original candidate from the disclosed report');
   const state=decisionPracticeFindings(source,practice).steps[0];
   candidateInspections.push({anchor:event.anchor,momentId:disclosure.momentId,segmentId:event.segmentId,beforeAnswer:!state.response});
   events.push({type:'inspect-edge-candidate',stepId:base.stepId,anchor:event.anchor,segmentId:event.segmentId});
  }else{
   if(!['answer','reveal','reflect'].includes(event?.type))throw Error('Use the maintained prediction, reveal or self-comparison action');
   practice=recordDecisionAction(source,practice,event);events.push(structuredClone(practice.events.at(-1)));
  }
 }
 const findings=decisionPracticeFindings(source,importDecisionPractice(source,practice));
 return {session:{...base,events},practice,findings:{...findings,disclosures,candidateInspections,
  boundary:'Disclosures record interface assistance, not verified attention or authenticated chronology. Observer labels and selected/rejected/unreviewed detector reports are evidence to inspect, not an answer key. Crossings and pixel-support gaps do not establish contact, physical edge absence or persistent identity.'}};
}
export const importEdgeDecisionPractice=raw=>replay(raw).session;
export const inspectEdgeDecisionPractice=raw=>replay(raw).findings;
export function recordEdgeDecisionAction(raw,action){const accepted=importEdgeDecisionPractice(raw);return importEdgeDecisionPractice({...accepted,events:[...accepted.events,structuredClone(action)]});}

// Transient maintained-reducer projection for composed reviewers; never export this without the complete edge exercise.
export const edgeDecisionBasePractice=raw=>replay(raw).practice;
