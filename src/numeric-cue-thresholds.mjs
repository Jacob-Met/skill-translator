import {importDecisionComparison} from './decision-comparison.mjs';
import {validateSequence} from './demonstration-sequence.mjs';

export const NUMERIC_CUE_FORMAT='skill-translator.numeric-cue-thresholds/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const text=(v,label,max=1000)=>{check(typeof v==='string'&&v.trim()&&v.length<=max,`${label} needs attributed text of at most ${max} characters`);return v.trim();};
function interval(v){
 check(Array.isArray(v)&&v.length===2&&v.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e12)&&v[0]<=v[1],'Supply an ordered finite closed reading range within ±1e12');
 return [...v];
}
function stepOf(example){const step=example.source.steps.find(s=>s.id===example.stepId);check(step,'Retain the selected original step');return step;}
function reading(raw,example){
 if(raw===null)return null;
 const step=stepOf(example);
 check(raw&&[step.beforeMomentId,step.afterMomentId].includes(raw.momentId),'Anchor the numeric reading to an original before or after frame');
 return {range:interval(raw.range),momentId:raw.momentId,basis:text(raw.basis,'Reading basis')};
}
function identity(example){const step=stepOf(example);return JSON.stringify([example.source.clip.sha256,...[step.beforeMomentId,step.afterMomentId].map(id=>{const m=example.source.moments.find(m=>m.id===id);return [m.image.sha256,m.origin.mediaTimeSeconds];})]);}
export function importNumericCueStudy(raw){
 check(raw?.format===NUMERIC_CUE_FORMAT,'Open a numeric cue threshold study');
 const comparison=importDecisionComparison(raw.comparison);
 const quantity=text(raw.quantity,'Quantity',160),unit=text(raw.unit,'Common unit',80),basis=text(raw.basis,'Common measurement and range basis');
 check(Array.isArray(raw.rows)&&raw.rows.length===comparison.examples.length,'Retain one numeric row for every original example in order');
 const rows=raw.rows.map((r,i)=>({decision:r.decision===null?null:text(r.decision,'Decision label',160),basis:text(r.basis,'Decision basis'),reading:reading(r.reading,comparison.examples[i])}));
 let target=null;
 if(raw.target!==null&&raw.target!==undefined){
  const example={source:validateSequence(raw.target.source),stepId:raw.target.stepId};stepOf(example);
  check(!comparison.examples.some(e=>identity(e)===identity(example)),'Target evidence must differ from every retained reference interval');
  target={...example,reading:reading(raw.target.reading,example)};
 }
 return {format:NUMERIC_CUE_FORMAT,comparison,quantity,unit,basis,rows,target};
}
// With x < t assigned to the low label, closed reading ranges constrain
// t to (largest low upper bound, smallest high lower bound]. No midpoint.
function fit(rows,indexes){
 const known=indexes.filter(i=>rows[i].decision!==null&&rows[i].reading!==null);
 const missing=indexes.filter(i=>!known.includes(i));
 const labels=[...new Set(known.map(i=>rows[i].decision))].sort();
 if(labels.length!==2)return {status:labels.length>2?'more-than-two-labels':'insufficient-contrast',families:[],missing};
 const families=labels.flatMap(low=>{
  const high=labels.find(label=>label!==low),lowerRows=known.filter(i=>rows[i].decision===low),upperRows=known.filter(i=>rows[i].decision===high);
  const lower=Math.max(...lowerRows.map(i=>rows[i].reading.range[1])),upper=Math.min(...upperRows.map(i=>rows[i].reading.range[0]));
  if(lower>=upper)return [];
  return [{lowLabel:low,highLabel:high,threshold:{lower,upper,lowerOpen:true,upperOpen:false},lowerWitnesses:lowerRows.filter(i=>rows[i].reading.range[1]===lower),upperWitnesses:upperRows.filter(i=>rows[i].reading.range[0]===upper)}];
 });
 return {status:families.length?(missing.length?'compatible-known-subset':'compatible'):'no-compatible-threshold',families,missing};
}
function compare(fitResult,range,rows,indexes){
 if(!range)return {status:'missing-reading',label:null};
 if(!fitResult.families.length)return {status:'no-supported-family',label:null};
 const results=fitResult.families.map(f=>range[1]<=f.threshold.lower?f.lowLabel:range[0]>=f.threshold.upper?f.highLabel:null);
 const label=results[0]!==null&&results.every(v=>v===results[0])?results[0]:null;
 const known=indexes.filter(i=>rows[i].decision!==null&&rows[i].reading!==null);
 const observed=[Math.min(...known.map(i=>rows[i].reading.range[0])),Math.max(...known.map(i=>rows[i].reading.range[1]))];
 return {status:label===null?'unresolved':'unanimous-conditional-label',label,extrapolates:range[0]<observed[0]||range[1]>observed[1],observedRange:observed};
}
export function inspectNumericCueStudy(raw){
 const study=importNumericCueStudy(raw),indexes=study.rows.map((_,i)=>i),findings=fit(study.rows,indexes);
 const omissions=indexes.map(index=>{
  // Entire original clips are withheld, including renamed or overlapping steps.
  const digest=study.comparison.examples[index].source.clip.sha256;
  const omittedIndexes=indexes.filter(i=>study.comparison.examples[i].source.clip.sha256===digest),training=indexes.filter(i=>!omittedIndexes.includes(i));
  const trainingFit=fit(study.rows,training),comparison=compare(trainingFit,study.rows[index].reading?.range,study.rows,training);
  return {index,omittedIndexes,findings:trainingFit,comparison,declaredLabel:study.rows[index].decision,agreement:comparison.label===null||study.rows[index].decision===null?'unassessed':comparison.label===study.rows[index].decision?'same-declared-label':'opposing-declared-label'};
 });
 return {study,findings,omissions,target:study.target?compare(findings,study.target.reading?.range,study.rows,indexes):null,
  boundary:'The declared numeric ranges, common quantity/unit and decision labels are supplied interpretations anchored to original frames, not measurements extracted from pixels. A retained rule must agree with every value in each known source range. Every such single-threshold rule is retained; no threshold is selected. An empty family does not exclude a threshold that fits only some values within the supplied ranges. A unanimous label is conditional agreement with this model and the known reference declarations, not the correct action, a causal explanation, a physical instruction or evidence of skill. Missing evidence is unvalidated; outside-range comparisons extrapolate. Clip withholding does not establish independence or predictive accuracy.'};
}
