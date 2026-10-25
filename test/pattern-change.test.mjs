import {collinearComparison} from './pattern-change-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,attachMomentCalibration,upsertStep} from '../src/demonstration-sequence.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createStateChange,declareStateReference,upsertCorrespondence,removeCorrespondence} from '../src/sequence-change.mjs';
import {inspectPatternChange} from '../src/pattern-change.mjs';

const triangle=[[16,16],[48,16],[16,48]];
function fixture(before=triangle,after=before){
  const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
  let sequence=createSequence(clip,{title:'Declared nominal pattern control'});
  for(const [i,points]of [before,after].entries()){
    const id=i?'after':'before',image={name:id+'.png',mimeType:'image/png',sha256:String(i+1).repeat(64),widthPx:128,heightPx:128,pixelCoordinates:'browser-oriented'};
    sequence=appendMoment(sequence,{id,label:id,image,origin:frameOrigin(clip,i,{mediaTime:i,width:128,height:128},image)});
    let task=createCapture(image,[{x:0,y:0},{x:128,y:0},{x:128,y:128},{x:0,y:128}],128,128);
    points.forEach(([x,y],j)=>{task=appendCaptureMark(task,{label:'Point '+j,sourcePx:{x,y},kind:'fraction',toleranceMm:2});});
    sequence=attachMomentCalibration(sequence,id,task);
  }
  sequence=upsertStep(sequence,{id:'step',title:'Compare pattern',intent:'Inspect relationships',beforeMomentId:'before',afterMomentId:'after'});
  let state=declareStateReference(createStateChange(sequence,'step'),{label:'Declared plane',basis:'Same original corners',samePlaneAndCorners:true});
  before.forEach((_,i)=>{state=upsertCorrespondence(state,{id:'pair-'+i,label:'Point '+i,beforeMarkId:'authored-'+(i+1),afterMarkId:'authored-'+(i+1)});});
  return state;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('complete pairs distinguish translation and rotation from a changed remote relationship',()=>{
  for(const after of [triangle.map(([x,y])=>[x+16,y+16]),triangle.map(([x,y])=>[96-y,x])]){
    const result=inspectPatternChange(fixture(triangle,after));assert.equal(result.pairs.length,3);near(result.largestSeparationChangeMm,0);assert.equal(result.reversed.length,0);
  }
  const result=inspectPatternChange(fixture(triangle,[[16,16],[48,16],[16,64]]));
  near(result.pairs[0].changeMm,0);near(result.largestSeparationChangeMm,16);assert.deepEqual(result.rankedPairs[0].ids,['pair-0','pair-2']);
});
test('reflection preserves every separation but reverses a triangle side',()=>{
  const result=inspectPatternChange(fixture(triangle,triangle.map(([x,y])=>[96-x,y])));
  result.pairs.forEach(p=>near(p.changeMm,0));assert.equal(result.reversed.length,1);assert.equal(result.triangles[0].before,-result.triangles[0].after);
});
test('collinear triples and incomplete declared coverage remain explicit',()=>{
  const state=fixture([[16,16],[32,16],[48,16]]),result=inspectPatternChange(state);
  assert.equal(result.degenerate.length,1);assert.equal(result.reversed.length,0);
  const partial=inspectPatternChange(removeCorrespondence(state,'pair-2'));
  assert.equal(partial.pairs.length,1);assert.equal(partial.triangles.length,0);assert.equal(partial.unpaired.before.length,1);assert.equal(partial.unpaired.after.length,1);
  const single=inspectPatternChange(removeCorrespondence(removeCorrespondence(state,'pair-2'),'pair-1'));assert.equal(single.largestSeparationChangeMm,null);
});
test('identities, complete source and outputs survive permutation and raw reopening',()=>{
  const state=fixture(),snapshot=JSON.stringify(state),expected=inspectPatternChange(state);
  assert.deepEqual(inspectPatternChange({...state,pairs:[...state.pairs].reverse(),pattern:{reversed:['forged']}}),expected);
  assert.deepEqual(inspectPatternChange(JSON.parse(snapshot)),expected);assert.equal(JSON.stringify(state),snapshot);
  const bad=structuredClone(state);bad.sequence.moments[0].calibratedTask.source.image.sha256='f'.repeat(64);assert.throws(()=>inspectPatternChange(bad));
});
test('capacity enumerates every pair and triple without narrowing the declared set',()=>{
  const points=Array.from({length:30},(_,i)=>[8+(i%6)*16,8+Math.floor(i/6)*16]);
  const result=inspectPatternChange(fixture(points,points.map(([x,y])=>[x+1,y+1])));
  assert.equal(result.pairs.length,435);assert.equal(result.triangles.length,4060);near(result.largestSeparationChangeMm,0);
});

test('exact nominal reversal can arise from calibration arithmetic for unchanged collinear source points',()=>{
  const result=inspectPatternChange(collinearComparison());
  assert.equal(result.reversed.length,1);assert.equal(result.reversed[0].before,1);assert.equal(result.reversed[0].after,-1);
  assert.ok(result.largestSeparationChangeMm<1e-12);
  assert.match(result.boundary,/Near-collinear signs can reverse from calibration arithmetic alone/);
  assert.match(result.boundary,/no visible or physical reversal is established/);
});
