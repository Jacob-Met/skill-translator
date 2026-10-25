import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createNarration,createClockNarration,narrationForStep,selectNarration,deriveNarratedSequence,importNarration,CLOCK_NARRATION_FORMAT} from '../src/timed-narration.mjs';
import {createNarrationNavigation,importNarrationNavigation} from '../src/narration-moments.mjs';
import {narrationFromNavigation} from '../src/clock-quotation.mjs';
function source(){
 const clip={name:'authored-clock.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:130};let s=createSequence(clip,{title:'Authored drift account'});
 for(const [i,time] of [57,59,123,125].entries()){
  const image={name:'frame-'+i+'.png',mimeType:'image/png',sha256:String(i+1).repeat(64),widthPx:160,heightPx:120,pixelCoordinates:'browser-oriented'};
  s=appendMoment(s,{id:'m'+i,label:'State '+i,visibleState:'Authored control',image,origin:frameOrigin(clip,time,{mediaTime:time,width:160,height:120},image)});
 }
 for(let i=0;i<3;i++)s=upsertStep(s,{id:'s'+i,beforeMomentId:'m'+i,afterMomentId:'m'+(i+1),title:'Stage '+i,intent:'Inspect supplied account',sensoryCue:'Original author note',recoveryCue:'',visibleChange:''});return s;
}
const clock={anchors:[{transcriptSeconds:0,clipSeconds:2},{transcriptSeconds:100,clipSeconds:112}],verification:{transcriptSeconds:50,clipSeconds:57},toleranceSeconds:.001,basis:'Authored clock correspondence'};
const text='WEBVTT\n\n00:50.000 --> 00:52.000\n<v Expert>Stop when resistance changes.\n\n01:50.000 --> 01:51.000\nInspect the result.';
const navigation=s=>createNarrationNavigation(s.clip,{text,attribution:'Authored control',clock});
test('same declared clock carries a previously missing utterance into source step overlap',()=>{
 const s=source(),before=JSON.stringify(s),old=createNarration(s,{text,attribution:'Authored control',offsetSeconds:2});
 assert.equal(narrationForStep(old,'s0').cues.length,0);
 const study=narrationFromNavigation(s,navigation(s)),found=narrationForStep(study,'s0');
 assert.equal(study.format,CLOCK_NARRATION_FORMAT);assert.deepEqual(found.cues.map(c=>c.index),[0]);assert.ok(Math.abs(found.cues[0].alignedStartSeconds-57)<1e-12);
 assert.equal(found.cues[0].text,'<v Expert>Stop when resistance changes.');assert.equal(study.transcript,text);assert.equal(JSON.stringify(s),before);
});
test('explicit clock quotation preserves original notes pixels timestamps and replay',()=>{
 const s=source(),study=narrationFromNavigation(s,navigation(s)),before=JSON.stringify(study);
 const chosen=selectNarration(s,study,{stepId:'s0',field:'sensoryCue',cueIndices:[0]}),derived=deriveNarratedSequence(chosen);
 assert.ok(derived.steps[0].sensoryCue.startsWith('Original author note\n\nSupplied narration'));
 assert.match(derived.steps[0].sensoryCue,/50–52 s transcript/);assert.match(derived.steps[0].sensoryCue,/<v Expert>Stop when resistance changes\./);assert.match(derived.steps[0].sensoryCue,/declared clock/);
 assert.deepEqual(derived.moments,s.moments);assert.deepEqual(deriveNarratedSequence(importNarration(s,JSON.parse(JSON.stringify(chosen)))),derived);assert.equal(JSON.stringify(study),before);
 assert.deepEqual(deriveNarratedSequence(selectNarration(s,chosen,{stepId:'s0',field:'sensoryCue',cueIndices:[]})),s);
});
test('extrapolated supplied words remain visibly identified rather than clipped',()=>{
 const s=source(),study=narrationFromNavigation(s,navigation(s));
 const found=narrationForStep(study,'s2');assert.equal(found.cues[0].index,1);assert.equal(found.cues[0].extrapolated,true);
 const chosen=selectNarration(s,study,{stepId:'s2',field:'recoveryCue',cueIndices:[1]});assert.match(deriveNarratedSequence(chosen).steps[2].recoveryCue,/extrapolated beyond fitting landmarks/);
});
test('wrong clip failed check changed source and format downgrades refuse',()=>{
 const s=source(),nav=navigation(s),study=narrationFromNavigation(s,nav);
 for(const change of [v=>v.narration.source.clip.sha256='b'.repeat(64),v=>v.clock.verification.clipSeconds=60]){const bad=structuredClone(nav);change(bad);assert.throws(()=>narrationFromNavigation(s,bad));}
 const changed=structuredClone(s);changed.steps[0].intent='Changed source';assert.throws(()=>importNarration(changed,study),/source demonstration changed/);
 assert.throws(()=>importNarration(s,{...study,format:'skill-translator.timed-narration/v1'}),/v2/);
 assert.throws(()=>importNarration(s,{...study,format:'skill-translator.timed-narration/v3'}),/Unsupported/);
 assert.throws(()=>importNarration(s,{...study,offsetSeconds:1}),/zero/);
 const forged=structuredClone(study);forged.clock.verification.clipSeconds=60;forged.checkPassed=true;assert.throws(()=>importNarration(s,forged),/Separate clock/);
});
test('unchanged offset navigation still produces original v1 quotation semantics',()=>{
 const s=source(),nav=createNarrationNavigation(s.clip,{text,attribution:'Offset control',offsetSeconds:7});
 assert.deepEqual(narrationFromNavigation(s,nav),createNarration(s,{text,attribution:'Offset control',offsetSeconds:7}));
});
test('authored sidecars retain exact source and cannot lose a quotation clock through studio navigation',()=>{
 const s=source(),original=createNarration(s,{text,attribution:'Original authored account',offsetSeconds:2});
 assert.throws(()=>narrationFromNavigation(s,original),/authored narration account/);
 assert.deepEqual(importNarration(s,original),original);
 const nav=navigation(s),study=narrationFromNavigation(s,nav);
 assert.throws(()=>importNarrationNavigation(study,s.clip),/studio navigation/);
 assert.throws(()=>importNarrationNavigation({...nav,narration:study},s.clip),/original v1 narration/);
});
test('clock-mapped cue overlap preserves exact half-open interval boundaries',()=>{
 const s=source(),clock={anchors:[{transcriptSeconds:0,clipSeconds:1},{transcriptSeconds:50,clipSeconds:101}],verification:{transcriptSeconds:25,clipSeconds:51},toleranceSeconds:0,basis:'Authored exact binary clock boundary'};
 const text='WEBVTT\n\n00:27.000 --> 00:28.000\nBefore.\n\n00:28.000 --> 00:29.000\nInside.\n\n00:29.000 --> 00:30.000\nAfter.';
 const study=createClockNarration(s,{text,attribution:'Authored boundary control',clock});
 const found=narrationForStep(study,'s0');assert.deepEqual(found.cues.map(c=>c.index),[1]);assert.equal(found.cues[0].alignedStartSeconds,57);assert.equal(found.cues[0].alignedEndSeconds,59);
});
