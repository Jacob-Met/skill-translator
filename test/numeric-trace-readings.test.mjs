import test from 'node:test';import assert from 'node:assert/strict';
import {source} from './helpers/numeric-cue-fixture.mjs';
import {NUMERIC_TRACE_FORMAT,inspectTraceReading,inspectNumericTraceStudy,importNumericTraceStudy} from '../src/numeric-trace-readings.mjs';
import {importNumericCueStudy} from '../src/numeric-cue-thresholds.mjs';
function example(i=0){const s=source(),digest=String(i+1).repeat(64);s.clip.sha256=digest;for(const m of s.moments)m.origin.clip.sha256=digest;return {source:s,stepId:'step-1'};}
function selection(e,value=2){return {trace:{format:'skill-translator.instrument-trace/v1',source:structuredClone(e.source),evidenceClass:'authored-example',instrument:{name:'Authored scalar instrument',quantity:'clearance',unit:'mm',calibrationBasis:'Authored source control, not measured calibration'},samples:[{timeSeconds:100,value},{timeSeconds:100.5,value:value+1},{timeSeconds:101,value:value+2}],clock:{anchors:[{instrumentSeconds:100,clipSeconds:1},{instrumentSeconds:104,clipSeconds:9}],verification:{instrumentSeconds:102,clipSeconds:5},toleranceSeconds:.01,basis:'Authored timing controls'},settings:{threshold:0,direction:'at-or-above',maximumGapSeconds:1,minimumSamples:2}},momentId:'moment-1',sampleIndex:null,uncertainty:{below:.1,above:.1,basis:'Separately supplied absolute value-error bound'},timingBasis:'Exact nominal timestamps compared; no synchronization accuracy claimed'};}
function study(){const examples=[0,1,2,3].map(example);return {format:NUMERIC_TRACE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples},quantity:'clearance',unit:'mm',basis:'Common supplied quantity, no unit conversion',rows:examples.map((e,i)=>({decision:i<2?'hold':'change',basis:'Authored decision',reading:null,traceReading:selection(e,[1,2,5,6][i])})),target:{...example(4),reading:null,traceReading:selection(example(4),5.3)}};}
test('existing trace exports supply exact original samples without value re-entry and retain every provenance field',()=>{
 const raw=study(),before=JSON.stringify(raw),r=inspectNumericTraceStudy(raw);
 assert.equal(r.resolutions.length,5);assert.ok(r.resolutions.every(x=>x.status==='exact-nominal-match'&&x.selectedIndex===0));assert.equal(r.report.target.label,'change');
 assert.equal(r.report.findings.families.length,1);const t=r.report.findings.families[0].threshold;assert.ok(t.lower>=2.1&&t.lower<2.100000000000002);assert.ok(t.upper<=4.9&&t.upper>4.899999999999998);
 assert.equal(JSON.stringify(raw),before);assert.deepEqual(r.study,raw);assert.deepEqual(importNumericTraceStudy(JSON.parse(JSON.stringify(r.study))),raw);assert.throws(()=>importNumericCueStudy(raw),/Unsupported|Open a numeric/);
});
test('all readings recompute from retained trace/index rather than forged copied values or results',()=>{
 const raw=study();raw.findings={status:'compatible'};raw.rows[0].traceReading.recordedValue=999;raw.target.traceReading.range=[-1,-1];const r=inspectNumericTraceStudy(raw);assert.equal(r.resolutions[0].recordedValue,1);assert.equal(r.report.target.label,'change');
 raw.target.traceReading.trace.samples[0].value=1.5;assert.equal(inspectNumericTraceStudy(raw).report.target.label,'hold');
 raw.rows[0].reading={range:[1,1],momentId:'moment-1',basis:'forged parallel manual reading'};assert.throws(()=>inspectNumericTraceStudy(raw),/cannot coexist/);
});
test('failed, absent and ambiguous nominal timing remains unsupported without nearest-sample interpolation',()=>{
 const e=example(),raw=selection(e),q={quantity:'clearance',unit:'mm'};
 raw.trace.clock.verification.clipSeconds=5.2;assert.equal(inspectTraceReading(e,raw,q).status,'clock-check-failed');
 raw.trace.clock.verification.clipSeconds=5;raw.trace.samples[0].timeSeconds=100.1;assert.equal(inspectTraceReading(e,raw,q).status,'no-exact-match');
 raw.sampleIndex=1;assert.equal(inspectTraceReading(e,raw,q).status,'selected-sample-does-not-match');
 const ambiguous=selection(e);ambiguous.trace.clock={anchors:[{instrumentSeconds:0,clipSeconds:1},{instrumentSeconds:21600,clipSeconds:1+Number.EPSILON}],verification:{instrumentSeconds:50,clipSeconds:1},toleranceSeconds:0,basis:'Authored representable-time collapse control'};
 const r=inspectTraceReading(e,ambiguous,q);assert.equal(r.status,'ambiguous-exact-matches');assert.deepEqual(r.matchingIndexes,[0,1,2]);assert.equal(r.reading,null);
 ambiguous.sampleIndex=2;const chosen=inspectTraceReading(e,ambiguous,q);assert.equal(chosen.selectedIndex,2);assert.equal(chosen.recordedValue,4);assert.deepEqual(chosen.matchingIndexes,[0,1,2]);
});
test('unsupported trace rows remain raw and explicitly unassessed rather than silently dropped',()=>{
 const raw=study();raw.rows[0].traceReading.trace.clock.verification.clipSeconds=5.2;raw.target.traceReading.trace.samples[0].timeSeconds=100.1;const r=inspectNumericTraceStudy(raw);
 assert.equal(r.study.rows.length,4);assert.deepEqual(r.study.rows[0].traceReading.trace,raw.rows[0].traceReading.trace);assert.equal(r.derived.rows[0].reading,null);assert.equal(r.report.findings.status,'compatible-known-subset');assert.deepEqual(r.report.findings.missing,[0]);assert.equal(r.report.target.status,'missing-reading');assert.equal(r.resolutions.at(-1).status,'no-exact-match');
});
test('separate value uncertainty expands outward, never from clock residual, with tiny errors preserved',()=>{
 const e=example(),raw=selection(e,1e10),q={quantity:'clearance',unit:'mm'};raw.uncertainty={below:1e-10,above:1e-10,basis:'Tiny authored bound'};let r=inspectTraceReading(e,raw,q);assert.ok(r.reading.range[0]<1e10);assert.ok(r.reading.range[1]>1e10);
 raw.uncertainty={below:0,above:0,basis:'Exact recorded-value model, not physical certainty'};raw.trace.clock.toleranceSeconds=1;raw.trace.clock.verification.clipSeconds=5.5;r=inspectTraceReading(e,raw,q);assert.deepEqual(r.reading.range,[1e10,1e10]);
 for(const change of [s=>s.uncertainty.below=-1,s=>s.uncertainty.above=NaN,s=>s.uncertainty.basis='',s=>s.timingBasis='']){const s=selection(e);change(s);assert.throws(()=>inspectTraceReading(e,s,q));}
});
test('source, unit, quantity, index, endpoint and original target identities remain strict',()=>{
 const e=example(),q={quantity:'clearance',unit:'mm'};for(const change of [s=>s.trace.source.title='foreign',s=>s.trace.instrument.unit='N',s=>s.trace.instrument.quantity='force',s=>s.sampleIndex=-1,s=>s.sampleIndex=3,s=>s.momentId='moment-3']){const s=selection(e);change(s);assert.throws(()=>inspectTraceReading(e,s,q));}
 const raw=study();raw.target={...raw.comparison.examples[0],reading:null,traceReading:raw.rows[0].traceReading};assert.throws(()=>inspectNumericTraceStudy(raw),/Target evidence/);
 const manual=study();manual.rows[0]={decision:'hold',basis:'Manual control',reading:{range:[.9,1.1],momentId:'moment-1',basis:'Separate manual reading'},traceReading:null};assert.equal(inspectNumericTraceStudy(manual).report.findings.status,'compatible');
});
