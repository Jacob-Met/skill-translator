import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFixedMotion,declaredProperOrientation} from '../src/fixed-motion.mjs';
import {motionStudy,annotation} from './helpers/shared-motion-fixture.mjs';
import {rational as q,add,mul,cmp} from '../vendor/chronos/exact-halfplanes.mjs';
const selection={fromSourceId:'source-0',toSourceId:'source-1',ids:['p0','p1','p2'],orientation:{a:1,b:0}};
test('explicit fixed orientation certifies the feasible translation rejected by the separate LS maximum',()=>{
 const raw=motionStudy([[[0,0],[10,0],[20,0]],[[0,0],[10,0],[23,0]]],1.6),before=JSON.stringify(raw);
 const r=inspectFixedMotion(raw,selection);assert.equal(r.status,'common-position');
 assert.deepEqual(r.point.xMm.exact,{numerator:'3',denominator:'2'});
 assert.equal(Math.max(...r.leastSquares.fit.residuals.map(x=>x.errorMm)),2);
 assert.equal(r.checks.length,3);assert.equal(JSON.stringify(raw),before);
 assert.equal(inspectFixedMotion({...raw,deviationMm:1.4},selection).status,'incompatible');
});
test('orientation is exactly proper and has an explicit half-turn',()=>{
 for(const o of [{a:1,b:0},{a:1,b:1},{a:0,b:1},{a:1,b:-1},{a:2,b:1},{a:-999999,b:1000000}]){
  const {c,s}=declaredProperOrientation(o);assert.equal(cmp(add(mul(c,c),mul(s,s)),q(1)),0);
 }
 for(const o of [{a:0,b:0},{a:.5,b:1},{a:Infinity,b:0},{a:1000001,b:0}])assert.throws(()=>declaredProperOrientation(o));
});
test('fixed-orientation incompatibility is not promoted to all-motion impossibility',()=>{
 const raw=motionStudy([[[20,20],[30,20],[20,30]],[[80,20],[80,30],[70,20]]],0);
 assert.equal(inspectFixedMotion(raw,selection).status,'incompatible');
 assert.equal(inspectFixedMotion(raw,{...selection,orientation:{a:1,b:1}}).status,'common-position');
});
test('budget refusal has no partial certificate and source/point admission stays explicit',()=>{
 const raw=motionStudy([[[20,20],[30,20],[20,30]],[[22,21],[32,21],[22,31]]],.01);
 for(const maxWork of [0,1,3]){const r=inspectFixedMotion(raw,selection,{maxWork});assert.equal(r.status,'unresolved');assert.equal(r.point,undefined);assert.equal(r.certificate,undefined);}
 for(const s of [{...selection,ids:['p0','p0']},{...selection,ids:['p0','missing']},{...selection,toSourceId:'source-0'},{...selection,fromSourceId:'absent'}])assert.throws(()=>inspectFixedMotion(raw,s));
});
test('non-cardinal exact orientation, repeated points and true missing observations retain their distinct meanings',()=>{
 const frames=[[[20,20],[25,20],[20,25]],[[96,78],[99,82],[92,81]]];
 const raw=motionStudy(frames,0);raw.demonstrations.forEach((d,i)=>d.annotation=annotation(frames[i],{width:256,height:256}));
 const r=inspectFixedMotion(raw,{...selection,orientation:{a:2,b:1}});assert.equal(r.status,'common-position');
 assert.deepEqual(r.point.xMm.exact,{numerator:'100',denominator:'1'});assert.deepEqual(r.point.yMm.exact,{numerator:'50',denominator:'1'});
 const missing=structuredClone(raw);missing.demonstrations[1].annotation.landmarks.pop();assert.throws(()=>inspectFixedMotion(missing,selection),/observed/);
 const repeated=motionStudy([[[20,20],[20,20],[20,20]],[[22,21],[22,21],[22,21]]],0);
 const d=inspectFixedMotion(repeated,selection);assert.equal(d.status,'common-position');assert.equal(d.leastSquares.fit,null);
});
