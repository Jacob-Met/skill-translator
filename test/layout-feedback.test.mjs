import test from 'node:test';
import assert from 'node:assert/strict';
import {explainLayout} from '../src/layout-feedback.mjs';
import {evaluatePractice} from '../src/practice.mjs';
const demo={source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},
  landmarks:[[30,30],[70,30],[40,70]].map(([x,y],i)=>({id:'m'+i,label:'Mark '+i,sourcePx:{x,y},kind:'fraction',toleranceMm:1}))};
const original=demo.landmarks.map(m=>({id:m.id,xMm:m.sourcePx.x,yMm:m.sourcePx.y}));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('translation preserves pair spacing; original failed verdict and input retained',()=>{
  const a=original.map(p=>({...p,xMm:p.xMm+5,yMm:p.yMm+3})),before=JSON.stringify(a);
  const f=explainLayout(demo,100,100,a);near(f.rigid.angleDegrees,0);near(f.rigid.remainingRmsMm,0);
  near(f.rigid.centroidDxMm,5);assert.equal(f.incompatiblePairs,0);assert.equal(f.rigid.wouldMeetAll,true);
  assert.equal(evaluatePractice(demo,100,100,a).passed,false);assert.equal(JSON.stringify(a),before);
});
test('proper rotation is identified without scaling and physical coordinates stay independent of view',()=>{
  const a=original.map(p=>({...p,xMm:100-p.yMm,yMm:p.xMm}));
  const f=explainLayout(demo,100,100,a);near(f.rigid.angleDegrees,90);near(f.rigid.remainingRmsMm,0);
  assert.equal(f.incompatiblePairs,0);assert.equal(f.rigid.wouldMeetAll,true);
});
test('stretch cannot be explained away by rigid alignment',()=>{
  const f=explainLayout(demo,100,100,original.map(p=>({...p,xMm:50+1.2*(p.xMm-50)})));
  assert.ok(f.incompatiblePairs>0);assert.ok(f.rigid.remainingRmsMm>1);assert.equal(f.rigid.wouldMeetAll,false);
});
test('reflection preserves distances but is not accepted as rotation',()=>{
  const f=explainLayout(demo,100,100,original.map(p=>({...p,xMm:100-p.xMm})));
  assert.equal(f.incompatiblePairs,0);assert.ok(f.rigid.remainingRmsMm>1);assert.equal(f.rigid.wouldMeetAll,false);
});
test('one local error remains visible in pair differences and residuals',()=>{
  const a=structuredClone(original);a[2].yMm+=10;const f=explainLayout(demo,100,100,a);
  assert.equal(f.incompatiblePairs,2);assert.equal(f.rigid.wouldMeetAll,false);
});
test('partial and collapsed observations cannot claim complete task success',()=>{
  assert.equal(explainLayout(demo,100,100,[]).rigid,null);
  const partial=explainLayout(demo,100,100,original.slice(0,2));assert.equal(partial.partial,true);assert.equal(partial.rigid.wouldMeetAll,false);
  const f=explainLayout(demo,100,100,original.map(p=>({...p,xMm:50,yMm:50})));assert.equal(f.rigid,null);assert.ok(f.unavailable);
});
test('existing source/placement validation remains authoritative',()=>{
  assert.throws(()=>explainLayout(demo,100,100,[original[0],original[0]]),/one placement/);
  assert.throws(()=>explainLayout(demo,100,100,[{...original[0],xMm:NaN}]),/finite/);
});
test('symmetric reflection has no unique proper rotation and never fabricates one',()=>{
  const square=structuredClone(demo);square.landmarks=[[30,30],[70,30],[70,70],[30,70]].map(([x,y],i)=>({...demo.landmarks[0],id:'s'+i,sourcePx:{x,y}}));
  const f=explainLayout(square,100,100,square.landmarks.map(m=>({id:m.id,xMm:100-m.sourcePx.x,yMm:m.sourcePx.y})));
  assert.equal(f.rigid,null);assert.equal(f.incompatiblePairs,0);assert.match(f.unavailable,/unique/);
});
test('all 435 pairs of maximum-size source reuse bounded relationship batches',()=>{
  const many=structuredClone(demo);many.landmarks=Array.from({length:30},(_,i)=>({...demo.landmarks[0],id:'p'+i,label:'x'.repeat(100),sourcePx:{x:10+(i%6)*10,y:10+Math.floor(i/6)*10}}));
  const f=explainLayout(many,100,100,many.landmarks.map(m=>({id:m.id,xMm:m.sourcePx.x,yMm:m.sourcePx.y})));
  assert.equal(f.pairs.length,435);assert.equal(f.incompatiblePairs,0);assert.equal(f.rigid.wouldMeetAll,true);
});
test('exact boundary layout rotated 180 degrees is not rejected by floating roundoff',()=>{
  const corners=structuredClone(demo);corners.landmarks=[[0,0],[100,0],[0,100]].map(([x,y],i)=>({...demo.landmarks[0],id:'c'+i,sourcePx:{x,y}}));
  const f=explainLayout(corners,100,100,corners.landmarks.map(m=>({id:m.id,xMm:100-m.sourcePx.x,yMm:100-m.sourcePx.y})));
  near(f.rigid.remainingRmsMm,0);assert.equal(f.rigid.wouldMeetAll,true);
});
