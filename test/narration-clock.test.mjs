import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectNarrationClock,mapNarrationTime} from '../src/narration-clock.mjs';
import {createNarrationNavigation,narrationMomentCandidates,requestedNarrationMoment,importNarrationNavigation} from '../src/narration-moments.mjs';
const clip={name:'drift.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:130};
const clock={anchors:[{transcriptSeconds:0,clipSeconds:2},{transcriptSeconds:100,clipSeconds:112}],verification:{transcriptSeconds:50,clipSeconds:57},toleranceSeconds:0.001,basis:'Authored separate clock control; check tolerance 1 ms'};
const text='WEBVTT\n\n00:50.000 --> 00:52.000\nStop when resistance changes.\n\n01:50.000 --> 01:52.000\nInspect the final position.';
const create=(c=clock)=>createNarrationNavigation(clip,{text,attribution:'Authored software control',offsetSeconds:0,clock:c});
test('two landmarks correct drift that constant offset cannot correct; separate check excluded from fit',()=>{
 const baseline=createNarrationNavigation(clip,{text,attribution:'Authored software control',offsetSeconds:2});
 assert.equal(requestedNarrationMoment(baseline,clip,0,'start').requestedSeconds,52);
 assert.equal('extrapolated' in requestedNarrationMoment(baseline,clip,0,'start'),false);
 assert.equal('extrapolated' in narrationMomentCandidates(baseline,clip).cues[0],false);
 const n=create(),r=requestedNarrationMoment(n,clip,0,'start');assert.ok(Math.abs(r.requestedSeconds-57)<1e-12);
 assert.equal(r.extrapolated,false);assert.equal(inspectNarrationClock(clock,130).checkPassed,true);
 const changed=structuredClone(clock);changed.verification.clipSeconds=57.1;changed.toleranceSeconds=.2;
 assert.equal(inspectNarrationClock(changed,130).slope,inspectNarrationClock(clock,130).slope);
 assert.equal(mapNarrationTime(changed,130,50).seconds,r.requestedSeconds);
});
test('failed separate check never silently navigates using offset or forged fit claims',()=>{
 const bad=structuredClone(clock);bad.verification.clipSeconds=60;bad.slope=1;bad.checkPassed=true;
 assert.equal(inspectNarrationClock(bad,130).checkPassed,false);
 const n=create(bad);assert.throws(()=>requestedNarrationMoment(n,clip,0,'start'),/Separate clock check/);
 assert.throws(()=>narrationMomentCandidates(n,clip),/Separate clock check/);
 assert.throws(()=>narrationMomentCandidates(n,clip,{query:'absent text'}),/Separate clock check/);
});
test('affine mapping preserves cue words, raw anchors, source and requested/presented distinction',()=>{
 const n=create(),raw=JSON.stringify(n),accepted=importNarrationNavigation(JSON.parse(raw),clip);
 assert.equal(JSON.stringify(accepted),raw);assert.equal(n.narration.transcript,text);
 const found=narrationMomentCandidates(accepted,clip);assert.equal(found.cues[0].text,'Stop when resistance changes.');assert.equal(found.cues[1].extrapolated,true);
 assert.equal('presentedSeconds' in requestedNarrationMoment(n,clip,0,'start'),false);
 assert.equal(JSON.stringify(n),raw);
 assert.throws(()=>importNarrationNavigation(n,{...clip,sha256:'b'.repeat(64)}));
 assert.throws(()=>createNarrationNavigation(clip,{text,attribution:'Control',offsetSeconds:2,clock}),/zero offset/);
});
test('held-back authored times follow known clock and mapped outside-clip requests refuse',()=>{
 for(const t of [0,1,7,23,49,80,99,100,110])assert.ok(Math.abs(mapNarrationTime(clock,130,t).seconds-(2+1.1*t))<1e-12);
 const short={...clip,durationSeconds:120};const n=createNarrationNavigation(short,{text,attribution:'Control',clock});
 assert.equal(narrationMomentCandidates(n,short).cues[1].options[0].available,false);
 assert.throws(()=>requestedNarrationMoment(n,short,1,'start'));
});
test('clock declarations reject reversed duplicate nonfinite and dependent checks',()=>{
 for(const change of [c=>c.anchors.reverse(),c=>c.anchors[1].transcriptSeconds=0,c=>c.anchors[1].clipSeconds=1,c=>c.verification.transcriptSeconds=0,c=>c.verification.clipSeconds=130,c=>c.toleranceSeconds=-1,c=>c.toleranceSeconds=NaN,c=>c.basis='',c=>c.anchors[0].transcriptSeconds=Infinity]){
  const c=structuredClone(clock);change(c);assert.throws(()=>inspectNarrationClock(c,130));
 }
 for(const clock of [false,0,''])assert.throws(()=>createNarrationNavigation(clip,{text,attribution:'Control',clock}));
});
test('selected request extrapolation differs from whole cue extent at exact fitting boundary',()=>{
 const n=createNarrationNavigation(clip,{text:'WEBVTT\n\n01:39.000 --> 01:41.000\nBoundary cue.',attribution:'Authored boundary control',clock});
 assert.equal(narrationMomentCandidates(n,clip).cues[0].extrapolated,true);
 assert.equal(requestedNarrationMoment(n,clip,0,'start').extrapolated,false);
 assert.equal(requestedNarrationMoment(n,clip,0,'midpoint').extrapolated,false);
 assert.equal(requestedNarrationMoment(n,clip,0,'end').extrapolated,true);
});
test('escaped literal transcript remains complete through source-only navigation JSON',()=>{
 const payload=String.raw({raw:['"\\']}).repeat(500);
 const text='WEBVTT\n\n'+Array.from({length:120},(_,i)=>String(i+1)+'\n00:50.000 --> 00:52.000\n'+payload).join('\n\n');
 const n=createNarrationNavigation(clip,{text,attribution:'Authored escaping control',clock});
 const json=JSON.stringify(n,null,2);
 assert.ok(new TextEncoder().encode(json).length<2*1024*1024);
 assert.equal(importNarrationNavigation(JSON.parse(json),clip).narration.transcript,text);
});
