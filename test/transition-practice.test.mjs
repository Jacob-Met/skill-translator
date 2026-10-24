import test from 'node:test';import assert from 'node:assert/strict';
import {transitionFixture,populated,revealed} from './transition-practice-fixture.mjs';
import {createTransitionPractice,importTransitionPractice,receiveTransitionPractice,inspectTransitionPractice,predictTransition,revealTransition,declareLearnerReference} from '../src/transition-practice.mjs';
import {observePractice,placePractice,retryPractice} from '../src/practice.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
test('different calibrated cameras preserve the endpoint/change distinction, including stationary and unpaired marks',()=>{
 const f=transitionFixture(),before=structuredClone(f);
 for(const [x,y,endpoint,change] of [[20,40,'satisfied','satisfied'],[30,40,'satisfied','unsatisfied'],[30,50,'unsatisfied','satisfied']]){
  const result=inspectTransitionPractice(revealed(populated(f,x,y))).findings;assert.equal(result.endpoint,endpoint);assert.equal(result.change,change);
  assert.equal(result.pairs[1].change.within,true);assert.equal(result.unpaired.after[0].id,'unpaired');
  if(x===30&&y===40)assert.ok(Math.abs(result.pairs[0].change.errorMm-10)<1e-10);
 }
 assert.deepEqual(f,before);
});
test('missing before evidence leaves change unknown even when the final mapped endpoints pass',()=>{
 const f=transitionFixture();let a=populated(f);a.before.attempts=[];
 let result=inspectTransitionPractice(revealed(a)).findings;assert.equal(result.endpoint,'satisfied');assert.equal(result.change,'unknown');assert.equal(result.pairs[0].observedChange,null);
 a=populated(f,40,20);a.before.attempts=a.before.attempts.slice(0,1);result=inspectTransitionPractice(revealed(a)).findings;
 assert.equal(result.change,'unsatisfied');assert.ok(Math.abs(result.pairs[0].change.errorMm-40)<1e-10);
});
test('feedback requires a committed prediction; revised evidence resets reference, prediction and reveal',()=>{
 const f=transitionFixture(),a=populated(f);assert.equal(inspectTransitionPractice(a).findings,null);assert.throws(()=>revealTransition(a),/Commit/);
 const locked=predictTransition(a,{endpoint:'satisfied',change:'unknown',reason:'I can see final positions but lack movement evidence'});assert.equal(inspectTransitionPractice(locked).findings,null);assert.throws(()=>predictTransition(locked,locked.prediction),/retained/);
 const next=receiveTransitionPractice(revealTransition(locked),'after',populated(f,20,50).after);assert.equal(next.prediction,null);assert.equal(next.revealed,false);assert.equal(next.learnerReference,null);assert.throws(()=>predictTransition(next,locked.prediction),/common learner/);
});
test('matching raw source, rules and original dimensions are mandatory; labels never establish correspondence',()=>{
 const f=transitionFixture(),a=populated(f),copy=structuredClone(a);
 for(const mutate of [s=>s.reference.source.image.sha256='f'.repeat(64),s=>s.reference.target.widthMm=161,s=>s.reference.landmarks[0].toleranceMm=40]){const bad=structuredClone(a.after);mutate(bad);assert.throws(()=>receiveTransitionPractice(a,'after',bad),/differ/);}
 assert.throws(()=>receiveTransitionPractice(a,'before',a.after),/differ/);
 const foreign=structuredClone(f.comparison);foreign.pairs[0].beforeMarkId='move-1';assert.throws(()=>createTransitionPractice(foreign,f.criteria),/selected before/);assert.deepEqual(a,copy);
});
test('photo annotation evidence and explicit manual detach remain distinct in both states',()=>{
 const f=transitionFixture();let a=f.account;
 for(const [i,stage] of ['before','after'].entries()){
  const image={...f.source.moments[i].image,sha256:(i?'d':'c').repeat(64)},corners=f.tasks[i].source.corners,h=calibrate(corners);
  const photo={schema:'skill-translator-learner-observation/v1',image,evidenceClass:'authored-image-control',note:'Authored learner photo',calibration:{widthMm:160,heightMm:90,corners},points:[{id:`move-${i}`,pixel:toImage(h,(i?40:20)/160,30/90)},{id:`hold-${i}`,pixel:toImage(h,.5,60/90)}]};
  let session=observePractice(f.tasks[i],160,90,f.sessions[i],photo);if(i)session=placePractice(f.tasks[i],160,90,session,'move-1',{xMm:50,yMm:30});a=receiveTransitionPractice(a,stage,session);
 }
 a=declareLearnerReference(a,{samePlaneAndCorners:true,basis:'Explicit learner common reference'});const p=inspectTransitionPractice(revealed(a)).findings.pairs;
 assert.equal(p[0].before.provenance.evidenceClass,'authored-image-control');assert.equal(p[0].after.provenance.kind,'manual placement');assert.equal(p[1].after.provenance.kind,'retained photo annotation');assert.equal(p[0].change.within,false);
});
test('input-only reopen recomputes all findings and current rounds cannot borrow prior placements',()=>{
 const f=transitionFixture(),a=revealed(populated(f,30,40));a.findings={change:'satisfied'};a.after.passed=true;
 const reopened=importTransitionPractice(a);assert.equal(inspectTransitionPractice(reopened).findings.change,'unsatisfied');assert.equal(reopened.findings,undefined);
 const retried=retryPractice(f.tasks[0],160,90,a.before);let next=receiveTransitionPractice(reopened,'before',retried);next=declareLearnerReference(next,{samePlaneAndCorners:true,basis:'Fresh empty round retains same frame'});
 const report=inspectTransitionPractice(revealed(next));assert.equal(report.findings.change,'unknown');assert.equal(report.findings.rounds.before,2);assert.equal(next.before.history.length,1);
});
test('criterion completeness, numerical bounds and complete-account capacity refuse without truncation',()=>{
 const f=transitionFixture();assert.throws(()=>createTransitionPractice(f.comparison,f.criteria.slice(1)),/every/);
 for(const n of [0,-1,NaN,51]){const criteria=structuredClone(f.criteria);criteria[0].toleranceMm=n;assert.throws(()=>createTransitionPractice(f.comparison,criteria),/positive/);}
 const a=populated(f);assert.throws(()=>receiveTransitionPractice(a,'after',{...a.after,padding:'x'.repeat(256*1024)}),/256 KiB/);
 assert.throws(()=>importTransitionPractice({...a,padding:'x'.repeat(4_000_000)}),/4 MB/);
});

test('same reference and normalized practice replay preserve the first committed prediction',()=>{
 const a=revealed(populated(transitionFixture(),30,40));
 assert.deepEqual(declareLearnerReference(a,{...a.learnerReference,basis:'  '+a.learnerReference.basis+'  '}),a);
 assert.throws(()=>declareLearnerReference(a,null),/committed/);
 assert.throws(()=>declareLearnerReference(a,{samePlaneAndCorners:true,basis:'Reworded after feedback'}),/committed/);
 for(const stage of ['before','after']){
  assert.deepEqual(receiveTransitionPractice(a,stage,{...a[stage],fabricatedResult:'pass'}),a);
  const index=stage==='before'?0:1,mark=a[stage].attempts[0],f=transitionFixture();
  const reordered=placePractice(f.tasks[index],160,90,a[stage],mark.id,mark);
  assert.notDeepEqual(reordered.attempts,a[stage].attempts);
  assert.deepEqual(receiveTransitionPractice(a,stage,reordered),a);
 }
 assert.throws(()=>predictTransition(a,{endpoint:'satisfied',change:'unsatisfied',reason:'Changed after viewing feedback'}),/retained/);
 assert.equal(inspectTransitionPractice(a).findings.change,'unsatisfied');
});
