import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {proposeSequencePointChoices,reviewSequencePointChoice} from '../src/sequence-point-proposals.mjs';
import {createSequencePath,inspectSequencePath,importSequencePath} from '../src/sequence-path.mjs';
const original=()=>JSON.parse(readFileSync(new URL('./fixtures/point-choice-sequence.json',import.meta.url)));
const query={anchorMomentId:'moment-0',anchorMarkId:'local-0-0',momentIds:['moment-0','moment-1','moment-2','moment-3'],deviationMm:1e-6};
const reference={samePlaneAndCorners:true,label:'Original fixed sheet',basis:'Author independently confirms fixed plane and matching corner meanings'};
test('one anchor reuses complete reviewed mappings in the unchanged path consumer',()=>{
 const source=original(),before=JSON.stringify(source),r=proposeSequencePointChoices(source,query);assert.deepEqual(r.rows.map(x=>x.status),['anchor','unique','unique','unique']);
 const reviews=r.rows.slice(1).map(row=>reviewSequencePointChoice(source,query,row.momentId,{semanticCorrespondenceConfirmed:true}));
 const path=createSequencePath(source,{label:'Reviewed point choices',reference,samples:[reviews[0].anchor,...reviews.map(x=>x.sample)]}),report=inspectSequencePath(path);
 assert.deepEqual(path.samples.map(x=>x.markId),['local-0-0','local-1-2','local-2-0','local-3-1']);
 for(const [i,[x,y]]of [[20,20],[31,21],[24,36],[40,44]].entries()){assert.ok(Math.abs(report.samples[i].position.xMm-x)<1e-10);assert.ok(Math.abs(report.samples[i].position.yMm-y)<1e-10);}
 assert.deepEqual(importSequencePath(JSON.parse(JSON.stringify(path))),path);assert.equal(JSON.stringify(source),before);
 assert.throws(()=>createSequencePath(source,{...path,reference:{...reference,samePlaneAndCorners:false}}),/common fixed planar/);
});
test('non-first anchor and explicitly selected moments retain original identities and exclude unselected frames',()=>{
 const q={...query,anchorMomentId:'moment-1',anchorMarkId:'local-1-2',momentIds:['moment-3','moment-1','moment-0']};
 const r=proposeSequencePointChoices(original(),q);assert.deepEqual(r.rows.map(x=>[x.momentId,x.markId]),[['moment-0','local-0-0'],['moment-1','local-1-2'],['moment-3','local-3-1']]);
 assert.throws(()=>reviewSequencePointChoice(original(),q,'moment-2',{semanticCorrespondenceConfirmed:true}));
});
test('semantic review and original selected anchor are required; stale source is recomputed',()=>{
 const source=original();assert.throws(()=>reviewSequencePointChoice(source,query,'moment-1'),/Review/);
 for(const bad of [{...query,anchorMarkId:'forged'},{...query,momentIds:['moment-1','moment-2']},{...query,momentIds:['moment-0','moment-0']}])assert.throws(()=>proposeSequencePointChoices(source,bad));
 const changed=structuredClone(source);changed.moments[1].calibratedTask.landmarks[0].sourcePx.x+=12;
 assert.equal(proposeSequencePointChoices(changed,query).rows[1].status,'no-compatible-mapping');assert.throws(()=>reviewSequencePointChoice(changed,query,'moment-1',{semanticCorrespondenceConfirmed:true}));
});
test('unavailable and incomplete mappings do not become point choices',()=>{
 const source=original();delete source.moments[1].calibratedTask;source.moments[2].calibratedTask.landmarks.pop();
 const r=proposeSequencePointChoices(source,query);assert.equal(r.rows[1].status,'unavailable-constellation');assert.equal(r.rows[2].status,'different-point-count');assert.equal(r.rows[1].markId,null);assert.equal(r.rows[2].markId,null);
 for(const id of ['moment-1','moment-2'])assert.throws(()=>reviewSequencePointChoice(source,query,id,{semanticCorrespondenceConfirmed:true}));
 const low=proposeSequencePointChoices(original(),{...query,maxStates:1});assert.ok(low.rows.slice(1).every(r=>r.status==='budget-unresolved'&&r.markId===null));
});
test('unique geometric identity does not establish matching reference corners',()=>{
 const source=original();for(const moment of source.moments.slice(1)){const corners=moment.calibratedTask.source.corners;moment.calibratedTask.source.corners=corners.slice(1).concat(corners[0]);}
 const r=proposeSequencePointChoices(source,query);assert.ok(r.rows.slice(1).every(x=>x.status==='unique'));
 // Identity inference deliberately makes no frame claim or reference declaration.
 assert.equal('reference' in r,false);const reviewed=reviewSequencePointChoice(source,query,'moment-1',{semanticCorrespondenceConfirmed:true});assert.equal('reference' in reviewed,false);
 assert.throws(()=>createSequencePath(source,{label:'Cannot infer frame',reference:{...reference,samePlaneAndCorners:false},samples:[reviewed.anchor,reviewed.sample]}));
});
test('current scaled matcher support does not change the default fixed-distance point query',async()=>{
 const {validateCapturedDemo}=await import('../src/capture.mjs'),{calibrate,toImage}=await import('../src/geometry.mjs');
 const source=original(),task=source.moments[1].calibratedTask,derived=validateCapturedDemo(task),h=calibrate(task.source.corners);
 task.landmarks.forEach((mark,i)=>{mark.sourcePx=toImage(h,derived.landmarks[i].uv.u*1.2,derived.landmarks[i].uv.v*1.2);});
 const r=proposeSequencePointChoices(source,query);assert.equal(r.rows[1].status,'no-compatible-mapping');
 for(const row of r.rows.filter(r=>r.report)){assert.equal(row.report.study.format,'skill-translator.spatial-correspondence/v1');assert.equal('model' in row.report.study,false);}
 assert.throws(()=>reviewSequencePointChoice(source,query,'moment-1',{semanticCorrespondenceConfirmed:true}));
});

async function symmetricSource(){
 const {calibrate,toImage}=await import('../src/geometry.mjs');
 const source=original();
 for(const [i,moment] of source.moments.entries()){
  const task=moment.calibratedTask,h=calibrate(task.source.corners);
  // Unequal sides distinguish the apex; the two base points may swap.
  const points=[[50+i,20+i],[30+i,60+i],[70+i,60+i]];
  task.landmarks=task.landmarks.slice(0,3);
  task.landmarks.forEach((mark,j)=>{mark.sourcePx=toImage(h,points[j][0]/100,points[j][1]/100);});
 }
 return source;
}
test('a forced apex is offered without promoting the two surviving full mappings',async()=>{
 const source=await symmetricSource(),before=JSON.stringify(source),r=proposeSequencePointChoices(source,query);
 assert.ok(r.rows.slice(1).every(row=>row.status==='ambiguous'&&row.proposalKind==='forced-anchor'&&row.report.completeMappingCount===2));
 assert.deepEqual(r.rows.map(row=>row.markId),source.moments.map(m=>m.calibratedTask.landmarks[0].id));
 const reviews=r.rows.slice(1).map(row=>reviewSequencePointChoice(source,query,row.momentId,{semanticCorrespondenceConfirmed:true}));
 assert.ok(reviews.every(r=>!r.reviewedMapping&&r.anchorOnlyReview.completeMappingCount===2));
 const path=createSequencePath(source,{label:'Only reviewed apex',reference,samples:[reviews[0].anchor,...reviews.map(r=>r.sample)]});
 const report=inspectSequencePath(path);assert.equal(report.samples.length,4);
 for(let i=0;i<4;i++){assert.ok(Math.abs(report.samples[i].position.xMm-(50+i))<1e-8);assert.ok(Math.abs(report.samples[i].position.yMm-(20+i))<1e-8);}
 const {createReviewedPointPaths}=await import('../src/reviewed-point-paths.mjs');
 assert.throws(()=>createReviewedPointPaths(path,reviews));
 assert.deepEqual(importSequencePath(JSON.parse(JSON.stringify(path))),path);assert.equal(JSON.stringify(source),before);
});
test('ambiguous base, exhausted search and changed constellation cannot inherit a forced apex',async()=>{
 const source=await symmetricSource(),q={...query,anchorMarkId:source.moments[0].calibratedTask.landmarks[1].id};
 assert.ok(proposeSequencePointChoices(source,q).rows.slice(1).every(r=>r.status==='ambiguous'&&r.markId===null));
 assert.throws(()=>reviewSequencePointChoice(source,q,'moment-1',{semanticCorrespondenceConfirmed:true}));
 assert.throws(()=>reviewSequencePointChoice(source,query,'moment-1'));
 assert.ok(proposeSequencePointChoices(source,{...query,maxStates:1}).rows.slice(1).every(r=>r.markId===null));
 const changed=structuredClone(source);changed.moments[1].calibratedTask.landmarks[0].sourcePx.x+=20;
 assert.equal(proposeSequencePointChoices(changed,query).rows[1].markId,null);
 assert.throws(()=>reviewSequencePointChoice(changed,query,'moment-1',{semanticCorrespondenceConfirmed:true}));
});
