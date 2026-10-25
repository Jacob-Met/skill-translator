import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoveredPairReview} from '../src/discovered-pair-review.mjs';
import {importPairInterpretations,assessPairInterpretations} from '../src/pair-interpretations.mjs';
import {DISCOVERY_FORMAT} from '../src/relationship-discovery.mjs';
const annotation=(p,w=200,h=150)=>({title:'Pair custody control',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:p.map((p,i)=>({id:i?'b':'a',label:i?'B':'A',kind:'fraction',toleranceMm:1,sourcePx:{x:p[0],y:p[1]}}))});
const study=()=>({format:DISCOVERY_FORMAT,deviationMm:.001,demonstrations:[annotation([[20,30],[50,70]]),annotation([[80,40],[40,70]],240,180)].map((annotation,i)=>({id:`source-${i}`,annotation,correspondenceConfirmed:true,evidenceClass:'authored-example'}))});
const settings={widthMm:400,heightMm:300,toleranceMm:2,basis:'Investigate whether the repeatable spacing matters on this larger workpiece.'};
test('inferred candidate reaches maintained pair assessment with empty practice, independent tolerance and complete original sources',()=>{
 const raw=study(),review=createDiscoveredPairReview(raw,'a:b:distance',settings),assessment=assessPairInterpretations(review);
 assert.equal(review.schema,'skill-translator-pair-interpretations/v2');assert.equal(review.pair.toleranceMm,2);assert.equal(review.discoveryEvidence.study.deviationMm,.001);
 assert.deepEqual(review.discoveryEvidence.study,raw);assert.equal(review.session.attempts.length,0);
 assert.equal(assessment.rounds[0].fixed.status,'incomplete');assert.equal(assessment.rounds[0].adapted.status,'incomplete');assert.ok(Math.abs(assessment.sourceExpectedMm-50)<1e-9);assert.ok(Math.abs(assessment.adaptedExpectedMm-100)<1e-9);
 assert.deepEqual(importPairInterpretations(JSON.parse(JSON.stringify(review))),review);
});
test('forged, changed-reference, downgraded and missing proposal evidence cannot enter native review',()=>{
 const review=createDiscoveredPairReview(study(),'a:b:distance',settings);
 for(const mutate of [r=>r.discoveryEvidence.candidateId='a:b:horizontal',r=>r.source.title='different',r=>r.schema='skill-translator-pair-interpretations/v1',r=>delete r.discoveryEvidence,r=>r.discoveryEvidence.study.demonstrations[1].annotation.landmarks[1].sourcePx.x=200]){const r=structuredClone(review);mutate(r);assert.throws(()=>importPairInterpretations(r));}
 assert.throws(()=>createDiscoveredPairReview(study(),'a:b:horizontal',settings),/repeatable distance/);
 assert.throws(()=>createDiscoveredPairReview(study(),'a:b:distance',{...settings,toleranceMm:-1}),/tolerance/);
 assert.throws(()=>createDiscoveredPairReview(study(),'a:b:distance',{...settings,basis:''}),/basis/);
});
test('legacy native v1 pair records remain replayable without proposal provenance',()=>{
 const review=createDiscoveredPairReview(study(),'a:b:distance',settings);delete review.discoveryEvidence;review.schema='skill-translator-pair-interpretations/v1';assert.equal(importPairInterpretations(review).schema,review.schema);
});
