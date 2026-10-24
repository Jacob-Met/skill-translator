import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,attachMomentCalibration,upsertStep} from '../src/demonstration-sequence.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
import {createStateChange,declareStateReference,upsertCorrespondence,removeCorrespondence,stateChangeEvidence,separationChange,validateStateChange,stateChangeSettings} from '../src/sequence-change.mjs';

const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture({afterPoints=[[.2,.3],[.7,.3]],afterWidth=300}={}){
  let sequence=createSequence(clip,{title:'Authored two-view control'});
  const corners=[[[10,10],[610,10],[610,370],[10,370]],[[80,30],[590,80],[540,390],[30,340]]];
  for(let i=0;i<2;i++){
    const id=i?'after':'before',image={name:id+'.png',mimeType:'image/png',sha256:String(i+1).repeat(64),widthPx:640,heightPx:420,pixelCoordinates:'browser-oriented'};
    const origin=frameOrigin(clip,i?3.25:.25,{mediaTime:i?3:0,width:640,height:420},image);
    sequence=appendMoment(sequence,{id,label:id,image,origin});
    const points=i?afterPoints:[[.2,.3],[.7,.3]],quad=corners[i].map(([x,y])=>({x,y})),h=calibrate(quad);
    let task=createCapture(image,quad,i?afterWidth:300,180);
    for(const [j,uv]of points.entries())task=appendCaptureMark(task,{label:'Point '+j,sourcePx:toImage(h,...uv),kind:'fraction',toleranceMm:2});
    sequence=attachMomentCalibration(sequence,id,task);
  }
  return upsertStep(sequence,{id:'step',title:'Move a guide',intent:'Preserve separation',beforeMomentId:'before',afterMomentId:'after'});
}
const reference={label:'Original workpiece',basis:'Same four physical corners, ordered TL/TR/BR/BL in both views.',samePlaneAndCorners:true};
function paired(sequence=fixture()){
  let state=declareStateReference(createStateChange(sequence,'step'),reference);
  for(let i=0;i<2;i++)state=upsertCorrespondence(state,{id:'pair-'+i,label:'Declared point '+i,beforeMarkId:'authored-'+(i+1),afterMarkId:'authored-'+(i+1)});
  return state;
}
test('different camera quadrilaterals preserve the same physical endpoints',()=>{
  const evidence=stateChangeEvidence(paired());assert.equal(evidence.pairs.length,2);
  for(const p of evidence.pairs){close(p.dxMm,0);close(p.dyMm,0);close(p.endpointDistanceMm,0);}
  close(evidence.pairs[0].before.xMm,60);close(evidence.pairs[0].after.yMm,54);
  assert.equal(evidence.frameIntervalSeconds,3);assert.deepEqual(evidence.unpaired,{before:[],after:[]});
});
test('translation preserves separation while a changed second point exposes relative change',()=>{
  const translated=paired(fixture({afterPoints:[[.3,.5],[.8,.5]]}));
  for(const p of stateChangeEvidence(translated).pairs){close(p.dxMm,30);close(p.dyMm,36);close(p.endpointDistanceMm,Math.hypot(30,36));}
  close(separationChange(translated,'pair-0','pair-1').change.distanceMm,0);
  const changed=paired(fixture({afterPoints:[[.3,.5],[.9,.5]]}));
  close(separationChange(changed,'pair-0','pair-1').change.distanceMm,30);
  close(separationChange(changed,'pair-0','pair-1').change.horizontalMm,30);
});
test('explicit shared reference, dimensions and calibration are required',()=>{
  const sequence=fixture(),draft=createStateChange(sequence,'step');assert.throws(()=>stateChangeEvidence(draft),/Declare/);
  assert.throws(()=>declareStateReference(draft,{...reference,samePlaneAndCorners:false}),/Explicitly/);
  assert.throws(()=>declareStateReference(draft,{...reference,basis:''}),/Reference identification/);
  assert.throws(()=>paired(fixture({afterWidth:301})),/identical supplied/);
  delete sequence.moments[1].calibratedTask;
  assert.throws(()=>declareStateReference(createStateChange(sequence,'step'),reference),/both retained/);
});
test('point declarations are one-to-one, scoped to the step and immutable on refusal',()=>{
  const state=paired(),before=JSON.stringify(state);
  assert.throws(()=>upsertCorrespondence(state,{id:'extra',label:'Duplicate',beforeMarkId:'authored-1',afterMarkId:'authored-2'}),/only one/);
  assert.throws(()=>upsertCorrespondence(state,{id:'pair-0',label:'Unknown',beforeMarkId:'missing',afterMarkId:'authored-1'}),/selected before/);
  assert.throws(()=>validateStateChange({...state,stepId:'missing'}),/authored step/);
  assert.throws(()=>separationChange(state,'pair-0','pair-0'),/two distinct/);
  assert.equal(JSON.stringify(state),before);
  const removed=removeCorrespondence(state,'pair-1');assert.equal(removed.pairs.length,1);
  assert.deepEqual(stateChangeEvidence(removed).unpaired,{before:[{id:'authored-2',label:'Point 1'}],after:[{id:'authored-2',label:'Point 1'}]});
});
test('reopening ignores forged derived output and retains exact complete source and declarations',()=>{
  const state=paired(fixture({afterPoints:[[.3,.5],[.8,.5]]}));
  const saved=JSON.parse(JSON.stringify({...state,evidence:{pairs:[{dxMm:999}]}}));
  const reopened=validateStateChange(saved);assert.deepEqual(reopened,state);close(stateChangeEvidence(reopened).pairs[0].dxMm,30);
  assert.equal(reopened.sequence.moments[1].origin.requestedTimeSeconds,3.25);
  assert.equal(reopened.sequence.moments[1].calibratedTask.evidenceClass,'human-annotated-local-image');
  const settings=stateChangeSettings(reopened);assert.equal(settings.sequence,undefined);assert.equal(settings.pairs.length,2);
  const forged=structuredClone(saved);forged.sequence.moments[1].calibratedTask.source.image.sha256='f'.repeat(64);
  assert.throws(()=>validateStateChange(forged),/does not match/);
});
test('numeric coordinate admission and correspondence bounds remain strict',()=>{
  const state=paired(),bad=structuredClone(state);bad.sequence.moments[0].calibratedTask.landmarks[0].sourcePx.x='130';
  assert.throws(()=>validateStateChange(bad));
  assert.throws(()=>validateStateChange({...state,pairs:Array(31).fill(state.pairs[0])}),/at most 30/);
  assert.throws(()=>validateStateChange({...state,pairs:[{...state.pairs[0],label:' '.repeat(3)}]}),/Paired point/);
});
test('existing source mark identities are accepted without imposing a new identifier alphabet',()=>{
  const sequence=fixture();sequence.moments[0].calibratedTask.landmarks[0].id='1-point';sequence.moments[1].calibratedTask.landmarks[0].id='-point';
  const state=declareStateReference(createStateChange(sequence,'step'),reference);
  const paired=upsertCorrespondence(state,{id:'pair',label:'Same supplied point',beforeMarkId:'1-point',afterMarkId:'-point'});
  close(stateChangeEvidence(paired).pairs[0].endpointDistanceMm,0);
});
