import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeSampledDwells} from '../src/path-dwell.mjs';
import {inspectSequencePath} from '../src/sequence-path.mjs';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
const account=(points,times)=>pathAccount(pathFixture(points,{times}));
test('discovers two original clusters without supplied interval endpoints',()=>{
 const source=account([[10,10],[10.1,10],[10,10.1],[40,40],[40.1,40],[40,40.1]],[0,1,3,4,6,9]);
 const before=JSON.stringify(source),r=proposeSampledDwells(source,.2,2);
 assert.deepEqual(r.intervals.map(x=>[x.startIndex,x.endIndex]),[[0,2],[3,5]]);
 assert.deepEqual(r.intervals.map(x=>x.durationSeconds),[3,5]);
 assert.equal(JSON.stringify(source),before);
});
test('slow drift does not pass by adjacent distances; overlapping alternatives retained',()=>{
 const r=proposeSampledDwells(account([[10,10],[11,10],[12,10],[13,10]],[0,1,2,3]),2.1,1);
 assert.deepEqual(r.intervals.map(x=>[x.startIndex,x.endIndex]),[[0,2],[1,3]]);
 assert.ok(r.intervals.every(x=>x.diameterMm<2.1));
});
test('a missing selected observation breaks support; distant equal endpoints are insufficient',()=>{
 const s=pathAccount(pathFixture([[10,10],[10,10],[10,10],[10,10],[10,10]],{times:[0,1,2,3,4]}),[2]);
 assert.deepEqual(proposeSampledDwells(s,.01,2).intervals,[]);
 assert.deepEqual(proposeSampledDwells(account([[10,10],[80,80],[10,10]],[0,1,4]),1,3).intervals,[]);
});
test('duration uses original presentation timestamps and no stationary single sample qualifies',()=>{
 const s=account([[10,10],[10,10],[70,70]],[0,4,5]);
 assert.equal(proposeSampledDwells(s,.001,4).intervals.length,1);
 assert.equal(proposeSampledDwells(s,.001,4.001).intervals.length,0);
 assert.equal(proposeSampledDwells(s,.001,0).intervals.length,1);
 for(const bad of [NaN,Infinity,-1,'1',null])assert.throws(()=>proposeSampledDwells(s,bad,1));
 assert.throws(()=>proposeSampledDwells(s,1,Infinity));
});

test('nominal diameter equality is inclusive without hiding floating geometry',()=>{
 const s=account([[21,34],[24,38]],[2,7]),f=inspectSequencePath(s);
 const d=Math.hypot(f.samples[1].position.xMm-f.samples[0].position.xMm,f.samples[1].position.yMm-f.samples[0].position.yMm);
 assert.equal(proposeSampledDwells(s,d,5).intervals.length,1);
 assert.equal(proposeSampledDwells(s,d-1e-12,5).intervals.length,0);
 assert.deepEqual(proposeSampledDwells(s,d,5).intervals[0].diameterWitnessMomentIds,['moment-0','moment-1']);
});
test('all-missing source provides no candidates and keeps missing identities',()=>{
 const s=pathAccount(pathFixture([[20,20],[20,20],[20,20]],{times:[0,1,3]}),[0,1,2]);
 const r=proposeSampledDwells(s,100,0);assert.deepEqual(r.intervals,[]);
 assert.deepEqual(r.missingMomentIds,['moment-0','moment-1','moment-2']);
 assert.throws(()=>proposeSampledDwells({...s,reference:{...s.reference,samePlaneAndCorners:false}},1,1));
});

test('zero-diameter interval still cites two distinct observed witnesses',()=>{
 const s=account([[20,20],[20,20]],[0,2]);
 const a=s.sequence.moments[0].calibratedTask,b=s.sequence.moments[1].calibratedTask;
 // Identical calibration and pixel coordinates produce exactly equal nominal
 // positions while retaining both original image and timestamp identities.
 b.source.corners=structuredClone(a.source.corners);b.landmarks[0].sourcePx=structuredClone(a.landmarks[0].sourcePx);
 const r=proposeSampledDwells(s,0,1);
 assert.equal(r.intervals[0].diameterMm,0);
 assert.deepEqual(r.intervals[0].diameterWitnessIndices,[0,1]);
});
