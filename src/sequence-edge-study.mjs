import {validateSequence,MAX_MOMENTS} from './demonstration-sequence.mjs';
import {createSequenceEdge} from './sequence-edge.mjs';
export const EDGE_STUDY='skill-translator.sequence-edge-study/v1';
/** Independent source-frame evidence. Sorting follows original retained moments;
 * no association, motion or continuous observation is synthesized. */
export function createEdgeStudy(sequence,entries){
 const source=validateSequence(sequence);
 if(!Array.isArray(entries)||entries.length>MAX_MOMENTS)throw Error('Retain at most one edge report per original moment');
 const byId=new Map();
 for(const entry of entries){
  if(!entry||Object.keys(entry).sort().join(',')!=='report,selection')throw Error('Retain only report and separate observer selection');
  const account=createSequenceEdge(source,entry.report,entry.selection),id=account.report.momentId;
  if(byId.has(id))throw Error('A moment has more than one active edge report');
  byId.set(id,{report:account.report,selection:account.selection});
 }
 return {format:EDGE_STUDY,sequence:source,entries:source.moments.filter(m=>byId.has(m.id)).map(m=>byId.get(m.id))};
}
export function importEdgeStudy(raw){
 if(raw?.format!==EDGE_STUDY)throw Error('Open a supported source-edge study');
 return createEdgeStudy(raw.sequence,raw.entries);
}
export function inspectEdgeStudy(raw){
 const study=importEdgeStudy(raw),byId=new Map(study.entries.map(e=>[e.report.momentId,e]));
 const moments=study.sequence.moments.map(m=>{const entry=byId.get(m.id);return {momentId:m.id,label:m.label,presentedSeconds:m.origin.mediaTimeSeconds,status:entry?.selection.status??'uninspected',featureLabel:entry?.selection.label??'',identity:entry?.selection.identity??'unspecified',candidateCount:entry?.report.candidates.length??null};});
 const observations=new Map(moments.map(m=>[m.momentId,m]));
 return {moments,steps:study.sequence.steps.map(s=>({stepId:s.id,title:s.title,authoredVisibleChange:s.visibleChange,before:observations.get(s.beforeMomentId),after:observations.get(s.afterMomentId)})),boundary:'Each review concerns one retained frame. Step descriptions and feature labels remain authored. Missing moments are uninspected; no persistent feature identity, continuous path, physical contact or action success is inferred.'};
}
