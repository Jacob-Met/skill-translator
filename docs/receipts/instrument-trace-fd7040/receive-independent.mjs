import assert from 'node:assert/strict';
import {study} from '../../../test/cue-budget-fixture.mjs';
import {inspectInstrumentTrace,selectInstrumentRun,instrumentPlaybackRange} from '../../../src/instrument-trace.mjs';
const source=study([['0'],['1']],['A','B']).comparison.examples[0].source;
let seed=267131;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};let intervals=0;
for(let trial=0;trial<240;trial++){
 let t=8;const samples=Array.from({length:20},()=>({timeSeconds:t+=[.125,.25,.5,1,2][(rnd()>>>8)%5],value:(rnd()>>>8)%7-3}));
 const threshold=(rnd()>>>8)%5-2,above=trial%2===0,gap=[.25,.5,1,2][(rnd()>>>8)%4],minimum=2+(rnd()>>>8)%4,failed=trial%3===0;
 const trace={format:'skill-translator.instrument-trace/v1',source,evidenceClass:'authored-example',instrument:{name:'Review scalar',quantity:'declared quantity',unit:'u',calibrationBasis:'Independent authored control'},samples,clock:{anchors:[{instrumentSeconds:10,clipSeconds:1},{instrumentSeconds:18,clipSeconds:9}],verification:{instrumentSeconds:14,clipSeconds:failed?5.1:5},toleranceSeconds:.01,basis:'Review clock'},settings:{threshold,direction:above?'at-or-above':'at-or-below',maximumGapSeconds:gap,minimumSamples:minimum}};
 const good=samples.map(s=>above?s.value>=threshold:s.value<=threshold),linked=i=>samples[i].timeSeconds-samples[i-1].timeSeconds<=gap;
 const edges=[];for(let i=0;i<20;i++)if(good[i]&&(i===0||!good[i-1]||!linked(i))){let j=i;while(j+1<20&&good[j+1]&&linked(j+1))j++;if(j-i+1>=minimum)edges.push(Array.from({length:j-i+1},(_,k)=>i+k));}
 const original=JSON.stringify(trace),r=inspectInstrumentTrace(source,trace);assert.equal(JSON.stringify(trace),original);assert.deepEqual(r.candidates.map(c=>c.sampleIndexes),edges);assert.equal(r.clock.checkPassed,!failed);
 for(const c of r.candidates){intervals++;const a=samples[c.sampleIndexes[0]].timeSeconds,b=samples[c.sampleIndexes.at(-1)].timeSeconds;assert.equal(c.navigation.available,!failed&&a>=10&&b<=18);
  const selected=selectInstrumentRun(source,trace,c.id);
  if(c.navigation.available)assert.deepEqual(instrumentPlaybackRange(source,trace,selected),{startSeconds:a-9,endSeconds:b-9,candidateId:c.id,sampleIndexes:c.sampleIndexes});else assert.throws(()=>instrumentPlaybackRange(source,trace,selected));
  const changed=structuredClone(trace);changed.instrument.calibrationBasis+=' changed';assert.throws(()=>instrumentPlaybackRange(source,changed,selected),/changed/);
 }
}
console.log(JSON.stringify({head:'80dad7a2dff71a0002819bd61f76d7571b5392b9',seed:267131,traces:240,independentlyCheckedIntervals:intervals,checks:'threshold/gap/maximality, original indices, check failure, whole anchor support, mapped playback, stale calibration rejection',status:'passed'}));
