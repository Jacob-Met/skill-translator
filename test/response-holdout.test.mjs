import test from 'node:test';
import assert from 'node:assert/strict';
import {RESPONSE_SCHEMA,createResponseObservation,analyzeResponseStudy} from '../src/response-family.mjs';
import {analyzeResponseHoldouts} from '../src/response-holdout.mjs';
const source={title:'Authored holdout control',provenance:'Analytic software control',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'mark',label:'Point',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:1}]};
function study(rows){return {schema:RESPONSE_SCHEMA,source:structuredClone(source),landmarkId:'mark',coefficientLimit:2,target:{widthMm:200,heightMm:160},observations:rows.map((row,i)=>createResponseObservation(source,'mark',{id:`row-${i}`,label:`Control ${i}`,evidenceClass:'authored-example',xBoundMm:0,yBoundMm:0,...row}))};}
const x={widthMm:200,heightMm:80,xMm:45,yMm:50};
const y={widthMm:100,heightMm:160,xMm:60,yMm:70};
const both={widthMm:200,heightMm:160,xMm:85,yMm:90};
test('independent width and height variation predicts omitted mixed response without changing full study',()=>{
 const s=study([x,y,both]),before=JSON.stringify(s),a=analyzeResponseHoldouts(s);
 assert.equal(a.full.status,'supported');assert.deepEqual(a.rows.map(r=>r.status),['contained','contained','contained']);
 assert.deepEqual(a.rows[2].axes.x.prediction,{lower:85,upper:85});
 assert.equal(JSON.stringify(s),before);assert.deepEqual(a.full,analyzeResponseStudy(s));
});
test('two fitted directions alone do not predict each other: omitted dimension remains free',()=>{
 const a=analyzeResponseHoldouts(study([x,y]));
 assert.deepEqual(a.rows.map(r=>r.status),['overlaps','overlaps']);
 assert.equal(a.rows[0].variationRank,1);assert.deepEqual(a.rows[0].axes.x.prediction,{lower:-180,upper:220});
});
test('conflict is not automatically localized to one faulty observation',()=>{
 const a=analyzeResponseHoldouts(study([x,y,{...both,xMm:86}]));
 assert.equal(a.full.status,'incompatible');assert.deepEqual(a.rows.map(r=>r.status),['excluded','excluded','excluded']);
 assert.equal(a.rows[2].axes.x.status,'excluded');assert.equal(a.rows[2].axes.y.status,'contained');
});
test('incompatible remaining evidence yields no prediction',()=>{
 const a=analyzeResponseHoldouts(study([x,{...x,xMm:46},y,{...y,yMm:71}]));
 assert.ok(a.rows.every(r=>r.status==='remainder-incompatible'&&r.axes===null));
});
test('empty and single observation retain explicit domain-only status',()=>{
 assert.deepEqual(analyzeResponseHoldouts(study([])).rows,[]);
 const a=analyzeResponseHoldouts(study([x]));assert.equal(a.rows[0].domainOnly,true);
 assert.equal(a.rows[0].status,'overlaps');assert.equal(a.rows[0].axes.x.extendsBeyondSheet,true);
});
test('boundary intersection and wider observed box differ from full containment',()=>{
 const a=analyzeResponseHoldouts(study([x,y,{...both,xMm:86,xBoundMm:1}]));
 assert.equal(a.rows[2].axes.x.status,'contained');
 const b=analyzeResponseHoldouts(study([{...x,xBoundMm:1},y,{...both,xMm:86,xBoundMm:0}]));
 assert.equal(b.rows[2].axes.x.status,'overlaps');
 assert.deepEqual(b.rows[2].axes.x.prediction,{lower:84,upper:86});
});
test('source-bound malformed input and forged findings are refused or recomputed',()=>{
 const s=study([x,y,both]);s.rows=[{status:'excluded'}];assert.equal(analyzeResponseHoldouts(s).rows[0].status,'contained');
 s.source.source.widthMm=101;assert.throws(()=>analyzeResponseHoldouts(s),/different source/);
});
test('all 60 admitted observations are independently omitted and repeated rows stay visible',()=>{
 const a=analyzeResponseHoldouts(study(Array.from({length:60},(_,i)=>[x,y,both][i%3])));
 assert.equal(a.rows.length,60);assert.ok(a.rows.every(r=>r.retainedCount===59&&r.status==='contained'));
});
test('permuting observation order preserves ID-associated predictions',()=>{
 const s=study([x,y,both]);const a=analyzeResponseHoldouts(s),b=analyzeResponseHoldouts({...s,observations:[...s.observations].reverse()});
 for(const row of a.rows)assert.deepEqual(row,b.rows.find(r=>r.observation.id===row.observation.id));
});
test('independent integer affine oracle predicts each omitted size across 100 coefficient controls',()=>{
 for(let i=0;i<100;i++){
  const ax=(i%5)/10,bx=(i%7)/10,ay=(i%3)/10,by=(i%4)/10;
  const rows=[[110,80],[100,90],[110,90]].map(([w,h])=>({widthMm:w,heightMm:h,xMm:20+Math.round(ax*(w-100)+bx*(h-80)),yMm:30+Math.round(ay*(w-100)+by*(h-80))}));
  const a=analyzeResponseHoldouts(study(rows));
  a.rows.forEach((row,j)=>{assert.equal(row.status,'contained');assert.deepEqual(row.axes.x.prediction,{lower:rows[j].xMm,upper:rows[j].xMm});assert.deepEqual(row.axes.y.prediction,{lower:rows[j].yMm,upper:rows[j].yMm});});
 }
});
test('subnormal excluded displacement is not masked by rounded interval comparison',()=>{
 const s=study([]);s.source.landmarks[0].sourcePx.x=0;
 s.observations=[0,Number.MIN_VALUE].map((xMm,i)=>createResponseObservation(s.source,'mark',{id:`tiny-${i}`,label:'Subnormal control',evidenceClass:'authored-example',widthMm:100,heightMm:80,xMm,yMm:30,xBoundMm:0,yBoundMm:0}));
 const a=analyzeResponseHoldouts(s);assert.equal(a.rows[1].status,'excluded');assert.equal(a.rows[0].status,'remainder-incompatible');
});
