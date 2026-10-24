import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadiness,recordReadiness,readinessFindings,importReadiness} from '../src/task-readiness.mjs';
import {readinessSequenceFixture} from './task-readiness-fixture.mjs';
const definitions=()=>[
  {stepId:'prepare',requires:[],checks:[{id:'flat',prompt:'Sheet lies flat',basis:'Author supplied support requirement'}]},
  {stepId:'align',requires:['prepare'],checks:[{id:'edge',prompt:'Edges align',basis:'Author supplied registration requirement'}]},
  {stepId:'finish',requires:['align'],checks:[{id:'join',prompt:'Join retained',basis:'Author supplied completion requirement'}]},
  {stepId:'inspect',requires:[],checks:[{id:'mark',prompt:'Reference is visible',basis:'Independent inspection'}]}
];
const observe=(source,study,stepId,checkId,value='pass')=>recordReadiness(source,study,{type:'observe',stepId,checkId,value,note:'Explicit authored control',evidenceClass:'authored-example'});
test('reported prerequisites change a retained next-step judgment without changing source',()=>{
  const source=readinessSequenceFixture(),before=structuredClone(source);let study=createReadiness(source,definitions());
  study=recordReadiness(source,study,{type:'choose',stepId:'align',prediction:'ready',reason:'I think the support is ready'});
  let findings=readinessFindings(source,study);assert.equal(findings.journal[0].matchesDeclaredEvidence,false);assert.deepEqual(findings.journal[0].blockedBy,['prepare']);
  study=observe(source,study,'prepare','flat');
  study=recordReadiness(source,study,{type:'choose',stepId:'align',prediction:'ready',reason:'The prerequisite has a reported observation'});
  findings=readinessFindings(source,study);assert.equal(findings.journal.at(-1).matchesDeclaredEvidence,true);assert.equal(findings.steps.find(s=>s.stepId==='align').complete,false);assert.deepEqual(source,before);
});
test('upstream revisions clear transitive credit while preserving independent observations and raw history',()=>{
  const source=readinessSequenceFixture();let study=createReadiness(source,definitions());
  for(const [s,c] of [['prepare','flat'],['align','edge'],['finish','join'],['inspect','mark']])study=observe(source,study,s,c);
  assert.ok(readinessFindings(source,study).steps.every(s=>s.complete));
  study=observe(source,study,'prepare','flat','pass');
  const findings=readinessFindings(source,study);assert.equal(study.events.length,5);
  assert.equal(findings.steps.find(s=>s.stepId==='align').complete,false);assert.equal(findings.steps.find(s=>s.stepId==='finish').checks[0].observation,null);assert.equal(findings.steps.find(s=>s.stepId==='inspect').complete,true);
  assert.deepEqual(findings.journal.at(-1).stepIds,['align','finish']);
  assert.deepEqual(importReadiness(source,JSON.parse(JSON.stringify(study))),study);
});
test('unknown and failed checks do not establish completion; blocked observations cannot bypass prerequisites',()=>{
  const source=readinessSequenceFixture();let study=createReadiness(source,definitions());
  study=observe(source,study,'align','edge');assert.equal(readinessFindings(source,study).steps.find(s=>s.stepId==='align').complete,false);
  for(const value of ['unknown','fail']){study=observe(source,study,'prepare','flat',value);assert.equal(readinessFindings(source,study).steps.find(s=>s.stepId==='align').ready,false);}
  study=observe(source,study,'prepare','flat');assert.equal(readinessFindings(source,study).steps.find(s=>s.stepId==='align').checks[0].observation,null);
});
test('reject cycles, omitted steps, foreign checks, edited source and fabricated actions transactionally',()=>{
  const source=readinessSequenceFixture(),defs=definitions();defs[0].requires=['finish'];assert.throws(()=>createReadiness(source,defs),/cycle/);
  assert.throws(()=>createReadiness(source,definitions().slice(1)),/every/);
  const study=createReadiness(source,definitions()),copy=structuredClone(study);
  assert.throws(()=>observe(source,study,'prepare','foreign'),/declared/);
  const changed=structuredClone(source);changed.steps[0].intent+=' revised';assert.throws(()=>importReadiness(changed,study),/changed/);
  assert.throws(()=>recordReadiness(source,study,{type:'complete',stepId:'prepare'}),/Unsupported/);
  assert.deepEqual(study,copy);
});
