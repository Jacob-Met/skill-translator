import test from 'node:test';
import assert from 'node:assert/strict';
import {RESPONSE_SCHEMA,createResponseObservation,analyzeResponseStudy,exportResponseStudy} from '../src/response-family.mjs';
import {createObservation,analyzeEvidence} from '../src/evidence.mjs';
const source={title:'Authored response control',provenance:'Independent analytic geometry',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'mark',label:'Test mark',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:1}]};
function study(rows=[],extra={}){return {schema:RESPONSE_SCHEMA,source:structuredClone(source),landmarkId:'mark',coefficientLimit:2,observations:rows.map((row,i)=>createResponseObservation(source,'mark',{id:`row-${i}`,label:'Authored independent control',evidenceClass:'authored-example',xBoundMm:0,yBoundMm:0,...row})),target:{widthMm:200,heightMm:160},...extra};}
const varied=[{widthMm:200,heightMm:80,xMm:45,yMm:50},{widthMm:100,heightMm:160,xMm:60,yMm:70}];
test('the maintained five-rule family rejects this genuinely broader supported relationship',()=>{
 const rows=varied.map((row,i)=>createObservation(source,{id:`fixed-${i}`,landmarkId:'mark',label:'Authored analytic control',evidenceClass:'authored-example',uncertaintyMm:0,...row}));
 assert.equal(analyzeEvidence(source,'mark',rows).status,'none-compatible');
 assert.equal(analyzeResponseStudy(study(varied)).status,'supported');
});
test('mixed and cross-axis rules survive and predict an independent target',()=>{
 const s=study(varied),before=JSON.stringify(s),a=analyzeResponseStudy(s);
 assert.equal(a.status,'supported');assert.equal(a.variationRank,2);
 assert.deepEqual(a.axes.x.prediction,{lower:85,upper:85});
 assert.deepEqual(a.axes.y.prediction,{lower:90,upper:90});
 assert.equal(a.axes.x.vertices.length,1);assert.equal(JSON.stringify(s),before);
});
test('one direction retains coefficient coupling; target along it can be precise',()=>{
 const a=analyzeResponseStudy(study([{widthMm:200,heightMm:160,xMm:85,yMm:90}]));
 assert.equal(a.variationRank,1);assert.equal(a.axes.x.vertices.length,2);
 assert.deepEqual(a.axes.x.prediction,{lower:85,upper:85});
 assert.ok(a.axes.x.widthCoefficient.upper>a.axes.x.widthCoefficient.lower);
 const other=analyzeResponseStudy(study([{widthMm:200,heightMm:160,xMm:85,yMm:90}],{target:{widthMm:200,heightMm:80}}));
 assert.ok(other.axes.x.prediction.upper-other.axes.x.prediction.lower>100);
});
test('coordinate bounds retain all independently feasible box corners',()=>{
 const a=analyzeResponseStudy(study(varied.map(v=>({...v,xBoundMm:1,yBoundMm:2}))));
 assert.deepEqual(a.axes.x.prediction,{lower:83,upper:87});
 assert.deepEqual(a.axes.y.prediction,{lower:86,upper:94});
 assert.equal(a.axes.x.vertices.length,4);
});
test('same-size evidence tests source agreement but identifies no response',()=>{
 let a=analyzeResponseStudy(study([{widthMm:100,heightMm:80,xMm:20,yMm:30}]));
 assert.equal(a.status,'supported');assert.equal(a.variationRank,0);assert.equal(a.axes.x.vertices.length,4);
 a=analyzeResponseStudy(study([{widthMm:100,heightMm:80,xMm:21,yMm:30}]));
 assert.equal(a.status,'incompatible');assert.equal(a.axes.x.firstContradiction,'row-0');assert.equal(a.axes.y.status,'supported');
});
test('incompatible cross-axis outcomes and finite coefficient domain stay explicit',()=>{
 const a=analyzeResponseStudy(study([...varied,{widthMm:200,heightMm:160,xMm:86,yMm:90}]));
 assert.equal(a.status,'incompatible');assert.equal(a.axes.x.firstContradiction,'row-2');
 assert.equal(analyzeResponseStudy(study(varied,{coefficientLimit:.1})).status,'incompatible');
});
test('unobserved and beyond-sheet ranges are not silently clipped',()=>{
 const a=analyzeResponseStudy(study());assert.equal(a.status,'unobserved');
 assert.ok(a.axes.x.prediction.lower<0);assert.equal(a.axes.x.extendsBeyondSheet,true);
 const atSource=analyzeResponseStudy(study([],{target:{widthMm:100,heightMm:80}}));
 assert.deepEqual(atSource.axes.x.prediction,{lower:20,upper:20});
});
test('reopen recomputes; source bindings and malformed rows cannot be rebound',()=>{
 const s=study(varied),saved=exportResponseStudy(s);saved.derived={status:'fabricated'};
 assert.deepEqual(analyzeResponseStudy(saved),analyzeResponseStudy(s));
 saved.source.source.widthMm=101;assert.throws(()=>analyzeResponseStudy(saved),/different source/);
 const bad=study(varied);bad.observations.push(bad.observations[0]);assert.throws(()=>analyzeResponseStudy(bad),/distinct/);
 const noBound=study(varied);delete noBound.observations[0].xBoundMm;assert.throws(()=>analyzeResponseStudy(noBound),/bound/);
});
test('subnormal contradiction is not erased by a numeric epsilon',()=>{
 const s=study([{widthMm:100,heightMm:80,xMm:Number.MIN_VALUE,yMm:30}]);
 s.source.landmarks[0].sourcePx.x=0;
 s.observations=[createResponseObservation(s.source,'mark',{...s.observations[0]})];
 assert.equal(analyzeResponseStudy(s).status,'incompatible');
});
