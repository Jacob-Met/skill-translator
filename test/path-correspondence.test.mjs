import test from 'node:test';
import assert from 'node:assert/strict';
import {proposePathCorrespondences} from '../src/path-correspondence.mjs';
import {createPathTiming,importPathTiming,inspectPathTiming} from '../src/path-timing.mjs';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
const propose=(a,b,bound=.001)=>proposePathCorrespondences(a,b,{sameCoordinateFrame:true,maxDistanceMm:bound});
test('unfamiliar time-warped course preselects twelve endpoints and reaches unchanged timing consumer',()=>{
 const points=[[13,17],[31,19],[27,42],[59,48]],a=pathAccount(pathFixture(points,{times:[0,1,4,6]})),b=pathAccount(pathFixture(points,{times:[10,12,13,19]}));
 const before=JSON.stringify([a,b]),r=propose(a,b);
 assert.equal(r.alignmentCount,'1');assert.equal(r.proposals.length,3);assert.equal(r.status,'internal-correspondences');
 const accepted=createPathTiming(a,b,r.proposals.map((p,i)=>({...p,label:'Confirmed authored phase '+i})));
 assert.deepEqual(inspectPathTiming(accepted).rows.map(x=>x.elapsedRatio),[2,1/3,3]);
 assert.deepEqual(importPathTiming(JSON.parse(JSON.stringify(accepted))),accepted);
 assert.equal(JSON.stringify([a,b]),before);
});
test('repeated positions retain all alignments and cannot become internal evidence',()=>{
 const a=pathAccount(pathFixture(Array.from({length:12},()=>[35,44]))),r=propose(a,a);
 assert.equal(r.status,'endpoints-only');assert.equal(r.forcedPairs.length,2);assert.equal(r.ambiguousPairs.length,142);
 assert.equal(r.proposals.length,1);assert.equal(r.alignmentCount,'45046719');
});
test('unknown positions and incompatible endpoints supply no proposed success',()=>{
 const a=pathAccount(pathFixture()),missing=pathAccount(pathFixture(),[1]);
 assert.equal(propose(a,missing).status,'missing-observations');assert.deepEqual(propose(a,missing).proposals,[]);
 const other=pathAccount(pathFixture([[60,60],[63,64],[60,60]]));
 assert.equal(propose(a,other).status,'no-alignment');assert.deepEqual(propose(a,other).proposals,[]);
});
test('irregular sample density preserves forced geometry without inventing timing at repeated positions',()=>{
 const a=pathAccount(pathFixture([[10,10],[30,10],[30,30]])),b=pathAccount(pathFixture([[10,10],[10,10],[30,10],[30,30]]));
 const r=propose(a,b);assert.equal(r.alignmentCount,'1');assert.equal(r.forcedPairs.length,4);
 assert.deepEqual(r.proposals.map(p=>[p.left.fromMomentId,p.right.fromMomentId]),[['moment-0','moment-1'],['moment-1','moment-2']]);
 assert.equal(inspectPathTiming(createPathTiming(a,b,r.proposals.map(p=>({...p,label:'Confirmed'})))).rows.length,2);
});
test('explicit common-frame and finite bounds are required; zero bound adds no hidden epsilon',()=>{
 const a=pathAccount(pathFixture());assert.throws(()=>proposePathCorrespondences(a,a,{maxDistanceMm:1}),/confirm/);
 for(const maxDistanceMm of [null,'1',NaN,Infinity,-1,1001])assert.throws(()=>proposePathCorrespondences(a,a,{sameCoordinateFrame:true,maxDistanceMm}));
 assert.equal(propose(a,a,0).alignmentCount,'1');
});
test('shared maintained coupling counter rejects malformed and sparse distance grids',async()=>{
 const {countMonotoneCouplings}=await import('../src/path-comparison.mjs');
 for(const grid of [[],[[0,0]],[[0,0],[0]],[[0,0],[0,NaN]],[[0,0],[0,-1]],[Array(2),[0,0]],[[0,0],,[0,0]]])assert.throws(()=>countMonotoneCouplings(grid,1));
 for(const bound of [-1,NaN,Infinity,'1'])assert.throws(()=>countMonotoneCouplings([[0,0],[0,0]],bound));
 assert.equal(countMonotoneCouplings([[0,0],[0,0]],0).total,3n);
 assert.equal(countMonotoneCouplings([[2,0],[0,0]],1).total,0n);
});
