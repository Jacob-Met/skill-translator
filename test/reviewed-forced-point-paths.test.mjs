import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {calibrate,toImage} from '../src/geometry.mjs';
import {createSequencePath} from '../src/sequence-path.mjs';
import {proposeSequencePointChoices,reviewSequencePointChoice} from '../src/sequence-point-proposals.mjs';
import {createReviewedPointPaths} from '../src/reviewed-point-paths.mjs';
import {createReviewedForcedPointPaths,importReviewedForcedPointPaths,inspectReviewedForcedPointPaths} from '../src/reviewed-forced-point-paths.mjs';
function fixture(){
 const source=JSON.parse(readFileSync(new URL('./fixtures/point-choice-sequence.json',import.meta.url)));
 for(const [i,m]of source.moments.entries()){const h=calibrate(m.calibratedTask.source.corners);[[50,10],[50,30],[30,60],[70,60]].forEach(([x,y],j)=>{const a=i*Math.PI/12,dx=x-50,dy=y-50;m.calibratedTask.landmarks[j].sourcePx=toImage(h,(50+dx*Math.cos(a)-dy*Math.sin(a)+i)/100,(50+dx*Math.sin(a)+dy*Math.cos(a))/100);});}
 const query={anchorMomentId:'moment-0',anchorMarkId:'local-0-0',momentIds:source.moments.map(m=>m.id),deviationMm:1e-6,maxStates:20000};
 const proposal=proposeSequencePointChoices(source,query),choices=proposal.rows.slice(1).map(row=>reviewSequencePointChoice(source,query,row.momentId,{semanticCorrespondenceConfirmed:true}));
 const seed=createSequencePath(source,{label:'Authored seed-specific role',reference:{samePlaneAndCorners:true,label:'Authored plane',basis:'Independently declared original plane'},samples:[choices[0].anchor,...choices.map(c=>c.sample)]});
 const reviews=proposal.rows.slice(1).map(row=>({momentId:row.momentId,semanticForcedPairsConfirmed:true,pairs:row.report.forcedPairs}));
 return {source,query,choices,seed,reviews,study:createReviewedForcedPointPaths(seed,query,reviews)};
}
test('one explicit forced-subset review per frame yields another distinct ordinary original-point path',()=>{
 const {study}=fixture(),before=JSON.stringify(study),r=inspectReviewedForcedPointPaths(study);
 assert.deepEqual(r.sharedForcedReferenceIds,['local-0-0','local-0-1']);assert.deepEqual(r.excludedReferenceIds,['local-0-2','local-0-3']);assert.equal(r.paths.length,1);assert.equal(r.reviewedFrameCount,3);
 assert.ok(Math.abs(r.paths[0].findings.sampledPathDistanceMm-18.41582645849501)<1e-8);assert.equal(r.paths[0].path.samples.length,4);
 assert.equal(r.paths[0].path.label,study.seed.sequence.moments[0].calibratedTask.landmarks[1].label);assert.notEqual(r.paths[0].path.label,study.seed.label);
 assert.deepEqual(r.paths[0].path.sequence,study.seed.sequence);assert.deepEqual(r.paths[0].path.reference,study.seed.reference);assert.equal(JSON.stringify(study),before);
});
test('anchor-only or incomplete review does not create a retained subset or complete mapping',()=>{
 const {seed,query,choices,reviews}=fixture();assert.throws(()=>createReviewedForcedPointPaths(seed,query,choices));assert.throws(()=>createReviewedPointPaths(seed,choices));
 const bad=structuredClone(reviews);bad[0].semanticForcedPairsConfirmed=false;assert.throws(()=>createReviewedForcedPointPaths(seed,query,bad),/Explicitly review/);
 bad[0]=reviews[0];bad.pop();assert.throws(()=>createReviewedForcedPointPaths(seed,query,bad),/one explicit/);
});
test('unforced, omitted, duplicate or changed pairs cannot be promoted',()=>{
 const {study}=fixture();
 for(const mutate of [r=>r.reviews[0].pairs.push({referenceId:'local-0-2',observationId:'local-1-2'}),r=>r.reviews[0].pairs.pop(),r=>r.reviews[0].pairs[1]=r.reviews[0].pairs[0],r=>r.reviews[0].pairs[0].observationId='local-1-3']){const bad=structuredClone(study);mutate(bad);assert.throws(()=>importReviewedForcedPointPaths(bad),/recomputed forced/);}
});
test('changed original geometry, exhausted search and edited seed identity are recomputed refusals',()=>{
 const {study}=fixture();
 const low=structuredClone(study);low.maxStates=1;assert.throws(()=>importReviewedForcedPointPaths(low),/Complete search/);
 const changed=structuredClone(study);changed.seed.sequence.moments[1].calibratedTask.landmarks[0].sourcePx.x+=30;assert.throws(()=>importReviewedForcedPointPaths(changed));
 const wrong=structuredClone(study);wrong.seed.samples[1].markId='local-1-1';assert.throws(()=>importReviewedForcedPointPaths(wrong),/seed choices/);
 const noPlane=structuredClone(study);noPlane.seed.reference.samePlaneAndCorners=false;assert.throws(()=>importReviewedForcedPointPaths(noPlane));
});
test('a broadened discrepancy cannot fill missing forced identities',()=>{
 const {seed,query,reviews}=fixture();assert.throws(()=>createReviewedForcedPointPaths(seed,{...query,deviationMm:1000},reviews),/Complete search/);
});
test('source-only replay ignores derived claims and preserves canonical original review order',()=>{
 const {study}=fixture(),raw=JSON.parse(JSON.stringify(study));raw.paths=[{referenceMarkId:'local-0-3'}];raw.sharedForcedReferenceIds=['local-0-3'];raw.reviews.reverse();raw.reviews.forEach(r=>r.pairs.reverse());
 assert.deepEqual(importReviewedForcedPointPaths(raw),study);assert.deepEqual(inspectReviewedForcedPointPaths(raw),inspectReviewedForcedPointPaths(study));
 const bad=structuredClone(study);bad.seed.sequence.moments[1].calibratedTask.source.image.sha256='f'.repeat(64);assert.throws(()=>importReviewedForcedPointPaths(bad),/match/);
});
test('subset producer requires its separate all-pair review and returns only original forced pairs',async()=>{
 const {reviewSequenceForcedSubset}=await import('../src/sequence-point-proposals.mjs');const {source,query}=fixture();
 assert.throws(()=>reviewSequenceForcedSubset(source,query,'moment-1'),/every offered forced pair/);
 const r=reviewSequenceForcedSubset(source,query,'moment-1',{semanticForcedPairsConfirmed:true});
 assert.equal(r.reviewedMapping,undefined);assert.equal(r.forcedSubsetReview.pairs.length,2);assert.equal(r.forcedSubsetReview.semanticForcedPairsConfirmed,true);
 assert.equal(r.sample.markId,'local-1-0');assert.deepEqual(r.forcedSubsetQuery,{anchorMomentId:query.anchorMomentId,deviationMm:query.deviationMm,maxStates:query.maxStates});
});
test('one newly ambiguous frame excludes identities forced in the other original frames',()=>{
 const {source,query}=fixture(),p=[[50,72],[65,19],[48,20],[21,32]],q=[[54,73],[66,19],[46,15],[25,29]];
 for(const [i,m]of source.moments.entries()){const h=calibrate(m.calibratedTask.source.corners);(i===2?q:p).forEach(([x,y],j)=>m.calibratedTask.landmarks[j].sourcePx=toImage(h,x/100,y/100));}
 const changedQuery={...query,deviationMm:10},proposal=proposeSequencePointChoices(source,changedQuery),choices=proposal.rows.slice(1).map(r=>reviewSequencePointChoice(source,changedQuery,r.momentId,{semanticCorrespondenceConfirmed:true}));
 assert.deepEqual(proposal.rows.slice(1).map(r=>r.report.forcedPairs.length),[4,2,4]);
 const seed=createSequencePath(source,{label:'Selected original anchor',reference:{samePlaneAndCorners:true,label:'Authored fixed plane',basis:'Independent original plane declaration'},samples:[choices[0].anchor,...choices.map(r=>r.sample)]});
 const reviews=proposal.rows.slice(1).map(r=>({momentId:r.momentId,semanticForcedPairsConfirmed:true,pairs:r.report.forcedPairs}));
 const result=inspectReviewedForcedPointPaths(createReviewedForcedPointPaths(seed,changedQuery,reviews));
 assert.deepEqual(result.sharedForcedReferenceIds,['local-0-0','local-0-2']);assert.deepEqual(result.excludedReferenceIds,['local-0-1','local-0-3']);assert.deepEqual(result.paths.map(p=>p.referenceMarkId),['local-0-2']);
});
