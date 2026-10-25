import {playPresentedInterval} from '../web/interval-playback.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
class Video extends EventTarget{
 constructor(){super();this.controls=true;this.playbackRate=2;this.currentTime=0;this.seeking=false;this.callbacks=new Map();this.serial=0;this.pauses=0;}
 pause(){this.pauses++;}
 play(){return Promise.resolve();}
 requestVideoFrameCallback(fn){const id=++this.serial;this.callbacks.set(id,fn);return id;}
 cancelVideoFrameCallback(id){this.callbacks.delete(id);}
 frame(time){const entry=this.callbacks.entries().next().value;assert.ok(entry);this.callbacks.delete(entry[0]);entry[1](0,{mediaTime:time});}
}
const clip=()=>({video:new Video(),identity:{durationSeconds:10}});
const range={startSeconds:1,endSeconds:3};
test('native rate and actual offsets',async()=>{const c=clip(),p=playPresentedInterval(c,range);assert.equal(c.video.playbackRate,1);assert.equal(c.video.controls,false);c.video.frame(.95);c.video.frame(2);c.video.frame(3.1);const r=await p;assert.equal(r.presentedCallbacks,3);assert.ok(r.firstOffsetSeconds<0&&r.lastOffsetSeconds>0);assert.equal(c.video.playbackRate,2);assert.equal(c.video.controls,true);assert.equal(c.video.callbacks.size,0);});
test('cancellation and retired callback',async()=>{const c=clip(),controller=new AbortController();let updates=0;const p=playPresentedInterval(c,range,{signal:controller.signal,onFrame:()=>updates++});const retired=[...c.video.callbacks.values()][0];controller.abort();await assert.rejects(p,/replaced/);retired(0,{mediaTime:2});assert.equal(updates,0);assert.equal(c.video.callbacks.size,0);});
test('abort in frame observer cannot reschedule',async()=>{const c=clip(),controller=new AbortController(),p=playPresentedInterval(c,range,{signal:controller.signal,onFrame:()=>controller.abort()});c.video.frame(1);await assert.rejects(p,/replaced/);assert.equal(c.video.callbacks.size,0);});
test('seeking callbacks do not count',async()=>{const c=clip(),p=playPresentedInterval(c,range);c.video.seeking=true;c.video.frame(0);c.video.seeking=false;c.video.frame(1.1);c.video.frame(3);const r=await p;assert.equal(r.firstPresentedSeconds,1.1);assert.equal(r.presentedCallbacks,2);});
test('source end distinct from presented endpoint',async()=>{const c=clip(),p=playPresentedInterval(c,{startSeconds:9,endSeconds:10});c.video.frame(9.2);c.video.frame(9.9);c.video.dispatchEvent(new Event('ended'));const r=await p;assert.equal(r.reason,'source-ended');assert.ok(r.lastOffsetSeconds<0);});
test('invalid bounds never take ownership',async()=>{for(const r of [{startSeconds:1,endSeconds:1},{startSeconds:-1,endSeconds:3},{startSeconds:1,endSeconds:11},{startSeconds:NaN,endSeconds:3}]){const c=clip();await assert.rejects(playPresentedInterval(c,r));assert.equal(c.video.pauses,0);}});
test('backward and invalid timestamps refuse',async()=>{for(const bad of [.5,NaN,11]){const c=clip(),p=playPresentedInterval(c,range);c.video.frame(1);c.video.frame(bad);await assert.rejects(p);assert.equal(c.video.callbacks.size,0);assert.equal(c.video.controls,true);}});
test('abort during initial pause cannot leak scheduled work',async()=>{const c=clip(),controller=new AbortController();c.video.pause=()=>controller.abort();const p=playPresentedInterval(c,range,{signal:controller.signal});await assert.rejects(p,/replaced/);assert.equal(c.video.callbacks.size,0);assert.equal(c.video.controls,true);});

test('autoplay rejection restores controls and cancels callbacks',async()=>{const c=clip();c.video.play=()=>Promise.reject(Error('Autoplay refused'));await assert.rejects(playPresentedInterval(c,range),/Autoplay refused/);assert.equal(c.video.callbacks.size,0);assert.equal(c.video.controls,true);});
