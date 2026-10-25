import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadiness,importReadiness,recordReadiness,readinessFindings,ALTERNATIVE_READINESS_FORMAT} from '../src/task-readiness.mjs';
import {explainReadiness} from '../src/readiness-explanation.mjs';
import {createReassessment,recordReassessment,inspectReassessment,importReassessment} from '../src/reassessment-rehearsal.mjs';
import {createRecheck,recordRecheck,inspectRecheck,importRecheck} from '../src/recheck-rehearsal.mjs';
import {readinessSequenceFixture} from './task-readiness-fixture.mjs';
import {createPrerequisiteRehearsal} from '../src/prerequisite-rehearsal.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {attachMomentCalibration,momentTask} from '../src/demonstration-sequence.mjs';
import {createPractice} from '../src/practice.mjs';

const observe=(checkId,value='pass',stepId='prepare')=>({type:'observe',stepId,checkId,value,note:'Authored observation control',evidenceClass:'authored-example'});
function fixture(geometric=false){
 let source=readinessSequenceFixture();
 if(geometric){const moment=source.moments[1];let task=createCapture(moment.image,[{x:0,y:0},{x:319,y:0},{x:319,y:179},{x:0,y:179}],100,100,{origin:moment.origin});task=appendCaptureMark(task,{label:'Registration',sourcePx:{x:159.5,y:89.5},kind:'fraction',toleranceMm:1});source=attachMomentCalibration(source,moment.id,task);}
 const prerequisites=createPrerequisiteRehearsal(source,[{before:'prepare',after:'align',reason:'Support before alignment'},{before:'align',after:'finish',reason:'Alignment before finish'}]);prerequisites.attempt=['prepare','align'];
 const definitions=source.steps.map(step=>({stepId:step.id,checks:step.id==='prepare'?[
  {id:'registration',prompt:'Registration established',basis:'Authored registration criterion',...(geometric?{placement:{widthMm:100,heightMm:100}}:{})},
  {id:'fixture',prompt:'Jig reference seated',basis:'Authored alternate registration criterion'},
  {id:'support',prompt:'Material supported',basis:'Shared authored condition'}
 ]:[{id:'completion',prompt:'Reported result',basis:'Authored condition'}],...(step.id==='prepare'?{completionRoutes:[
  {id:'marks',label:'Registration marks',basis:'Author declares registration and support sufficient',checkIds:['registration','support']},
  {id:'jig',label:'Jig reference',basis:'Author declares seated jig and support sufficient',checkIds:['fixture','support']}
 ]}:{})}));
 return {source,prerequisites,definitions,study:createReadiness(source,prerequisites,definitions)};
}

test('all64 authored evidence-state combinations obey the declared alternatives and shared condition',()=>{
 const {source,study}=fixture();
 for(const a of [null,'unknown','fail','pass'])for(const b of [null,'unknown','fail','pass'])for(const c of [null,'unknown','fail','pass']){
  const events=[['registration',a],['fixture',b],['support',c]].filter(([,v])=>v!==null).map(([id,value])=>observe(id,value));
  const finding=readinessFindings(source,{...study,events});
  assert.equal(finding.steps[0].complete,c==='pass'&&(a==='pass'||b==='pass'));
  assert.equal(finding.steps[1].ready,finding.steps[0].complete);
  assert.deepEqual(finding.steps[0].completionAlternatives.sharedCheckIds,['support']);
  for(const route of finding.steps[0].completionAlternatives.routes){assert.equal(route.satisfied,route.unestablishedCheckIds.length===0);assert.ok(route.basis.length);}
 }
 assert.equal(study.format,ALTERNATIVE_READINESS_FORMAT);assert.deepEqual(study.events,[]);
});

test('actual geometry and reported method switch retain their distinct required evidence',()=>{
 const {source,study}=fixture(true),session=createPractice(momentTask(source,'moment-1'),100,100);
 let current=recordReadiness(source,study,{type:'practice',stepId:'prepare',checkId:'registration',note:'Missing geometry',session});
 current=recordReadiness(source,current,observe('fixture'));current=recordReadiness(source,current,observe('support'));
 let finding=readinessFindings(source,current).steps[0];assert.equal(finding.complete,true);assert.deepEqual(finding.completionAlternatives.routes.filter(r=>r.satisfied).map(r=>r.id),['jig']);
 assert.throws(()=>recordReadiness(source,current,observe('registration')),/practice evidence/);
 current=recordReadiness(source,current,observe('fixture','fail'));assert.equal(readinessFindings(source,current).steps[0].complete,false);
 session.attempts=[{id:'authored-1',xMm:50,yMm:50}];current=recordReadiness(source,current,{type:'practice',stepId:'prepare',checkId:'registration',note:'Original passing placement',session});
 finding=readinessFindings(source,current).steps[0];assert.equal(finding.complete,true);assert.deepEqual(finding.completionAlternatives.routes.filter(r=>r.satisfied).map(r=>r.id),['marks']);
 assert.equal(finding.checks.find(c=>c.id==='fixture').observation.value,'fail');
 assert.deepEqual(importReadiness(source,JSON.parse(JSON.stringify(current))),current);
});

test('earliest unmet methods remain separate rather than claiming every missing check is required',()=>{
 const {source,study}=fixture();let current=recordReadiness(source,study,observe('support'));
 const explanation=explainReadiness(source,current,'finish');assert.deepEqual(explanation.unresolvedChecks,[]);assert.equal(explanation.unresolvedAlternatives.length,1);
 const alternatives=explanation.unresolvedAlternatives[0];assert.equal(alternatives.stepId,'prepare');assert.deepEqual(alternatives.completionAlternatives.sharedCheckIds,['support']);assert.deepEqual(alternatives.completionAlternatives.routes.map(r=>r.unestablishedCheckIds),[['registration'],['fixture']]);
 current=recordReadiness(source,current,observe('fixture'));assert.equal(explainReadiness(source,current,'align').evidenceReady,true);
 const own=readinessFindings(source,current).steps[0];assert.equal(own.checks.find(c=>c.id==='registration').observation,null);
});

test('source and first judgments survive later method evidence and conservative downstream invalidation',()=>{
 const {source,study,prerequisites}=fixture();const sourceBefore=structuredClone(source);
 let current=recordReadiness(source,study,{type:'choose',stepId:'align',prediction:'ready',reason:'Unassisted first judgment before reports'});
 current=recordReadiness(source,current,observe('fixture'));current=recordReadiness(source,current,observe('support'));current=recordReadiness(source,current,observe('completion','pass','align'));
 const prior=structuredClone(current);current=recordReadiness(source,current,observe('support','unknown'));
 const finding=readinessFindings(source,current);assert.equal(finding.journal[0].matchesDeclaredEvidence,false);assert.equal(finding.steps[1].checks[0].observation,null);assert.equal(finding.steps[1].ready,false);
 assert.deepEqual(current.events.slice(0,prior.events.length),prior.events);assert.deepEqual(current.prerequisites,prerequisites);assert.deepEqual(source,sourceBefore);
 const changed=structuredClone(source);changed.steps[0].intent+=' changed';assert.throws(()=>importReadiness(changed,current),/changed/);assert.deepEqual(source,sourceBefore);
});

test('reassessment and hypothetical recheck preserve v3 methods and original prediction custody',()=>{
 const {source,study}=fixture();let original=recordReadiness(source,study,observe('fixture'));original=recordReadiness(source,original,observe('support'));original=recordReadiness(source,original,observe('completion','pass','align'));const untouched=structuredClone(original);
 let rehearsal=createReassessment(source,original,observe('support','unknown'),'not-seen-before');
 rehearsal=recordReassessment(source,rehearsal,{type:'predict',stepIds:['align'],uncertain:false,reason:'Shared support revision retires downstream credit'});rehearsal=recordReassessment(source,rehearsal,{type:'reveal'});
 assert.deepEqual(inspectReassessment(source,rehearsal).consequences.comparison,{omitted:[],extra:[],uncertain:false});
 assert.deepEqual(importReassessment(source,JSON.parse(JSON.stringify(rehearsal))),rehearsal);
 let recheck=createRecheck(source,rehearsal);recheck=recordRecheck(source,recheck,observe('support'));
 const finding=inspectRecheck(source,recheck);assert.equal(finding.findings.steps[0].complete,true);assert.equal(finding.findings.steps[1].ready,true);assert.equal(finding.findings.steps[1].complete,false);
 assert.deepEqual(finding.findings.steps[0].completionAlternatives.routes.filter(r=>r.satisfied).map(r=>r.id),['jig']);
 assert.deepEqual(importRecheck(source,JSON.parse(JSON.stringify(recheck))),recheck);assert.deepEqual(recheck.rehearsal.original,untouched);assert.deepEqual(original,untouched);
});

test('malformed routes and schema downgrades refuse; legacy v1/v2 exports gain no method field',()=>{
 const {source,study,definitions,prerequisites}=fixture();
 for(const mutate of [d=>d.completionRoutes=[],d=>d.completionRoutes[0].checkIds=[],d=>d.completionRoutes[0].checkIds=['foreign'],d=>d.completionRoutes[0].checkIds=['registration','registration'],d=>d.completionRoutes[1].id='marks',d=>d.completionRoutes[1].checkIds=['support','registration'],d=>d.completionRoutes[0].basis='',d=>d.completionRoutes=[d.completionRoutes[0]],d=>d.completionRoutes=Array.from({length:9},(_,i)=>({...d.completionRoutes[0],id:'method'+i}))]){const invalid=structuredClone(definitions);mutate(invalid[0]);assert.throws(()=>createReadiness(source,prerequisites,invalid));}
 for(const format of ['skill-translator.task-readiness/v1','skill-translator.task-readiness/v2'])assert.throws(()=>importReadiness(source,{...study,format}),/v3/);
 const sparseRoutes=structuredClone(definitions);sparseRoutes[0].completionRoutes=[...sparseRoutes[0].completionRoutes,undefined];delete sparseRoutes[0].completionRoutes[2];assert.throws(()=>createReadiness(source,prerequisites,sparseRoutes));
 const sparseChecks=structuredClone(definitions);sparseChecks[0].completionRoutes[0].checkIds=Array(1);assert.throws(()=>createReadiness(source,prerequisites,sparseChecks));
 const removed=structuredClone(study);delete removed.definitions[0].completionRoutes;assert.throws(()=>importReadiness(source,removed),/format/);
 for(const geometric of [false,true]){const f=fixture(geometric),legacyDefinitions=f.definitions.map(({completionRoutes,...rest})=>rest),legacy=createReadiness(f.source,f.prerequisites,legacyDefinitions);assert.equal(legacy.format,geometric?'skill-translator.task-readiness/v2':'skill-translator.task-readiness/v1');assert.ok(readinessFindings(f.source,legacy).steps.every(s=>s.completionAlternatives===undefined));assert.deepEqual(importReadiness(f.source,JSON.parse(JSON.stringify(legacy))),legacy);}
 const forged=structuredClone(study);forged.complete=true;forged.definitions[0].completionRoutes[0].satisfied=true;assert.deepEqual(importReadiness(source,forged),study);
});
