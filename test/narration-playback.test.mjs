import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createNarration,createClockNarration} from '../src/timed-narration.mjs';
import {narrationPlaybackRange} from '../src/narration-playback.mjs';
function source(){
 const clip={name:'authored-speech.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:5.113};let s=createSequence(clip);
 for(const [i,time]of [.5,5].entries()){
  const image={name:'f'+i+'.png',mimeType:'image/png',sha256:String(i+1).repeat(64),widthPx:160,heightPx:120,pixelCoordinates:'browser-oriented'};
  s=appendMoment(s,{id:'m'+i,label:'State '+i,visibleState:'Authored control',image,origin:frameOrigin(clip,time,{mediaTime:time,width:160,height:120},image)});
 }
 return upsertStep(s,{id:'step',beforeMomentId:'m0',afterMomentId:'m1',title:'Inspect narration',intent:'Authored receiving control',visibleChange:'',sensoryCue:'',recoveryCue:''});
}
const text='WEBVTT\n\n00:00.000 --> 00:02.300\n<v Expert>Inspect this cue.\n\n00:02.300 --> 00:04.860\nInspect the outcome.';
const details={text,attribution:'Authored speech control',offsetSeconds:0};
test('playback requests the complete original cue, never its step intersection or captured frame',()=>{
 const s=source(),study=createNarration(s,details),before=JSON.stringify(study),r=narrationPlaybackRange(study,'step',0);
 assert.equal(r.startSeconds,0);assert.equal(r.endSeconds,2.3);assert.equal(r.text,'<v Expert>Inspect this cue.');assert.equal(r.transcriptStartSeconds,0);assert.equal('presentedSeconds'in r,false);
 assert.equal(JSON.stringify(study),before);assert.equal(study.selections.length,0);
});
test('clock-aware quote producer supplies the identical requested source range',()=>{
 const s=source(),clock={anchors:[{transcriptSeconds:0,clipSeconds:.2},{transcriptSeconds:4,clipSeconds:4.6}],verification:{transcriptSeconds:2,clipSeconds:2.4},toleranceSeconds:.001,basis:'Authored clock control'};
 const study=createClockNarration(s,{...details,clock}),r=narrationPlaybackRange(study,'step',0);
 assert.equal(r.startSeconds,.2);assert.ok(Math.abs(r.endSeconds-2.73)<1e-12);assert.equal(r.transcriptEndSeconds,2.3);
 assert.throws(()=>narrationPlaybackRange(study,'step',1),/complete mapped utterance/);
 const forged=structuredClone(study);forged.clock.verification.clipSeconds=3;forged.checkPassed=true;
 assert.throws(()=>narrationPlaybackRange(forged,'step',0),/Separate clock/);
});
test('negative/outside mapped requests refuse without clamping; exact source end remains usable',()=>{
 const s=source(),negative=createNarration(s,{...details,offsetSeconds:-1});
 assert.throws(()=>narrationPlaybackRange(negative,'step',0),/not clipped/);
 assert.ok(narrationPlaybackRange(negative,'step',1).startSeconds>0);
 const ending=createNarration(s,{...details,text:'WEBVTT\n\n00:04.000 --> 00:05.113\nEnd of original source.'});
 assert.equal(narrationPlaybackRange(ending,'step',0).endSeconds,s.clip.durationSeconds);
});
test('unknown step, unrelated cue, malformed identity and invalid index cannot choose a fallback',()=>{
 const s=source(),study=createNarration(s,details);
 for(const index of [-1,.5,'0',NaN,99])assert.throws(()=>narrationPlaybackRange(study,'step',index));
 assert.throws(()=>narrationPlaybackRange(study,'absent',0));
 const bad=structuredClone(study);bad.source.clip.sha256='b'.repeat(64);assert.throws(()=>narrationPlaybackRange(bad,'step',0));
 const later=createNarration(s,{...details,text:'WEBVTT\n\n00:05.050 --> 00:05.100\nOutside authored step.'});
 assert.throws(()=>narrationPlaybackRange(later,'step',0),/overlapping/);
});
