import {sequenceFixture} from './helpers/sequence-discovery-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathFixture} from './helpers/sampled-path-fixture.mjs';
import {appendCaptureMark} from '../src/capture.mjs';
import {attachMomentCalibration,removeMomentCalibration} from '../src/demonstration-sequence.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
import {createSequenceDiscovery,sequenceDiscoveryInputs,importSequenceDiscovery} from '../src/sequence-discovery.mjs';
import {discoverRelationships} from '../src/relationship-discovery.mjs';
const declarations={correspondenceConfirmed:true,commonFixedPlaneConfirmed:true,basis:'Same authored plane; the two marks retain corresponding IDs.',evidenceClass:'authored-example',deviationMm:0.001};
test('one original sequence reaches exact maintained pair inference without separate per-frame exports',()=>{
 const source=sequenceFixture(),before=structuredClone(source),account=createSequenceDiscovery(source,declarations),{study,sources}=sequenceDiscoveryInputs(account),result=discoverRelationships(study);
 assert.equal(result.counts.repeatable,1);assert.equal(result.counts.contradicted,2);assert.ok(Math.abs(result.candidates.find(c=>c.kind==='distance').minMm-25)<1e-9);assert.equal(sources.length,3);assert.deepEqual(source,before);assert.deepEqual(study.demonstrations.map(d=>d.annotation),source.moments.map(m=>m.calibratedTask));
});
test('new contradictory frame removes distance hypothesis; arbitrary saved findings cannot restore it',()=>{
 const source=sequenceFixture({offsets:[[15,20],[-20,15],[-30,-40]]}),raw=createSequenceDiscovery(source,declarations);raw.findings={repeatable:3};const result=discoverRelationships(sequenceDiscoveryInputs(importSequenceDiscovery(raw)).study);assert.equal(result.counts.repeatable,0);assert.equal(importSequenceDiscovery(raw).findings,undefined);
});
test('uncalibrated moments stay in original source and visibly outside inference',()=>{
 const source=removeMomentCalibration(sequenceFixture(),'moment-1'),r=sequenceDiscoveryInputs(createSequenceDiscovery(source,declarations));assert.equal(r.sources.length,2);assert.equal(r.account.sequence.moments.length,3);assert.equal(r.uncalibratedMoments[0].momentId,'moment-1');
});
test('refuse undeclared identity/reference, too little calibration, changed dimensions and oversized declarations',()=>{
 const seq=sequenceFixture();for(const patch of [{correspondenceConfirmed:false},{commonFixedPlaneConfirmed:false},{basis:''},{basis:'x'.repeat(1201)}])assert.throws(()=>createSequenceDiscovery(seq,{...declarations,...patch}));
 assert.throws(()=>createSequenceDiscovery(removeMomentCalibration(removeMomentCalibration(seq,'moment-0'),'moment-1'),declarations),/at least two/);
 const changed=structuredClone(seq);changed.moments[1].calibratedTask.source.widthMm=200;assert.throws(()=>createSequenceDiscovery(changed,declarations),/same declared/);
});
test('missing corresponding point stays incomplete, not inferred from nearby differently identified point',()=>{
 const seq=sequenceFixture();seq.moments[1].calibratedTask.landmarks[1].id='different';const r=discoverRelationships(sequenceDiscoveryInputs(createSequenceDiscovery(seq,declarations)).study);assert.equal(r.counts.repeatable,0);assert.equal(r.candidates.find(c=>c.kind==='distance').status,'incomplete');
});
test('held-out rotated translated courses preserve pair distance without choosing pairs or kinds',()=>{
 for(let i=1;i<=25;i++){const angle=i*0.217,r=7+i*.37,points=[[21,29],[49,47],[62,68]],offsets=[0,angle,angle+1.17].map(a=>[r*Math.cos(a),r*Math.sin(a)]);const result=discoverRelationships(sequenceDiscoveryInputs(createSequenceDiscovery(sequenceFixture({points,offsets}),declarations)).study);const d=result.candidates.find(c=>c.kind==='distance');assert.equal(d.status,'repeatable');assert.ok(Math.abs(d.minMm-r)<1e-9);}
});
