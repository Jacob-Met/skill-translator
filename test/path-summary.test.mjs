import test from 'node:test';
import assert from 'node:assert/strict';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
import {proposePathSummary} from '../src/path-summary.mjs';
import {inspectSequencePath} from '../src/sequence-path.mjs';
const account=(points,times)=>pathAccount(pathFixture(points,{times}));
test('time-consistent straight samples compact; collinear returns and pauses survive',()=>{
 const straight=account([[10,10],[20,10],[40,10],[70,10]],[0,1,3,6]);
 const original=JSON.stringify(straight),p=proposePathSummary(straight,1e-10);
 assert.deepEqual(p.retainedIndices,[0,3]);assert.equal(JSON.stringify(straight),original);
 const returned=account([[10,10],[70,10],[20,10],[80,10]],[0,1,2,3]);
 assert.deepEqual(proposePathSummary(returned,1).retainedIndices,[0,1,2,3]);
 const paused=account([[10,10],[10,10],[30,10]],[0,1,2]);
 assert.deepEqual(proposePathSummary(paused,1).retainedIndices,[0,1,2]);
});
test('missing observations remain selected and split runs even under huge allowance',()=>{
 const raw=pathAccount(pathFixture([[10,10],[20,20],[30,30],[40,40],[50,50],[60,60],[70,70]]),[2,5]);
 const p=proposePathSummary(raw,1000);assert.deepEqual(p.retainedIndices,[0,1,2,3,4,5,6]);
 assert.equal(p.intervals.length,2);assert.equal(p.missingMomentIds.length,2);
 assert.deepEqual(proposePathSummary(pathAccount(pathFixture(),[0,1,2]),100).retainedIndices,[0,1,2]);
});
test('independent exhaustive subset oracle confirms minimum and all original residuals',()=>{
 let seed=42;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 for(let c=0;c<120;c++){
  const n=3+Math.floor(random()*6),points=Array.from({length:n},()=>[5+90*random(),5+90*random()]);
  let t=0;const times=points.map(()=>t+=.1+random()*4),raw=account(points,times),bound=random()*70;
  const samples=inspectSequencePath(raw).samples;
  let minimum=n;
  for(let mask=0;mask<2**(n-2);mask++){
   const kept=[0,...Array.from({length:n-2},(_,i)=>i+1).filter(i=>mask&(1<<(i-1))),n-1];let valid=true;
   for(let q=1;q<kept.length;q++){
    const a=kept[q-1],b=kept[q];
    for(let k=a+1;k<b;k++){
     const wa=(times[b]-times[k])/(times[b]-times[a]),wb=1-wa;
     const error=Math.hypot(samples[k].position.xMm-(wa*samples[a].position.xMm+wb*samples[b].position.xMm),samples[k].position.yMm-(wa*samples[a].position.yMm+wb*samples[b].position.yMm));
     if(error>bound)valid=false;
    }
   }
   if(valid)minimum=Math.min(minimum,kept.length);
  }
  const p=proposePathSummary(raw,bound);assert.equal(p.retainedIndices.length,minimum);
  assert.ok(p.intervals.every(i=>i.residuals.every(r=>r.deviationMm<=bound)));
 }
});
test('threshold controls change proposal; invalid bounds and forged findings do not pass',()=>{
 const raw=account([[10,10],[20,30],[30,10]],[0,1,2]);
 const nominal=proposePathSummary(raw,100).maximumOmittedDeviationMm;
 assert.deepEqual(proposePathSummary(raw,nominal).retainedIndices,[0,2]);
 assert.deepEqual(proposePathSummary(raw,nominal-1e-8).retainedIndices,[0,1,2]);
 for(const value of [-1,NaN,Infinity,'2',null])assert.throws(()=>proposePathSummary(raw,value));
 raw.findings={retainedIndices:[0,2],maximumOmittedDeviationMm:0};
 assert.deepEqual(proposePathSummary(raw,0).retainedIndices,[0,1,2]);
});
