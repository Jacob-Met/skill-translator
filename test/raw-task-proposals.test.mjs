import test from 'node:test';
import assert from 'node:assert/strict';
import {createRawTask,inspectRawTask,exportRawTask,importRawTask} from '../src/raw-task-proposals.mjs';
import {inspectRawRuleProposals,createRawRuleProposal} from '../src/raw-rule-proposals.mjs';
import {createPractice,evaluatePractice} from '../src/practice.mjs';
import {RESPONSE_SCHEMA} from '../src/response-family.mjs';
import {DEMONSTRATION_RESPONSE_SCHEMA} from '../src/response-demonstrations.mjs';
import {source,rawAccount,mixed} from './helpers/raw-task-fixture.mjs';
test('compose supported left, top and proportional proposals into actual complete practice',()=>{
 const input=mixed(),before=JSON.stringify(input),r=inspectRawTask(input);
 assert.deepEqual(r.findings.map(f=>f.proposal),['left','top','fraction']);
 assert.deepEqual(r.proposedTarget.landmarks.map(m=>[m.id,m.xMm,m.yMm]),[['guide',20,44.625],['index',95.55,25],['center',136.5,59.5]]);
 assert.equal(JSON.stringify(input),before);assert.deepEqual(createPractice(r.proposedSource,273,119).attempts,[]);
 const attempts=r.proposedTarget.landmarks.map(({id,xMm,yMm})=>({id,xMm,yMm}));
 assert.equal(evaluatePractice(r.proposedSource,273,119,attempts).passed,true);
 assert.equal(evaluatePractice(r.originalSource,273,119,attempts).passed,false);
 assert.equal(r.proposedSource.landmarks[0].toleranceMm,1);
});
test('one-mark target parity and exact maintained candidate parity for each account',()=>{
 const a=rawAccount('guide',20,60),one=inspectRawTask(createRawTask([a],a.referenceStudy.target)),prior=createRawRuleProposal(a);
 assert.deepEqual(one.proposedTarget,prior.target);
 for(const row of inspectRawTask(mixed()).findings)assert.deepEqual(row.candidates,inspectRawRuleProposals(row.account).candidates);
 assert.deepEqual(one.unexamined,['index','center']);
});
test('ambiguous, contradicted and no-evidence accounts remain explicit and never gain a proposed rule',()=>{
 const left=rawAccount('guide',20,60),amb=rawAccount('index',35,25);amb.demonstrations[0].annotation=source();amb.demonstrations[0].landmarkId='index';
 const none=rawAccount('center',100,80);none.demonstrations=[];
 const r=inspectRawTask(createRawTask([left,amb,none],{widthMm:273,heightMm:119}));
 assert.deepEqual(r.findings.map(f=>f.status),['single-compatible','unresolved','no-evidence']);
 assert.deepEqual(r.unresolved,['index','center']);assert.equal(r.proposedSource.landmarks[1].kind,'fraction');
 const bad=rawAccount('index',1,1),badResult=inspectRawTask(createRawTask([bad],{widthMm:273,heightMm:119}));
 assert.equal(badResult.findings[0].status,'none-compatible');assert.equal(badResult.proposedSource,null);assert.equal(badResult.proposedTarget,null);
});
test('source identity, duplicate marks and missing correspondence refuse before composition',()=>{
 const a=rawAccount('guide',20,60),b=rawAccount('index',70,25);
 for(const mutate of [s=>s.landmarks[0].toleranceMm=2,s=>s.provenance='Changed',s=>s.landmarks[0].sourcePx.x=21,s=>s.landmarks[0].edge='left']){const changed=structuredClone(b);mutate(changed.referenceStudy.source);assert.throws(()=>createRawTask([a,changed],{widthMm:200,heightMm:160}),/same complete original/);}
 assert.throws(()=>createRawTask([a,a],{widthMm:200,heightMm:160}),/one complete account/);
 const falseCorrespondence=structuredClone(b);falseCorrespondence.demonstrations[0].correspondenceConfirmed=false;assert.throws(()=>createRawTask([a,falseCorrespondence],{widthMm:200,heightMm:160}),/confirm/);
});
test('replay recomputes all results from raw evidence, ignores forged derived output',()=>{
 const saved=exportRawTask(mixed());assert.deepEqual(Object.keys(saved),['format','target','accounts']);
 const expected=inspectRawTask(saved);saved.proposedSource={landmarks:[]};saved.supported=[];
 assert.deepEqual(inspectRawTask(JSON.parse(JSON.stringify(saved))).proposedTarget,expected.proposedTarget);
 saved.accounts[0].demonstrations[0].annotation.landmarks[0].sourcePx.x=40;
 const changed=inspectRawTask(saved);assert.equal(changed.findings[0].proposal,'fraction');assert.equal(changed.proposedTarget.landmarks[0].xMm,54.6);
 assert.deepEqual(exportRawTask(saved),importRawTask(saved));
});
test('bounds remain rectangular and account order cannot change composed task geometry',()=>{
 const input=mixed(),reverse=inspectRawTask({...input,accounts:[...input.accounts].reverse()});
 assert.deepEqual(reverse.proposedTarget,inspectRawTask(input).proposedTarget);
 const raw=rawAccount('guide',21,60);raw.demonstrations[0].xBoundMm=.1;raw.demonstrations[0].yBoundMm=2;
 assert.equal(inspectRawTask(createRawTask([raw],input.target)).findings[0].status,'none-compatible');
});
test('invalid dimensions, empty accounts, over-capacity raw data and nonfitting target never yield practice',()=>{
 for(const value of [0,10001,NaN,'200'])assert.throws(()=>createRawTask([rawAccount('guide',20,60)],{widthMm:value,heightMm:119}),/dimensions/);
 assert.throws(()=>createRawTask([],{widthMm:200,heightMm:160}),/1–12/);
 assert.throws(()=>createRawTask(Array(13).fill(rawAccount('guide',20,60)),{widthMm:200,heightMm:160}),/1–12/);
 const oversized=mixed();oversized.accounts[0].referenceStudy.source.extra='x'.repeat(2_000_000);assert.throws(()=>importRawTask(oversized),/2 MB/);
 const r=inspectRawTask(createRawTask([rawAccount('guide',20,60)],{widthMm:10,heightMm:119}));assert.equal(r.proposedSource,null);assert.match(r.targetError,/clearance|outside|fit|offset/i);
});
