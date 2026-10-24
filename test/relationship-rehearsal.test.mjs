import test from 'node:test';
import assert from 'node:assert/strict';
import {createRehearsal,placeRehearsal,revealRehearsal,submitRehearsal,advanceRehearsal} from '../src/transfer-rehearsal.mjs';
import {createRelationshipRehearsal,reviewRelationshipRehearsal,importRelationshipRehearsal,exportRelationshipRehearsal} from '../src/relationship-rehearsal.mjs';
const source={title:'Authored control',provenance:'Synthetic axes',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:2},{id:'b',label:'B',kind:'fraction',sourcePx:{x:40,y:30},toleranceMm:2}]};
const rules=[{id:'pair',label:'Directed spacing',from:'a',to:'b',kind:'horizontal',toleranceMm:0.5}];
const fresh=()=>createRehearsal(source,[{widthMm:100,heightMm:100},{widthMm:200,heightMm:100}]);
const place=(s,a,b)=>placeRehearsal(placeRehearsal(s,'a',{xMm:a,yMm:30}),'b',{xMm:b,yMm:30});
const review=s=>reviewRelationshipRehearsal(createRelationshipRehearsal(s,rules));
test('common shift preserves pair while original positions fail and unsubmitted feedback stays hidden',()=>{
 let s=place(fresh(),25,45);assert.equal(review(s).trials[0].assessment,null);
 s=submitRehearsal(s);const t=review(s).trials[0];assert.equal(t.assessment.passed,true);assert.equal(t.assessment.practice.passed,false);
 assert.equal(review(s).trials[1].assessment,null);
});
test('point passes do not imply tighter relationship pass and references adapt per workpiece',()=>{
 let s=submitRehearsal(place(fresh(),19,41));let t=review(s).trials[0];assert.equal(t.assessment.practice.passed,true);assert.equal(t.assessment.passed,false);
 s=submitRehearsal(place(advanceRehearsal(s),40,80));t=review(s).trials[1];assert.equal(t.assessment.results[0].expectedMm,40);assert.equal(t.assessment.passed,true);
});
test('missing observations and exact prehelp records survive raw replay without mutation',()=>{
 let s=placeRehearsal(fresh(),'a',{xMm:25,yMm:30});s=submitRehearsal(revealRehearsal(s));const before=JSON.stringify(s),bundle=createRelationshipRehearsal(s,rules),r=reviewRelationshipRehearsal(bundle);
 assert.deepEqual(r.trials[0].assessment.results[0].missing,['b']);assert.equal(r.trials[0].assistance,'targets_requested');assert.equal(r.trials[0].reveals[0].priorAttempts[0].xMm,25);
 assert.deepEqual(reviewRelationshipRehearsal(JSON.parse(exportRelationshipRehearsal(bundle))),r);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>importRelationshipRehearsal({...bundle,rules:[{...rules[0],to:'missing'}]}));
});
test('distance cannot distinguish reversal but directed criteria do',()=>{
 const s=submitRehearsal(place(fresh(),40,20));assert.equal(review(s).trials[0].assessment.passed,false);
 assert.equal(reviewRelationshipRehearsal(createRelationshipRehearsal(s,[{...rules[0],kind:'distance'}])).trials[0].assessment.passed,true);
});

test('exact source criteria reuse refuses changed source without altering accepted rehearsal',async()=>{
 const {createPractice}=await import('../src/practice.mjs');const {createRelationshipReview}=await import('../src/task-relationships.mjs');const {applyRehearsalRelationshipReview}=await import('../src/relationship-rehearsal.mjs');
 const bundle=createRelationshipRehearsal(fresh()),before=JSON.stringify(bundle);
 const review=createRelationshipReview(source,createPractice(source,100,100),rules);
 assert.deepEqual(applyRehearsalRelationshipReview(bundle,review).rules,rules);
 const changed=structuredClone(source);changed.landmarks[0].toleranceMm=3;
 const other=createRelationshipReview(changed,createPractice(changed,100,100),rules);
 assert.throws(()=>applyRehearsalRelationshipReview(bundle,other),/complete original/);assert.equal(JSON.stringify(bundle),before);
});
