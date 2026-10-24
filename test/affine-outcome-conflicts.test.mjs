import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeRawAffineChallenge,receiveRawAffineResult,encodeRawAffineChallenge} from '../src/raw-affine-challenge.mjs';
import {diagnoseAffineOutcomeConflicts as diagnose} from '../src/affine-outcome-conflicts.mjs';
const ann=(w,h,x,y=30)=>({title:'Authored source',provenance:'Analytic control only',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:[{id:'mark',label:'Mark',sourcePx:{x,y},kind:'fraction',toleranceMm:1}]});
const raw=(id,w,h,x,y=30)=>({id,label:id,evidenceClass:'authored-example',annotation:ann(w,h,x,y),landmarkId:'mark',correspondenceConfirmed:true,xBoundMm:.001,yBoundMm:.001});
function fixture(rows){const training={schema:'skill-translator-response-demonstrations/v1',referenceStudy:{schema:'skill-translator-response-family/v1',source:ann(100,80,20),landmarkId:'mark',coefficientLimit:2,observations:[],target:{widthMm:100,heightMm:80}},demonstrations:[raw('training',100,80,20)]};let study=freezeRawAffineChallenge(training,rows.map(([id,widthMm,heightMm])=>({id:'challenge-'+id,label:id,widthMm,heightMm})),true);for(const [id,w,h,x,y]of rows)if(x!==null)study=receiveRawAffineResult(study,'challenge-'+id,raw(id,w,h,x,y));return study;}
const groups=r=>r.groups.map(g=>g.outcomeIds.join(',')).sort();
test('four-outcome witness exposes both minimal groups without changing training or readings',()=>{
 const study=fixture([['a',110,80,30],['b',120,80,40],['c',130,80,35],['d',100,90,20]]),before=encodeRawAffineChallenge(study),r=diagnose(study);
 assert.equal(r.status,'conflicts');assert.equal(r.evaluatedSubsets,15);assert.ok(r.outcomes.every(o=>o.individuallyCompatible));assert.equal(r.originalFirstPrefixContradiction,'challenge-c');
 assert.deepEqual(groups(r),['challenge-a,challenge-c','challenge-b,challenge-c']);assert.ok(r.groups.every(g=>g.contradictedAxes.join()==='x'&&g.deletionChecks.every(d=>d.compatible)));
 assert.equal(encodeRawAffineChallenge(study),before);assert.deepEqual(r.account,study);
});
test('all inclusion-minimal groups include a triple even when a different singleton already contradicts',()=>{
 const r=diagnose(fixture([['a',110,80,20],['b',100,90,20],['c',110,90,30],['d',120,80,100]]));
 assert.deepEqual(groups(r),['challenge-a,challenge-b,challenge-c','challenge-d']);assert.equal(r.groups[0].outcomeIds.length,1);
 assert.ok(r.groups.every(g=>g.deletionChecks.length===g.outcomeIds.length&&g.deletionChecks.every(d=>d.compatible)));
});
test('six one-axis outcomes match an independent interval oracle across all63 subsets',()=>{
 const rows=Array.from({length:6},(_,i)=>[String(i+1),110+10*i,80,20+(10+10*i)*(.2*i)]),r=diagnose(fixture(rows));
 const failed=[];for(let mask=1;mask<64;mask++){let lo=-2,hi=2;rows.forEach((row,i)=>{if(mask&(1<<i)){const dx=row[1]-100;lo=Math.max(lo,(row[3]-20-.001)/dx);hi=Math.min(hi,(row[3]-20+.001)/dx);}});if(lo>hi)failed.push(mask);}
 const expected=failed.filter(m=>!failed.some(p=>p!==m&&(p&m)===p)).map(m=>rows.filter((_,i)=>m&(1<<i)).map(row=>'challenge-'+row[0]).join(',')).sort();
 assert.equal(r.evaluatedSubsets,63);assert.deepEqual(groups(r),expected);assert.equal(expected.length,15);
});
test('receipt order does not alter minimal groups and whole-account reopening recomputes forged summaries',()=>{
 const a=fixture([['a',110,80,30],['b',120,80,40],['c',130,80,35]]),b=JSON.parse(encodeRawAffineChallenge(a));b.results.reverse();b.conflicts=[];
 assert.deepEqual(groups(diagnose(a)),groups(diagnose(b)));assert.equal(diagnose(b).status,'conflicts');
});
test('missing outcomes are untested, empty evidence is distinct from a compatible received set',()=>{
 const empty=diagnose(fixture([['a',110,80,null]]));assert.equal(empty.status,'no-received-outcomes');assert.equal(empty.evaluatedSubsets,0);assert.deepEqual(empty.missingOutcomeIds,['challenge-a']);
 const r=diagnose(fixture([['a',110,80,30],['b',120,80,null]]));assert.equal(r.status,'compatible');assert.equal(r.received,1);assert.deepEqual(r.groups,[]);assert.deepEqual(r.missingOutcomeIds,['challenge-b']);
});
test('independent x and y contradiction axes retain separate minimal source groups',()=>{
 const r=diagnose(fixture([['a',110,80,100,30],['b',100,90,20,85]]));assert.equal(r.groups.length,2);assert.deepEqual(r.groups.map(g=>g.contradictedAxes),[['x'],['y']]);
});
test('insufficient work budget, malformed source binding and oversize input refuse rather than report no conflicts',()=>{
 const a=fixture([['a',110,80,30],['b',120,80,40],['c',130,80,35]]);
 assert.throws(()=>diagnose(a,{maxSubsetEvaluations:6}),{code:'CONFLICT_BUDGET'});
 for(const n of [0,64,NaN,Infinity])assert.throws(()=>diagnose(a,{maxSubsetEvaluations:n}),{code:'CONFLICT_BUDGET'});
 const malformed=structuredClone(a);malformed.results[0].correspondenceConfirmed=false;assert.throws(()=>diagnose(malformed),/confirm/);
 const large=structuredClone(a);large.extra='x'.repeat(2_000_000);assert.throws(()=>diagnose(large),/exceeds2MB/);
});
