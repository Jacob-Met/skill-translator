import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPathCircle,MIN_CIRCLE_COVERAGE_DEGREES} from '../src/path-circle.mjs';
import {pathAccount,pathFixture} from './helpers/sampled-path-fixture.mjs';
const account=(p,missing=[])=>pathAccount(pathFixture(p),missing);
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const arc=(n=8,span=315,radius=23,cx=51,cy=48,phase=17)=>Array.from({length:n},(_,i)=>{const a=(phase+i*span/(n-1))*Math.PI/180;return [cx+radius*Math.cos(a),cy+radius*Math.sin(a)];});

test('unfamiliar circular samples infer center and radius without additional guide anchors',()=>{
 for(let k=0;k<20;k++){
  const cx=35+k,cy=55-k*.6,radius=12+k*.5,p=arc(8,300,radius,cx,cy,13+k*7),raw=account(p),original=JSON.stringify(raw);
  const r=inspectPathCircle(raw);assert.equal(r.circle.status,'resolved');near(r.circle.center.xMm,cx);near(r.circle.center.yMm,cy);near(r.circle.radiusMm,radius);
  near(r.rmsResidualMm,0);near(r.maxHeldOutResidualMm,0);near(r.maxHeldOutCenterShiftMm,0);assert.equal(r.heldOutResolvedCount,8);
  assert.equal(JSON.stringify(raw),original);assert.ok(raw.sequence.moments.every(m=>m.calibratedTask.landmarks.length===1));
 }
});
test('symmetric unequal radii match an independent algebraic oracle while retaining every disagreement',()=>{
 const points=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,r=i%2?22:20;return [50+r*Math.cos(a),50+r*Math.sin(a)];});
 const r=inspectPathCircle(account(points)),radius=Math.sqrt((20**2+22**2)/2);
 assert.equal(r.circle.status,'resolved');near(r.circle.center.xMm,50);near(r.circle.center.yMm,50);near(r.circle.radiusMm,radius);
 for(let i=0;i<8;i++)near(r.rows[i].residualMm,(i%2?22:20)-radius);
 assert.ok(r.maxResidualMm>1);assert.equal(r.rows.length,8);
});
test('ellipse and displaced observation remain visible failures of radial agreement',()=>{
 const ellipse=Array.from({length:8},(_,i)=>[50+30*Math.cos(i*Math.PI/4),50+10*Math.sin(i*Math.PI/4)]);
 const r=inspectPathCircle(account(ellipse));assert.equal(r.circle.status,'resolved');assert.ok(r.maxResidualMm>12);assert.ok(r.maxHeldOutResidualMm>10);
 const p=arc();p[2]=[51+1.6*(p[2][0]-51),48+1.6*(p[2][1]-48)];const displaced=inspectPathCircle(account(p));assert.ok(displaced.maxResidualMm>3);assert.ok(displaced.maxHeldOutCenterShiftMm>1);
});
test('short arcs, collinear, coincident and insufficient samples do not provide usable center or radius',()=>{
 assert.equal(MIN_CIRCLE_COVERAGE_DEGREES,90);
 for(const [points,status]of [[arc(8,15),'insufficient-angular-support'],[[[20,20],[30,30],[40,40],[50,50]],'unresolved-collinear'],[Array(5).fill([50,50]),'unresolved-coincident'],[arc(3,240),'insufficient-observations']]){
  const r=inspectPathCircle(account(points));assert.equal(r.circle.status,status);assert.equal(r.circle.center,undefined);assert.equal(r.circle.radiusMm,undefined);assert.equal(r.rmsResidualMm,null);
 }
 const tiny=arc(10,2,24,50,50,20).map((p,i)=>[p[0]+.03*Math.sin(i*1.7),p[1]+.03*Math.cos(i*2.1)]);
 assert.notEqual(inspectPathCircle(account(tiny)).circle.status,'resolved');
});
test('held-out loss of support is reported rather than silently converted to a zero residual',()=>{
 const r=inspectPathCircle(account(arc(4,100)));assert.equal(r.circle.status,'resolved');assert.ok(r.heldOutResolvedCount<4);
 assert.ok(r.rows.some(row=>row.heldOutResidualMm===null&&row.heldOutStatus==='insufficient-angular-support'));
});
test('missing samples and source-only replay preserve original evidence and reject source mismatch',()=>{
 const raw=account(arc(),[2]);raw.circle={center:{xMm:999,yMm:999},radiusMm:0};const r=inspectPathCircle(raw);
 assert.equal(r.circle.status,'resolved');assert.equal(r.observedCount,7);assert.equal(r.rows[2].status,'missing-observation');assert.equal(r.rows[2].residualMm,null);
 near(r.circle.radiusMm,23);assert.deepEqual(inspectPathCircle(JSON.parse(JSON.stringify(raw))),r);
 raw.sequence.moments[0].calibratedTask.source.image.sha256='f'.repeat(64);assert.throws(()=>inspectPathCircle(raw),/match/);
});
