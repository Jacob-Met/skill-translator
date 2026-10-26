import test from 'node:test';import assert from 'node:assert/strict';
import {mixed,source,rawAccount} from './helpers/raw-task-fixture.mjs';
import {inspectRawTask,createRawTask} from '../src/raw-task-proposals.mjs';
import {inspectRawTaskPractice,exportRawTaskPractice,importRawTaskPractice} from '../src/raw-task-practice.mjs';
import {inspectDemonstrationPractice} from '../src/demonstration-practice.mjs';
import {createPractice,placePractice,retryPractice,evaluatePractice} from '../src/practice.mjs';
function attempt(task,original=false){const r=inspectRawTask(task),s=original?r.originalSource:r.proposedSource,{widthMm,heightMm}=task.target;let session=createPractice(s,widthMm,heightMm);for(const mark of r.proposedTarget.landmarks)session=placePractice(s,widthMm,heightMm,session,mark.id,mark);return {source:s,session};}
test('actual composed session formerly refused by every single-account receiver now retains all three judgments',()=>{
 const task=mixed(),{session}=attempt(task),before=JSON.stringify({task,session});
 for(const account of task.accounts)assert.throws(()=>inspectDemonstrationPractice(account,session),/source, rules/);
 const r=inspectRawTaskPractice(task,session);assert.equal(r.practiceBasis,'composed-raw-proposals');assert.deepEqual(r.rounds[0].marks.map(m=>m.status),['within-all','within-all','within-all']);assert.equal(r.rounds[0].originalScore.passed,true);assert.deepEqual(r.session,session);assert.equal(JSON.stringify({task,session}),before);
});
test('original failed score remains failed despite agreement with all demonstrated rules',()=>{
 const task=mixed(),{session}=attempt(task,true),r=inspectRawTaskPractice(task,session);assert.equal(r.practiceBasis,'original-annotation');assert.equal(r.rounds[0].originalScore.passed,false);assert.ok(r.marks.every(m=>m.rounds[0].status==='within-all'));
 for(let i=0;i<task.accounts.length;i++)assert.deepEqual(r.marks[i],inspectDemonstrationPractice(task.accounts[i],session));
});
test('every actual historical round and missing current placements stay distinct',()=>{
 const task=mixed(),a=attempt(task),second=retryPractice(a.source,273,119,a.session),r=inspectRawTaskPractice(task,second);
 assert.equal(r.rounds.length,2);assert.deepEqual(r.rounds[1].marks.map(m=>m.status),Array(3).fill('missing-placement'));assert.equal(r.rounds[1].originalScore.complete,false);assert.deepEqual(r.session,second);assert.deepEqual(r.session.history[0].attempts,a.session.attempts);
});
test('ambiguity is compared without choosing a rule and unexamined task marks remain visible',()=>{
 const left=rawAccount('guide',20,60),ambiguous=rawAccount('index',35,25);ambiguous.demonstrations[0].annotation=source();ambiguous.demonstrations[0].landmarkId='index';
 const task=createRawTask([left,ambiguous],{widthMm:273,heightMm:119}),{session}=attempt(task),r=inspectRawTaskPractice(task,session);
 assert.deepEqual(r.unexamined,['center']);assert.equal(r.rounds[0].originalScore.passed,true);assert.equal(r.marks[1].sourceStatus,'unresolved');assert.equal(r.marks[1].rounds[0].status,'within-some');assert.deepEqual(r.marks[1].rounds[0].withinRules,['fraction']);
});
test('unsupported evidence and missing marks cannot be presented as demonstrated agreement',()=>{
 const task=mixed();task.accounts[1].demonstrations=[];task.accounts[2].demonstrations[0].annotation.landmarks[0].sourcePx={x:1,y:1};
 const {session}=attempt(task),r=inspectRawTaskPractice(task,session);assert.deepEqual(r.marks.map(m=>m.sourceStatus),['single-compatible','no-evidence','none-compatible']);assert.deepEqual(r.marks.slice(1).map(m=>m.rounds[0].status),['no-supported-relationship','no-supported-relationship']);
});
test('source-only replay recomputes all verdicts and rejects foreign criteria or forged source references',()=>{
 const task=mixed(),{session}=attempt(task),saved=exportRawTaskPractice(task,session);assert.deepEqual(Object.keys(saved),['format','task','session']);saved.marks=[{status:'failed'}];saved.rounds=[];assert.deepEqual(importRawTaskPractice(saved),inspectRawTaskPractice(task,session));
 const wrong=structuredClone(saved);wrong.session.reference.provenance='foreign';assert.throws(()=>importRawTaskPractice(wrong),/source, rules/);
 const changed=structuredClone(task);for(const a of changed.accounts)a.referenceStudy.source.landmarks[0].toleranceMm=2;assert.throws(()=>inspectRawTaskPractice(changed,session),/source, rules/);
 const points=structuredClone(session);points.attempts[0].xMm+=3;assert.equal(inspectRawTaskPractice(task,points).marks[0].rounds[0].status,'within-none');
});
test('actual different practice size is kept rather than replaced by the planned composition dimensions',()=>{
 const task=mixed(),r=inspectRawTask(task);let session=createPractice(r.proposedSource,300,150);session=placePractice(r.proposedSource,300,150,session,'guide',{xMm:20,yMm:56.25});
 const received=inspectRawTaskPractice(task,session);assert.deepEqual(received.task.target,{widthMm:273,heightMm:119});assert.deepEqual(received.session.reference.target,{widthMm:300,heightMm:150});assert.equal(received.marks[0].rounds[0].status,'within-all');assert.equal(received.rounds[0].originalScore.complete,false);
});
test('over-capacity full source and attempt are refused before accepting an unreopenable comparison',()=>{
 const task=mixed(),{session}=attempt(task),oversized=structuredClone(task);oversized.accounts[0].extra='x'.repeat(2_000_000);assert.throws(()=>inspectRawTaskPractice(oversized,session),/2 MB/);
});
test('a nonfitting planned size does not veto the exact composed source at the actual received size',()=>{
 const task=mixed(),r=inspectRawTask(task);let session=createPractice(r.proposedSource,300,150);session=placePractice(r.proposedSource,300,150,session,'guide',{xMm:20,yMm:56.25});
 task.target={widthMm:10,heightMm:119};assert.equal(inspectRawTask(task).proposedSource,null);
 const received=inspectRawTaskPractice(task,session);assert.equal(received.practiceBasis,'composed-raw-proposals');assert.equal(received.marks[0].rounds[0].status,'within-all');assert.deepEqual(received.task.target,{widthMm:10,heightMm:119});assert.deepEqual(received.session.reference.target,{widthMm:300,heightMm:150});
 assert.deepEqual(importRawTaskPractice(exportRawTaskPractice(task,session)),received);
 const impossible=structuredClone(session);impossible.reference.target.widthMm=10;assert.throws(()=>inspectRawTaskPractice(task,impossible),/source, rules|clearance|outside|fit/i);
});
