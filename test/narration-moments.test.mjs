import test from 'node:test';
import assert from 'node:assert/strict';
import {createNarrationNavigation,narrationMomentCandidates,requestedNarrationMoment,NARRATION_PAGE_SIZE} from '../src/narration-moments.mjs';
const clip={name:'existing-speech.webm',mimeType:'video/webm',sizeBytes:71149,sha256:'a'.repeat(64),durationSeconds:5.113};
const text='WEBVTT\n\nfirst\n00:00.000 --> 00:02.300\n<v Speaker>Green square; [guide].\n\nsecond\n00:02.300 --> 00:04.860\nWhite bell rings.';
const navigation=(raw=text,offsetSeconds=0)=>createNarrationNavigation(clip,{text:raw,offsetSeconds,attribution:'Authored control'});
test('narration discovers requested moments before any retained frame or authored step',()=>{
 const n=navigation(),before=JSON.stringify(n);assert.equal(n.source.moments.length,0);assert.equal(n.source.steps.length,0);
 const all=narrationMomentCandidates(n,clip);assert.equal(all.matches,2);assert.equal(all.totalCues,2);assert.deepEqual(all.cues[0].options.map(o=>[o.kind,o.seconds,o.available]),[['start',0,true],['midpoint',1.15,true],['end',2.3,true]]);
 const bell=narrationMomentCandidates(n,clip,{query:'BELL'});assert.equal(bell.matches,1);assert.equal(bell.cues[0].index,1);assert.equal(requestedNarrationMoment(n,clip,1,'midpoint').requestedSeconds,3.58);
 assert.equal(narrationMomentCandidates(n,clip,{query:'[guide].'}).matches,1);assert.equal(narrationMomentCandidates(n,clip,{query:'missing'}).matches,0);assert.equal(JSON.stringify(n),before);
});
test('candidate boundaries are explicit, never clamped or substituted for actual frame timing',()=>{
 const raw='WEBVTT\n\n00:00.000 --> 00:05.113\nWhole interval',n=navigation(raw),c=narrationMomentCandidates(n,clip).cues[0];
 assert.equal(c.options[0].available,true);assert.equal(c.options[2].available,false);assert.equal(c.options[2].seconds,clip.durationSeconds);assert.throws(()=>requestedNarrationMoment(n,clip,0,'end'),/not including/);
 const shifted=navigation(text,-.1),first=narrationMomentCandidates(shifted,clip).cues[0];assert.equal(first.options[0].seconds,-.1);assert.equal(first.options[0].available,false);assert.equal(first.options[1].available,true);assert.throws(()=>requestedNarrationMoment(shifted,clip,0,'start'));
 const selected=requestedNarrationMoment(navigation(),clip,1,'start');assert.equal(selected.requestedSeconds,2.3);assert.equal('presentedSeconds' in selected,false);assert.equal('frame' in selected,false);
});
test('pagination and literal filtering preserve original cue indexes',()=>{
 const stamp=ms=>'00:'+String(Math.floor(ms/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');
 const raw='WEBVTT\n\n'+Array.from({length:121},(_,i)=>stamp(i*10)+' --> '+stamp(i*10+10)+'\n'+(i===70?'Needle':'Ordinary cue '+i)).join('\n\n'),n=navigation(raw);
 const a=narrationMomentCandidates(n,clip),b=narrationMomentCandidates(n,clip,{page:2});assert.equal(a.cues.length,NARRATION_PAGE_SIZE);assert.equal(a.pages,3);assert.equal(b.cues.length,21);assert.equal(b.cues[0].index,100);
 const found=narrationMomentCandidates(n,clip,{query:'needle'});assert.equal(found.cues[0].index,70);assert.equal(requestedNarrationMoment(n,clip,70,'start').requestedSeconds,.7);
 assert.throws(()=>narrationMomentCandidates(n,clip,{page:3}),/unavailable/);assert.throws(()=>narrationMomentCandidates(n,clip,{page:-1}));assert.throws(()=>narrationMomentCandidates(n,clip,{query:'x'.repeat(201)}));
});
test('original clip and recognized producer declaration bind navigation',()=>{
 const n=navigation();assert.equal(narrationMomentCandidates(n,{...clip,name:'renamed.webm'}).matches,2);
 for(const changed of [{sha256:'b'.repeat(64)},{durationSeconds:6},{sizeBytes:71150}])assert.throws(()=>narrationMomentCandidates(n,{...clip,...changed}),/does not match/);
 const declared=text.replace('WEBVTT\n\n','WEBVTT\n\nNOTE CAPTIONVERSE local ASR draft\nSource SHA-256: '+'b'.repeat(64)+'\n\n');assert.throws(()=>navigation(declared),/declared source digest/);
 assert.throws(()=>requestedNarrationMoment(n,clip,9,'start'),/unavailable/);assert.throws(()=>requestedNarrationMoment(n,clip,0,'automatic'),/midpoint/);assert.throws(()=>navigation(text,Infinity),/offset/);
});
