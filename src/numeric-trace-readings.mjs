import {importInstrumentTrace} from './instrument-trace.mjs';
import {inspectNarrationClock,mapNarrationTime} from './narration-clock.mjs';
import {importDecisionComparison} from './decision-comparison.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
import {NUMERIC_CUE_FORMAT,importNumericCueStudy,inspectNumericCueStudy} from './numeric-cue-thresholds.mjs';

export const NUMERIC_TRACE_FORMAT='skill-translator.numeric-cue-thresholds/v2';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const text=(v,label,max=1000)=>{check(typeof v==='string'&&v.trim()&&v.length<=max,`${label} needs attributed text of at most ${max} characters`);return v.trim();};
const finiteBound=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12;
function clockInput(c){return {anchors:c.anchors.map(p=>({transcriptSeconds:p.instrumentSeconds,clipSeconds:p.clipSeconds})),verification:{transcriptSeconds:c.verification.instrumentSeconds,clipSeconds:c.verification.clipSeconds},toleranceSeconds:c.toleranceSeconds,basis:c.basis};}
function nextUp(x){if(x===0)return Number.MIN_VALUE;const d=new DataView(new ArrayBuffer(8));d.setFloat64(0,x);d.setBigUint64(0,d.getBigUint64(0)+(x>0?1n:-1n));return d.getFloat64(0);}
function rangeFor(value,bounds){
 // Expand nonzero-error arithmetic outward by one representable value. A tiny
 // declared error must not disappear when added to a much larger reading.
 const lower=bounds.below===0?value:-nextUp(-(value-bounds.below));
 const upper=bounds.above===0?value:nextUp(value+bounds.above);
 check(Number.isFinite(lower)&&Number.isFinite(upper)&&lower>=-1e12&&upper<=1e12,'Derived uncertainty range exceeds the numeric cue domain');
 return [lower,upper];
}
export function inspectTraceReading(example,input,{quantity,unit}){
 const source=validateSequence(example.source),step=source.steps.find(s=>s.id===example.stepId);
 check(step,'Retain the original demonstrated step');
 check(input&&typeof input==='object','Retain an instrument trace reading');
 check([step.beforeMomentId,step.afterMomentId].includes(input.momentId),'Anchor the trace reading to the original selected before or after frame');
 const trace=importInstrumentTrace(source,input.trace);
 check(trace.instrument.quantity===quantity&&trace.instrument.unit===unit,'Trace quantity and unit must exactly match the common numeric declaration; no conversion is inferred');
 check(input.sampleIndex===null||(Number.isSafeInteger(input.sampleIndex)&&input.sampleIndex>=0&&input.sampleIndex<trace.samples.length),'Select a retained original sample index or null for automatic exact matching');
 check(input.uncertainty&&finiteBound(input.uncertainty.below)&&finiteBound(input.uncertainty.above),'Declare separate nonnegative measurement-error bounds in the common unit');
 const uncertainty={below:input.uncertainty.below,above:input.uncertainty.above,basis:text(input.uncertainty.basis,'Measurement uncertainty basis')};
 const timingBasis=text(input.timingBasis,'Nominal timing correspondence basis');
 const retained={trace,momentId:input.momentId,sampleIndex:input.sampleIndex,uncertainty,timingBasis};
 const moment=source.moments.find(m=>m.id===input.momentId),clock=clockInput(trace.clock),report=inspectNarrationClock(clock,source.clip.durationSeconds);
 const base={retained,frameTimeSeconds:moment.origin.mediaTimeSeconds,clockCheckPassed:report.checkPassed,matchingIndexes:[],selectedIndex:null,reading:null};
 if(!report.checkPassed)return {...base,status:'clock-check-failed'};
 const matches=[];
 trace.samples.forEach((sample,index)=>{const mapped=mapNarrationTime(clock,source.clip.durationSeconds,sample.timeSeconds);if(!mapped.extrapolated&&mapped.seconds===moment.origin.mediaTimeSeconds)matches.push(index);});
 base.matchingIndexes=matches;
 let index=input.sampleIndex;
 if(index===null){if(matches.length!==1)return {...base,status:matches.length?'ambiguous-exact-matches':'no-exact-match'};index=matches[0];}
 else if(!matches.includes(index))return {...base,status:'selected-sample-does-not-match'};
 const sample=trace.samples[index],range=rangeFor(sample.value,uncertainty);
 return {...base,status:'exact-nominal-match',selectedIndex:index,originalInstrumentTimeSeconds:sample.timeSeconds,recordedValue:sample.value,
  reading:{range,momentId:input.momentId,basis:`Original instrument sample ${index+1} (${sample.timeSeconds}s), nominally mapped to retained frame ${moment.origin.mediaTimeSeconds}s. Full timing, calibration and separately declared measurement uncertainty are retained in the trace reading`}};
}
export function inspectNumericTraceStudy(raw){
 check(raw?.format===NUMERIC_TRACE_FORMAT,'Open a provenance-retaining numeric trace study');
 const comparison=importDecisionComparison(raw.comparison),quantity=text(raw.quantity,'Common quantity',160),unit=text(raw.unit,'Common unit',80),basis=text(raw.basis,'Common comparison basis');
 check(Array.isArray(raw.rows)&&raw.rows.length===comparison.examples.length,'Retain one row per original comparison example');
 const resolutions=[];
 function row(rawRow,example,key){
  check(rawRow&&typeof rawRow==='object','Retain the row declaration');
  if(rawRow.traceReading!==undefined&&rawRow.traceReading!==null){
   check(rawRow.reading===null||rawRow.reading===undefined,'Trace-derived and manually entered readings cannot coexist in one row');
   const r=inspectTraceReading(example,rawRow.traceReading,{quantity,unit});resolutions.push({key,...r});
   return {retained:{reading:null,traceReading:r.retained},derived:r.reading};
  }
  return {retained:{reading:rawRow.reading,traceReading:null},derived:rawRow.reading};
 }
 const rows=raw.rows.map((r,i)=>{const resolved=row(r,comparison.examples[i],i);return {declaration:{decision:r.decision,basis:r.basis},...resolved};});
 let target=null,targetDerived=null;
 if(raw.target!==undefined&&raw.target!==null){const example={source:validateSequence(raw.target.source),stepId:raw.target.stepId},resolved=row(raw.target,example,'target');target={...example,...resolved.retained};targetDerived={...example,reading:resolved.derived};}
 const derived=importNumericCueStudy({format:NUMERIC_CUE_FORMAT,comparison,quantity,unit,basis,rows:rows.map(r=>({...r.declaration,reading:r.derived})),target:targetDerived});
 const study={format:NUMERIC_TRACE_FORMAT,comparison:derived.comparison,quantity:derived.quantity,unit:derived.unit,basis:derived.basis,rows:rows.map((r,i)=>({...r.declaration,...r.retained,decision:derived.rows[i].decision,basis:derived.rows[i].basis,...(r.retained.traceReading?{}:{reading:derived.rows[i].reading})})),target:target?{...target,...(target.traceReading?{}:{reading:derived.target.reading})}:null};
 return {study,derived,report:inspectNumericCueStudy(derived),resolutions,
  boundary:'Trace exports are supplied records, not authenticated measurements. Original source, all samples, calibration narrative and clock declarations remain retained. Exact nominal timestamp coincidence is not proof of synchronization or a bound on timing error. Measurement uncertainty is separately declared; clock residuals never become value error. Missing, ambiguous or unsupported matches supply no numeric reading. No nearest sample or interpolation is used.'};
}
export function importNumericTraceStudy(raw){return inspectNumericTraceStudy(raw).study;}
