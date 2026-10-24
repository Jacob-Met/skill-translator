import test from 'node:test';
import assert from 'node:assert/strict';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createPractice,evaluatePractice,placePractice} from '../src/practice.mjs';
import {createSequence,appendMoment,upsertStep,editMoment,validateSequence,attachMomentCalibration,removeMomentCalibration,momentTask,SEQUENCE_FORMAT,CALIBRATED_SEQUENCE_FORMAT} from '../src/demonstration-sequence.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:4};
function source(){let sequence=createSequence(clip,{title:'Set the guide',context:'An authored geometric control'});
  for(const [id,time]of [['before',0],['after',2]]){const image={name:id+'.png',mimeType:'image/png',widthPx:200,heightPx:100,pixelCoordinates:'browser-oriented',sha256:(id==='before'?'b':'c').repeat(64)};
    sequence=appendMoment(sequence,{id,label:id,visibleState:'A supplied visible state',image,origin:frameOrigin(clip,time+.1,{mediaTime:time,width:200,height:100},image)});}
  return upsertStep(sequence,{id:'align',beforeMomentId:'before',afterMomentId:'after',title:'Align the guide',intent:'Keep a left clearance',visibleChange:'Mark reaches the guide',sensoryCue:'',recoveryCue:'Reposition if needed'});
}
function task(moment){return appendCaptureMark(createCapture(moment.image,[{x:0,y:0},{x:200,y:0},{x:200,y:100},{x:0,y:100}],200,100,{title:'The retained guide'}),{label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:40,y:30},toleranceMm:2,why:'Keep the declared left clearance'});}
test('attaching exact-frame calibration preserves source and enriches timeline without changing the supplied evidence class',()=>{
  const s=source(),draft=task(s.moments[1]),before=JSON.stringify(s);draft.source.image.name='renamed.png';const next=attachMomentCalibration(s,'after',draft);
  assert.equal(next.format,CALIBRATED_SEQUENCE_FORMAT);assert.equal(s.format,SEQUENCE_FORMAT);
  assert.equal(next.moments[1].calibratedTask.evidenceClass,draft.evidenceClass);
  assert.deepEqual(next.moments[1].calibratedTask.source.origin,s.moments[1].origin);
  assert.deepEqual(validateSequence(JSON.parse(JSON.stringify(next))),next);
  assert.equal(JSON.stringify(s),before);assert.equal(draft.source.origin,undefined);
});
test('different PNG bytes, physical calibration and conflicting frame times refuse transactionally',()=>{
  const s=source(),raw=JSON.stringify(s);assert.throws(()=>attachMomentCalibration(s,'after',task(s.moments[0])),/does not match/);
  const bad=task(s.moments[1]);bad.source.corners[0].x=-1;assert.throws(()=>attachMomentCalibration(s,'after',bad),/inside/);
  const timed=task(s.moments[1]);timed.source.origin={...s.moments[1].origin,mediaTimeSeconds:2.5};assert.throws(()=>attachMomentCalibration(s,'after',timed),/different video-frame/);
  timed.source.origin={...s.moments[1].origin,requestedTimeSeconds:2.2};assert.throws(()=>attachMomentCalibration(s,'after',timed),/different video-frame/);
  assert.equal(JSON.stringify(s),raw);
});
test('v2 prevents an older sequence reader from silently dropping attached tasks, while unannotated v1 remains readable',()=>{
  const s=source(),next=attachMomentCalibration(s,'after',task(s.moments[1]));assert.equal(validateSequence(s).format,SEQUENCE_FORMAT);
  assert.throws(()=>validateSequence({...next,format:SEQUENCE_FORMAT}),/v2/);
  const removed=removeMomentCalibration(next,'after');assert.equal(removed.format,CALIBRATED_SEQUENCE_FORMAT);assert.equal(removed.moments[1].calibratedTask,undefined);assert.ok(next.moments[1].calibratedTask);
});
test('task context comes from current saved steps and moment notes rather than imported derived context',()=>{
  let s=source(),input=task(s.moments[1]);input.sequenceContext={title:'forged context'};s=attachMomentCalibration(s,'after',input);
  s=editMoment(s,'after',{label:'After alignment',visibleState:'Guide now aligned'});s=upsertStep(s,{...s.steps[0],intent:'Revised supplied intent'});
  const received=momentTask(s,'after');assert.equal(received.sequenceContext.title,'Set the guide');assert.equal(received.sequenceContext.moment.label,'After alignment');
  assert.equal(received.sequenceContext.steps[0].intent,'Revised supplied intent');assert.equal(received.sequenceContext.steps[0].role,'after');assert.equal(received.sequenceContext.steps[0].afterPresentedSeconds,2);
  assert.equal(s.moments[1].calibratedTask.sequenceContext,undefined);
});
test('maintained practice consumes the bound task on a different workpiece and retains the exact frame source',()=>{
  const s=source(),bound=attachMomentCalibration(s,'after',task(s.moments[1])),demo=momentTask(bound,'after');
  let practice=createPractice(demo,400,200);const mark=demo.landmarks[0];practice=placePractice(demo,400,200,practice,mark.id,{xMm:40,yMm:60});
  const result=evaluatePractice(demo,400,200,practice.attempts);assert.equal(result.passed,true);
  assert.equal(demo.source.image.sha256,'c'.repeat(64));assert.equal(demo.source.origin.mediaTimeSeconds,2);assert.equal(demo.sequenceContext.steps[0].recoveryCue,'Reposition if needed');
});
test('empty or oversized source annotations refuse without truncating author context',()=>{
  const s=source(),empty=task(s.moments[1]);empty.landmarks=[];assert.throws(()=>attachMomentCalibration(s,'after',empty),/at least one/);
  const huge=task(s.moments[1]);huge.notes='x'.repeat(256*1024);assert.throws(()=>attachMomentCalibration(s,'after',huge),/256 KiB/);
  assert.throws(()=>momentTask(s,'after'),/Attach calibrated/);assert.throws(()=>attachMomentCalibration(s,'missing',task(s.moments[1])),/unavailable/);
});
