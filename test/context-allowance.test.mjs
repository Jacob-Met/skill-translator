import test from 'node:test';import assert from 'node:assert/strict';
import {createObservation,exportEvidence,analyzeEvidence} from '../src/evidence.mjs';
import {CONTEXT_INPUT_SCHEMA,readContextInput,createContextStudy,validateContextStudy} from '../src/context-consistency.mjs';
import {analyzeContextDisks} from '../src/context-disk-support.mjs';
import {analyzeContextAllowance} from '../src/context-allowance.mjs';
import {rational as q,add,sub,mul,div,cmp} from '../vendor/chronos/exact-halfplanes.mjs';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const source={title:'Authored comparable-context controls',provenance:'Analytic observations, not physical measurements',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'guide',label:'Guide',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:1}]};
function input(points){return {schema:CONTEXT_INPUT_SCHEMA,source,observationEvidence:exportEvidence(source,points.map(([xMm,yMm,uncertaintyMm],i)=>createObservation(source,{id:'r'+i,label:'Authored reading '+i,evidenceClass:'authored-example',landmarkId:'guide',widthMm:200,heightMm:160,xMm,yMm,uncertaintyMm}))) };}
function study(points){const base=input(points);return createContextStudy(base,{landmarkId:'guide',observationIds:base.observationEvidence.observations.map(o=>o.id),label:'Declared comparable setup',basis:'Authored equal-condition control; no physical attribution.',comparable:true});}
const unseal=o=>[BigInt(o.numerator),BigInt(o.denominator)],sq=x=>mul(x,x);
function verify(account,result){const rows=account.observationEvidence.observations;
 if(result.status==='incompatible'){
  const pairs=result.certificate.support.map(s=>({row:rows.find(o=>o.id===s.observationId),w:unseal(s.weight.exact)}));
  assert.equal(cmp(pairs.reduce((a,p)=>add(a,p.w),q(0)),q(1)),0);assert.ok(pairs.every(p=>cmp(p.w,q(0))>=0));
  const mean=axis=>pairs.reduce((a,p)=>add(a,mul(p.w,q(p.row[axis]))),q(0));
  const value=sub(pairs.reduce((a,p)=>add(a,mul(p.w,sub(add(sq(q(p.row.xMm)),sq(q(p.row.yMm))),sq(q(p.row.uncertaintyMm))))),q(0)),add(sq(mean('xMm')),sq(mean('yMm'))));
  assert.equal(cmp(value,unseal(result.certificate.weightedSquaredResidualLowerBound.exact)),0);assert.ok(cmp(value,q(0))>0);
 }else if(result.status==='common-position'){
  const x=unseal(result.point.xMm.exact),y=unseal(result.point.yMm.exact);
  for(const id of result.selectedIds){const r=rows.find(o=>o.id===id);assert.ok(cmp(add(sq(sub(x,q(r.xMm))),sq(sub(y,q(r.yMm)))),sq(q(r.uncertaintyMm)))<=0);}
 }
}

function optimal(account,r){
 assert.equal(r.status,'optimal');const lower=unseal(r.optimumSquaredResidual.exact),x=unseal(r.point.xMm.exact),y=unseal(r.point.yMm.exact);
 const rows=account.observationEvidence.observations;
 let wsum=q(0),mx=q(0),my=q(0),sum=q(0);
 for(const item of r.certificate.support){const w=unseal(item.weight.exact),o=rows.find(o=>o.id===item.observationId);assert.ok(cmp(w,q(0))>=0);wsum=add(wsum,w);mx=add(mx,mul(w,q(o.xMm)));my=add(my,mul(w,q(o.yMm)));sum=add(sum,mul(w,sub(add(sq(q(o.xMm)),sq(q(o.yMm))),sq(q(o.uncertaintyMm)))));}
 assert.equal(cmp(wsum,q(1)),0);assert.equal(cmp(sub(sum,add(sq(mx),sq(my))),lower),0);
 for(const id of r.selectedIds){const o=rows.find(o=>o.id===id),res=sub(add(sq(sub(x,q(o.xMm))),sq(sub(y,q(o.yMm)))),sq(q(o.uncertaintyMm)));assert.ok(cmp(res,lower)<=0);}
 assert.equal(r.checks.length,r.selectedIds.length);assert.equal(cmp(unseal(r.allowanceSquaredMm.exact),cmp(lower,q(0))>0?lower:q(0)),0);
}
test('full-context magnitude exceeds first sufficient contradiction while all original inputs remain unchanged',()=>{
 const a=study([[45,50,2],[49,50,2],[47,53,2],[65,50,2]]),before=JSON.stringify(a),old=analyzeContextDisks(a),r=analyzeContextAllowance(a);optimal(a,r);
 assert.deepEqual(old.certificate.weightedSquaredResidualLowerBound.exact,{numerator:'25',denominator:'36'});assert.deepEqual(r.allowanceSquaredMm.exact,{numerator:'96',denominator:'1'});assert.equal(JSON.stringify(a),before);assert.deepEqual(analyzeContextDisks(a),old);
});
test('unequal radii, tangency, concentric negative optimum, zero disks and collinear supports',()=>{
 for(const [points,expected]of [[[[40,50,1],[44,50,3]],0],[[[40,50,2],[40,50,3]],-4],[[[40,50,0],[40,50,0]],0],[[[40,50,1],[50,50,1],[45,50,2]],24]]){const a=study(points),r=analyzeContextAllowance(a);optimal(a,r);assert.equal(cmp(unseal(r.optimumSquaredResidual.exact),q(expected)),0);}
});
test('independent equal-radius pair midpoint oracle covers100 varied contexts',()=>{
 for(let i=0;i<100;i++){const x1=10+(i*7)%60,y1=10+(i*13)%60,x2=10+(i*17)%60,y2=10+(i*23)%60,radius=i%8,a=study([[x1,y1,radius],[x2,y2,radius]]),r=analyzeContextAllowance(a);optimal(a,r);const expected=div(q((x1-x2)**2+(y1-y2)**2-4*radius**2),q(4));assert.equal(cmp(unseal(r.optimumSquaredResidual.exact),expected),0);}
});
test('all60 records checked; exhausted proof never returns optimum or allowance',()=>{
 const a=study(Array.from({length:60},(_,i)=>[40+i%2*10,50,1])),r=analyzeContextAllowance(a);optimal(a,r);assert.equal(r.checks.length,60);assert.equal(cmp(unseal(r.allowanceSquaredMm.exact),q(24)),0);
 for(const maxWork of [0,1,60,61]){const r=analyzeContextAllowance(a,{maxWork});assert.equal(r.status,'unresolved');assert.ok(!r.point&&!r.certificate&&!r.allowanceSquaredMm);}
});
