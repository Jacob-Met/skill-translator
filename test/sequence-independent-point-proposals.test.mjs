import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import {calibrate,toImage}from'../src/geometry.mjs';
import {proposeSequencePointChoices}from'../src/sequence-point-proposals.mjs';
import {proposeSequenceIndependentPointChoices,reviewSequenceIndependentPointChoice}from'../src/sequence-independent-point-proposals.mjs';
import {createSequencePath,inspectSequencePath,importSequencePath}from'../src/sequence-path.mjs';
import {createReviewedPointPaths}from'../src/reviewed-point-paths.mjs';
const reference={samePlaneAndCorners:true,label:'Authored fixed page',basis:'Original common plane and corner meanings supplied independently'};
function fixture(){const source=JSON.parse(readFileSync(new URL('./fixtures/point-choice-sequence.json',import.meta.url))),orders=[[0,1,2,3],[3,0,1,2],[1,2,3,0],[2,3,0,1]];for(const[i,m]of source.moments.entries()){const p=[[40+5*i,40-3*i],[10,10],[80,10],[10,70]],h=calibrate(m.calibratedTask.source.corners);m.calibratedTask.landmarks.forEach((mark,j)=>mark.sourcePx=toImage(h,p[orders[i][j]][0]/100,p[orders[i][j]][1]/100));}return{source,query:{anchorMomentId:'moment-0',anchorMarkId:'local-0-0',momentIds:source.moments.map(m=>m.id),deviationMm:1e-6,maxStates:20000}};}
test('conditional original point proposals feed unchanged ordinary sampled paths with no manual local IDs',()=>{
 const{source,query}=fixture(),before=JSON.stringify(source);assert.ok(proposeSequencePointChoices(source,query).rows.slice(1).every(r=>r.status==='no-compatible-mapping'));
 const report=proposeSequenceIndependentPointChoices(source,query);assert.deepEqual(report.rows.map(r=>r.markId),['local-0-0','local-1-1','local-2-3','local-3-2']);
 const choices=report.rows.slice(1).map(r=>reviewSequenceIndependentPointChoice(source,query,r.momentId,{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true}));
 const path=createSequencePath(source,{label:'Reviewed moving point',reference,samples:[choices[0].anchor,...choices.map(r=>r.sample)]}),findings=inspectSequencePath(path);
 for(const[i,sample]of findings.samples.entries()){assert.ok(Math.abs(sample.position.xMm-(40+5*i))<1e-8);assert.ok(Math.abs(sample.position.yMm-(40-3*i))<1e-8);}assert.ok(Math.abs(findings.sampledPathDistanceMm-3*Math.sqrt(34))<1e-8);
 assert.deepEqual(importSequencePath(JSON.parse(JSON.stringify(path))),path);assert.equal(JSON.stringify(source),before);assert.ok(choices.every(c=>!c.reviewedMapping));assert.throws(()=>createReviewedPointPaths(path,choices));
});
test('both model and semantic reviews remain required, and no common plane is inferred',()=>{
 const{source,query}=fixture();assert.throws(()=>reviewSequenceIndependentPointChoice(source,query,'moment-1'),/exemption/);assert.throws(()=>reviewSequenceIndependentPointChoice(source,query,'moment-1',{independentPointModelConfirmed:true}),/same task point/);
 const c=reviewSequenceIndependentPointChoice(source,query,'moment-1',{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true});assert.equal(c.reference,undefined);assert.throws(()=>createSequencePath(source,{label:'No plane inferred',reference:{...reference,samePlaneAndCorners:false},samples:[c.anchor,c.sample]}));
});
test('missing or unequal original point sets remain unavailable without changing accepted source',()=>{
 const{source,query}=fixture();delete source.moments[1].calibratedTask;source.moments[2].calibratedTask.landmarks.pop();source.moments[3].calibratedTask.landmarks.push({...source.moments[3].calibratedTask.landmarks[0],id:'extra'});
 const before=JSON.stringify(source),r=proposeSequenceIndependentPointChoices(source,query);assert.deepEqual(r.rows.slice(1).map(x=>x.markId),[null,null,null]);assert.equal(r.rows[1].status,'unavailable-original-constellation');assert.equal(r.rows[3].status,'different-original-point-count');assert.equal(JSON.stringify(source),before);
});
test('bounded search and changed auxiliary originals cannot be accepted as a prior proposal',()=>{
 const{source,query}=fixture();const low=proposeSequenceIndependentPointChoices(source,{...query,maxStates:1});assert.ok(low.rows.slice(1).every(r=>r.status==='budget-unresolved'&&r.markId===null));assert.throws(()=>reviewSequenceIndependentPointChoice(source,{...query,maxStates:1},'moment-1',{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true}));
 source.moments[1].calibratedTask.landmarks[2].sourcePx.x+=80;assert.equal(proposeSequenceIndependentPointChoices(source,query).rows[1].markId,null);assert.throws(()=>reviewSequenceIndependentPointChoice(source,query,'moment-1',{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true}));
});
test('nonfirst anchor and selected subset preserve original chronology and local identities',()=>{
 const{source,query}=fixture();const q={...query,anchorMomentId:'moment-1',anchorMarkId:'local-1-1',momentIds:['moment-3','moment-1','moment-0']};assert.deepEqual(proposeSequenceIndependentPointChoices(source,q).rows.map(r=>[r.momentId,r.markId]),[['moment-0','local-0-0'],['moment-1','local-1-1'],['moment-3','local-3-2']]);assert.throws(()=>reviewSequenceIndependentPointChoice(source,q,'moment-2',{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true}));
 for(const bad of[{...query,anchorMarkId:'missing'},{...query,momentIds:['moment-1','moment-2']},{...query,momentIds:['moment-0','moment-0']}])assert.throws(()=>proposeSequenceIndependentPointChoices(source,bad));
});
