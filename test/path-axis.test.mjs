import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPathAxis} from '../src/path-axis.mjs';
import {pathAccount,pathFixture} from './helpers/sampled-path-fixture.mjs';
const account=points=>pathAccount(pathFixture(points));
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);

test('unfamiliar rotated straight paths infer the geometric axis without extra anchors',()=>{
 for(let k=0;k<23;k++){
  const angle=(k*7.1+3)*Math.PI/180,points=[-23,-11,-2,9,24].map(t=>[50+t*Math.cos(angle),50+t*Math.sin(angle)]),source=account(points),before=JSON.stringify(source);
  const r=inspectPathAxis(source);assert.equal(r.axis.status,'resolved');near(r.rmsResidualMm,0);near(r.maxHeldOutResidualMm,0);
  near(Math.abs(r.axis.direction.x*Math.cos(angle)+r.axis.direction.y*Math.sin(angle)),1);
  assert.equal(r.heldOutResolvedCount,5);assert.equal(JSON.stringify(source),before);
  assert.ok(source.sequence.moments.every(m=>m.calibratedTask.landmarks.length===1));
 }
});
test('symmetric unfamiliar noisy samples agree with an independent horizontal-axis oracle',()=>{
 const r=inspectPathAxis(account([[20,39],[30,42],[40,38],[50,42],[60,39]]));
 assert.equal(r.axis.status,'resolved');near(r.axis.center.xMm,40);near(r.axis.center.yMm,40);
 near(Math.abs(r.axis.direction.x),1);near(r.rmsResidualMm,Math.sqrt(14/5));near(r.maxResidualMm,2);
 for(const [i,y] of [39,42,38,42,39].entries())near(Math.abs(r.rows[i].residualMm),Math.abs(y-40));
});
test('curved excursion and held-out endpoint failures cannot masquerade as straight agreement',()=>{
 const curved=inspectPathAxis(account([[10,20],[30,40],[50,50],[70,40],[90,20]]));
 assert.equal(curved.axis.status,'resolved');assert.ok(curved.maxResidualMm>10);assert.ok(curved.maxHeldOutResidualMm>20);
 const leverage=inspectPathAxis(account([[10,20],[20,20],[30,20],[90,70]]));
 near(leverage.rows[3].heldOutResidualMm,50);assert.ok(leverage.maxResidualMm>0);
});
test('isotropic, coincident and insufficient samples do not receive an axis',()=>{
 for(const [points,status] of [[[[20,20],[80,20],[80,80],[20,80]],'unresolved-direction'],[[[50,50],[50,50],[50,50]],'unresolved-coincident'],[[[10,10],[80,80]],'insufficient-observations']]){
  const r=inspectPathAxis(account(points));assert.equal(r.axis.status,status);assert.equal(r.rmsResidualMm,null);assert.ok(r.rows.every(row=>row.residualMm===null));
 }
});
test('missing samples remain explicit and source-only replay recomputes fabricated findings',()=>{
 const raw=pathAccount(pathFixture([[10,20],[20,20],[30,20],[40,20]]),[1]);raw.axis={status:'resolved',angleDegrees:999};
 const r=inspectPathAxis(raw);assert.equal(r.observedCount,3);assert.equal(r.selectedCount,4);assert.equal(r.rows[1].status,'missing-observation');assert.equal(r.rows[1].heldOutResidualMm,null);near(r.rmsResidualMm,0);
 assert.deepEqual(inspectPathAxis(JSON.parse(JSON.stringify(raw))),r);
 raw.sequence.moments[0].calibratedTask.source.image.sha256='f'.repeat(64);assert.throws(()=>inspectPathAxis(raw),/match/);
});
test('orthogonal least squares beats a dense independent angle search without outlier deletion',()=>{
 let seed=49201;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
 for(let k=0;k<30;k++){
  const points=Array.from({length:7},()=>[10+80*random(),10+80*random()]),r=inspectPathAxis(account(points));assert.equal(r.axis.status,'resolved');assert.equal(r.rows.length,7);
  const cx=points.reduce((s,p)=>s+p[0],0)/7,cy=points.reduce((s,p)=>s+p[1],0)/7;
  let oracle=Infinity;for(let degree=0;degree<180;degree+=.25){const a=degree*Math.PI/180;const mse=points.reduce((s,p)=>s+((p[1]-cy)*Math.cos(a)-(p[0]-cx)*Math.sin(a))**2,0)/7;oracle=Math.min(oracle,mse);}
  assert.ok(r.rmsResidualMm**2<=oracle+1e-7);assert.ok(oracle-r.rmsResidualMm**2<.02);
 }
});
