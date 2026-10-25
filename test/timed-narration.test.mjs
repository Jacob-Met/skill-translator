import {createAuthoredManifest} from '../vendor/captionverse/core.mjs';
import {serializeReviewedWebVtt} from '../vendor/captionverse/review-vtt.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep,validateSequence} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {parseNarration,createNarration,importNarration,narrationForStep,selectNarration,deriveNarratedSequence,MAX_TRANSCRIPT_BYTES} from '../src/timed-narration.mjs';
function source(){
 const clip={name:'authored-binding.webm',mimeType:'video/webm',sizeBytes:1234,sha256:'a'.repeat(64),durationSeconds:20};let s=createSequence(clip,{title:'Authored sewing-frame tension control'});
 for(const [i,time] of [0,2,4,8].entries()){
  const image={name:'frame-'+i+'.png',mimeType:'image/png',sha256:String(i+1).repeat(64),widthPx:640,heightPx:360,pixelCoordinates:'browser-oriented'};
  s=appendMoment(s,{id:'m'+i,label:'State '+i,visibleState:'Authored fixture',image,origin:frameOrigin(clip,time,{mediaTime:time,width:640,height:360},image)});
 }
 for(let i=0;i<3;i++)s=upsertStep(s,{id:'s'+i,beforeMomentId:'m'+i,afterMomentId:'m'+(i+1),title:'Stage '+i,intent:'Set the fold',sensoryCue:'Original author note',recoveryCue:'',visibleChange:''});return s;
}
const transcript='WEBVTT\n\nNOTE Authored multi-speaker craft control, not a recording\n\nexpert\n00:00.500 --> 00:02.500\n<v Expert>Keep the fold against the guide.\nNotice the resistance.\n\nlearner\n00:01.500 --> 00:02.000\n<v Learner>Is the tension even?\n\n00:02.000 --> 00:03.000\n<v Expert>Stop if the paper begins to buckle.\n\n00:10.000 --> 00:12.000\nAn unrelated later explanation.';
const create=(s=source(),text=transcript,offsetSeconds=0)=>createNarration(s,{text,attribution:'Authored narration control',offsetSeconds});
test('retains original transcript, speaker markup, overlapping cues and authored sequence',()=>{
 const s=source(),raw=JSON.stringify(s),a=create(s),cues=parseNarration(transcript);
 assert.equal(a.transcript,transcript);assert.equal(cues[0].id,'expert');assert.equal(cues[0].text,'<v Expert>Keep the fold against the guide.\nNotice the resistance.');
 assert.deepEqual(narrationForStep(a,'s0').cues.map(c=>c.index),[0,1]);assert.deepEqual(narrationForStep(a,'s1').cues.map(c=>c.index),[0,2]);assert.deepEqual(narrationForStep(a,'s2').cues,[]);assert.equal(JSON.stringify(s),raw);
});
test('explicit offset shifts overlap without clipping or altering original times',()=>{
 const a=create(source(),transcript,-1),found=narrationForStep(a,'s0');
 assert.deepEqual(found.cues.map(c=>c.index),[0,1,2]);assert.deepEqual(found.outsideClip,[0]);assert.equal(found.cues[0].startSeconds,.5);assert.equal(found.cues[0].alignedStartSeconds,-.5);
 assert.deepEqual(narrationForStep(create(source(),transcript,20),'s0').cues,[]);
});
test('selected quotes append once, preserve original account and reopen in maintained sequence validator',()=>{
 const s=source(),a=create(s),raw=JSON.stringify(a);const chosen=selectNarration(s,a,{stepId:'s0',field:'sensoryCue',cueIndices:[1,0]});
 assert.deepEqual(chosen.selections[0].cueIndices,[0,1]);const derived=deriveNarratedSequence(chosen);
 assert.ok(derived.steps[0].sensoryCue.startsWith('Original author note\n\nSupplied narration'));assert.match(derived.steps[0].sensoryCue,/Is the tension even/);assert.deepEqual(derived.moments,s.moments);assert.deepEqual(validateSequence(derived),derived);assert.equal(JSON.stringify(a),raw);
 assert.deepEqual(deriveNarratedSequence(importNarration(s,JSON.parse(JSON.stringify(chosen)))),derived);
 const cleared=selectNarration(s,chosen,{stepId:'s0',field:'sensoryCue',cueIndices:[]});assert.deepEqual(deriveNarratedSequence(cleared),s);
 assert.deepEqual(deriveNarratedSequence(selectNarration(s,chosen,{stepId:'s0',field:'sensoryCue',cueIndices:[0,1]})),derived);
});
test('wrong clip or edited author account refuses sidecar and forged selections never reach output',()=>{
 const s=source(),a=create(s),changed=structuredClone(s);changed.steps[0].intent='Changed';assert.throws(()=>importNarration(changed,a),/source demonstration changed/);
 const other=structuredClone(s);other.clip.sha256='b'.repeat(64);for(const m of other.moments)m.origin.clip.sha256=other.clip.sha256;assert.throws(()=>importNarration(other,a),/source demonstration changed/);
 for(const indices of [[3],[0,0],[-1],[.5],['0']])assert.throws(()=>selectNarration(s,a,{stepId:'s0',field:'sensoryCue',cueIndices:indices}));
 assert.throws(()=>deriveNarratedSequence({...a,selections:[{stepId:'s0',field:'intent',cueIndices:[3]}]}),/overlap/);
 assert.throws(()=>selectNarration(s,a,{stepId:'s0',field:'title',cueIndices:[0]}),/account field/);
});
test('parser refuses unsupported mappings, malformed timing, descending starts, empty text and resource overflow',()=>{
 for(const text of ['wrong','WEBVTT\n\n00:00.000 --> 00:00.000\nX','WEBVTT\n\n00:61.000 --> 01:02.000\nX','WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00.000\n\n00:00.000 --> 00:01.000\nX','WEBVTT\n\nSTYLE\n::cue {}','WEBVTT\n\n00:02.000 --> 00:03.000\nX\n\n00:01.000 --> 00:02.000\nY','WEBVTT\n\n00:00.000 --> 00:01.000\n','x'.repeat(MAX_TRANSCRIPT_BYTES+1)])assert.throws(()=>parseNarration(text));
 assert.equal(parseNarration('\uFEFF'+transcript.replace(/\n/g,'\r\n')).length,4);
 assert.throws(()=>create(source(),transcript,NaN),/offset/);assert.throws(()=>createNarration(source(),{text:transcript,attribution:''}),/supplied/);
});
test('bounded selection refuses overlong author fields without truncating any words',()=>{
 const s=source(),a=create(s,'WEBVTT\n\n00:00.000 --> 00:01.000\n'+'x'.repeat(1790));assert.throws(()=>selectNarration(s,a,{stepId:'s0',field:'sensoryCue',cueIndices:[0]}),/1800/);assert.equal(a.selections.length,0);
 const many='WEBVTT\n\n'+Array.from({length:1001},()=> '00:00.000 --> 00:01.000\nX').join('\n\n');assert.throws(()=>parseNarration(many),/1000/);
});

test('maintained CAPTIONVERSE reviewed producer reaches narration and refuses declared source mismatch',()=>{
 const s=source(),sha256=s.clip.sha256,mediaDuration=s.clip.durationSeconds;
 const manifest=createAuthoredManifest({sourceId:'authored-fold-control',sha256,cues:[{id:'expert-1',kind:'dialogue',start:.5,end:2.5,label:'Expert',text:'Keep the fold against the guide.',anchor:null}]},{mediaDuration});
 const text=serializeReviewedWebVtt(manifest,{mediaSha256:sha256,mediaDuration});
 const a=create(s,text);assert.equal(a.transcript,text);assert.equal(parseNarration(text)[0].text.trim(),'Expert: Keep the fold against the guide.');
 const picked=selectNarration(s,a,{stepId:'s0',field:'intent',cueIndices:[0]});assert.match(deriveNarratedSequence(picked).steps[0].intent,/Expert: Keep the fold/);
 assert.throws(()=>create(s,text.replace(sha256,'b'.repeat(64))),/declared source digest/);
});
test('shared subtitle admission preserves producer provenance failures and rejects hidden cue loss',()=>{
 const s=source(),sha=s.clip.sha256;
 const note='NOTE CAPTIONVERSE local ASR draft\nSource SHA-256: '+sha;
 const cue='00:00.500 --> 00:01.500\nSupplied draft words';
 assert.equal(create(s,'WEBVTT\n\n'+note+'\n\n'+cue).source.clip.sha256,sha);
 for(const raw of [
  'WEBVTT\n\nNOTE explanation\n'+cue,
  'WEBVTT\n\n'+cue+'\n00:02.000 --> 00:03.000\nUnseparated cue',
  'WEBVTT\n\n'+note+'\n\n'+note+'\n\n'+cue,
  'WEBVTT\n\nNOTE CAPTIONVERSE local ASR draft\nSource SHA-256: bad\n\n'+cue
 ])assert.throws(()=>create(s,raw));
});
