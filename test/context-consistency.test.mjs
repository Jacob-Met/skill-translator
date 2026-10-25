import test from 'node:test';import assert from 'node:assert/strict';
import {createObservation,exportEvidence,analyzeEvidence} from '../src/evidence.mjs';
import {CONTEXT_INPUT_SCHEMA,readContextInput,createContextStudy,validateContextStudy} from '../src/context-consistency.mjs';
import {analyzeContextDisks} from '../src/context-disk-support.mjs';
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
test('three pairwise-compatible closed disks expose a joint conflict independently of all five rules',()=>{
 const points=[[45,50,2],[49,50,2],[47,53,2]],s=study(points),before=JSON.stringify(s);
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.equal(analyzeContextDisks(study([points[i],points[j]])).status,'common-position');
 const r=analyzeContextDisks(s);assert.equal(r.status,'incompatible');assert.deepEqual(r.certificate.weightedSquaredResidualLowerBound.exact,{numerator:'25',denominator:'36'});verify(s,r);assert.equal(JSON.stringify(s),before);
 assert.equal(r.certificate.support.length,3);
});
test('fresh explicitly widened declarations admit a point verified against every selected record',()=>{
 const s=study([[45,50,3],[49,50,3],[47,53,3]]),r=analyzeContextDisks(s);assert.equal(r.status,'common-position');verify(s,r);assert.equal(r.checks.length,3);
});
test('tangency, zero radii, repeated centers and collinear disks retain exact closed-boundary semantics',()=>{
 for(const points of [[[40,40,1],[42,40,1]],[[40,40,0],[40,40,0]],[[40,40,0],[40,40,3]],[[40,40,3],[42,40,1],[44,40,3]]]){const s=study(points),r=analyzeContextDisks(s);assert.equal(r.status,'common-position');verify(s,r);}
 const s=study([[40,40,0],[41,40,0]]),r=analyzeContextDisks(s);assert.equal(r.status,'incompatible');verify(s,r);
});
test('independent integer pair-distance oracle and certificate reconstruction match 150 controls',()=>{
 let state=123;const rnd=()=>((state=(state*1664525+1013904223)>>>0)/2**32);
 for(let i=0;i<150;i++){
  const a=[20+Math.floor(rnd()*30),20+Math.floor(rnd()*30),Math.floor(rnd()*15)],b=[20+Math.floor(rnd()*30),20+Math.floor(rnd()*30),Math.floor(rnd()*15)];
  const expected=(a[0]-b[0])**2+(a[1]-b[1])**2<=(a[2]+b[2])**2;
  const s=study([a,b]),r=analyzeContextDisks(s);assert.equal(r.status,expected?'common-position':'incompatible');verify(s,r);
 }
});
test('complete sixty-record common-point check and early subset certificate retain every raw record',()=>{
 const common=study(Array.from({length:60},(_,i)=>[45+i%5,50+i%7,20])),r=analyzeContextDisks(common);assert.equal(r.status,'common-position');assert.equal(r.checks.length,60);verify(common,r);
 const other=study([[45,50,2],[49,50,2],[47,53,2],...Array.from({length:57},()=>[47,50,20])]),failed=analyzeContextDisks(other);assert.equal(failed.status,'incompatible');assert.equal(failed.selectedIds.length,60);assert.equal(other.observationEvidence.observations.length,60);verify(other,failed);
});
test('work exhaustion never returns a partial point or contradiction certificate',()=>{
 for(const maxWork of [0,1,3,4]){const r=analyzeContextDisks(study([[45,50,2],[49,50,2],[47,53,2]]),{maxWork});assert.equal(r.status,'unresolved');assert.equal(r.point,undefined);assert.equal(r.certificate,undefined);assert.ok(r.work<=maxWork);}
 assert.throws(()=>analyzeContextDisks(study([[40,40,1],[42,40,1]]),{maxWork:100001}),/budget/);
});
test('actual task-space input and raw context replay retain original source and original five-rule results',()=>{
 const s=study([[45,50,2],[49,50,2],[47,53,2]]),original=analyzeEvidence(s.source,'guide',s.observationEvidence.observations);
 const admitted=readContextInput({schema:'skill-translator-task-space/v1',source:s.source,observationEvidence:s.observationEvidence,evaluation:{forged:'pass'}});
 const replay=createContextStudy(admitted,s.group);assert.deepEqual(replay,s);assert.deepEqual(validateContextStudy({...s,derived:{forged:'compatible'}}),s);assert.deepEqual(analyzeContextDisks(replay),analyzeContextDisks(s));
 assert.deepEqual(analyzeEvidence(s.source,'guide',s.observationEvidence.observations),original);
});
test('same-size declaration is explicit and source/group custody refuses changed assumptions',()=>{
 const s=study([[45,50,2],[49,50,2],[47,53,2]]);
 for(const mutate of [v=>{v.group.comparable=false;},v=>{v.group.basis='';},v=>{v.group.observationIds=['r0','r0'];},v=>{v.group.observationIds=['r0','unknown'];},v=>{v.group.landmarkId='another';},v=>{v.observationEvidence.observations[1].widthMm=201;},v=>{v.source.source.widthMm=101;}]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>analyzeContextDisks(bad));}
});
test('exact closed-disk question remains distinct from the existing five-rule numerical guard',()=>{
 const a=study([[40,60,0],[40+5e-10,60,0]]);const old=analyzeEvidence(a.source,'guide',a.observationEvidence.observations);assert.ok(old.compatibleRules.includes('fraction'));
 assert.equal(analyzeContextDisks(a).status,'incompatible');assert.match(analyzeContextDisks(a).limitations.join(' '),/separate 1e-9/);
});
test('maintained CHRONOS kernel and arithmetic dependency remain byte pinned',async()=>{
 const root=new URL('../vendor/chronos/',import.meta.url),lock=JSON.parse(await readFile(new URL('exact-circle-source-lock.json',root),'utf8'));
 assert.equal(createHash('sha256').update(await readFile(new URL('exact-circle-support.mjs',root))).digest('hex'),lock.sha256);
 assert.equal(createHash('sha256').update(await readFile(new URL('exact-halfplanes.mjs',root))).digest('hex'),'3f2020d8adac92ac1b82331dd5b30964a889a85d249e81cd16bb9dbba99b1150');
});
