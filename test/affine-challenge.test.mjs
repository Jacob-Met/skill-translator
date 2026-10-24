import test from 'node:test';
import assert from 'node:assert/strict';
import {RESPONSE_SCHEMA,createResponseObservation} from '../src/response-family.mjs';
import {freezeAffineChallenge,receiveAffineResult,analyzeAffineChallenge,exportAffineChallenge} from '../src/affine-challenge.mjs';
const source={provenance:'Authored prospective control',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'mark',label:'Mark',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:1}]};
const training={schema:RESPONSE_SCHEMA,source,landmarkId:'mark',coefficientLimit:2,target:{widthMm:100,heightMm:80},observations:[createResponseObservation(source,'mark',{id:'training-1',label:'Authored same-size training',evidenceClass:'authored-example',widthMm:100,heightMm:80,xMm:20,yMm:30,xBoundMm:0,yBoundMm:0})]};
const plan=[{id:'challenge-a',label:'First separate workpiece',widthMm:110,heightMm:80},{id:'challenge-b',label:'Second separate workpiece',widthMm:120,heightMm:80}];
const reading=(xMm,yMm=30)=>({label:'Authored result',evidenceClass:'authored-example',xMm,yMm,xBoundMm:0,yBoundMm:0});
test('two individually compatible results contradict one common frozen family',()=>{
 let study=freezeAffineChallenge(training,plan,true),before=JSON.stringify(study.training);const frozen=analyzeAffineChallenge(study).rows.map(r=>r.frozenPrediction);
 study=receiveAffineResult(study,'challenge-a',reading(30));study=receiveAffineResult(study,'challenge-b',reading(30));
 const a=analyzeAffineChallenge(study);assert.equal(a.status,'contradicted');assert.ok(a.rows.every(r=>r.individuallyCompatible));assert.equal(a.rows[1].jointlyCompatible,false);assert.equal(a.firstJointContradiction,'challenge-b');
 assert.deepEqual(a.rows.map(r=>r.frozenPrediction),frozen);assert.equal(JSON.stringify(study.training),before);
});
test('coherent held-out sizes retain one model; order of receiving does not alter plan-order evaluation',()=>{
 let a=freezeAffineChallenge(training,plan,true);a=receiveAffineResult(a,'challenge-b',reading(40));a=receiveAffineResult(a,'challenge-a',reading(30));
 assert.equal(analyzeAffineChallenge(a).status,'compatible-complete');assert.ok(analyzeAffineChallenge(a).rows.every(r=>r.jointlyCompatible));
 const b=exportAffineChallenge(a);b.derived={status:'contradicted'};assert.deepEqual(analyzeAffineChallenge(a),analyzeAffineChallenge(b));
});
test('missing results remain untested and cannot conceal contradiction',()=>{
 let a=freezeAffineChallenge(training,plan,true);assert.equal(analyzeAffineChallenge(a).status,'awaiting-results');
 a=receiveAffineResult(a,'challenge-b',reading(100));const r=analyzeAffineChallenge(a);assert.equal(r.status,'contradicted');assert.equal(r.rows[0].individuallyCompatible,null);assert.equal(r.rows[1].individuallyCompatible,false);
});
test('replacement preserves only current supplied reading without modifying frozen inputs',()=>{
 let a=freezeAffineChallenge(training,plan,true);a=receiveAffineResult(a,'challenge-a',reading(30));const before=JSON.stringify(a);const b=receiveAffineResult(a,'challenge-a',reading(25));assert.equal(b.results.length,1);assert.equal(a.results[0].xMm,30);assert.equal(JSON.stringify(a),before);
});
test('plan, source and result mismatches refuse rather than silently rebinding',()=>{
 assert.throws(()=>freezeAffineChallenge(training,plan,false),/declare/);
 assert.throws(()=>freezeAffineChallenge(training,[{...plan[0],widthMm:100}],true),/differ/);
 assert.throws(()=>freezeAffineChallenge(training,[plan[0],plan[0]],true),/distinct/);
 let a=receiveAffineResult(freezeAffineChallenge(training,plan,true),'challenge-a',reading(30));
 a.results[0].widthMm=111;assert.throws(()=>exportAffineChallenge(a),/frozen plan/);
 a=receiveAffineResult(freezeAffineChallenge(training,plan,true),'challenge-a',reading(30));a.results[0].sourceReference.provenance='another';assert.throws(()=>exportAffineChallenge(a),/source reading/);
});
