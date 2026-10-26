import test from 'node:test';
import assert from 'node:assert/strict';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
import {inspectSequencePath} from '../src/sequence-path.mjs';
import {createPathRegions} from '../src/path-regions.mjs';
import {inspectPathReturnSupport} from '../src/path-return-support.mjs';
function study(points,r,threshold=1,missing=[]){
 const path=pathAccount(pathFixture(points),missing),samples=inspectSequencePath(path).samples;
 return createPathRegions(path,samples.map(s=>({momentId:s.momentId,rectangle:s.position?{
  xMin:s.position.xMm-r,xMax:s.position.xMm+r,yMin:s.position.yMm-r,yMax:s.position.yMm+r,basis:'Authored independent planar bounds'}:null})),threshold);
}
test('same nominal excursion is universal with narrow regions and unresolved with broad ones',()=>{
 const points=[[20,20],[25,20],[20.05,20.05]],narrow=study(points,.2),broad=study(points,2);
 const before=JSON.stringify(narrow),a=inspectPathReturnSupport(narrow),b=inspectPathReturnSupport(broad);
 assert.equal(a.proposals[0].status,'universally-supported-excursion');
 assert.equal(b.proposals[0].status,'unresolved');
 assert.deepEqual(a.nominal,b.nominal);assert.equal(a.proposals[0].departureWitnesses[0].toMomentId,'moment-1');
 assert.equal(JSON.stringify(narrow),before);assert.deepEqual(inspectPathReturnSupport(JSON.parse(before)),a);
});
test('missing positions, monotone travel and no departure remain absent, not supported',()=>{
 for(const raw of [study([[20,20],[25,20],[20,20]],.1,1,[1]),study([[20,20],[25,20],[30,20]],.1),study([[20,20],[20,20],[20,20]],.1)])
  assert.equal(inspectPathReturnSupport(raw).proposals.length,0);
});
test('exact endpoint equality is supported; departure equality is never strict outside',()=>{
 const raw=study([[20,20],[30,20],[20,20]],.1,5);
 for(const i of [0,2])raw.declarations[i].rectangle={xMin:19,xMax:23,yMin:19,yMax:22,basis:'Authored 3-4-5 diagonal'};
 let f=inspectPathReturnSupport(raw);assert.equal(f.proposals[0].status,'universally-supported-excursion');
 assert.deepEqual(f.proposals[0].endpoint.range.maximum.squared,{numerator:'25',denominator:'1'});
 const equal=study([[20,20],[23,20],[20,20]],.1,1);
 equal.declarations[0].rectangle={xMin:19,xMax:21,yMin:19,yMax:21,basis:'Authored box'};
 equal.declarations[1].rectangle={xMin:22,xMax:24,yMin:19,yMax:21,basis:'Authored box'};
 f=inspectPathReturnSupport(equal);assert.equal(f.proposals[0].interior[0].allOutside,false);
 assert.deepEqual(f.proposals[0].interior[0].range.minimum.squared,{numerator:'1',denominator:'1'});
 assert.equal(f.proposals[0].status,'unresolved');
});
test('all original interior witnesses remain inspectable rather than only the nominal farthest',()=>{
 const raw=study([[20,20],[25,20],[30,20],[20,20]],.1);
 raw.declarations[2].rectangle={xMin:19,xMax:31,yMin:19,yMax:21,basis:'Broad declared farthest reading'};
 const p=inspectPathReturnSupport(raw).proposals[0];
 assert.equal(p.nominal.farthest.momentId,'moment-2');assert.equal(p.status,'universally-supported-excursion');
 assert.deepEqual(p.departureWitnesses.map(w=>w.toMomentId),['moment-1']);assert.equal(p.interior.length,2);
});
test('changed identity/region and forged saved conclusions cannot supply a certificate',()=>{
 const raw=study([[20,20],[25,20],[20,20]],.1),bad=structuredClone(raw);bad.declarations[1].momentId='foreign';
 assert.throws(()=>inspectPathReturnSupport(bad));
 bad.declarations[1].momentId='moment-1';bad.declarations[1].rectangle.xMin=100;assert.throws(()=>inspectPathReturnSupport(bad));
 const broad=study([[20,20],[25,20],[20,20]],2);broad.status='universally-supported-excursion';
 assert.equal(inspectPathReturnSupport(broad).proposals[0].status,'unresolved');
});
test('universal excursion does not certify the nominal first-return time',()=>{
 const raw=study([[20,20],[25,20],[22,20],[20,20]],.1);
 raw.declarations[2].rectangle={xMin:19.9,xMax:22.1,yMin:19.9,yMax:20.1,basis:'May already have returned before final nominal sample'};
 const p=inspectPathReturnSupport(raw).proposals[0];
 assert.equal(p.nominal.toMomentId,'moment-3');assert.equal(p.status,'universally-supported-excursion');
 assert.equal(p.interior[1].allOutside,false);assert.equal(p.interior[1].allInside,false);
 // A coherent allowed path 20→25→20→20 returns at moment-2. The certificate
 // only establishes departure and eventual return; it must not assert timing.
 assert.match(inspectPathReturnSupport(raw).boundary,/does not certify the first return time/);
});
test('certificates survive independently sampled coherent shared-start assignments',()=>{
 let seed=938,certified=0,assignments=0;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 for(let c=0;c<40;c++){
  const raw=study([[20,20],[22+rand()*7,20+rand()*3],[20+rand()*.4,20+rand()*.4]],.05+rand()*.7);
  const result=inspectPathReturnSupport(raw),p=result.proposals[0];if(p?.status!=='universally-supported-excursion')continue;certified++;
  const pick=r=>({x:r.xMin+rand()*(r.xMax-r.xMin),y:r.yMin+rand()*(r.yMax-r.yMin)});
  for(let i=0;i<100;i++){
   const points=raw.declarations.map(d=>pick(d.rectangle)),a=points[p.nominal.fromIndex],b=points[p.nominal.toIndex];
   assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<=1);
   for(const witness of p.departureWitnesses){const d=points[raw.declarations.findIndex(d=>d.momentId===witness.toMomentId)];assert.ok(Math.hypot(a.x-d.x,a.y-d.y)>1);}assignments++;
  }
 }
 assert.ok(certified>0);assert.ok(assignments>=100);
});
