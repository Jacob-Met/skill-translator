import test from 'node:test';
import assert from 'node:assert/strict';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
import {createPathRegions} from '../src/path-regions.mjs';
import {inspectPathReturnSupport} from '../src/path-return-support.mjs';
const rect=(xMin,xMax)=>({xMin,xMax,yMin:19,yMax:21,basis:'Authored exact analytic region'});
function course(radius=7,missing=[]){
 const path=pathAccount(pathFixture([[15,20],[5,20],[25,20],[15,20]]),missing),bounds=[rect(10,20),rect(4,6),rect(24,26),rect(14,16)];
 return createPathRegions(path,path.samples.map((s,i)=>({momentId:s.momentId,rectangle:missing.includes(i)?null:bounds[i]})),radius);
}
const first=raw=>inspectPathReturnSupport(raw).proposals.find(p=>p.nominal.fromIndex===0);
test('pair separation certifies inevitable departure without claiming a fixed moment',()=>{
 const raw=course(),before=JSON.stringify(raw),p=first(raw);
 assert.equal(p.status,'universally-supported-excursion');assert.equal(p.departureSupport,'at-least-one-of-pair');
 assert.equal(p.departureWitnesses.length,0);assert.equal(p.alternativeDepartureWitnesses.length,1);
 assert.deepEqual(p.alternativeDepartureWitnesses[0].range.minimum.squared,{numerator:'324',denominator:'1'});
 assert.deepEqual(p.endpoint.range.maximum.squared,{numerator:'40',denominator:'1'});
 assert.deepEqual(p.alternativeDepartureWitnesses.map(w=>[w.fromMomentId,w.toMomentId]),[['moment-1','moment-2']]);
 assert.equal(JSON.stringify(raw),before);assert.deepEqual(first(JSON.parse(before)),p);
});
test('exact twice-radius equality refuses with a coherent no-departure assignment',()=>{
 const raw=course(9),p=first(raw);
 assert.equal(p.status,'unresolved');assert.equal(p.departureSupport,null);
 assert.equal(p.alternativePairComparisons[0].separationExceedsTwiceRadius,false);
 const assignment=[[15,20],[6,20],[24,20],[15,20]];
 for(let i=0;i<4;i++){const [x,y]=assignment[i],r=raw.declarations[i].rectangle;assert.ok(x>=r.xMin&&x<=r.xMax&&y>=r.yMin&&y<=r.yMax);assert.ok(Math.hypot(x-15,y-20)<=9);}
});
test('a robust pair cannot certify uncertain return or cross a missing sample',()=>{
 const raw=course();raw.declarations[3].rectangle=rect(1,30);
 const p=first(raw);assert.equal(p.status,'unresolved');assert.equal(p.departureSupport,'at-least-one-of-pair');assert.equal(p.endpoint.allInside,false);
 assert.equal(inspectPathReturnSupport(course(7,[2])).proposals.length,0);
});
test('nominal pair separation is insufficient under overlapping declared regions',()=>{
 const raw=course();raw.declarations[1].rectangle=rect(4,16);raw.declarations[2].rectangle=rect(14,26);
 const p=first(raw);assert.equal(p.status,'unresolved');assert.equal(p.alternativeDepartureWitnesses.length,0);
 assert.deepEqual(p.alternativePairComparisons[0].range.minimum.squared,{numerator:'0',denominator:'1'});
});
test('existing fixed witnesses remain primary and pair cache is bounded by66',()=>{
 const raw=course();raw.declarations[0].rectangle=rect(14,16);
 const p=first(raw);assert.equal(p.departureSupport,'fixed-moment');assert.equal(p.departureWitnesses.length,2);
 const points=Array.from({length:12},(_,i)=>[i<6||i===11?15:i%2?5:25,20]);
 const path=pathAccount(pathFixture(points));
 const broad=createPathRegions(path,path.samples.map((s,i)=>({momentId:s.momentId,rectangle:i<6||i===11?rect(10,20):points[i][0]===5?rect(4,6):rect(24,26)})),7);
 const report=inspectPathReturnSupport(broad);assert.ok(report.proposals.length>0);assert.ok(report.pairComparisons<=66);
});
test('independent coherent endpoint assignments respect the disjunctive proof',()=>{
 const raw=course(),p=first(raw);let checked=0;
 const corners=r=>[[r.xMin,r.yMin],[r.xMax,r.yMin],[r.xMax,r.yMax],[r.xMin,r.yMax]];
 for(const a of corners(raw.declarations[0].rectangle))for(const b of corners(raw.declarations[1].rectangle))
  for(const c of corners(raw.declarations[2].rectangle))for(const d of corners(raw.declarations[3].rectangle)){
   assert.ok(Math.hypot(b[0]-a[0],b[1]-a[1])>7||Math.hypot(c[0]-a[0],c[1]-a[1])>7);
   assert.ok(Math.hypot(d[0]-a[0],d[1]-a[1])<=7);checked++;
  }
 assert.equal(checked,256);assert.equal(p.status,'universally-supported-excursion');
});
