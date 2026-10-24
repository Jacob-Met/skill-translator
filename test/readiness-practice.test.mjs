import test from 'node:test';import assert from 'node:assert/strict';
import {practiceReadinessFixture} from './readiness-practice-fixture.mjs';
import {inspectReadinessPractice} from '../src/readiness-practice.mjs';
import {createReadiness,importReadiness,recordReadiness,readinessFindings,READINESS_FORMAT} from '../src/task-readiness.mjs';
import {observePractice,placePractice,retryPractice} from '../src/practice.mjs';
const add=(f,session,study=f.study)=>recordReadiness(f.sequence,study,{type:'practice',stepId:'prepare',checkId:'completion',note:'Authored source-bound software control',session});
const result=(f,s)=>readinessFindings(f.sequence,s).steps[0].checks[0].observation;
test('raw practice evidence recomputes incomplete, pass and fail without changing either source',()=>{
 const f=practiceReadinessFixture(),original=structuredClone(f);
 assert.equal(result(f,add(f,f.session)).value,'unknown');assert.equal(result(f,add(f,f.passing)).value,'pass');
 const failed=structuredClone(f.passing);failed.attempts[0].xMm+=3;failed.passed=true;
 const report=result(f,add(f,failed));assert.equal(report.value,'fail');assert.equal(report.practice.evaluation.results[0].evaluation.errorMm,3);assert.equal(report.practice.evaluation.results[0].provenance,'manual placement');assert.deepEqual(f,original);
});
test('known failure remains failed even with another placement missing; prior rounds never fill current gaps',()=>{
 const f=practiceReadinessFixture(),partial=structuredClone(f.passing);partial.attempts=[{id:'center',xMm:83,yMm:45}];assert.equal(result(f,add(f,partial)).value,'fail');
 const retried=retryPractice(f.demo,160,90,f.passing);assert.equal(result(f,add(f,retried)).value,'unknown');assert.equal(result(f,add(f,retried)).practice.evaluation.placed,0);
});
test('source, tolerance, target dimensions and manual-result bypass refuse transactionally',()=>{
 const f=practiceReadinessFixture(),original=structuredClone(f.study);
 for(const mutate of [s=>s.reference.source.image.sha256='f'.repeat(64),s=>s.reference.landmarks[0].toleranceMm=50,s=>s.reference.target.widthMm=161]){const wrong=structuredClone(f.passing);mutate(wrong);assert.throws(()=>add(f,wrong),/differ/);}
 assert.throws(()=>recordReadiness(f.sequence,f.study,{type:'observe',stepId:'prepare',checkId:'completion',value:'pass',note:'bypass',evidenceClass:'reported-observation'}),/raw practice/);
 assert.deepEqual(f.study,original);
});
test('raw replay ignores forged outcomes and keeps v1 studies unchanged; v1 cannot hide new binding',()=>{
 const f=practiceReadinessFixture(),saved=add(f,f.session);saved.events[0].value='pass';saved.events[0].practice={value:'pass'};saved.steps=[{complete:true}];
 assert.equal(result(f,importReadiness(f.sequence,saved)).value,'unknown');
 const defs=structuredClone(f.definitions);delete defs[0].checks[0].placement;
 const v1=createReadiness(f.sequence,f.prerequisites,defs);assert.equal(v1.format,READINESS_FORMAT);assert.deepEqual(importReadiness(f.sequence,v1),v1);
 saved.format=READINESS_FORMAT;assert.throws(()=>importReadiness(f.sequence,saved),/v2/);
});
test('geometric revision invalidates dependent completion while retaining original evidence events',()=>{
 const f=practiceReadinessFixture();let s=add(f,f.passing);
 s=recordReadiness(f.sequence,s,{type:'observe',stepId:'align',checkId:'completion',value:'pass',note:'Authored downstream report',evidenceClass:'authored-example'});
 assert.equal(readinessFindings(f.sequence,s).steps[1].complete,true);
 s=add(f,f.session,s);assert.equal(readinessFindings(f.sequence,s).steps[1].ready,false);assert.equal(readinessFindings(f.sequence,s).steps[1].checks[0].observation,null);assert.deepEqual(s.events[0].session,f.passing);assert.equal(s.events.length,3);
});
test('photo annotation provenance and explicit manual detach survive source-bound replay',()=>{
 const f=practiceReadinessFixture(),image={...f.sequence.moments[0].image,sha256:'f'.repeat(64)},w=image.widthPx,h=image.heightPx;
 const observation={schema:'skill-translator-learner-observation/v1',image,evidenceClass:'authored-image-control',note:'Synthetic annotation',calibration:{widthMm:160,heightMm:90,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},points:[{id:'center',pixel:{x:w/2,y:h/2}},{id:'index',pixel:{x:w/4,y:h/4}}]};
 const photo=observePractice(f.demo,160,90,f.session,observation);let evidence=result(f,add(f,photo));assert.ok(evidence.practice.evaluation.results.every(r=>r.provenance==='retained photo annotation'));assert.equal(evidence.practice.session.photoObservation.evidenceClass,'authored-image-control');
 const mixed=placePractice(f.demo,160,90,photo,'center',{xMm:83,yMm:45});evidence=result(f,add(f,mixed));assert.equal(evidence.value,'fail');assert.equal(evidence.practice.evaluation.results[0].provenance,'manual placement');assert.equal(evidence.practice.evaluation.results[1].provenance,'retained photo annotation');
});
test('unbound after-state and retained evidence resource limits refuse explicitly',()=>{
 const f=practiceReadinessFixture();assert.throws(()=>inspectReadinessPractice(f.sequence,'align',{widthMm:160,heightMm:90},f.passing),/Attach calibrated/);
 const huge={...f.session,extra:'x'.repeat(1_000_000)};assert.throws(()=>add(f,huge),/1 MB/);
});
