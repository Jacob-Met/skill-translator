import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPathReferencePrediction} from '../src/path-reference-prediction.mjs';
import {inspectPathAxisPrediction} from '../src/path-axis-prediction.mjs';
import {createPathComparison} from '../src/path-comparison.mjs';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
const arc=(r=23,cx=50,cy=50,start=17,span=180,n=8)=>Array.from({length:n},(_,i)=>{const a=(start+i*span/(n-1))*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];});
const path=points=>pathAccount(pathFixture(points));
const study=(a,b)=>createPathComparison(a,b,{samePointAndCoordinates:true,basis:'Authored common point and coordinate meanings'});
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('first-source circle predicts unfamiliar target angles through unchanged existing axis admission',()=>{
 for(let k=0;k<12;k++){
  const r=14+k*.6,raw=study(path(arc(r,50,50,k*11)),path(arc(r,50,50,k*11+9,160,9))),before=JSON.stringify(raw),out=inspectPathReferencePrediction(raw);
  assert.deepEqual(out.axis,inspectPathAxisPrediction(raw));assert.equal(out.status,'both-references-supported');assert.equal(out.targetCount,9);assert.equal(out.commonCount,9);near(out.circleSummary.rmsMm,0);assert.ok(out.axisSummary.rmsMm>3);
  assert.deepEqual(out.rows.map(r=>r.momentId),out.axis.rows.map(r=>r.momentId));assert.equal(JSON.stringify(raw),before);
 }
});
test('changed target radius and center never refit either source hypothesis',()=>{
 const first=path(arc()),a=inspectPathReferencePrediction(study(first,path(arc(23,50,50,26,160,9)))),b=inspectPathReferencePrediction(study(first,path(arc(30,50,50,26,160,9)))),c=inspectPathReferencePrediction(study(first,path(arc(23,57,46,26,160,9))));
 for(const other of[b,c]){assert.deepEqual(a.axis.training,other.axis.training);assert.deepEqual(a.circle,other.circle);}
 near(a.circleSummary.rmsMm,0);near(b.circleSummary.rmsMm,7);assert.ok(c.circleSummary.rmsMm>5);
});
test('same target population is scored once despite repeated ordered coupling partners',()=>{
 const out=inspectPathReferencePrediction(study(path(arc(23,50,50,17,180,4)),path(arc(23,50,50,26,160,10))));
 assert.equal(out.rows.length,10);assert.equal(out.commonCount,10);assert.ok(out.axis.comparison.coupling.length>=10);
 assert.equal(new Set(out.rows.map(r=>r.momentId)).size,10);near(out.circleSummary.rmsMm,0);
});
test('short-arc, straight and isotropic first-source refusals never become zero-error common scores',()=>{
 const target=path(arc());
 for(const [first,unsupported]of [[path(arc(23,50,50,17,15)),'circle'],[path([[10,30],[30,30],[50,30],[70,30]]),'circle'],[path(arc(23,50,50,0,315)),'axis']]){
  const out=inspectPathReferencePrediction(study(first,target));assert.equal(out.status,'incomplete-reference-support');assert.equal(out.commonCount,0);assert.equal(out.commonCircleSummary.rmsMm,null);assert.equal(out.commonAxisSummary.rmsMm,null);assert.equal(out[unsupported+'Summary'].rmsMm,null);
 }
});
test('both wrong and both agreeing targets do not produce a preferred model or a pass verdict',()=>{
 const first=path(arc()),bad=inspectPathReferencePrediction(study(first,path([[10,10],[90,90],[10,90],[90,10],[50,50]])));
 assert.ok(bad.axisSummary.rmsMm>30&&bad.circleSummary.rmsMm>30);assert.ok(bad.circleSummary.rmsMm<bad.axisSummary.rmsMm);assert.equal(bad.winner,undefined);assert.equal(bad.passed,undefined);
 const a=bad.axis.axis,c=bad.circle.circle,dx=a.center.xMm-c.center.xMm,dy=a.center.yMm-c.center.yMm,t=dx*a.direction.x+dy*a.direction.y;
 const foot={x:a.center.xMm-t*a.direction.x,y:a.center.yMm-t*a.direction.y},h=Math.hypot(foot.x-c.center.xMm,foot.y-c.center.yMm),along=Math.sqrt(c.radiusMm**2-h*h),point=[foot.x+along*a.direction.x,foot.y+along*a.direction.y];
 const tie=inspectPathReferencePrediction(study(first,path([point,point,point])));near(tie.axisSummary.rmsMm,0);near(tie.circleSummary.rmsMm,0);assert.equal(tie.winner,undefined);
});
test('source order, dimensions, missing evidence, declaration and raw replay retain maintained meaning',()=>{
 const a=path(arc()),b=path(arc(30,50,50,26,160,9)),raw=study(a,b),out=inspectPathReferencePrediction(raw),reverse=inspectPathReferencePrediction(study(b,a));
 near(out.circle.circle.radiusMm,23);near(reverse.circle.circle.radiusMm,30);assert.notDeepEqual(out.circle,reverse.circle);
 const forged=structuredClone(raw);forged.circle={radiusMm:0};forged.rows=[];assert.deepEqual(inspectPathReferencePrediction(forged),out);
 const missing=structuredClone(b);missing.samples[1].markId=null;assert.throws(()=>inspectPathReferencePrediction(study(a,missing)),/complete|Missing/);
 const noMeaning=structuredClone(raw);noMeaning.declaration.samePointAndCoordinates=false;assert.throws(()=>inspectPathReferencePrediction(noMeaning),/declare/);
 const wide=pathAccount(pathFixture(arc(),{widths:Array(8).fill(120)}));assert.throws(()=>inspectPathReferencePrediction(study(a,wide)),/dimensions/);
 raw.paths[0].sequence.moments[0].calibratedTask.source.image.sha256='f'.repeat(64);assert.throws(()=>inspectPathReferencePrediction(raw),/match/);
});
