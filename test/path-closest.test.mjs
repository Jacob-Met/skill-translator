import test from 'node:test';
import assert from 'node:assert/strict';
import {createPathComparison} from '../src/path-comparison.mjs';
import {inspectPathOccurrences,inspectClosestPathOccurrences,createClosestPathStudy,importClosestPathStudy} from '../src/path-occurrences.mjs';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
const declaration={samePointAndCoordinates:true,basis:'Authored original point and common coordinates'};
const account=(a,b,missing=[])=>createPathComparison(pathAccount(pathFixture(a)),pathAccount(pathFixture(b),missing),declaration);
function oracle(a,b){let distance=Infinity,count=0;function visit(i,j,worst){worst=Math.max(worst,Math.hypot(a[i].xMm-b[j].xMm,a[i].yMm-b[j].yMm));if(i===a.length-1&&j===b.length-1){if(worst<distance){distance=worst;count=1;}else if(worst===distance)count++;return;}for(const [di,dj]of [[1,0],[0,1],[1,1]])if(i+di<a.length&&j+dj<b.length)visit(i+di,j+dj,worst);}visit(0,0,0);return {distance,count:String(count)};}
test('new near-pattern is located without guessing a bound while prior bound remains failed',()=>{
 const raw=account([[13,17],[24,31],[39,22]],[[4,4],[13.5,17.5],[24.5,31.5],[24.5,31.5],[39.5,22.5],[88,87]]),before=JSON.stringify(raw);
 const prior=inspectPathOccurrences(raw,.001),r=inspectClosestPathOccurrences(raw);
 assert.equal(prior.status,'no-occurrence');assert.equal(r.status,'closest-only');assert.equal(r.comparisonKind,'closest-only');assert.ok(Math.abs(r.minimumDistanceMm-Math.SQRT1_2)<1e-8);
 assert.deepEqual(r.closestIntervals.map(row=>[row.startIndex,row.endIndex]),[[1,4]]);assert.equal(r.candidateCount,15);assert.equal(r.intervalScores.length,15);assert.equal('maxDistanceMm' in r,false);assert.equal(JSON.stringify(raw),before);assert.deepEqual(inspectPathOccurrences(raw,.001),prior);
});
test('unrelated and reversed paths still have a nearest result, never an acceptance verdict',()=>{
 for(const raw of [account([[10,10],[20,10]],[[80,80],[90,80]]),account([[10,10],[20,10]],[[20,10],[10,10]])]){
  const r=inspectClosestPathOccurrences(raw);assert.equal(r.status,'closest-only');assert.ok(r.minimumDistanceMm>=9.99);assert.equal(r.closestIntervals.length,1);assert.match(r.boundary,/not an acceptance verdict/);assert.equal(inspectPathOccurrences(raw,1).status,'no-occurrence');
 }
});
test('all exact overlapping ties retain separate original interval identities',()=>{
 const fixed=points=>{const sequence=pathFixture(points);const {corners}=sequence.moments[0].calibratedTask.source,point=sequence.moments[0].calibratedTask.landmarks[0].sourcePx;for(const moment of sequence.moments){moment.calibratedTask.source.corners=structuredClone(corners);moment.calibratedTask.landmarks[0].sourcePx=structuredClone(point);}return pathAccount(sequence);};
 const r=inspectClosestPathOccurrences(createPathComparison(fixed([[20,20],[20,20]]),fixed(Array.from({length:4},()=>[20,20])),declaration));
 assert.equal(r.minimumDistanceMm,0);assert.equal(r.closestIntervals.length,6);assert.deepEqual(r.closestIntervals.map(row=>row.alignmentCount),['3','5','7','3','5','3']);
});
test('independent exhaustive oracle checks every original interval, minimum, tie count and witness',()=>{
 let seed=470331;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let trial=0;trial<100;trial++){
  const a=Array.from({length:2+(random()>>>8)%3},()=>[10+(random()>>>8)%8,10+(random()>>>8)%8]),b=Array.from({length:2+(random()>>>8)%4},()=>[10+(random()>>>8)%8,10+(random()>>>8)%8]);
  const r=inspectClosestPathOccurrences(account(a,b)),expected=[];
  for(let start=0;start<b.length-1;start++)for(let end=start+1;end<b.length;end++){const o=oracle(r.paths[0].samples.map(s=>s.position),r.paths[1].samples.slice(start,end+1).map(s=>s.position));expected.push({startIndex:start,endIndex:end,minimumDistanceMm:o.distance,alignmentCount:o.count});}
  assert.deepEqual(r.intervalScores.map(({startIndex,endIndex,minimumDistanceMm,alignmentCount})=>({startIndex,endIndex,minimumDistanceMm,alignmentCount})),expected);
  const minimum=Math.min(...expected.map(row=>row.minimumDistanceMm));assert.equal(r.minimumDistanceMm,minimum);assert.deepEqual(r.closestIntervals.map(row=>[row.startIndex,row.endIndex]),expected.filter(row=>row.minimumDistanceMm===minimum).map(row=>[row.startIndex,row.endIndex]));
  for(const row of r.closestIntervals){assert.equal(Math.max(...row.coupling.map(pair=>pair.distanceMm)),minimum);assert.deepEqual([row.coupling[0].firstIndex,row.coupling[0].secondIndex],[0,row.startIndex]);assert.deepEqual([row.coupling.at(-1).firstIndex,row.coupling.at(-1).secondIndex],[a.length-1,row.endIndex]);for(let k=1;k<row.coupling.length;k++){const dx=row.coupling[k].firstIndex-row.coupling[k-1].firstIndex,dy=row.coupling[k].secondIndex-row.coupling[k-1].secondIndex;assert.ok(dx>=0&&dx<=1&&dy>=0&&dy<=1&&dx+dy>0);}}
 }
});
test('missing source observations do not become nearest evidence',()=>{
 let raw=account([[10,10],[20,10]],[[10,10],[20,10],[30,10],[10.5,10.5],[20.5,10.5]],[2]),r=inspectClosestPathOccurrences(raw);
 assert.equal(r.candidateCount,2);assert.deepEqual(r.intervalScores.map(row=>[row.startIndex,row.endIndex]),[[0,1],[3,4]]);assert.deepEqual(r.missingSecondMomentIds,['moment-2']);
 raw.paths[0].samples[0].markId=null;r=inspectClosestPathOccurrences(raw);assert.equal(r.status,'missing-pattern-observations');assert.equal(r.minimumDistanceMm,null);assert.deepEqual(r.closestIntervals,[]);
 raw=account([[10,10],[20,10]],[[10,10],[20,10]],[1]);assert.equal(inspectClosestPathOccurrences(raw).status,'no-observed-interval');
});
test('full 12-by-12 source capacity and raw replay preserve inputs and recompute forged results',()=>{
 const raw=account(Array.from({length:12},(_,i)=>[10+i*2,20+i%3]),Array.from({length:12},(_,i)=>[12+i*2,23+i%3])),before=JSON.stringify(raw),study=createClosestPathStudy(raw),r=inspectClosestPathOccurrences(raw);
 assert.equal(r.candidateCount,66);assert.equal(r.intervalScores.length,66);assert.equal(JSON.stringify(raw),before);
 const reopened=importClosestPathStudy({...study,minimumDistanceMm:0,closestIntervals:[],status:'occurrences'});assert.deepEqual(reopened,study);assert.deepEqual(inspectClosestPathOccurrences(reopened.comparison),r);assert.equal('maxDistanceMm' in reopened,false);assert.throws(()=>importClosestPathStudy({...study,format:'unknown'}));
});
