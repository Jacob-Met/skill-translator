import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const actual=readFileSync(new URL('../web/video-input.mjs', import.meta.url),'utf8');
const source=`const MAX_VIDEO_BYTES=134217728, MAX_IMAGE_SIDE=8192, MAX_IMAGE_PIXELS=24000000, MAX_SAMPLE_SIDE=640;
function clipIdentity(o){return {name:o.name,mimeType:o.mimeType,sha256:o.sha256,sizeBytes:o.sizeBytes,durationSeconds:o.durationSeconds};}
function requestedFrameTime(x){return x;}
`+actual.slice(actual.indexOf('function boundedFrameSize'));
const {loadLocalVideo,releaseVideo}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function installDecoder(mode){
 const originalDocument=globalThis.document, create=URL.createObjectURL, revoke=URL.revokeObjectURL,revoked=[];
 let player;
 globalThis.document={createElement(tag){
  assert.equal(tag,'video');
  const listeners=new Map();
  player={controls:false,muted:false,playsInline:false,preload:'',videoWidth:640,videoHeight:480,duration:2,readyState:0,error:null,src:'',
    addEventListener(name,fn){(listeners.get(name)||listeners.set(name,new Set()).get(name)).add(fn);},
    removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
    emit(name){for(const fn of [...(listeners.get(name)||[])])fn();},
    load(){if(!this.src)return;queueMicrotask(()=>{this.emit('loadedmetadata');
      if(mode==='valid'||mode==='bad-after-frame'){this.readyState=2;queueMicrotask(()=>{this.emit('loadeddata');if(mode==='bad-after-frame')queueMicrotask(()=>{this.error={code:3};this.emit('error');});});}
      else{this.error={code:3};queueMicrotask(()=>this.emit('error'));}});},
    pause(){this.paused=true;},removeAttribute(name){if(name==='src')this.src='';},remove(){},
  };return player;
 }};
 URL.createObjectURL=()=> 'blob:test-decoder';
 URL.revokeObjectURL=url=>revoked.push(url);
 return {get player(){return player},revoked,restore(){globalThis.document=originalDocument;URL.createObjectURL=create;URL.revokeObjectURL=revoke;}};
}
const file={size:32,name:'original.mp4',type:'video/mp4',async arrayBuffer(){
  await new Promise(r=>setTimeout(r,20));return new Uint8Array([1,2,3,4]).buffer;
}};
test('original with container metadata but undecodable first frame is refused',async()=>{
 const env=installDecoder('bad');
 try{
  await assert.rejects(loadLocalVideo(file),/decode|frame|video/i);
  assert.equal(env.player.src,'');
  assert.deepEqual(env.revoked,['blob:test-decoder']);
 }finally{env.restore();}
});
test('first decodable frame is accepted and retains source identity',async()=>{
 const env=installDecoder('valid');
 try{
  const clip=await loadLocalVideo(file);
  assert.equal(clip.identity.name,'original.mp4');
  assert.equal(clip.identity.durationSeconds,2);
  assert.deepEqual(env.revoked,[]);
  releaseVideo(clip);
  assert.deepEqual(env.revoked,['blob:test-decoder']);
 }finally{env.restore();}
});
test('early decoder error after the first frame but before hashing finishes is refused',async()=>{
 const env=installDecoder('bad-after-frame');
 try{
  await assert.rejects(loadLocalVideo(file),/decode|frame|video/i);
  assert.equal(env.player.src,'');
  assert.deepEqual(env.revoked,['blob:test-decoder']);
 }finally{env.restore();}
});
