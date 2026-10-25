import test from 'node:test';
import assert from 'node:assert/strict';
import {pathAccount,pathFixture} from './helpers/sampled-path-fixture.mjs';
import {createPathComparison} from '../src/path-comparison.mjs';
import {inspectPathAxisPrediction} from '../src/path-axis-prediction.mjs';
const p=points=>pathAccount(pathFixture(points));
const comparison=(a,b)=>createPathComparison(a,b,{samePointAndCoordinates:true,basis:'Authored same point in common sheet coordinates'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('unfamiliar same-axis extents are separated from sampled path matching',()=>{
 const r=inspectPathAxisPrediction(comparison(p([[10,30],[20,30],[40,30],[60,30],[80,30]]),p([[15,30],[25,30],[35,30],[55,30],[75,30]])));
 near(r.maxResidualMm,0);near(r.comparison.distanceMm,5);
});
test('held-out parallel displacement stays visible instead of refitting it away',()=>{
 const source=p([[10,30],[20,30],[40,30],[60,30],[80,30]]),a=inspectPathAxisPrediction(comparison(source,p([[15,36],[25,36],[35,36],[55,36],[75,36]]))),b=inspectPathAxisPrediction(comparison(source,p([[15,50],[25,50],[35,50],[55,50],[75,50]])));
 near(a.maxResidualMm,6);near(b.maxResidualMm,20);assert.deepEqual(a.axis,b.axis);assert.deepEqual(a.training,b.training);
});
test('interior excursions are retained even when held-out endpoints lie on reference axis',()=>{
 const r=inspectPathAxisPrediction(comparison(p([[10,30],[40,30],[80,30]]),p([[15,30],[25,30],[35,43],[55,30],[75,30]])));
 near(r.maxResidualMm,13);near(r.rows[0].residualMm,0);near(r.rows.at(-1).residualMm,0);
});
test('unresolved reference and incomplete or mismatched source meanings cannot pass as a prediction',()=>{
 const straight=p([[10,10],[40,10],[80,10]]),unresolved=inspectPathAxisPrediction(comparison(p([[50,50],[50,50],[50,50]]),straight));assert.equal(unresolved.maxResidualMm,null);assert.ok(unresolved.rows.every(r=>r.residualMm===null));
 const missing=structuredClone(straight);missing.samples[1].markId=null;assert.throws(()=>inspectPathAxisPrediction(comparison(straight,missing)),/Missing|complete/);
 const raw=comparison(straight,straight);raw.declaration.samePointAndCoordinates=false;assert.throws(()=>inspectPathAxisPrediction(raw),/declare/);
 const wide=pathAccount(pathFixture([[10,10],[40,10],[80,10]],{widths:[120,120,120]}));assert.throws(()=>inspectPathAxisPrediction(comparison(straight,wide)),/dimensions/);
});
test('independent rotated held-out offsets retain their expected distances without source mutation',()=>{
 for(let k=0;k<19;k++){
  const a=(k*8+5)*Math.PI/180,point=(t,offset)=>[50+t*Math.cos(a)-offset*Math.sin(a),50+t*Math.sin(a)+offset*Math.cos(a)];
  const raw=comparison(p([-20,0,20].map(t=>point(t,0))),p([-25,-7,13,25].map(t=>point(t,3+k/10)))),before=JSON.stringify(raw),r=inspectPathAxisPrediction(raw);
  near(r.maxResidualMm,3+k/10);near(r.rmsResidualMm,3+k/10);assert.equal(JSON.stringify(raw),before);
 }
});
