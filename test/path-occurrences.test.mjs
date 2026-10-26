import test from 'node:test';
import assert from 'node:assert/strict';
import {createPathComparison,inspectPathComparison} from '../src/path-comparison.mjs';
import {inspectPathOccurrences,createPathOccurrenceStudy,importPathOccurrenceStudy} from '../src/path-occurrences.mjs';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
const declaration={samePointAndCoordinates:true,basis:'Authored common point and coordinates'};
const account=(a,b,missing=[])=>createPathComparison(pathAccount(pathFixture(a)),pathAccount(pathFixture(b),missing),declaration);
const ids=result=>result.occurrences.map(x=>[x.startIndex,x.endIndex]);
function oracle(a,b,bound){let count=0;const visit=(i,j)=>{if(Math.hypot(a[i].xMm-b[j].xMm,a[i].yMm-b[j].yMm)>bound)return;if(i===a.length-1&&j===b.length-1){count++;return;}for(const [di,dj]of [[1,0],[0,1],[1,1]])if(i+di<a.length&&j+dj<b.length)visit(i+di,j+dj);};visit(0,0);return String(count);}
function witness(r){for(const occurrence of r.occurrences){const rows=occurrence.coupling;assert.deepEqual([rows[0].firstIndex,rows[0].secondIndex],[0,occurrence.startIndex]);assert.deepEqual([rows.at(-1).firstIndex,rows.at(-1).secondIndex],[r.paths[0].samples.length-1,occurrence.endIndex]);for(let k=0;k<rows.length;k++){const row=rows[k];assert.ok(row.distanceMm<=r.maxDistanceMm);for(const [side,index]of [[0,row.firstIndex],[1,row.secondIndex]])assert.equal(row[side?'secondMomentId':'firstMomentId'],r.paths[side].samples[index].momentId);if(k){const a=row.firstIndex-rows[k-1].firstIndex,b=row.secondIndex-rows[k-1].secondIndex;assert.ok(a>=0&&a<=1&&b>=0&&b<=1&&a+b>0);}}}}
test('embedded unfamiliar pattern is found without selecting endpoints or dropping approaches',()=>{
 const raw=account([[13,17],[24,31],[39,22]],[[4,4],[13,17],[24,31],[24,31],[39,22],[88,87]]),before=JSON.stringify(raw);
 assert.ok(inspectPathComparison(raw).distanceMm>50);
 const result=inspectPathOccurrences(raw,.001);assert.deepEqual(ids(result),[[1,4]]);assert.equal(result.paths[1].samples.length,6);witness(result);assert.equal(JSON.stringify(raw),before);
});
test('all repeated and overlapping occurrences remain visible; reversed and distant patterns refuse',()=>{
 let r=inspectPathOccurrences(account([[10,10],[20,10],[10,10]],[[10,10],[20,10],[10,10],[20,10],[10,10]]),.001);assert.deepEqual(ids(r),[[0,2],[2,4]]);witness(r);
 r=inspectPathOccurrences(account([[10,10],[10,10]],[[10,10],[10,10],[10,10]]),.001);assert.equal(r.occurrences.length,3);assert.equal(r.occurrences.find(x=>x.endIndex===2&&x.startIndex===0).alignmentCount,'5');
 assert.equal(inspectPathOccurrences(account([[10,10],[20,10]],[[20,10],[10,10]]),.001).status,'no-occurrence');
 assert.equal(inspectPathOccurrences(account([[10,10],[20,10]],[[70,70],[80,70]]),1).status,'no-occurrence');
});
test('missing observations split target coverage and never shorten the complete pattern',()=>{
 const r=inspectPathOccurrences(account([[10,10],[20,10]],[[10,10],[20,10],[30,10],[10,10],[20,10]],[2]),.001);
 assert.deepEqual(ids(r),[[0,1],[3,4]]);assert.equal(r.candidateCount,2);assert.deepEqual(r.missingSecondMomentIds,['moment-2']);witness(r);
 const raw=account([[10,10],[20,10]],[[10,10],[20,10]]);raw.paths[0].samples[0].markId=null;assert.equal(inspectPathOccurrences(raw,1).status,'missing-pattern-observations');
});
test('160 held-back original-source cases match exhaustive enumeration for every interval',()=>{
 let seed=6917223;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let trial=0;trial<160;trial++){
  const a=Array.from({length:2+random()%3},()=>[10+random()%5,10+random()%5]),b=Array.from({length:2+random()%4},()=>[10+random()%5,10+random()%5]),bound=(random()%8)/2;
  const r=inspectPathOccurrences(account(a,b),bound),expected=[];
  for(let start=0;start<b.length-1;start++)for(let end=start+1;end<b.length;end++){const count=oracle(r.paths[0].samples.map(s=>s.position),r.paths[1].samples.slice(start,end+1).map(s=>s.position),bound);if(count!=='0')expected.push({start,end,count});}
  assert.deepEqual(r.occurrences.map(o=>({start:o.startIndex,end:o.endIndex,count:o.alignmentCount})),expected);witness(r);
 }
});
test('full capacity preserves all 66 intervals without enumerating millions of pairings',()=>{
 const points=Array.from({length:12},()=>[20,20]),r=inspectPathOccurrences(account(points,points),.001);
 assert.equal(r.candidateCount,66);assert.equal(r.occurrences.length,66);assert.equal(r.occurrences.find(o=>o.startIndex===0&&o.endIndex===11).alignmentCount,'45046719');witness(r);
});
test('a single observed target sample is outside the declared positive-duration candidate domain',()=>{
 const r=inspectPathOccurrences(account([[10,10],[10,10]],[[10,10],[10,10]],[1]),.001);
 assert.equal(r.status,'no-observed-interval');assert.equal(r.candidateCount,0);assert.deepEqual(r.occurrences,[]);assert.match(r.boundary,/at least two selected samples/);
});
test('raw query replay recomputes, refuses invalid bounds and mismatched dimensions',()=>{
 const raw=account([[10,10],[20,10]],[[60,60],[70,60]]),study=createPathOccurrenceStudy(raw,1),before=JSON.stringify(study);
 const forged={...study,occurrences:[{startIndex:0,endIndex:1}],status:'occurrences'};
 const reopened=importPathOccurrenceStudy(forged);assert.deepEqual(reopened,study);assert.equal(inspectPathOccurrences(reopened.comparison,reopened.maxDistanceMm).status,'no-occurrence');assert.equal(JSON.stringify(study),before);
 for(const bound of [null,-1,1001,Infinity,NaN,'1'])assert.throws(()=>inspectPathOccurrences(raw,bound));
 const changed=createPathComparison(raw.paths[0],pathAccount(pathFixture([[10,10],[20,10]],{widths:[200,200]})),declaration);assert.throws(()=>inspectPathOccurrences(changed,1),/identical declared/);
});
