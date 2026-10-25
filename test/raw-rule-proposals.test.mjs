import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRawRuleProposals,createRawRuleProposal,exportRawRuleProposal,importRawRuleProposal} from '../src/raw-rule-proposals.mjs';
import {RESPONSE_SCHEMA} from '../src/response-family.mjs';
import {DEMONSTRATION_RESPONSE_SCHEMA} from '../src/response-demonstrations.mjs';
import {createPractice,evaluatePractice} from '../src/practice.mjs';
const annotation=(w,h,x,y)=>({provenance:'Authored geometric input',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:[{id:'point',label:'Point',kind:'fraction',sourcePx:{x,y},toleranceMm:1}]});
const account=(x=20,y=60,xBound=.1,yBound=.1)=>({schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy:{schema:RESPONSE_SCHEMA,source:annotation(100,80,20,30),landmarkId:'point',coefficientLimit:2,observations:[],target:{widthMm:273,heightMm:119}},demonstrations:[{id:'separate',label:'Separate authored annotation',evidenceClass:'authored-example',annotation:annotation(200,160,x,y),landmarkId:'point',correspondenceConfirmed:true,xBoundMm:xBound,yBoundMm:yBound}]});
test('raw annotated coordinates supply a unique inferred rule and unchanged existing practice evaluator',()=>{
 const raw=account(),before=JSON.stringify(raw),p=createRawRuleProposal(raw);assert.equal(p.rule,'left');assert.equal(JSON.stringify(raw),before);
 assert.equal(p.target.landmarks[0].xMm,20);assert.equal(p.target.landmarks[0].yMm,44.625);
 assert.deepEqual(createPractice(p.source,273,119).attempts,[]);
 assert.equal(evaluatePractice(p.source,273,119,[{id:'point',xMm:20,yMm:44.625}]).passed,true);
 assert.equal(evaluatePractice(raw.referenceStudy.source,273,119,[{id:'point',xMm:20,yMm:44.625}]).passed,false);
 assert.deepEqual(p.account.demonstrations[0].annotation,raw.demonstrations[0].annotation);
});
test('independent rectangular bounds reject a candidate that an enclosing circular adapter would accept',()=>{
 const raw=account(21,60,.1,2),r=inspectRawRuleProposals(raw);assert.equal(r.status,'none-compatible');assert.ok(Math.hypot(1,0)<Math.hypot(.1,2));
 const left=r.candidates.find(c=>c.rule==='left').readings[0];assert.equal(left.xWithin,false);assert.equal(left.yWithin,true);assert.throws(()=>createRawRuleProposal(raw),/No unique/);
});
test('changed original annotation recomputes the inferred relationship',()=>{
 assert.equal(createRawRuleProposal(account(40,60)).rule,'fraction');assert.equal(createRawRuleProposal(account(120,60)).rule,'right');
 assert.equal(createRawRuleProposal(account(40,30)).rule,'top');assert.equal(createRawRuleProposal(account(40,110)).rule,'bottom');
});
test('no evidence, unchanged-size ambiguity and unconfirmed correspondences cannot yield a source',()=>{
 const none=account();none.demonstrations=[];assert.equal(inspectRawRuleProposals(none).status,'no-evidence');assert.throws(()=>createRawRuleProposal(none),/No unique/);
 const same=account();same.demonstrations[0].annotation=annotation(100,80,20,30);assert.equal(inspectRawRuleProposals(same).compatibleRules.length,5);assert.throws(()=>createRawRuleProposal(same),/No unique/);
 const unconfirmed=account();unconfirmed.demonstrations[0].correspondenceConfirmed=false;assert.throws(()=>inspectRawRuleProposals(unconfirmed),/confirm/);
});
test('input-only proposal replay recomputes source and refuses changed rule or evidence',()=>{
 const raw=account(),saved=exportRawRuleProposal(raw);assert.deepEqual(Object.keys(saved),['format','account','rule']);
 saved.source={landmarks:[]};assert.equal(importRawRuleProposal(saved).source.landmarks[0].edge,'left');
 const wrong=structuredClone(saved);wrong.rule='right';assert.throws(()=>importRawRuleProposal(wrong),/does not match/);
 const changed=structuredClone(saved);changed.account.demonstrations[0].annotation.landmarks[0].sourcePx.x=40;assert.throws(()=>importRawRuleProposal(changed),/does not match/);
});
test('exact decimal boundary comparisons admit equality and refuse a smaller original bound',()=>{
 const boundary=account(20.125,60,.125,0),r=inspectRawRuleProposals(boundary);assert.equal(r.proposal,'left');
 const narrowed=account(20.125,60,.124999999999,0);assert.equal(inspectRawRuleProposals(narrowed).status,'none-compatible');
});
test('the separate affine coefficient domain neither silently vetoes nor enlarges five-rule support',()=>{
 const raw=account();const original=inspectRawRuleProposals(raw);raw.referenceStudy.coefficientLimit=.001;
 const changed=inspectRawRuleProposals(raw);assert.deepEqual(changed.candidates,original.candidates);assert.match(changed.boundary,/coefficient domain is not used/);
});
