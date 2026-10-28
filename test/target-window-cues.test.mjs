import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
import {importTargetCueStudy,TARGET_CUE_FORMAT} from '../src/target-cue-study.mjs';
import {importTargetWindowCues,inspectTargetWindowCues,TARGET_WINDOW_FORMAT} from '../src/target-window-cues.mjs';
function input(){const reference=study([['a'],['b']],['A','B']),source=structuredClone(reference.comparison.examples[0].source);source.clip.sha256='f'.repeat(64);source.moments.forEach(m=>m.origin.clip.sha256=source.clip.sha256);const middle=structuredClone(source.moments[0]);middle.id='middle';middle.origin.mediaTimeSeconds=1.5;middle.origin.requestedTimeSeconds=1.5;source.moments.splice(1,0,middle);return{format:TARGET_WINDOW_FORMAT,windowDeclaration:'retained-moments-within-step',reference,target:{source,stepId:'s'},readings:[{cueId:'c0',value:'a',momentId:'middle',basisKind:'visible-category',basis:'Authored control'}]};}
test('interior attribution preserves original source, endpoints and report population',()=>{const s=input(),before=JSON.stringify(s),a=importTargetWindowCues(s),r=inspectTargetWindowCues(s);assert.deepEqual(a.target,s.target);assert.deepEqual(r.report.compatibleExampleIndexes,[0]);assert.equal(r.readings[0].frame.id,'middle');assert.equal(JSON.stringify(s),before);assert.equal(r.targetDecisionInferred,false);});
test('old reader refuses format and explicit endpoint downgrade',()=>{const s=input();assert.throws(()=>importTargetCueStudy(s));assert.throws(()=>importTargetCueStudy({...s,format:TARGET_CUE_FORMAT}));});
test('original narrowed interval and missing anchors refuse',()=>{const s=input();s.target.source.steps[0].afterMomentId='m1';assert.throws(()=>importTargetWindowCues(s));const t=input();t.readings[0].momentId='manufactured';assert.throws(()=>importTargetWindowCues(t));});
test('declaration attribution and unique categorical normalization precede findings',()=>{for(const change of [s=>s.windowDeclaration=null,s=>s.readings[0].basis='',s=>s.readings[0].basisKind='automatic',s=>s.readings.push({...s.readings[0]})]){const s=input();change(s);assert.throws(()=>importTargetWindowCues(s));}});
test('raw replay ignores saved findings',()=>{const s=input();s.report={invented:true};const a=importTargetWindowCues(s);assert.equal(a.report,undefined);assert.deepEqual(importTargetWindowCues(JSON.parse(JSON.stringify(a))),a);});
function study(values,labels){
 const examples=values.map((_,i)=>{
 const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:String(i+1).repeat(64),durationSeconds:10};
 let source=createSequence(clip,{title:'Authored example'});
 for(const n of [1,2]){const image={name:'frame.png',mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};source=appendMoment(source,{id:'m'+n,label:'Moment',visibleState:'Authored',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});}
 source=upsertStep(source,{id:'s',beforeMomentId:'m1',afterMomentId:'m2',title:'Step',intent:'Authored',visibleChange:'Authored',sensoryCue:'',recoveryCue:''});
 return {source,stepId:'s'};
 });
 return {format:CUE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples},cues:values[0].map((_,i)=>({id:'c'+i,label:'Cue',basis:'Authored'})),rows:values.map((v,i)=>({values:v,decision:labels[i],basis:'Authored'}))};
}
