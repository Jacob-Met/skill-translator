import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const production = readFileSync(new URL('../web/video-input.mjs',import.meta.url),'utf8');
const imports = `const MAX_VIDEO_BYTES=134217728, MAX_IMAGE_SIDE=8192, MAX_IMAGE_PIXELS=24000000, MAX_SAMPLE_SIDE=640;
function clipIdentity(o){return o;}
function requestedFrameTime(seconds,duration){
 if(!Number.isFinite(seconds)||seconds<0||seconds>=duration)throw Error("Invalid frame time");
}`;
const source=imports+production.slice(production.indexOf('function boundedFrameSize'));
const {capturePresentedFrame,samplePresentedFrame}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function environment({reportedTime,frameTime=3.166667,sampleOnly=false}={}){
 const oldDocument=globalThis.document;
 let drawn=0,encoded=0,assigned=NaN, video;
 globalThis.document={createElement(type){
  if(type==='canvas')return {width:0,height:0,getContext(){return {
    drawImage(){drawn++;},
    getImageData(){return {data:new Uint8ClampedArray(4)}},
  };},toBlob(fn){encoded++;fn(new Blob([new Uint8Array([1,2,3])],{type:'image/png'}));}};
  throw Error('Unexpected element '+type);
 }};
 const listeners=new Map();
 let clock=0;
 video={
  controls:true,videoWidth:160,videoHeight:90,readyState:4,seeking:false,error:null,
  get currentTime(){return clock},
  set currentTime(value){assigned=value;clock=reportedTime===undefined?value:reportedTime;},
  pause(){},play(){return Promise.resolve();},
  addEventListener(event,handler){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(handler);},
  removeEventListener(event,handler){listeners.get(event)?.delete(handler);},
  requestVideoFrameCallback(callback){queueMicrotask(()=>callback(0,{mediaTime:frameTime,width:160,height:90}));return 1},
  cancelVideoFrameCallback(){},
 };
 return {
  clip:{video,identity:{name:'source.mp4',durationSeconds:4}},
  metrics(){return {drawn,encoded,assigned,currentTime:clock}},
  restore(){globalThis.document=oldDocument;},
 };
}

test('broken seek clock must refuse stale original PNG',async()=>{
 const e=environment({reportedTime:0.066,frameTime:0.083333});
 try{
  await assert.rejects(capturePresentedFrame(e.clip,3.2),/seek|requested|moment/i);
  assert.equal(e.metrics().drawn,0,'never copy a frame after a rejected seek');
  assert.equal(e.metrics().assigned,3.2);
 }finally{e.restore();}
});

test('broken seek clock also refuses inspection samples',async()=>{
 const e=environment({reportedTime:0.009,frameTime:0});
 try{
  await assert.rejects(samplePresentedFrame(e.clip,3.2),/seek|requested|moment/i);
  assert.equal(e.metrics().drawn,0);
 }finally{e.restore();}
});

test('normally completed seek retains actual presented frame PTS',async()=>{
 const e=environment({frameTime:3.166667});
 try{
  const result=await capturePresentedFrame(e.clip,3.2);
  assert.equal(result.metadata.mediaTime,3.166667);
  assert.equal(result.requestedTimeSeconds,3.2);
  assert.equal(e.metrics().drawn,1);
  assert.equal(e.metrics().encoded,1);
 }finally{e.restore();}
});

test('sparse earlier presentation time is admitted if browser clock honored seek',async()=>{
 const e=environment({frameTime:2.0});
 try{
  const result=await capturePresentedFrame(e.clip,3.2);
  assert.equal(result.metadata.mediaTime,2.0);
  assert.equal(e.metrics().drawn,1);
 }finally{e.restore();}
});

test('small seek quantization remains acceptable',async()=>{
 const e=environment({reportedTime:3.16,frameTime:3.13});
 try{
  const result=await samplePresentedFrame(e.clip,3.2);
  assert.equal(result.presentedSeconds,3.13);
  assert.equal(result.requestedSeconds,3.2);
  assert.equal(e.metrics().drawn,1);
 }finally{e.restore();}
});
