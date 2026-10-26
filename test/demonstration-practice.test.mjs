import test from 'node:test';import assert from 'node:assert/strict';
import {inspectDemonstrationPractice,exportDemonstrationPractice,importDemonstrationPractice} from '../src/demonstration-practice.mjs';
import {createPractice,placePractice,retryPractice} from '../src/practice.mjs';
import {createRawRuleProposal,exportRawRuleProposal} from '../src/raw-rule-proposals.mjs';
import {RESPONSE_SCHEMA} from '../src/response-family.mjs';import {DEMONSTRATION_RESPONSE_SCHEMA} from '../src/response-demonstrations.mjs';
const annotation=(w,h,x,y)=>({provenance:'Authored practice comparison',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:[{id:'point',label:'Point',kind:'fraction',sourcePx:{x,y},toleranceMm:1}]});
const account=(w=200,h=80,x=40,y=30)=>({schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy:{schema:RESPONSE_SCHEMA,source:annotation(100,80,20,30),landmarkId:'point',coefficientLimit:2,observations:[],target:{widthMm:273,heightMm:119}},demonstrations:[{id:'extra',label:'Authored extra',evidenceClass:'authored-example',annotation:annotation(w,h,x,y),landmarkId:'point',correspondenceConfirmed:true,xBoundMm:.001,yBoundMm:.001}]});
const attempt=(raw,w,h,x,y)=>placePractice(raw.referenceStudy.source,w,h,createPractice(raw.referenceStudy.source,w,h),'point',{xMm:x,yMm:y});
test('multiple demonstrated rules agree on the actual unfamiliar target without choosing a relationship',()=>{
 const raw=account(),session=attempt(raw,273,80,54.6,30),before=JSON.stringify({raw,session}),r=inspectDemonstrationPractice(raw,session);
 assert.deepEqual(r.compatibleRules,['fraction','top','bottom']);assert.equal(r.rounds[0].status,'within-all');assert.equal(r.rounds[0].originalScore.passed,true);assert.equal(JSON.stringify({raw,session}),before);
});
test('changed target distinguishes all/some/none while preserving the original failed score',()=>{
 const raw=account(),session=attempt(raw,273,119,54.6,30),r=inspectDemonstrationPractice(raw,session);assert.equal(r.rounds[0].status,'within-some');assert.deepEqual(r.rounds[0].withinRules,['top']);assert.equal(r.rounds[0].originalScore.passed,false);
 assert.equal(inspectDemonstrationPractice(raw,attempt(raw,273,119,54.6,0)).rounds[0].status,'within-none');
});
test('empty rounds remain missing, every actual prior round remains separate, and raw replay recomputes',()=>{
 const raw=account(),source=raw.referenceStudy.source,first=attempt(raw,273,119,54.6,30),session=retryPractice(source,273,119,first),r=inspectDemonstrationPractice(raw,session);
 assert.deepEqual(r.rounds.map(r=>r.status),['within-some','missing-placement']);assert.equal(r.rounds[1].actual,null);assert.deepEqual(r.session,session);
 const saved=exportDemonstrationPractice(raw,session);saved.results=[{status:'within-all'}];assert.deepEqual(importDemonstrationPractice(saved),r);
});
test('actual sessions from the uniquely inferred raw source are matched without retargeting earlier original sessions',()=>{
 const raw=account(200,160,20,60),proposed=createRawRuleProposal(raw),session=placePractice(proposed.source,273,119,createPractice(proposed.source,273,119),'point',{xMm:20,yMm:44.625});
 const r=inspectDemonstrationPractice(raw,session);assert.equal(r.practiceBasis,'unique-raw-proposal');assert.equal(r.rounds[0].status,'within-all');assert.deepEqual(inspectDemonstrationPractice(exportRawRuleProposal(raw),session),r);
 const original=inspectDemonstrationPractice(raw,attempt(raw,273,119,20,44.625));assert.equal(original.practiceBasis,'original-annotation');assert.equal(original.rounds[0].originalScore.passed,false);
});
test('foreign source, no supported relationship and impossible alternative targets never become all-within',()=>{
 const raw=account(),session=attempt(raw,273,119,54.6,30),wrong=structuredClone(session);wrong.reference.provenance='foreign';assert.throws(()=>inspectDemonstrationPractice(raw,wrong),/source/);
 const unsupported=account(200,160,100,100);assert.equal(inspectDemonstrationPractice(unsupported,attempt(unsupported,273,119,54.6,30)).rounds[0].status,'no-supported-relationship');
 const small=inspectDemonstrationPractice(raw,attempt(raw,273,10,54.6,5));assert.equal(small.rounds[0].status,'unavailable-target');assert.ok(small.rounds[0].alternatives.some(a=>a.predicted===null));
});
test('agreement for the selected demonstrated mark does not pass the remaining task',()=>{
 const raw=account();raw.referenceStudy.source.landmarks.push({id:'second',label:'Other task mark',kind:'fraction',sourcePx:{x:60,y:40},toleranceMm:1});
 const session=attempt(raw,273,80,54.6,30),r=inspectDemonstrationPractice(raw,session);
 assert.equal(r.rounds[0].status,'within-all');assert.equal(r.rounds[0].originalScore.complete,false);assert.equal(r.rounds[0].originalScore.passed,false);assert.equal(r.rounds[0].originalScore.results.find(m=>m.id==='second').placed,false);
 assert.deepEqual(importDemonstrationPractice(exportDemonstrationPractice(raw,session)),r);
});
