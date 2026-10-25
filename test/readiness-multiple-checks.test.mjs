import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadiness,recordReadiness,readinessFindings,importReadiness} from '../src/task-readiness.mjs';
import {readinessSequenceFixture} from './task-readiness-fixture.mjs';
import {createPrerequisiteRehearsal} from '../src/prerequisite-rehearsal.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {attachMomentCalibration,momentTask} from '../src/demonstration-sequence.mjs';
import {createPractice} from '../src/practice.mjs';

test('geometric pass does not establish a separately declared physical check',()=>{
 let source=readinessSequenceFixture();const moment=source.moments[1];
 let capture=createCapture(moment.image,[{x:0,y:0},{x:319,y:0},{x:319,y:179},{x:0,y:179}],100,100,{origin:moment.origin});
 capture=appendCaptureMark(capture,{label:'Registration',sourcePx:{x:159.5,y:89.5},kind:'fraction',toleranceMm:1});source=attachMomentCalibration(source,moment.id,capture);
 const prerequisite=createPrerequisiteRehearsal(source,[{before:'prepare',after:'align',reason:'Support before alignment'}]);prerequisite.attempt=['prepare','align'];
 const definitions=source.steps.map(s=>({stepId:s.id,checks:s.id==='prepare'?[
  {id:'completion',prompt:'Registration meets declared tolerance',basis:'Supplied after-state geometry',placement:{widthMm:100,heightMm:100}},
  {id:'completion-2',prompt:'Material remains supported',basis:'Separately reported support condition'}
 ]:[{id:'completion',prompt:'Reported result',basis:'Supplied condition'}]}));
 let study=createReadiness(source,prerequisite,definitions);
 const practice=createPractice(momentTask(source,moment.id),100,100);practice.attempts=[{id:'authored-1',xMm:50,yMm:50}];
 const geometry={type:'practice',stepId:'prepare',checkId:'completion',note:'Authored passing geometry control',session:practice};
 study=recordReadiness(source,study,geometry);
 let findings=readinessFindings(source,study);assert.equal(findings.steps[0].checks[0].observation.value,'pass');assert.equal(findings.steps[0].checks[1].observation,null);assert.equal(findings.steps[0].complete,false);assert.deepEqual(findings.steps[1].blockedBy,['prepare']);
 study=recordReadiness(source,study,{type:'choose',stepId:'align',prediction:'ready',reason:'Only geometry was inspected'});
 const report=value=>({type:'observe',stepId:'prepare',checkId:'completion-2',value,note:'Authored support report',evidenceClass:'authored-example'});
 for(const value of ['unknown','fail']){const partial=recordReadiness(source,study,report(value));assert.equal(readinessFindings(source,partial).steps[0].complete,false);}
 study=recordReadiness(source,study,report('pass'));findings=readinessFindings(source,study);assert.equal(findings.steps[0].complete,true);assert.equal(findings.steps[1].ready,true);assert.equal(findings.journal[0].matchesDeclaredEvidence,false);
 assert.deepEqual(study.prerequisites,prerequisite);assert.deepEqual(importReadiness(source,JSON.parse(JSON.stringify(study))),study);
 const original=structuredClone(study);study=recordReadiness(source,study,{type:'observe',stepId:'align',checkId:'completion',value:'pass',note:'Authored downstream report',evidenceClass:'authored-example'});
 study=recordReadiness(source,study,report('unknown'));findings=readinessFindings(source,study);assert.equal(findings.steps[0].checks[0].observation.value,'pass');assert.equal(findings.steps[1].checks[0].observation,null);assert.equal(findings.steps[1].ready,false);assert.deepEqual(original.events,study.events.slice(0,original.events.length));
 assert.throws(()=>recordReadiness(source,study,{...report('pass'),checkId:'completion'}),/practice evidence/);
});
