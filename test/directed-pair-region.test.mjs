import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice} from '../src/practice.mjs';
import {inspectDirectedPairRegion,createDirectedPairRegion,importDirectedPairRegion} from '../src/directed-pair-region.mjs';
import {calibrate,fromImage} from '../src/geometry.mjs';
const corners=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
const demo={source:{widthMm:100,heightMm:100,corners},landmarks:[{id:'a',label:'A',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:2},{id:'b',label:'B',sourcePx:{x:40,y:30},kind:'fraction',toleranceMm:2}]};
const setup={demo,widthMm:100,heightMm:100,session:createPractice(demo,100,100)};
const observation={schema:'skill-translator-learner-observation/v1',image:{name:'authored.png',sha256:'a'.repeat(64),widthPx:100,heightPx:100,mimeType:'image/png',pixelCoordinates:'browser-oriented'},calibration:{widthMm:100,heightMm:100,corners},evidenceClass:'authored-image-control',points:[{id:'a',pixel:{x:20,y:30}},{id:'b',pixel:{x:40,y:30}}]};

const rule={id:'spacing',label:'Spacing',from:'a',to:'b',kind:'horizontal',toleranceMm:.5};
const declarations=[{id:'a',halfWidthPx:1,halfHeightPx:1},{id:'b',halfWidthPx:1,halfHeightPx:1}];
test('complete axis extrema, independently sampled perspective witnesses and dispositions',()=>{
const before=JSON.stringify({setup,observation});
for(const kind of ['horizontal','vertical'])for(const corners of [observation.calibration.corners,[{x:0,y:0},{x:90,y:0},{x:80,y:100},{x:10,y:100}]]){
 const obs=structuredClone(observation);obs.calibration.corners=corners;
 const r=inspectDirectedPairRegion(setup,obs,{...rule,kind},declarations),h=calibrate(corners),values=[];
 for(let a=0;a<9;a++)for(let b=0;b<9;b++){
  const positions=[a,b].map((n,i)=>{const center=obs.points[i].pixel;return fromImage(h,{x:center.x-1+n%3,y:center.y-1+Math.floor(n/3)});});
  const value=100*(kind==='horizontal'?positions[1].u-positions[0].u:positions[1].v-positions[0].v);assert.ok(value>=r.minMm-1e-8&&value<=r.maxMm+1e-8);values.push(value);
 }
 assert.ok(Math.abs(Math.min(...values)-r.minMm)<1e-8);assert.ok(Math.abs(Math.max(...values)-r.maxMm)<1e-8);
}
assert.equal(JSON.stringify({setup,observation}),before);
assert.equal(inspectDirectedPairRegion(setup,observation,rule,declarations).status,'unresolved');
assert.equal(inspectDirectedPairRegion(setup,observation,{...rule,toleranceMm:3},declarations).status,'all-within');
const shifted=structuredClone(observation);shifted.points[1].pixel.x=50;assert.equal(inspectDirectedPairRegion(setup,shifted,rule,declarations).status,'all-outside');
assert.throws(()=>inspectDirectedPairRegion(setup,observation,{...rule,kind:'distance'},declarations));

});
test('raw source binding, zero-region parity, missing/refused regions and custody',()=>{
 const b=createDirectedPairRegion(setup,observation,rule,declarations),before=JSON.stringify(b);
 assert.deepEqual(importDirectedPairRegion({...b,derived:{status:'all-within'}}),b);
 const changed=structuredClone(b);changed.observation.points[0].pixel.x++;
 assert.throws(()=>importDirectedPairRegion(changed),/differs/);
 const zero=declarations.map(d=>({...d,halfWidthPx:0,halfHeightPx:0}));
 const z=inspectDirectedPairRegion(setup,observation,rule,zero);assert.equal(z.status,'all-within');assert.equal(z.minMm,z.maxMm);
 const missing=structuredClone(observation);missing.points.pop();assert.throws(()=>inspectDirectedPairRegion(setup,missing,rule,declarations),/no retained/);
 assert.throws(()=>inspectDirectedPairRegion(setup,observation,rule,[{...declarations[0],halfWidthPx:1000},declarations[1]]),/inside/);
 assert.throws(()=>inspectDirectedPairRegion(setup,observation,rule,declarations.toReversed()),/order/);
 const tangent=inspectDirectedPairRegion(setup,observation,{...rule,toleranceMm:2},declarations);assert.equal(tangent.status,'unresolved');
 assert.equal(JSON.stringify(b),before);
});
