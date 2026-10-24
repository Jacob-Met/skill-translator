import {annotationContext} from '../src/annotation-bound.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createPractice} from '../src/practice.mjs';
import {inspectDirectedPairRegion,createDirectedPairRegion,importDirectedPairRegion} from '../src/directed-pair-region.mjs';
import {polygonPairDistance} from '../src/polygon-pair-distance.mjs';
const corners=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
const demo={source:{widthMm:100,heightMm:100,corners},landmarks:[{id:'a',label:'A',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:2},{id:'b',label:'B',sourcePx:{x:40,y:30},kind:'fraction',toleranceMm:2}]};
const setup={demo,widthMm:100,heightMm:100,session:createPractice(demo,100,100)};
const observation={schema:'skill-translator-learner-observation/v1',image:{name:'authored.png',sha256:'a'.repeat(64),widthPx:100,heightPx:100,mimeType:'image/png',pixelCoordinates:'browser-oriented'},calibration:{widthMm:100,heightMm:100,corners},evidenceClass:'authored-image-control',points:[{id:'a',pixel:{x:20,y:30}},{id:'b',pixel:{x:40,y:30}}]};

const rule={id:'spacing',label:'Spacing',from:'a',to:'b',kind:'distance',toleranceMm:.5};
const declarations=[{id:'a',halfWidthPx:1,halfHeightPx:1},{id:'b',halfWidthPx:1,halfHeightPx:1}];

test('complete distance criterion adds distinct useful information and raw replay',()=>{
 const st=structuredClone(setup),obs=structuredClone(observation);st.demo.landmarks[1].sourcePx.y=50;st.session=createPractice(st.demo,100,100);obs.points[1].pixel.y=50;
 const ds=declarations.map(d=>({...d,halfWidthPx:.4,halfHeightPx:.4})),r={...rule,toleranceMm:1};
 for(const kind of ['horizontal','vertical'])assert.equal(inspectDirectedPairRegion(st,obs,{...r,kind},ds).status,'all-within');
 const result=inspectDirectedPairRegion(st,obs,r,ds);assert.equal(result.status,'unresolved');assert.equal(result.approximateDisplay,true);assert.ok(result.minMm<result.referenceMm-1);assert.ok(result.maxMm>result.referenceMm+1);
 const b=createDirectedPairRegion(st,obs,r,ds);assert.deepEqual(importDirectedPairRegion({...b,derived:{status:'all-within'}}),b);
});
test('threshold equality and inherited allowance remain unresolved, zero radii preserve nominal parity',()=>{
 const ds=declarations.map(d=>({...d,halfHeightPx:0}));
 assert.equal(inspectDirectedPairRegion(setup,observation,{...rule,toleranceMm:2},ds).status,'unresolved');
 assert.equal(inspectDirectedPairRegion(setup,observation,{...rule,toleranceMm:2+1e-8},ds).status,'unresolved');
 assert.equal(inspectDirectedPairRegion(setup,observation,{...rule,toleranceMm:2+1e-5},ds).status,'all-within');
 for(const x of [40,40.5,40.5+5e-10,40.50001]){const o=structuredClone(observation);o.points[1].pixel.x=x;const r=inspectDirectedPairRegion(setup,o,rule,ds.map(d=>({...d,halfWidthPx:0})));assert.equal(r.status,r.nominal.passed?'all-within':'all-outside');}
 const far=structuredClone(observation);far.points[1].pixel.x=50;assert.equal(inspectDirectedPairRegion(setup,far,rule,ds).status,'all-outside');
});
test('overlap, touching, segments, bounded ordered admission and exact witness extrema',()=>{
 const p=(x,y)=>({x,y}),rect=(x,y)=>[p(x,y),p(x+2,y),p(x+2,y+2),p(x,y+2)];
 for(const [a,b]of [[rect(0,0),rect(1,1)],[rect(0,0),rect(2,2)],[[p(0,0),p(4,4)],[p(0,4),p(4,0)]],[[p(0,0),p(4,0)],[p(2,0),p(6,0)]]])assert.deepEqual(polygonPairDistance(a,b).minimum.squaredBounds,{lower:0,upper:0});
 assert.throws(()=>polygonPairDistance([p(0,0),p(2,2),p(0,2),p(2,0)],rect(5,5)),/convex/);
 assert.throws(()=>polygonPairDistance(Array(5).fill(p(0,0)),rect(5,5)),/four/);
 assert.throws(()=>polygonPairDistance([],rect(5,5)),/four/);
 assert.throws(()=>polygonPairDistance([p(Infinity,0)],rect(5,5)),/Finite/);
 assert.throws(()=>polygonPairDistance([p(0,0),p(1,0),p(2,0)],rect(5,5)),/segment/);
});

test('interior projection retains independently derived rational witness and squared minimum',()=>{
 const result=polygonPairDistance([{x:0,y:0},{x:3,y:1}],[{x:1,y:3}]);
 assert.deepEqual(result.minimum.squared,{numerator:'32',denominator:'5'});
 assert.deepEqual(result.minimum.witness[0],{x:{numerator:'9',denominator:'5'},y:{numerator:'3',denominator:'5'}});
 assert.deepEqual(result.maximum.squared,{numerator:'10',denominator:'1'});
 const reversed=polygonPairDistance([{x:1,y:3}],[{x:3,y:1},{x:0,y:0}]);
 assert.deepEqual(reversed.minimum.squared,result.minimum.squared);assert.deepEqual(reversed.maximum.squared,result.maximum.squared);
});

test('#123 preserves existing horizontal and vertical v1 raw notebook semantics',()=>{
 for(const [kind,minMm,maxMm,referenceMm]of [['horizontal',18,22,20],['vertical',-2,2,0]]){
  const oldRule={...rule,kind};
  // Construct the pre-distance v1 raw contract directly: no derived geometry.
  const context=annotationContext(setup,observation);const raw={schema:'skill-translator-directed-pair-region/v1',setup:context.setup,observation:context.observation,reference:{practice:context.setup.session.reference,observation:structuredClone(context.observation)},rule:oldRule,declarations};
  const before=JSON.stringify(raw),accepted=importDirectedPairRegion({...raw,derived:{status:'forged'}});
  assert.equal(accepted.schema,raw.schema);assert.equal(accepted.rule.kind,kind);assert.deepEqual(accepted.setup.session,setup.session);assert.deepEqual(accepted.declarations,declarations);
  const finding=inspectDirectedPairRegion(accepted.setup,accepted.observation,accepted.rule,accepted.declarations);
  assert.ok(Math.abs(finding.minMm-minMm)<1e-10);assert.ok(Math.abs(finding.maxMm-maxMm)<1e-10);assert.ok(Math.abs(finding.referenceMm-referenceMm)<1e-10);assert.equal(finding.status,'unresolved');assert.equal(finding.exactSquaredExtrema,undefined);
  assert.equal(JSON.stringify(raw),before);assert.equal('derived' in accepted,false);
 }
});
