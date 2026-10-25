import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVisualScanPlan, compareSamplePixels, inspectVisualScan, MAX_SCAN_SAMPLES} from '../src/visual-scan.mjs';

const clip = {name:'authored.webm', mimeType:'video/webm', sizeBytes:100,
  sha256:'a'.repeat(64), durationSeconds:10};
const image = (rgb, widthPx=4, heightPx=3) => ({widthPx,heightPx,
  rgba:Uint8ClampedArray.from(Array.from({length:widthPx*heightPx},()=>[...rgb,255]).flat())});
const plan = () => createVisualScanPlan(clip,{startSeconds:0,endSeconds:8,sampleCount:5});
const sampled = (requestedSeconds,presentedSeconds=requestedSeconds,rgb=[30,40,50]) =>
  ({...image(rgb),requestedSeconds,presentedSeconds});

test('uniform requests retain the exact source and both ends, with a finite bounded workload',()=>{
  const p=plan();assert.deepEqual(p.requestedTimes,[0,2,4,6,8]);assert.deepEqual(p.clip,clip);
  assert.equal(createVisualScanPlan(clip,{startSeconds:0,endSeconds:9.99,sampleCount:MAX_SCAN_SAMPLES}).requestedTimes.length,64);
  for(const options of [{startSeconds:0,endSeconds:10,sampleCount:5},{startSeconds:3,endSeconds:2,sampleCount:5},
    {startSeconds:NaN,endSeconds:2,sampleCount:5},{startSeconds:0,endSeconds:2,sampleCount:65},
    {startSeconds:0,endSeconds:2,sampleCount:2.5}])assert.throws(()=>createVisualScanPlan(clip,options));
});
test('an unchanged image has zero raw and adjusted change without changing either input',()=>{
  const a=image([20,80,110]),b=structuredClone(a),result=compareSamplePixels(a,b);
  assert.deepEqual(result,{meanAbsoluteChange:0,meanAdjustedChange:0,uniformBrightnessShift:0,changedPixelFraction:0,pixelCount:12});
  assert.deepEqual(a,b);
});
test('uniform brightening remains visible in raw evidence while the additive adjustment removes it',()=>{
  const result=compareSamplePixels(image([20,60,100]),image([50,90,130]));
  assert.equal(result.uniformBrightnessShift,30);assert.equal(result.meanAbsoluteChange,30/255);
  assert.equal(result.meanAdjustedChange,0);assert.equal(result.changedPixelFraction,0);
  const reverse=compareSamplePixels(image([50,90,130]),image([20,60,100]));
  assert.equal(reverse.uniformBrightnessShift,-30);assert.equal(reverse.meanAdjustedChange,0);
});
test('localized change survives whole-image brightness adjustment',()=>{
  const before=image([20,30,40]),after=image([40,50,60]);
  after.rgba.set([200,210,220,255],0);
  const result=compareSamplePixels(before,after);
  assert.equal(result.uniformBrightnessShift,20);assert.equal(result.changedPixelFraction,1/12);
  assert.equal(result.meanAdjustedChange,160/(12*255));assert.ok(result.meanAbsoluteChange>result.meanAdjustedChange);
});
test('opposing color-channel changes are retained rather than reduced to grayscale',()=>{
  const result=compareSamplePixels(image([50,50,50]),image([90,50,10]));
  assert.equal(result.uniformBrightnessShift,0);assert.equal(result.meanAbsoluteChange,80/(3*255));
  assert.equal(result.meanAdjustedChange,result.meanAbsoluteChange);assert.equal(result.changedPixelFraction,1);
});
test('a real global gray change is exposed even when adjustment would remove it',()=>{
  const result=compareSamplePixels(image([10,10,10]),image([210,210,210]));
  assert.equal(result.meanAdjustedChange,0);assert.equal(result.meanAbsoluteChange,200/255);
});
test('sample dimensions and complete typed pixels are required',()=>{
  for(const value of [{...image([0,0,0]),rgba:[]},image([0,0,0],161,1),{...image([0,0,0]),rgba:new Uint8Array(3)}])
    assert.throws(()=>compareSamplePixels(value,image([0,0,0])));
  assert.throws(()=>compareSamplePixels(image([0,0,0]),image([0,0,0],3,4)),/same image dimensions/);
});
test('presentation times remain separate from requests and duplicates do not become zero activity',()=>{
  const result=inspectVisualScan(plan(),[sampled(0,.1),sampled(2,1.8),sampled(4,1.8),sampled(6,5.8),sampled(8,7.8)]);
  assert.equal(result.frames[1].requestedSeconds,2);assert.equal(result.frames[1].presentedSeconds,1.8);
  assert.equal(result.intervals[1].status,'same-presented-frame');assert.equal(result.intervals[1].meanAbsoluteChange,undefined);
  assert.equal(result.intervals[0].elapsedSeconds,1.7);assert.equal(result.comparedCount,3);
});
test('decoder failure and later unknown requests stay visible without bridging the gap',()=>{
  const result=inspectVisualScan(plan(),[sampled(0),sampled(2),{requestedSeconds:4,error:'decoder failed'}]);
  assert.equal(result.complete,false);assert.equal(result.sampledCount,2);assert.equal(result.comparedCount,1);
  assert.equal(result.intervals.length,4);assert.deepEqual(result.intervals.map(x=>x.status),['compared','missing-frame','missing-frame','missing-frame']);
  assert.equal(result.frames[2].error,'decoder failed');assert.equal(result.frames[3].status,'not-sampled');
});
test('out-of-order and changed-size frames receive no numerical comparison',()=>{
  const result=inspectVisualScan(plan(),[sampled(0,.5),sampled(2,.4),{...sampled(4,4),...image([30,40,50],3,4)},sampled(6),sampled(8)]);
  assert.deepEqual(result.intervals.map(x=>x.status),['out-of-order-frame','changed-frame-size','changed-frame-size','compared']);
});
test('wrong request, invalid actual time and extra results refuse',()=>{
  assert.throws(()=>inspectVisualScan(plan(),[sampled(1)]),/different requested time/);
  assert.throws(()=>inspectVisualScan(plan(),[sampled(0,11)]),/actual presented/);
  assert.throws(()=>inspectVisualScan(plan(),Array(6).fill(sampled(0))),/count/);
});
