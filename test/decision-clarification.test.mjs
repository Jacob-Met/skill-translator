import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDecisionPractice,recordDecisionAction,importDecisionPractice} from '../src/decision-practice.mjs';
import {createCuePractice,recordCueAction,inspectCuePractice} from '../src/cue-practice.mjs';
import {clarificationQuestions,createClarification,inspectClarification,importClarification} from '../src/decision-clarification.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../docs/receipts/decision-practice-20261024/source.json',import.meta.url))).sequence;
const stepId=source.steps[0].id;
function question(){let p=createDecisionPractice(source,[stepId]);for(const e of [{type:'answer',response:{expectedChange:'',cue:'Watch position',recovery:'',uncertain:true}},{type:'reveal'},{type:'reflect',comparison:'unsure',note:'',reconsideration:{anchors:['after','sensoryCue'],judgment:'',question:'What resistance guided the decision?'}}])p=recordDecisionAction(source,p,{...e,stepId});return p;}
const input={stepId,field:'sensoryCue',clarification:'Authored control: pause and ask if resistance changes.',suppliedBy:'Source author (declared)',basis:'Explicit authored software test response',authorConfirmed:true};
test('actual retained question leads to changed account and separate familiar retry',()=>{
 const practice=question(),frozen=JSON.stringify({source,practice});const a=createClarification(source,practice,input),r=inspectClarification(source,a);
 assert.equal(r.question.question,'What resistance guided the decision?');assert.equal(r.originalText,'');assert.equal(r.amendedSource.steps[0].sensoryCue,input.clarification);
 assert.deepEqual(r.amendedSource.moments,source.moments);assert.deepEqual(r.amendedSource.steps.slice(1),source.steps.slice(1));
 assert.deepEqual(r.retry.events,[]);assert.deepEqual(r.retry.stepIds,[stepId]);assert.equal(r.retry.priorFamiliarity,'seen-before');assert.deepEqual(importDecisionPractice(r.amendedSource,r.retry),r.retry);
 assert.throws(()=>importDecisionPractice(r.amendedSource,practice));assert.equal(JSON.stringify({source,practice}),frozen);
 assert.equal(r.authorIdentityAuthenticated,false);assert.equal(r.learningEffectEstablished,false);
});
test('source-bound lineage recomputes amendments and ignores supplied derived verdicts',()=>{
 const a=createClarification(source,question(),input),forged={...a,retry:{events:[{type:'answer'}]},amendedSource:{fake:true},authorIdentityAuthenticated:true};
 assert.deepEqual(importClarification(source,forged),a);assert.deepEqual(importClarification(source,JSON.parse(JSON.stringify(a))),a);
 const changed=structuredClone(source);changed.steps[0].intent='Changed account';assert.throws(()=>importClarification(changed,a));
 const altered=structuredClone(a);altered.practice.events[2].reconsideration.question='';assert.throws(()=>importClarification(source,altered));
});
test('only questioned authored fields can be explicitly amended',()=>{
 const p=question(),before=JSON.stringify(p);
 for(const patch of [{field:'after'},{field:'intent'},{stepId:'missing'},{authorConfirmed:false},{clarification:''},{clarification:'x'.repeat(1801)},{suppliedBy:''},{basis:''}])assert.throws(()=>createClarification(source,p,{...input,...patch}));
 const empty=createDecisionPractice(source,[stepId]);assert.deepEqual(clarificationQuestions(source,empty),[]);assert.throws(()=>createClarification(source,empty,input));assert.equal(JSON.stringify(p),before);
});
test('frame-only questions stay inspectable without permitting fabricated account anchors',()=>{
 const p=question();p.events[2].reconsideration.anchors=['after'];const q=clarificationQuestions(source,p)[0];assert.deepEqual(q.fields,[]);assert.equal(q.evidence[0].kind,'retained-frame');assert.throws(()=>createClarification(source,p,input));
});

function cueQuestion(){let p=createCuePractice(source,[stepId],'not-seen-before');for(const action of [{type:'request-cue',field:'recoveryCue'},{type:'answer',response:{expectedChange:'',cue:'I asked for help',recovery:'',uncertain:true}},{type:'request-cue',field:'sensoryCue'},{type:'reveal'},{type:'reflect',comparison:'unsure',note:'',reconsideration:{anchors:['sensoryCue'],judgment:'',question:'What resistance guided the decision?'}}])p=recordCueAction(source,p,{...action,stepId});return p;}
test('cue-assisted question clarification retains exact selective help and original format',()=>{
 const practice=cueQuestion(),frozen=JSON.stringify(practice),a=createClarification(source,practice,input),r=inspectClarification(source,a);
 assert.deepEqual(a.practice,practice);assert.equal(a.practice.format,'skill-translator.cue-practice/v1');assert.equal(a.practice.events.filter(e=>e.type==='request-cue').length,2);
 assert.equal(r.question.cueRequests[0].field,'recoveryCue');assert.equal(r.question.cueRequests[0].beforeAnswer,true);assert.equal(r.question.cueRequests[0].available,true);assert.equal(r.question.cueRequests[1].beforeAnswer,false);assert.equal(r.question.cueRequests[1].available,false);
 assert.equal(r.question.priorFamiliarity,'not-seen-before');assert.equal(r.retry.priorFamiliarity,'seen-before');assert.deepEqual(r.retry.events,[]);assert.equal(r.retry.format,'skill-translator.decision-practice/v1');assert.deepEqual(r.amendedSource.moments,source.moments);
 assert.deepEqual(importClarification(source,JSON.parse(JSON.stringify(a))),a);assert.equal(JSON.stringify(practice),frozen);assert.throws(()=>importDecisionPractice(source,practice));
});
test('cue clarification rederives assistance and refuses source or question changes',()=>{
 const practice=cueQuestion(),a=createClarification(source,practice,input),forged=structuredClone(a);forged.practice.events[0].beforeAnswer=false;forged.practice.events[0].text='Invented help';
 assert.deepEqual(importClarification(source,forged),a);const r=inspectClarification(source,forged);assert.equal(r.question.cueRequests[0].beforeAnswer,true);assert.equal(r.question.cueRequests[0].text,source.steps[0].recoveryCue);
 const changed=structuredClone(source);changed.steps[0].recoveryCue='Changed guidance';assert.throws(()=>importClarification(changed,a));
 const swapped=structuredClone(a);swapped.practice.events.at(-1).reconsideration.anchors=['after'];assert.throws(()=>importClarification(source,swapped));assert.deepEqual(inspectCuePractice(source,a.practice).steps[0].response,inspectCuePractice(source,practice).steps[0].response);
});
