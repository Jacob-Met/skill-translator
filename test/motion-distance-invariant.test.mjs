import test from 'node:test';import assert from 'node:assert/strict';
import {inspectMotionDistanceInvariant as inspect,inspectMotionWithDistance} from '../src/motion-distance-invariant.mjs';
import {motionStudy} from './helpers/shared-motion-fixture.mjs';
const selection={fromSourceId:'source-0',toSourceId:'source-1',ids:['p0','p1','p2']};
test('new-only arithmetic exhaustion preserves the completed original fixed result',()=>{
 const raw=motionStudy([[[0,0],[1e-310,0]],[[0,0],[1e-310,0]]],0),s={...selection,ids:['p0','p1'],orientation:{a:1,b:0}};
 assert.throws(()=>inspect(raw,s),/capacity exhausted/);const result=inspectMotionWithDistance(raw,s);assert.equal(result.status,'common-position');assert.equal(result.distanceInvariant.status,'unavailable');assert.equal(result.checks.length,2);
});
test('strict invariant contradiction retains all selected pairs and admits exact tangency',()=>{
 const raw=motionStudy([[[0,0],[10,0],[20,0]],[[0,0],[10,0],[23,0]]],1.4),before=JSON.stringify(raw);
 const r=inspect(raw,selection);assert.equal(r.excluded,true);assert.equal(r.pairs.length,3);assert.equal(JSON.stringify(raw),before);
 for(const deviationMm of [1.5,1.6])assert.equal(inspect({...raw,deviationMm},selection).excluded,false);
 assert.deepEqual(inspect(raw,{...selection,ids:[...selection.ids].reverse()}),r);
});
test('rotations and reflections are both inconclusive, never proper-motion certificates',()=>{
 const a=[[20,20],[30,20],[20,30]];
 for(const b of [[[80,20],[80,30],[70,20]],[[80,20],[70,20],[80,30]]]){const r=inspect(motionStudy([a,b],0),selection);assert.equal(r.excluded,false);assert.match(r.limitation,/do not prove/);}
});
test('pair capacity, missing observations and separate source admission stay bounded',()=>{
 const a=Array.from({length:12},(_,i)=>[20+i,20]),raw=motionStudy([a,a],0),ids=a.map((_,i)=>'p'+i);assert.equal(inspect(raw,{...selection,ids}).pairCount,66);
 assert.throws(()=>inspect(raw,{...selection,ids:['p0','missing']}));assert.throws(()=>inspect(raw,{...selection,toSourceId:'source-0'}));
});
test('independent direct-distance oracle agrees away from boundaries over 200 authored pairs',()=>{
 let seed=79;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)%100);
 for(let i=0;i<200;i++){
  const a=[[rnd(),rnd()],[rnd(),rnd()]],b=[[rnd(),rnd()],[rnd(),rnd()]],radius=rnd()/10;
  const change=Math.abs(Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])-Math.hypot(b[0][0]-b[1][0],b[0][1]-b[1][1]));if(Math.abs(change-2*radius)<1e-8)continue;
  const r=inspect(motionStudy([a,b],radius),{...selection,ids:['p0','p1']});assert.equal(r.excluded,change>2*radius);
 }
});
