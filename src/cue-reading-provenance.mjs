import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectRepeatedReadings} from './cue-repeated-readings.mjs';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export function inspectReadingProvenance(raw,inputs){
 const study=importCueStudy(raw);
 if(!exact(inputs,['maxErrors','basis','entries'])||!Array.isArray(inputs.entries)||inputs.entries.length>30)throw Error('An explicit ordered provenance entry list is required');
 const provenance=inputs.entries.map((entry,index)=>{
  if(!exact(entry,['cue','value','provenance']))throw Error('Reading entry requires cue, value and provenance');
  const p=entry.provenance;
  if(!p||!['hypothetical','source-inspection','unspecified'].includes(p.kind)||typeof p.basis!=='string'||!p.basis.trim()||p.basis.length>1000)throw Error('Explicit provenance kind and basis required');
  if(p.kind!=='source-inspection'){
   if(!exact(p,['kind','basis']))throw Error('Only source inspections may claim an original frame anchor');
   return {index,kind:p.kind,basis:p.basis,meaning:p.kind==='hypothetical'?'Authored hypothetical answer':'Origin not established; not an observed reading'};
  }
  if(!exact(p,['kind','basis','exampleIndex','momentId','frameSha256'])||!Number.isInteger(p.exampleIndex)||p.exampleIndex<0||p.exampleIndex>=study.rows.length)throw Error('Source inspection needs an exact retained example/frame anchor');
  const example=study.comparison.examples[p.exampleIndex],moment=example.source.moments.find(m=>m.id===p.momentId);
  if(!moment||moment.image.sha256!==p.frameSha256)throw Error('Reading anchor differs from original retained frame');
  const step=example.source.steps.find(s=>s.id===example.stepId),role=moment.id===step.beforeMomentId?'before':moment.id===step.afterMomentId?'after':'context';
  return {index,...structuredClone(p),presentedSeconds:moment.origin.mediaTimeSeconds,clipSha256:example.source.clip.sha256,role,meaning:'Observer reports inspecting this retained frame. The category is an authored reading, not verified cue truth or an independent physical trial.'};
 });
 const result=inspectRepeatedReadings(study,{maxErrors:inputs.maxErrors,basis:inputs.basis,readings:inputs.entries.map(({cue,value})=>({cue,value}))});
 return {...result,provenance,counts:Object.fromEntries(['hypothetical','source-inspection','unspecified'].map(kind=>[kind,provenance.filter(p=>p.kind===kind).length])),provenanceBoundary:'All supplied entries are evaluated as one explicitly assumed sequence. Source anchors do not verify categories or make errors independent; mixed provenance remains visible.'};
}
