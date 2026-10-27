#!/usr/bin/env node
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {inspectSharedMotionGroups as current} from '../src/shared-motion-groups.mjs';
import {motionStudy} from '../test/helpers/shared-motion-fixture.mjs';
const baselineUrl=process.argv[2];
assert.ok(baselineUrl,'Usage: node tools/benchmark-shared-motion-filter.mjs /absolute/baseline/src/shared-motion-groups.mjs');
const {inspectSharedMotionGroups:baseline}=await import(pathToFileURL(baselineUrl).href);
const smallBatches=process.argv[3]==='--small-batches';
const rounds=smallBatches?20:Number(process.argv[3]||11);assert.ok(Number.isInteger(rounds)&&rounds>=3);
const points=Array.from({length:12},(_,i)=>[10+i*10,20+(i%3)*15]);
const reflected=[[20,20],[70,25],[35,80]];
const fixtures=[
 ['dense-12-points-2-sources',motionStudy([points,points.map(([x,y])=>[x+4,y+7])])],
 ['default-independent-groups',motionStudy()],
 ['collapsed',motionStudy([[[30,30],[30,30],[30,30]],[[80,80],[80,80],[80,80]]],10)],
 ['reflection',motionStudy([reflected,reflected.map(([x,y])=>[160-x,y])],.001)],
 ['heterogeneous-12-points-12-sources',motionStudy(Array.from({length:12},(_,s)=>points.map(([x,y],i)=>[x+s*.7+Math.sin(i*1.73+s*2.11)*.15,y+s*.4+Math.cos(i*2.31+s*.93)*.15])))]
];
const median=a=>{const v=[...a].sort((x,y)=>x-y),m=v.length>>1;return v.length%2?v[m]:(v[m-1]+v[m])/2;};
const stats=a=>({minMs:Math.min(...a),medianMs:median(a),maxMs:Math.max(...a)});
const report=[];
for(const [name,raw] of fixtures){
 if(smallBatches&&!['reflection','default-independent-groups'].includes(name))continue;
 const original=structuredClone(raw),expected=structuredClone(baseline(raw));
 assert.deepStrictEqual(raw,original);assert.deepStrictEqual(current(raw),expected);assert.deepStrictEqual(raw,original);
 if(name.startsWith('dense')){assert.equal(expected.counts.evaluated,4083);assert.equal(expected.groups.length,1);assert.equal(expected.groups[0].ids.length,12);assert.equal(expected.work.fits,4084);assert.equal(expected.work.pointFits,expected.work.maxSubsetPointFits+12);}
 const samples={baseline:[],current:[]};
 if(smallBatches){
  for(let i=0;i<200;i++)for(const fn of i%2?[current,baseline]:[baseline,current]){assert.deepStrictEqual(fn(raw),expected);assert.deepStrictEqual(raw,original);}
  for(let batch=0;batch<20;batch++)for(const [label,fn] of batch%2?[['current',current],['baseline',baseline]]:[['baseline',baseline],['current',current]]){
   let result;const started=performance.now();for(let i=0;i<100;i++)result=fn(raw);const elapsed=(performance.now()-started)/100;
   assert.deepStrictEqual(result,expected);assert.deepStrictEqual(raw,original);samples[label].push(elapsed);
  }
  const quartiles=a=>{const s=[...a].sort((x,y)=>x-y);return {...stats(s),q1Ms:median(s.slice(0,10)),q3Ms:median(s.slice(10))};};
  const saved=samples.baseline.map((v,i)=>v-samples.current[i]);
  const result={name,warmupsPerImplementation:200,batches:20,callsPerBatch:100,baseline:quartiles(samples.baseline),current:quartiles(samples.current),medianPairedSavedMs:median(saved),samples,checks:'complete output equality and input immutability outside timed batches'};
  report.push(result);console.log(JSON.stringify(result));continue;
 }
 for(let r=-3;r<rounds;r++){
  const order=(r&1)?[['current',current],['baseline',baseline]]:[['baseline',baseline],['current',current]];
  for(const [label,fn] of order){const started=performance.now(),result=fn(raw),elapsed=performance.now()-started;assert.deepStrictEqual(result,expected);assert.deepStrictEqual(raw,original);if(r>=0)samples[label].push(elapsed);}
 }
 const b=stats(samples.baseline),c=stats(samples.current),saved=samples.baseline.map((v,i)=>v-samples.current[i]);
 const result={name,points:raw.demonstrations[0].annotation.landmarks.length,sources:raw.demonstrations.length,counts:expected.counts,work:expected.work,rounds,baseline:b,current:c,medianPairedSavedMs:median(saved),medianPairedSavedPercent:median(saved.map((v,i)=>v/samples.baseline[i]*100)),medianSpeedup:b.medianMs/c.medianMs,samples};
 report.push(result);console.log(JSON.stringify(result));
}
console.log(JSON.stringify({result:'PASS',node:process.version,platform:process.platform,arch:process.arch,mode:smallBatches?'small-batches':'paired-invocations',warmups:smallBatches?200:3,checks:smallBatches?'complete equality and source immutability outside timed batches':'complete deep equality and source immutability on every invocation',fixtures:report.length}));
