import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,editMoment,removeMoment,upsertStep,removeStep,validateSequence,sequenceFindings,assertSequenceClip} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1234,sha256:'a'.repeat(64),durationSeconds:10};
function frame(n,time,requested=time){const image={name:`frame-${n}.png`,mimeType:'image/png',sha256:String(n).repeat(64),widthPx:640,heightPx:360,pixelCoordinates:'browser-oriented'};return {id:`moment-${n}`,label:`Moment ${n}`,visibleState:'Author describes visible workpiece state',image,origin:frameOrigin(clip,requested,{mediaTime:time,width:640,height:360},image)};}
function source(){let s=createSequence(clip);s=appendMoment(s,frame(1,1,1.25));return appendMoment(s,frame(2,3,3.2));}
const task={id:'step-a',beforeMomentId:'moment-1',afterMomentId:'moment-2',title:'Set the fold',intent:'Align the workpiece edge',visibleChange:'Edge moves onto the guide',sensoryCue:'Expert reports a light increase in resistance',recoveryCue:'Stop if the edge drifts'};
test('retained presented times and human account survive JSON round trip without changing source',()=>{
  const s=source(),before=JSON.stringify(s),next=upsertStep(s,task),reopened=validateSequence(JSON.parse(JSON.stringify(next)));
  assert.equal(JSON.stringify(s),before);assert.deepEqual(reopened,next);const result=sequenceFindings(next);
  assert.equal(result.steps[0].elapsedSeconds,2);assert.equal(result.timing[0].requestedSeconds,1.25);assert.equal(result.timing[0].presentedSeconds,1);assert.equal(result.timing[0].offsetSeconds,-.25);assert.deepEqual(result.steps[0].missingAccount,[]);
});
test('new moments sort into source time while saved out-of-order and duplicate times are refused',()=>{
  let s=appendMoment(source(),frame(3,2));assert.deepEqual(s.moments.map(m=>m.id),['moment-1','moment-3','moment-2']);
  assert.throws(()=>validateSequence({...s,moments:[...s.moments].reverse()}),/increasing/);
  assert.throws(()=>appendMoment(s,frame(4,2)),/distinct/);assert.throws(()=>appendMoment(s,frame(3,4)),/unique/);
});
test('mixed source clips, forged frame hashes and changed clip metadata are refused',()=>{
  const s=source(),mixed=frame(3,5);mixed.origin.clip.sha256='b'.repeat(64);assert.throws(()=>appendMoment(s,mixed),/same source clip/);
  const forged=frame(3,5);forged.image.sha256='f'.repeat(64);assert.throws(()=>appendMoment(s,forged),/does not match/);
  assert.equal(assertSequenceClip(s,{...clip,name:'renamed.webm'}),true);assert.throws(()=>assertSequenceClip(s,{...clip,durationSeconds:11}),/does not match/);assert.throws(()=>assertSequenceClip(s,{...clip,sha256:'b'.repeat(64)}),/does not match/);
});
test('before and after references enforce actual time, and failed edits preserve prior accepted work',()=>{
  const s=upsertStep(source(),task),raw=JSON.stringify(s);
  assert.throws(()=>upsertStep(s,{...task,afterMomentId:'missing'}),/two retained/);
  assert.throws(()=>upsertStep(s,{...task,beforeMomentId:'moment-2',afterMomentId:'moment-1'}),/must end after/);
  assert.throws(()=>upsertStep(s,{...task,intent:''}),/Intended result/);assert.equal(JSON.stringify(s),raw);
});
test('editing and deletion retain stable identities and refuse a dangling source reference',()=>{
  let s=upsertStep(source(),task);assert.throws(()=>removeMoment(s,'moment-1'),/steps using/);
  s=editMoment(s,'moment-1',{label:'Before alignment',visibleState:'Sheet is offset'});assert.equal(s.moments[0].id,'moment-1');assert.equal(s.moments[1].id,'moment-2');
  s=upsertStep(s,{...task,title:'Revised action'});assert.equal(s.steps.length,1);assert.equal(s.steps[0].id,'step-a');
  s=removeStep(s,'step-a');s=removeMoment(s,'moment-1');assert.deepEqual(s.moments.map(m=>m.id),['moment-2']);
});
test('overlapping descriptions and unsupplied cues stay explicit instead of becoming a causal chain',()=>{
  let s=appendMoment(source(),frame(3,5));s=upsertStep(s,task);s=upsertStep(s,{...task,id:'step-b',afterMomentId:'moment-3',visibleChange:'',sensoryCue:'',recoveryCue:''});
  const found=sequenceFindings(s);assert.deepEqual(found.overlappingSteps,[['step-a','step-b']]);assert.deepEqual(found.steps[1].missingAccount,['visibleChange','sensoryCue','recoveryCue']);
  const edited={...s,findings:{steps:[{elapsedSeconds:999}]}};assert.equal(sequenceFindings(edited).steps[0].elapsedSeconds,2);
});
test('resource bounds and malformed metadata are enforced on reopen and empty drafts',()=>{
  const s=source();assert.throws(()=>validateSequence({...s,moments:Array(13).fill(s.moments[0])}),/at most 12/);
  assert.throws(()=>validateSequence({...s,steps:Array(25).fill(task)}),/at most 24/);
  assert.throws(()=>validateSequence({...s,title:'x'.repeat(161)}),/title/);
  assert.throws(()=>createSequence({...clip,sha256:'bad'}),/identity/);
  const huge=source();for(const m of huge.moments){m.image.widthPx=6000;m.image.heightPx=4000;Object.assign(m.origin,{widthPx:6000,heightPx:4000,decodedWidthPx:6000,decodedHeightPx:4000});}assert.throws(()=>validateSequence(huge),/32 megapixel/);
});
