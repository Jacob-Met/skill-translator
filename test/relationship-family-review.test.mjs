import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,placePractice,retryPractice,evaluatePractice} from '../src/practice.mjs';
import {DISCOVERY_FORMAT} from '../src/relationship-discovery.mjs';
import {createRelationshipFamilyReview,createFreshRelationshipFamilyReview,importRelationshipFamilyReview,assessRelationshipFamilyReview} from '../src/relationship-family-review.mjs';
const annotation=(w,dx)=>({title:'Authored family practice',source:{widthMm:w,heightMm:150,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:150},{x:0,y:150}]},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:1},{id:'b',label:'B',kind:'fraction',sourcePx:{x:20+dx,y:30},toleranceMm:1}]});
const study=()=>({format:DISCOVERY_FORMAT,deviationMm:.0001,demonstrations:[annotation(200,30),annotation(317,47.55),annotation(251,37.65)].map((annotation,i)=>({id:'source-'+i,annotation,evidenceClass:'authored-example',correspondenceConfirmed:true}))});
test('inferred width relation compares actual retained practice without requiring an authored model or relation tolerance',()=>{
 const raw=study(),source=raw.demonstrations[0].annotation;let session=createPractice(source,400,150);session=placePractice(source,400,150,session,'a',{xMm:40,yMm:30});session=placePractice(source,400,150,session,'b',{xMm:95,yMm:30});const before=JSON.stringify(session);
 const review=createRelationshipFamilyReview(raw,'a:b:horizontal',session),report=assessRelationshipFamilyReview(review);
 assert.deepEqual(report.pair.compatibleFamilies,['width-proportional']);assert.equal(report.rounds[0].alternatives[0].expectedMm,60);assert.equal(report.rounds[0].observedMm,55);assert.equal(report.rounds[0].alternatives[0].differenceMm,-5);assert.equal(report.rounds[0].alternatives[0].status,'observed');assert.equal(report.rounds[0].alternatives[0].within,undefined);
 assert.deepEqual(report.rounds[0].originalPractice,evaluatePractice(source,400,150,session.attempts));assert.equal(JSON.stringify(session),before);assert.deepEqual(importRelationshipFamilyReview(JSON.parse(JSON.stringify(review))),review);
});
test('actual history stays scored while fresh missing endpoints cannot count as compatible observed outcomes',()=>{
 const raw=study(),source=raw.demonstrations[0].annotation;let session=createPractice(source,400,150);session=placePractice(source,400,150,session,'a',{xMm:40,yMm:30});session=placePractice(source,400,150,session,'b',{xMm:100,yMm:30});session=retryPractice(source,400,150,session);
 const report=assessRelationshipFamilyReview(createRelationshipFamilyReview(raw,'a:b:horizontal',session));assert.equal(report.rounds.length,2);assert.equal(report.rounds[0].alternatives[0].differenceMm,0);assert.equal(report.rounds[0].originalPractice.passed,true);assert.equal(report.rounds[1].observedMm,null);assert.equal(report.rounds[1].alternatives[0].status,'incomplete');assert.equal(report.rounds[1].originalPractice.passed,false);
});
test('raw reopen recomputes forged findings and refuses mismatched native source, invalid target and unknown pair',()=>{
 const raw=study(),review=createRelationshipFamilyReview(raw,'a:b:horizontal',createPractice(raw.demonstrations[0].annotation,400,150));review.pair={compatibleFamilies:['fixed']};assert.deepEqual(assessRelationshipFamilyReview(review).pair.compatibleFamilies,['width-proportional']);
 for(const alter of [r=>r.study.demonstrations[0].annotation.source.widthMm=201,r=>r.target.widthMm=0,r=>r.pairId='missing']){const copy=structuredClone(review);alter(copy);assert.throws(()=>importRelationshipFamilyReview(copy));}
});

test('hypothetical family exploration stays available when original authored point clearances cannot fit',()=>{const raw=study();raw.demonstrations[0].annotation.landmarks[1].kind='edge_offset_mm';raw.demonstrations[0].annotation.landmarks[1].edge='left';const review=createFreshRelationshipFamilyReview(raw,'a:b:horizontal',{widthMm:10,heightMm:100}),report=assessRelationshipFamilyReview(review);assert.equal(review.session,null);assert.equal(report.rounds.length,0);assert.equal(report.pair.predictions[0].expectedMm,1.5);});
test('a closer learner residual never selects among source-ambiguous hypotheses',()=>{
 const raw=study();raw.demonstrations=[raw.demonstrations[0],{...structuredClone(raw.demonstrations[0]),id:'unchanged-size'}];const source=raw.demonstrations[0].annotation;
 let session=createPractice(source,400,150);session=placePractice(source,400,150,session,'a',{xMm:40,yMm:30});session=placePractice(source,400,150,session,'b',{xMm:70,yMm:30});
 const report=assessRelationshipFamilyReview(createRelationshipFamilyReview(raw,'a:b:horizontal',session));assert.equal(report.pair.status,'ambiguous');assert.equal(report.rounds[0].alternatives.length,4);assert.equal(report.rounds[0].alternatives.find(p=>p.family==='fixed').differenceMm,0);assert.equal(report.rounds[0].alternatives.find(p=>p.family==='width-proportional').differenceMm,-30);
});
