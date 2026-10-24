import {validateSequence} from './demonstration-sequence.mjs';
import {createPrerequisiteRehearsal} from './prerequisite-rehearsal.mjs';
import {GeometryError} from './geometry.mjs';
export const ORDER_FORMAT='skill-translator.order-evidence/v1';
export const MAX_ORDER_SOURCES=8;
const check=(ok,text)=>{if(!ok)throw new GeometryError(text);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const sameOrderSource=(a,b)=>JSON.stringify(canonical(validateSequence(a)))===JSON.stringify(canonical(validateSequence(b)));
function evidenceKey(s){
 const byId=new Map(s.moments.map(m=>[m.id,m]));
 const stamp=m=>[m.image.sha256,m.image.widthPx,m.image.heightPx,m.origin.mediaTimeSeconds];
 return JSON.stringify({clip:[s.clip.sha256,s.clip.mimeType,s.clip.sizeBytes,s.clip.durationSeconds],moments:s.moments.map(stamp),steps:s.steps.map(x=>[stamp(byId.get(x.beforeMomentId)),stamp(byId.get(x.afterMomentId))]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
}
export function createOrderStudy(reference,comparisons=[]){
 const source=validateSequence(reference);check(source.steps.length>=2,'The reference needs at least two authored steps.');
 check(Array.isArray(comparisons)&&comparisons.length<MAX_ORDER_SOURCES,'Compare at most seven additional demonstrations.');
 const ids=new Set(),evidence=new Set([evidenceKey(source)]),referenceIds=new Set(source.steps.map(s=>s.id));
 const accepted=comparisons.map(c=>{
  check(c&&typeof c.id==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(c.id)&&c.id!=='reference'&&!ids.has(c.id),'Comparison identities must be distinct short identifiers.');ids.add(c.id);
  const sequence=validateSequence(c.sequence),key=evidenceKey(sequence);check(!evidence.has(key),'These retained frames and step intervals are already included.');evidence.add(key);
  check(typeof c.label==='string'&&c.label.trim()&&c.label.length<=160,'Name the comparison in at most 160 characters.');
  check(Array.isArray(c.matches)&&c.matches.length<=source.steps.length,'Supply explicit step correspondences.');
  const refs=new Set(),targets=new Set(),targetIds=new Set(sequence.steps.map(s=>s.id));
  const matches=c.matches.map(m=>{check(m&&referenceIds.has(m.referenceStepId)&&targetIds.has(m.comparisonStepId)&&!refs.has(m.referenceStepId)&&!targets.has(m.comparisonStepId),'Match each reference and comparison step at most once; unavailable steps cannot be matched.');refs.add(m.referenceStepId);targets.add(m.comparisonStepId);return {referenceStepId:m.referenceStepId,comparisonStepId:m.comparisonStepId};});
  return {id:c.id,label:c.label.trim(),sequence,matches};
 });
 return {format:ORDER_FORMAT,reference:source,comparisons:accepted};
}
export function importOrderStudy(value){check(value?.format===ORDER_FORMAT&&Array.isArray(value.comparisons),'Open a complete order-evidence study.');return createOrderStudy(value.reference,value.comparisons);}
export function orderEvidenceFindings(value){
 const study=importOrderStudy(value),sources=[{id:'reference',label:study.reference.title,sequence:study.reference,matches:study.reference.steps.map(s=>({referenceStepId:s.id,comparisonStepId:s.id}))},...study.comparisons];
 const rows=sources.map(s=>{const moments=new Map(s.sequence.moments.map(m=>[m.id,m]));const spans=new Map(s.sequence.steps.map(step=>{const before=moments.get(step.beforeMomentId),after=moments.get(step.afterMomentId);return [step.id,{stepId:step.id,beforeMomentId:before.id,afterMomentId:after.id,start:before.origin.mediaTimeSeconds,end:after.origin.mediaTimeSeconds}];}));return {...s,mapped:new Map(s.matches.map(m=>[m.referenceStepId,spans.get(m.comparisonStepId)]))};});
 const pairs=[];
 for(let i=0;i<study.reference.steps.length;i++)for(let j=i+1;j<study.reference.steps.length;j++){
  const a=study.reference.steps[i].id,b=study.reference.steps[j].id;
  const witnesses=rows.map(row=>{const left=row.mapped.get(a)??null,right=row.mapped.get(b)??null;return {sourceId:row.id,label:row.label,a:left,b:right,relation:!left||!right?'unmapped':left.end<=right.start?'a-before-b':right.end<=left.start?'b-before-a':'overlap'};});
  const directions=witnesses.map(w=>w.relation),enough=rows.length>=2;
  const candidate=!enough?null:directions.every(x=>x==='a-before-b')?{before:a,after:b}:directions.every(x=>x==='b-before-a')?{before:b,after:a}:null;
  pairs.push({a,b,witnesses,candidate,oppositeOrders:directions.includes('a-before-b')&&directions.includes('b-before-a'),unresolved:!enough||directions.some(x=>x==='unmapped'||x==='overlap')});
 }
 return {pairs,sourceCount:rows.length,boundary:'These are intervals between retained before and after frames, not measured action durations. A shared endpoint counts as at-or-before. Agreement across supplied examples is observed chronology, not causal necessity, verified success, independent sampling or physical skill.'};
}
export function declareOrderPrerequisites(value,declarations){
 const study=importOrderStudy(value),findings=orderEvidenceFindings(study);
 check(Array.isArray(declarations)&&declarations.length>0&&declarations.length<=276,'Select at least one supported order and supply its prerequisite reason.');
 for(const d of declarations)check(d&&findings.pairs.some(p=>p.candidate?.before===d.before&&p.candidate?.after===d.after),'A selected order is not unanimous across the supplied mapped intervals.');
 return createPrerequisiteRehearsal(study.reference,declarations);
}
