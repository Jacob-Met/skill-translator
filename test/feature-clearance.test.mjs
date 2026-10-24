import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFeatureClearance as inspect,reopenFeatureClearance,featurePracticeInput,FEATURE_SCHEMA,FEATURE_ASSUMPTION} from '../src/feature-clearance.mjs';
const source=(kind='fraction')=>({title:'Authored pair',provenance:'Synthetic analytic control',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',sourcePx:{x:20,y:50},kind,edge:'left',toleranceMm:2},{id:'b',label:'B',sourcePx:{x:40,y:50},kind,edge:'left',toleranceMm:3}]});
const features=[{id:'a',radiusMm:5},{id:'b',radiusMm:5}];
const bundle=()=>({schema:FEATURE_SCHEMA,assumption:FEATURE_ASSUMPTION,source:source(),features,requiredGapMm:10,workpieces:[{widthMm:100,heightMm:100},{widthMm:200,heightMm:100}]});
test('nominal tangency to declared gap and placement envelope are distinct',()=>{
 const r=inspect(source(),100,100,features,10),p=r.pairs[0];
 assert.equal(p.distanceMm,20);assert.equal(p.nominalGapMm,10);assert.equal(p.minimumToleranceGapMm,5);
 assert.equal(r.nominalMeets,true);assert.equal(r.toleranceEnvelopeMeets,false);
 assert.equal(inspect(source(),100,100,features,5).toleranceEnvelopeMeets,true);
 assert.equal(inspect(source(),100,100,features,10.001).nominalMeets,false);
});
test('overlap, zero radius, coincident centers and clamped minimum distance',()=>{
 const s=source();s.landmarks[1].sourcePx.x=20;
 const p=inspect(s,100,100,features,0).pairs[0];assert.equal(p.nominalGapMm,-10);assert.equal(p.minimumToleranceGapMm,-10);
 const zero=features.map(f=>({...f,radiusMm:0}));assert.equal(inspect(s,100,100,zero,0).toleranceEnvelopeMeets,true);
});
test('changed dimensions preserve fixed versus proportional source semantics',()=>{
 assert.equal(inspect(source(),200,100,features,25).nominalMeets,true);
 assert.equal(inspect(source('edge_offset_mm'),200,100,features,25).nominalMeets,false);
 assert.throws(()=>inspect(source('edge_offset_mm'),30,100,features,0),/cannot fit/);
});
test('all unordered pairs are evaluated, including diagonal geometry',()=>{
 const s=source();s.landmarks.push({...s.landmarks[0],id:'c',sourcePx:{x:20,y:80}});
 const r=inspect(s,100,100,[...features,{id:'c',radiusMm:2}],0);
 assert.equal(r.pairs.length,3);assert.equal(r.pairs.find(p=>p.from==='a'&&p.to==='c').distanceMm,30);
 assert.ok(Math.abs(r.pairs.find(p=>p.from==='b'&&p.to==='c').distanceMm-Math.hypot(20,30))<1e-9);
});
test('strict explicit input admission preserves missingness',()=>{
 for(const radius of [undefined,null,'5',-1,Infinity,NaN,10001])assert.throws(()=>inspect(source(),100,100,[{id:'a',radiusMm:radius},features[1]],0));
 for(const gap of [undefined,null,'0',-1,NaN])assert.throws(()=>inspect(source(),100,100,features,gap));
 assert.throws(()=>inspect(source(),100,100,[features[0],features[0]],0));
 assert.throws(()=>inspect(source(),100,100,[features[0]],0));
 assert.throws(()=>inspect(source(),100,100,[features[0],{id:'unknown',radiusMm:1}],0));
});
test('roundtrip retains source and declarations, never saved derived verdicts',()=>{
 const b=bundle();b.reports=[{nominalMeets:true}];const r=reopenFeatureClearance(b);
 assert.deepEqual(r.reports.map(x=>x.toleranceEnvelopeMeets),[false,true]);
 assert.deepEqual(reopenFeatureClearance(JSON.parse(JSON.stringify(r.bundle))),r);
 r.bundle.source.landmarks[0].sourcePx.x=0;assert.equal(b.source.landmarks[0].sourcePx.x,20);
 assert.throws(()=>reopenFeatureClearance({...b,assumption:'unknown'}));
 assert.throws(()=>reopenFeatureClearance({...b,workpieces:[]}));
 assert.throws(()=>reopenFeatureClearance({...b,workpieces:Array(9).fill(b.workpieces[0])}));
});
test('practice receives unchanged rules/source and selected size with empty attempts',()=>{
 const b=bundle(),before=JSON.stringify(b),input=featurePracticeInput(b,1);
 assert.deepEqual(input.demo,b.source);assert.equal(input.widthMm,200);assert.equal(input.heightMm,100);
 assert.deepEqual(input.session.attempts,[]);assert.deepEqual(input.session.history,[]);
 assert.equal(input.showGoals,false);assert.equal(JSON.stringify(b),before);
 assert.throws(()=>featurePracticeInput(b,-1));assert.throws(()=>featurePracticeInput(b,2));
});

