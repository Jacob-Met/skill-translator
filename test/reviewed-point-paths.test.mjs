import test from 'node:test';import assert from 'node:assert/strict';
import {createReviewedPointPaths,importReviewedPointPaths,inspectReviewedPointPaths} from '../src/reviewed-point-paths.mjs';
import {createSequencePath,importSequencePath} from '../src/sequence-path.mjs';
import {validateCapturedDemo} from '../src/capture.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
import {createReviewedSpatialMapping,SCALED_SPATIAL_CORRESPONDENCE_FORMAT,COMMON_SCALE_MODEL} from '../src/spatial-correspondence.mjs';
import {reviewedPointFixture,reviewedPointSource} from './helpers/reviewed-point-path-fixture.mjs';
test('three existing complete reviews yield three different complete ordinary paths without new point choices',()=>{
 const {seed,reviews}=reviewedPointFixture(),before=JSON.stringify({seed,reviews}),r=inspectReviewedPointPaths(createReviewedPointPaths(seed,reviews));
 assert.equal(r.reviewedMappingCount,3);assert.equal(r.paths.length,3);assert.deepEqual(r.paths.map(x=>x.path.samples.map(s=>s.markId)),[['local-0-1','local-1-0','local-2-3','local-3-2'],['local-0-2','local-1-3','local-2-1','local-3-0'],['local-0-3','local-1-1','local-2-2','local-3-3']]);
 assert.deepEqual(r.paths.map(x=>Number(x.findings.sampledPathDistanceMm.toFixed(6))),[48.030096,41.878696,49.785811]);
 for(const {path,findings}of r.paths){assert.ok(findings.complete);assert.equal(findings.samples.length,4);assert.deepEqual(importSequencePath(JSON.parse(JSON.stringify(path))),path);assert.deepEqual(path.sequence,seed.sequence);assert.deepEqual(path.reference,seed.reference);}
 assert.equal(JSON.stringify({seed,reviews}),before);
});
test('seed point-specific labels and bases are never transferred to other points',()=>{
 const {seed,reviews}=reviewedPointFixture();seed.label='SEED_ONLY_PURPOSE';seed.samples.forEach(s=>s.basis='SEED_ONLY_POINT_MEANING');
 const r=inspectReviewedPointPaths(createReviewedPointPaths(seed,reviews));assert.equal(r.study.seed.label,seed.label);
 for(const {path,referenceMarkId}of r.paths){assert.equal(path.label,seed.sequence.moments[0].calibratedTask.landmarks.find(m=>m.id===referenceMarkId).label);assert.ok(!path.samples.some(s=>s.basis.includes('SEED_ONLY')));assert.ok(!path.label.includes('SEED_ONLY'));}
});
test('full reviewed records and unchanged original sources are required; basis text is insufficient',()=>{
 const {seed,reviews}=reviewedPointFixture();assert.throws(()=>createReviewedPointPaths(seed,reviews.slice(1)));assert.throws(()=>createReviewedPointPaths(seed,seed.samples.slice(1).map(s=>({basis:s.basis}))));
 for(const change of [r=>r[0].reviewedMapping.semanticCorrespondenceConfirmed=false,r=>r[0].reviewedMapping.pairs[0].observationId='forged',r=>r[1]=structuredClone(r[0])]){const r=structuredClone(reviews);change(r);assert.throws(()=>createReviewedPointPaths(seed,r));}
 for(const change of [s=>s.sequence.moments[1].calibratedTask.landmarks[1].label='Changed another point',s=>s.sequence.moments[1].calibratedTask.landmarks[0].sourcePx.x+=2]){const s=structuredClone(seed);change(s);assert.throws(()=>createReviewedPointPaths(s,reviews));}
});
test('author corrections, missing identities and withdrawn independent frame declarations are not overwritten',()=>{
 const {seed,reviews}=reviewedPointFixture();for(const change of [s=>s.samples[1].markId='local-1-0',s=>s.samples[1].markId=null,s=>s.reference.samePlaneAndCorners=false]){const s=structuredClone(seed);change(s);const before=JSON.stringify(s);assert.throws(()=>createReviewedPointPaths(s,reviews));assert.equal(JSON.stringify(s),before);}
 const r=structuredClone(reviews);r[0].anchor.markId='local-0-1';assert.throws(()=>createReviewedPointPaths(seed,r));
});
test('non-first anchor and selected subset preserve original chronology and unselected evidence',()=>{
 const {seed,reviews}=reviewedPointFixture({anchorMomentId:'moment-1',anchorMarkId:'local-1-2',momentIds:['moment-3','moment-1','moment-0']});
 const r=inspectReviewedPointPaths(createReviewedPointPaths(seed,reviews));assert.equal(r.anchorMomentId,'moment-1');
 for(const {path,findings}of r.paths){assert.deepEqual(path.samples.map(s=>s.momentId),['moment-0','moment-1','moment-3']);assert.deepEqual(findings.unselectedMoments.map(m=>m.momentId),['moment-2']);assert.equal(path.sequence.moments.length,4);}
});
test('explicitly reviewed scale-model records retain provenance without rescaling original coordinates',()=>{
 const source=reviewedPointSource(),reference=source.moments[0].calibratedTask;
 for(let i=1;i<4;i++){const task=source.moments[i].calibratedTask,d=validateCapturedDemo(task),h=calibrate(task.source.corners),factor=[1,1.1,1.2,1.05][i];task.landmarks.forEach((mark,j)=>mark.sourcePx=toImage(h,d.landmarks[j].uv.u*factor,d.landmarks[j].uv.v*factor));}
 const reviews=source.moments.slice(1).map(m=>{const reviewedMapping=createReviewedSpatialMapping({format:SCALED_SPATIAL_CORRESPONDENCE_FORMAT,model:COMMON_SCALE_MODEL,reference,observation:m.calibratedTask,deviationMm:1e-6},{semanticCorrespondenceConfirmed:true});return {anchor:{momentId:'moment-0',markId:'local-0-0'},sample:{momentId:m.id,markId:reviewedMapping.pairs.find(p=>p.referenceId==='local-0-0').observationId},reviewedMapping};});
 const seed=createSequencePath(source,{label:'Existing independently framed point',reference:reviewedPointFixture().seed.reference,samples:[{...reviews[0].anchor,basis:'Original anchor'},...reviews.map(r=>({...r.sample,basis:'Existing reviewed identity'}))]});
 const r=inspectReviewedPointPaths(createReviewedPointPaths(seed,reviews));assert.ok(r.study.reviews.every(x=>x.reviewedMapping.study.model===COMMON_SCALE_MODEL));
 for(const {findings}of r.paths)for(const sample of findings.samples){const task=validateCapturedDemo(source.moments.find(m=>m.id===sample.momentId).calibratedTask),mark=task.landmarks.find(m=>m.id===sample.markId);assert.deepEqual(sample.position,{xMm:mark.uv.u*task.source.widthMm,yMm:mark.uv.v*task.source.heightMm});}
});
test('retained JSON reopens by recomputation and ignores forged output findings',()=>{
 const {seed,reviews}=reviewedPointFixture(),study=createReviewedPointPaths(seed,reviews),reversed=createReviewedPointPaths(seed,[...reviews].reverse());assert.deepEqual(reversed,study);assert.deepEqual(importReviewedPointPaths(JSON.parse(JSON.stringify(study))),study);
 const forged={...study,paths:[{label:'Invented path'}],findings:{complete:true}};assert.deepEqual(inspectReviewedPointPaths(forged),inspectReviewedPointPaths(study));
 assert.deepEqual(study.reviews.map(r=>r.reviewedMapping),reviews.map(r=>r.reviewedMapping));
});
