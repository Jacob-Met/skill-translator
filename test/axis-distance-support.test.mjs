import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rational as q,cmp,mul} from '../vendor/chronos/exact-halfplanes.mjs';
import {exactAxisCandidates,sqrtEnclosure} from '../src/axis-distance-support.mjs';
const p=[[19,23],[43,31],[29,71],[103,89]],order=[2,0,3,1];
test('signed and rotated inputs preserve magnitude-only correspondence without an inferred orientation',()=>{
 for(const signs of [[1,1],[-1,1],[1,-1],[-1,-1]])for(const angle of [0,.42]){
  const target=order.map(i=>{const x=signs[0]*1.6*p[i][0],y=signs[1]*1.3*p[i][1];return[300+x*Math.cos(angle)-y*Math.sin(angle),200+x*Math.sin(angle)+y*Math.cos(angle)];});
  const result=exactAxisCandidates(p,target);assert.equal(result.status,'unique-with-conservative-witness');assert.deepEqual(result.mappings[0].mapping,p.map((_,i)=>order.indexOf(i)));assert.ok(result.mappings[0].hasConservativeWitness);assert.match(result.qualification,/no orientation, sign/);
 }
});
test('norm enclosures are certified by exact rational predicates and refuse unsupported numeric resolution',()=>{
 for(const number of [0,1,2,2500,1e-100,1e100]){const value=q(number),bounds=sqrtEnclosure(value);assert.ok(cmp(mul(bounds.lower,bounds.lower),value)<=0);assert.ok(cmp(mul(bounds.upper,bounds.upper),value)>=0);}
 assert.deepEqual(sqrtEnclosure(q(2500)),{lower:q(50),upper:q(50)});assert.throws(()=>sqrtEnclosure(mul(q(1e-320),q(1e-320))),/enclosure support/);
});
test('complete mapping sets match12 unfamiliar authored cases independently checked with288 linear programs',()=>{
 // Independent floating LP outputs are a separate crosscheck, not the proof of
 // exact clipping, certified norm bounds or physical semantic correspondence.
 const cases=JSON.parse(readFileSync(new URL('./fixtures/axis-correspondence-oracle.json',import.meta.url)));
 for(const {p,q:target,mappings}of cases){const result=exactAxisCandidates(p,target);assert.equal(result.complete,true);assert.equal(result.count,mappings.length);assert.deepEqual(result.mappings.map(row=>row.mapping),mappings);}
});
