import test from 'node:test';
import assert from 'node:assert/strict';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
import {proposePathReturns} from '../src/path-returns.mjs';

test('unfamiliar oblique sampled return retains original witness IDs and account',()=>{
 const raw=pathAccount(pathFixture([[27,19],[31,22],[35,25],[27.1,19.1]],{times:[.1,.8,2.7,4.3]}));
 const original=JSON.stringify(raw), report=proposePathReturns(raw,.2);
 assert.equal(report.proposals.length,1);
 const p=report.proposals[0];assert.equal(p.fromMomentId,'moment-0');assert.equal(p.toMomentId,'moment-3');
 assert.equal(p.departureMomentId,'moment-1');assert.equal(p.farthest.momentId,'moment-2');
 assert.ok(Math.abs(p.elapsedSeconds-4.2)<1e-12);assert.equal(JSON.stringify(raw),original);
 assert.deepEqual(proposePathReturns(JSON.parse(original),.2),report);
});
test('stationary, monotone and missing observations cannot manufacture returns',()=>{
 for(const points of [[[20,20],[20,20],[20,20]],[[20,20],[25,20],[30,20]]])
  assert.equal(proposePathReturns(pathAccount(pathFixture(points)),.1).proposals.length,0);
 const raw=pathAccount(pathFixture([[20,20],[25,20],[26,20],[20,20]]),[2]);
 assert.equal(proposePathReturns(raw,.1).proposals.length,0);
 assert.deepEqual(proposePathReturns(raw,.1).missingMomentIds,['moment-2']);
});
test('overlap stays explicit, earliest re-entry wins, changed radius recomputes',()=>{
 const raw=pathAccount(pathFixture([[20,20],[25,20],[20,20],[25,20],[20,20]]));
 assert.deepEqual(proposePathReturns(raw,.1).proposals.map(p=>[p.fromIndex,p.toIndex]),[[0,2],[1,3],[2,4]]);
 assert.equal(proposePathReturns(raw,6).proposals.length,0);
});
test('invalid radius and changed source cannot bypass maintained admission',()=>{
 const raw=pathAccount();for(const r of [-1,NaN,Infinity,'1',null])assert.throws(()=>proposePathReturns(raw,r));
 const changed=structuredClone(raw);changed.samples[1].momentId='absent';assert.throws(()=>proposePathReturns(changed,1));
});

test('zero-radius stationary calibration residue is not a departure',()=>{
 const raw=pathAccount(pathFixture([[20,20],[20,20],[20,20],[20,20]]));
 assert.equal(proposePathReturns(raw,0).proposals.length,0);
});

test('independent exhaustive endpoint oracle agrees on unfamiliar bounded courses',()=>{
 let seed=271828;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 for(let course=0;course<40;course++){
  const points=Array.from({length:7},()=>[20+Math.floor(rand()*4),30+Math.floor(rand()*4)]);
  const missing=points.flatMap((_,i)=>rand()<.1?[i]:[]), expected=[];
  for(let a=0;a<points.length;a++)for(let b=a+2;b<points.length;b++){
   if(missing.some(i=>i>=a&&i<=b))continue;
   const distances=points.slice(a,b+1).map(p=>Math.hypot(p[0]-points[a][0],p[1]-points[a][1]));
   if(distances.at(-1)>.4)continue;
   const departure=distances.findIndex(d=>d>.4);if(departure<0)continue;
   if(distances.slice(departure+1,-1).some(d=>d<=.4))continue;
   expected.push([a,b]);
  }
  const raw=pathAccount(pathFixture(points),missing);
  assert.deepEqual(proposePathReturns(raw,.4).proposals.map(p=>[p.fromIndex,p.toIndex]),expected);
 }
});
