import test from 'node:test';
import assert from 'node:assert/strict';
import {study} from './cue-budget-fixture.mjs';
import {INSTRUMENT_TRACE_FORMAT,importInstrumentTrace,inspectInstrumentTrace,selectInstrumentRun,instrumentPlaybackRange} from '../src/instrument-trace.mjs';
function fixture(){
 const source=study([['0'],['1']],['A','B']).comparison.examples[0].source;
 const trace={format:INSTRUMENT_TRACE_FORMAT,source,evidenceClass:'authored-example',instrument:{name:'Authored scalar instrument',quantity:'supplied force',unit:'N',calibrationBasis:'Authored software control; not measured force'},
  samples:[{timeSeconds:100,value:0},{timeSeconds:100.5,value:6},{timeSeconds:101,value:7},{timeSeconds:101.5,value:0},{timeSeconds:103,value:9},{timeSeconds:103.25,value:10}],
  clock:{anchors:[{instrumentSeconds:100,clipSeconds:1},{instrumentSeconds:104,clipSeconds:9}],verification:{instrumentSeconds:102,clipSeconds:5},toleranceSeconds:0.01,basis:'Authored independent timing landmarks'},
  settings:{threshold:5,direction:'at-or-above',maximumGapSeconds:1,minimumSamples:2}};
 return {source,trace};
}

test('offset/drift clock and gapped samples expose original-index candidates without interpolation',()=>{
 const {source,trace}=fixture(),before=structuredClone(trace),report=inspectInstrumentTrace(source,trace);
 assert.equal(report.clock.slope,2);assert.equal(report.clock.checkPassed,true);
 assert.deepEqual(report.candidates.map(c=>c.sampleIndexes),[[1,2],[4,5]]);
 assert.deepEqual(report.candidates.map(c=>[c.navigation.startSeconds,c.navigation.endSeconds]),[[2,3],[7,7.5]]);
 assert.deepEqual(report.gaps,[{beforeIndex:3,afterIndex:4,startInstrumentSeconds:101.5,endInstrumentSeconds:103}]);
 assert.deepEqual(trace,before);
 const selection=selectInstrumentRun(source,trace,'run-1');
 assert.deepEqual(instrumentPlaybackRange(source,trace,selection),{startSeconds:7,endSeconds:7.5,candidateId:'run-1',sampleIndexes:[4,5]});
});

test('failed independent clock check preserves trace candidates but refuses navigation',()=>{
 const {source,trace}=fixture();trace.clock.verification.clipSeconds=5.2;
 const report=inspectInstrumentTrace(source,trace);assert.equal(report.clock.checkPassed,false);assert.equal(report.candidates.length,2);
 assert.ok(report.candidates.every(c=>!c.navigation.available&&c.navigation.reason==='clock-check-failed'));
 assert.throws(()=>instrumentPlaybackRange(source,trace,selectInstrumentRun(source,trace,'run-0')),/clock-check-failed/);
});

test('outside clock support and clip coverage stay unavailable without clipping',()=>{
 const {source,trace}=fixture();trace.clock.anchors=[{instrumentSeconds:101,clipSeconds:3},{instrumentSeconds:103,clipSeconds:7}];
 const report=inspectInstrumentTrace(source,trace);assert.equal(report.candidates[0].navigation.reason,'outside-clock-anchors');
 trace.samples=[{timeSeconds:105,value:6},{timeSeconds:105.5,value:7}];
 assert.equal(inspectInstrumentTrace(source,trace).candidates[0].navigation.reason,'outside-original-clip');
});

test('independent threshold/gap oracle agrees for irregular timestamp sequences',()=>{
 let seed=9482;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let n=0;n<100;n++){
  const {source,trace}=fixture();let time=100;
  trace.samples=Array.from({length:12},()=>({timeSeconds:time+=(1+random()%8)/10,value:random()%11-5}));
  trace.settings={threshold:random()%7-3,direction:n%2?'at-or-above':'at-or-below',maximumGapSeconds:0.4,minimumSamples:2+n%3};
  const good=trace.samples.map(s=>trace.settings.direction==='at-or-above'?s.value>=trace.settings.threshold:s.value<=trace.settings.threshold);
  const expected=[];
  // Enumerate every maximal contiguous index interval directly, independently
  // of the producer's streaming flush implementation.
  for(let start=0;start<good.length;start++)for(let end=start;end<good.length;end++){
   if(end-start+1<trace.settings.minimumSamples)continue;
   if(!good.slice(start,end+1).every(Boolean))continue;
   const linked=i=>trace.samples[i].timeSeconds-trace.samples[i-1].timeSeconds<=trace.settings.maximumGapSeconds;
   if(Array.from({length:end-start},(_,j)=>start+j+1).some(i=>!linked(i)))continue;
   if(start>0&&good[start-1]&&linked(start))continue;
   if(end+1<good.length&&good[end+1]&&linked(end+1))continue;
   expected.push(Array.from({length:end-start+1},(_,i)=>start+i));
  }
  assert.deepEqual(inspectInstrumentTrace(source,trace).candidates.map(c=>c.sampleIndexes),expected);
 }
});

test('raw replay, source binding and changed selection controls refuse plausible stale navigation',()=>{
 const {source,trace}=fixture(),selection=selectInstrumentRun(source,trace,'run-0');
 for(const change of [t=>t.instrument.unit='mN',t=>t.settings.threshold=6,t=>t.samples[1].value=8,t=>t.clock.basis='different declaration']){
  const revised=structuredClone(trace);change(revised);
  assert.throws(()=>instrumentPlaybackRange(source,revised,selection),/changed/);
 }
 const wrong=structuredClone(source);wrong.title='Different source';assert.throws(()=>importInstrumentTrace(wrong,trace),/source changed/);
 assert.deepEqual(inspectInstrumentTrace(source,{...trace,candidates:[{id:'fake'}]}).candidates,inspectInstrumentTrace(source,trace).candidates);
 for(const change of [t=>t.samples[1].timeSeconds=t.samples[0].timeSeconds,t=>t.samples[1].value=NaN,t=>t.instrument.unit='',t=>t.settings.minimumSamples=1,t=>t.settings.maximumGapSeconds=0]){
  const invalid=structuredClone(trace);change(invalid);assert.throws(()=>importInstrumentTrace(source,invalid));
 }
 trace.settings.minimumSamples=3;assert.deepEqual(inspectInstrumentTrace(source,trace).candidates,[]);
});
