import test from "node:test";
import assert from "node:assert/strict";
import {clipIdentity,requestedFrameTime,frameOrigin,validateFrameOrigin,MAX_VIDEO_BYTES} from "../src/frame-origin.mjs";
import {createCapture,appendCaptureMark,validateCapturedDemo} from "../src/capture.mjs";
const clip={name:"authored-motion.webm",mimeType:"video/webm",sizeBytes:24000,durationSeconds:2,sha256:"b".repeat(64)};
const image={sha256:"c".repeat(64),widthPx:640,heightPx:360};
const metadata={mediaTime:.8,width:640,height:360};
test("frame evidence keeps requested seek separate from reported presentation time",()=>{
  const origin=frameOrigin(clip,.85,metadata,image);
  assert.equal(origin.requestedTimeSeconds,.85);assert.equal(origin.mediaTimeSeconds,.8);
  assert.equal(origin.frameSha256,image.sha256);assert.equal(origin.clip.sha256,clip.sha256);
  assert.deepEqual(validateFrameOrigin(JSON.parse(JSON.stringify(origin)),image),origin);
});
test("a copied PNG cannot inherit a different frame digest or output dimensions",()=>{
  const origin=frameOrigin(clip,.85,metadata,image);
  assert.throws(()=>validateFrameOrigin(origin,{...image,sha256:"d".repeat(64)}),/match/);
  assert.throws(()=>validateFrameOrigin(origin,{...image,widthPx:641}),/match/);
  assert.throws(()=>validateFrameOrigin({...origin,frameSha256:"invalid"},image));
});
test("seek bounds reject nonfinite, negative and end-of-clip requests",()=>{
  assert.equal(requestedFrameTime(0,2),0);assert.equal(requestedFrameTime(1.999,2),1.999);
  for(const t of [-1,2,Infinity,NaN,"1"])assert.throws(()=>requestedFrameTime(t,2));
});
test("clip admission retains a bounded finite source and supported media identity",()=>{
  assert.deepEqual(clipIdentity(clip),clip);
  for(const change of [{sha256:"short"},{durationSeconds:Infinity},{durationSeconds:0},{sizeBytes:MAX_VIDEO_BYTES+1},{mimeType:"video/unknown"},{name:""}])
    assert.throws(()=>clipIdentity({...clip,...change}));
});
test("presentation metadata must be observed, finite and within the source timeline",()=>{
  for(const mediaTime of [undefined,NaN,-1,2.1])assert.throws(()=>frameOrigin(clip,.85,{...metadata,mediaTime},image));
  assert.throws(()=>validateFrameOrigin({...frameOrigin(clip,.85,metadata,image),timing:"requested-currentTime"},image));
});
test("decoded dimensions and displayed output dimensions remain separately inspectable",()=>{
  const origin=frameOrigin(clip,.85,{mediaTime:.8,width:720,height:360},image);
  assert.equal(origin.widthPx,640);assert.equal(origin.decodedWidthPx,720);
  assert.throws(()=>frameOrigin(clip,.85,{...metadata,width:9000},image));
});
test("the maintained capture contract retains frame provenance and rejects a changed frame link",()=>{
  const meta={...image,name:"frame.png",mimeType:"image/png",pixelCoordinates:"browser-oriented"};
  const origin=frameOrigin(clip,.85,metadata,meta);
  const demo=appendCaptureMark(createCapture(meta,[{x:0,y:0},{x:640,y:0},{x:640,y:360},{x:0,y:360}],200,100,{origin}),{sourcePx:{x:160,y:90},label:"Guide",kind:"fraction",toleranceMm:1});
  assert.deepEqual(demo.source.origin,origin);assert.equal(demo.evidenceClass,"human-annotated-local-video-frame");
  validateCapturedDemo(demo);
  const wrong=structuredClone(demo);wrong.source.origin.frameSha256="d".repeat(64);
  assert.throws(()=>validateCapturedDemo(wrong),/match/);assert.equal(demo.source.origin.frameSha256,meta.sha256);
});
