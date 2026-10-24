import test from "node:test";
import assert from "node:assert/strict";
import {createCapture,appendCaptureMark,validateCapturedDemo,assertImageMatches,
  inspectImageBytes,imageMetadata,MAX_IMAGE_BYTES} from "../src/capture.mjs";
import {adapt,derive} from "../src/geometry.mjs";
import {demonstration} from "../src/demo.mjs";

const image={sha256:"a".repeat(64),name:"authored-affine.png",mimeType:"image/png",
  widthPx:512,heightPx:300,pixelCoordinates:"browser-oriented"};
// Independently authored affine map: px=(40+2*x+.5*y,30+.2*x+2*y).
const corners=[{x:40,y:30},{x:440,y:70},{x:490,y:270},{x:90,y:230}];
const mark={sourcePx:{x:105,y:134},label:"Spine allowance",kind:"edge_offset_mm",edge:"left",toleranceMm:2};
function capture(){return createCapture(image,corners,200,100,{title:"Authored input test"});}
function png(width,height){const b=new Uint8Array(24);b.set([137,80,78,71,13,10,26,10]);b.set([73,72,68,82],12);const d=new DataView(b.buffer);d.setUint32(16,width);d.setUint32(20,height);return b;}
function jpeg(width,height){return Uint8Array.from([255,216,255,224,0,4,0,0,255,192,0,8,8,height>>8,height&255,width>>8,width&255,1,255,217]);}

test("capture preserves image identity and independently known skewed physical coordinates",()=>{
  const original=capture(), before=JSON.stringify(original), annotated=appendCaptureMark(original,mark);
  assert.equal(JSON.stringify(original),before);
  const d=validateCapturedDemo(annotated), m=d.landmarks[0];
  assert.ok(Math.abs(m.uv.u-.1)<1e-10);assert.ok(Math.abs(m.uv.v-.5)<1e-10);
  assert.ok(Math.abs(m.distanceMm-20)<1e-10);
  const transferred=adapt(d,340,130).landmarks[0];
  assert.ok(Math.abs(transferred.xMm-20)<1e-10);assert.ok(Math.abs(transferred.yMm-65)<1e-10);
  assert.equal(annotated.source.image.sha256,image.sha256);
  assert.equal(annotated.evidenceClass,"human-annotated-local-image");
});
test("source export stays compatible with maintained geometry without embedding pixels",()=>{
  const demo=appendCaptureMark(capture(),mark), text=JSON.stringify(demo), round=JSON.parse(text);
  assert.equal(derive(round).landmarks.length,1);assert.equal(validateCapturedDemo(round).landmarks.length,1);
  assert.equal(text.includes("data:image"),false);assert.equal(text.includes("blob:"),false);
  assert.equal(derive(demonstration).landmarks.length,3);
});
test("bad corner ordering, missing corners, out-of-frame points and dimensions are refused",()=>{
  assert.throws(()=>createCapture(image,[corners[0],corners[2],corners[1],corners[3]],200,100));
  assert.throws(()=>createCapture(image,[corners[0],corners[0],corners[2],corners[3]],200,100));
  assert.throws(()=>createCapture(image,corners.slice(1),200,100));
  assert.throws(()=>createCapture(image,[{x:-1,y:30},...corners.slice(1)],200,100),/inside/);
  for(const width of [NaN,Infinity,0,10001,"200"])assert.throws(()=>createCapture(image,corners,width,100));
});
test("marks outside image or calibrated sheet never mutate the accepted capture",()=>{
  const demo=appendCaptureMark(capture(),mark), before=JSON.stringify(demo);
  for(const sourcePx of [{x:800,y:2},{x:0,y:0},{x:NaN,y:10}])assert.throws(()=>appendCaptureMark(demo,{...mark,sourcePx}));
  assert.equal(JSON.stringify(demo),before);
});
test("paired image matches bytes and oriented dimensions while allowing a renamed file",()=>{
  const demo=appendCaptureMark(capture(),mark);
  assert.equal(assertImageMatches(demo,{...image,name:"renamed.png"}),true);
  for(const change of [{sha256:"b".repeat(64)},{widthPx:511},{heightPx:299},{mimeType:"image/jpeg"},{pixelCoordinates:"raw"}])
    assert.throws(()=>assertImageMatches(demo,{...image,...change}));
});
test("image metadata and imported capture must retain valid bounded identity",()=>{
  for(const change of [{sha256:"short"},{widthPx:9000},{heightPx:0},{widthPx:8000,heightPx:8000},{name:""},{mimeType:"image/svg+xml"}])
    assert.throws(()=>imageMetadata({...image,...change}));
  const demo=appendCaptureMark(capture(),mark);
  const corrupt=structuredClone(demo);corrupt.source.corners[0]={x:-10,y:30};
  assert.throws(()=>validateCapturedDemo(corrupt),/inside/);
  const corruptMark=structuredClone(demo);corruptMark.landmarks[0].sourcePx.x=9000;
  assert.throws(()=>validateCapturedDemo(corruptMark),/inside/);
  assert.throws(()=>validateCapturedDemo(capture()),/1–30/);
});
test("PNG header admission reads exact dimensions with a bounded byte view",()=>{
  const header=png(800,550), wrapper=new Uint8Array(30);wrapper.set(header,3);
  assert.deepEqual(inspectImageBytes(wrapper.subarray(3,27)),{widthPx:800,heightPx:550,mimeType:"image/png"});
  for(const [w,h] of [[0,300],[8193,100],[7000,7000]])assert.throws(()=>inspectImageBytes(png(w,h)));
});
test("JPEG admission crosses ordinary marker segments and reads frame dimensions",()=>{
  assert.deepEqual(inspectImageBytes(jpeg(800,550)),{widthPx:800,heightPx:550,mimeType:"image/jpeg"});
  assert.throws(()=>inspectImageBytes(jpeg(9000,200)));
  assert.throws(()=>inspectImageBytes(Uint8Array.from([255,216,255,224,0,50,0,0])),/incomplete/);
});
test("unknown, truncated and oversized image inputs are rejected before browser decode",()=>{
  for(const b of [new Uint8Array(),new TextEncoder().encode("not an image"),png(10,10).slice(0,19),new Uint8Array(MAX_IMAGE_BYTES+1)])
    assert.throws(()=>inspectImageBytes(b));
});
