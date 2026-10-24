import test from 'node:test';
import assert from 'node:assert/strict';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {reopenCapture,exportCapture,reviseCaptureMark,removeCaptureMark,reviseCaptureCalibration} from '../src/capture-editing.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
const image={sha256:'a'.repeat(64),widthPx:600,heightPx:400,mimeType:'image/png',name:'source.png',pixelCoordinates:'browser-oriented'};
const mark=(label='Guide')=>({label,sourcePx:{x:200,y:150},kind:'edge_offset_mm',edge:'left',toleranceMm:3,why:'Expert supplied meaning'});
function fixture(){
  let d=createCapture(image,[{x:50,y:50},{x:550,y:50},{x:550,y:350},{x:50,y:350}],240,160);
  d=appendCaptureMark(d,mark());d=appendCaptureMark(d,{...mark('Center'),kind:'fraction'});
  d.source.frame={clipSha256:'b'.repeat(64),presentedTime:1.25};
  d.landmarks[0].expertNote='Do not infer pressure';return d;
}
test('reopen preserves source, stable ids and unrecognized context with matching original bytes',()=>{
  const original=fixture(), reopened=reopenCapture(JSON.stringify(original),{...image,name:'renamed.png'});
  assert.deepEqual(reopened,original);reopened.landmarks[0].label='changed';assert.equal(original.landmarks[0].label,'Guide');
});
test('wrong image or malformed annotation refuses without mutating accepted work',()=>{
  const d=fixture(),before=structuredClone(d);
  assert.throws(()=>reopenCapture(JSON.stringify(d),{...image,sha256:'b'.repeat(64)}),/does not match/);
  assert.throws(()=>reopenCapture('{',image));
  assert.throws(()=>reopenCapture(' '.repeat(256*1024+1),image),/256 KiB/);
  const bad=structuredClone(d);bad.landmarks[0].sourcePx={x:601,y:40};
  assert.throws(()=>reopenCapture(JSON.stringify(bad),image),/inside/);assert.deepEqual(d,before);
});
test('edit preserves order, identity, frame evidence and expert context',()=>{
  const d=fixture();d.landmarks[0].sourcePx.measurementNote={method:'Human annotation',radiusPx:2};
  const before=structuredClone(d),id=d.landmarks[0].id;
  const next=reviseCaptureMark(d,id,{...mark('Revised'),kind:'fraction',sourcePx:{x:300,y:200},toleranceMm:2});
  assert.equal(next.landmarks[0].id,id);assert.equal(next.landmarks[0].edge,undefined);
  assert.equal(next.landmarks[0].label,'Revised');assert.equal(next.landmarks[0].expertNote,'Do not infer pressure');
  assert.deepEqual(next.landmarks[0].sourcePx.measurementNote,d.landmarks[0].sourcePx.measurementNote);
  assert.deepEqual(next.source,d.source);assert.deepEqual(next.landmarks[1],d.landmarks[1]);assert.deepEqual(d,before);
});
test('invalid edits remain transactional and image bounds still apply',()=>{
  const d=fixture(),before=structuredClone(d);
  for(const changes of [{sourcePx:{x:601,y:100}},{sourcePx:{x:0,y:0}},{toleranceMm:0},{label:''},{kind:'unknown'}])
    assert.throws(()=>reviseCaptureMark(d,d.landmarks[0].id,{...mark(),...changes}));
  assert.throws(()=>reviseCaptureMark(d,'missing',mark()),/existing/);assert.deepEqual(d,before);
});
test('delete keeps remaining ids; last deletion leaves a usable empty draft',()=>{
  const d=fixture();const next=removeCaptureMark(d,d.landmarks[0].id);
  assert.deepEqual(next.landmarks,[d.landmarks[1]]);assert.equal(d.landmarks.length,2);
  const empty=removeCaptureMark(next,next.landmarks[0].id);assert.equal(empty.landmarks.length,0);
  assert.equal(appendCaptureMark(empty,mark()).landmarks.length,1);
  assert.deepEqual(reopenCapture(JSON.stringify(empty),image),empty);
  assert.throws(()=>removeCaptureMark(d,'missing'),/existing/);
});
test('all thirty supported marks can be revised without temporary overflow',()=>{
  let d=fixture();while(d.landmarks.length<30)d=appendCaptureMark(d,mark('More'));
  const revised=reviseCaptureMark(d,d.landmarks[15].id,mark('Edited full capture'));
  assert.equal(revised.landmarks.length,30);assert.equal(revised.landmarks[15].label,'Edited full capture');
});
test('recalibration preserves authorship, unknowns and original pixel annotations',()=>{
  const d=fixture(),before=structuredClone(d);
  d.provenance='Expert attribution';d.unknowns.push('Unmeasured material');
  d.source.image.acquisitionNote={author:'Expert A',lighting:'Diffuse illumination'};
  const next=reviseCaptureCalibration(d,d.source.corners,300,200,'New measurement');
  assert.equal(next.source.widthMm,300);assert.equal(next.title,'New measurement');
  assert.deepEqual(next.landmarks,d.landmarks);assert.deepEqual(next.source.frame,d.source.frame);
  assert.equal(next.provenance,d.provenance);assert.deepEqual(next.unknowns,d.unknowns);
  assert.deepEqual(next.source.image,d.source.image);
  assert.equal(d.source.widthMm,before.source.widthMm);
  assert.throws(()=>reviseCaptureCalibration(d,[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],300,200,'Invalid'),/outside/);
  assert.throws(()=>reviseCaptureCalibration(d,d.source.corners,0,200,'Invalid'));
});
test('reopened video annotations retain valid timing and reject mismatched origins even in empty drafts',()=>{
  const d=fixture();d.source.origin=frameOrigin({name:'clip.webm',mimeType:'video/webm',sizeBytes:1000,durationSeconds:3,sha256:'c'.repeat(64)},1.3,{mediaTime:1.25,width:600,height:400},image);
  d.source.origin.annotation={expert:'A',cue:'Resistance cannot be seen'};
  d.source.origin.clip.acquisitionNote={permission:'User supplied rights record'};
  assert.deepEqual(reopenCapture(JSON.stringify(d),image).source.origin,d.source.origin);
  const next=reviseCaptureCalibration(d,d.source.corners,250,170,'Revised frame');assert.deepEqual(next.source.origin,d.source.origin);
  d.landmarks=[];d.source.origin.frameSha256='d'.repeat(64);
  assert.throws(()=>reopenCapture(JSON.stringify(d),image),/does not match/);
});
test('export fits the reopening reader and refuses empty or oversized saved sources',()=>{
  const d=fixture();assert.deepEqual(reopenCapture(exportCapture(d),image),d);
  const empty=structuredClone(d);empty.landmarks=[];assert.throws(()=>exportCapture(empty));
  d.notes=Array(10000).fill('context');const text=exportCapture(d);assert.deepEqual(reopenCapture(text,image),d);
  d.notes=Array(100000).fill('context');assert.throws(()=>exportCapture(d),/256 KiB/);
});
test('editing another field does not truncate or invent an unchanged expert explanation',()=>{
  const d=fixture();d.landmarks[0].why='Expert evidence '.repeat(40);
  const m=d.landmarks[0];
  const next=reviseCaptureMark(d,m.id,{...mark('Revised label'),why:m.why});
  assert.equal(next.landmarks[0].why,m.why);
  const input=mark('Another edit');delete input.why;
  assert.equal(reviseCaptureMark(d,m.id,input).landmarks[0].why,m.why);
  delete d.landmarks[0].why;
  assert.equal(Object.hasOwn(reviseCaptureMark(d,m.id,input).landmarks[0],'why'),false);
});
