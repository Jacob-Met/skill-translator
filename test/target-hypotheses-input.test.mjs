import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGET_CUE_FORMAT,importTargetCueStudy,inspectTargetCueStudy} from '../src/target-cue-study.mjs';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';

import {TARGET_ALTERNATIVES_FORMAT,importTargetCueAlternatives,inspectTargetCueAlternatives} from '../src/target-cue-alternatives.mjs';

import {readFile} from 'node:fs/promises';
function input(values=[['dry'],['damp'],['wet'],[null]]){
 const reference=study(values,values.map((_,i)=>'label'+i)),source=structuredClone(reference.comparison.examples[0].source);source.clip.sha256='f'.repeat(64);source.moments.forEach(m=>m.origin.clip.sha256=source.clip.sha256);
 return{format:TARGET_ALTERNATIVES_FORMAT,target:{format:TARGET_CUE_FORMAT,reference,target:{source,stepId:'s'},readings:[]},combinationDeclaration:'all-combinations',alternatives:[{cueId:'c0',readings:['dry','damp'].map(value=>reading('c0',value))}]};
}
function reading(cueId,value){return{cueId,value,momentId:'m1',basisKind:'visible-category',basis:'Observer supplied alternative from original retained frame'};}
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

import {TARGET_HYPOTHESES_FORMAT,importTargetCueHypotheses,inspectTargetCueHypotheses} from '../src/target-cue-hypotheses.mjs';
function coherent(values=[['0','0'],['1','1'],['0','1'],['1','0']]){const original=input(values);return{format:TARGET_HYPOTHESES_FORMAT,declaration:'only-listed-complete-hypotheses',target:original.target,hypotheses:[['0','0'],['1','1']].map((vs,i)=>({id:'h'+i,basis:'Authored whole-reading possibility',readings:vs.map((v,c)=>reading('c'+c,v))}))};}

const source=(await readFile(new URL('../web/target-hypotheses-input.mjs',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
function adapter({read=async raw=>({study:JSON.parse(await raw.text()).study,referenceSources:[],targetSource:{}}),write=async()=>new Blob(['{}']),release=()=>{}}={}){return new Function('importTargetCueHypotheses','readTargetCueBundle','makeTargetCueBundle','releaseTargetCueBundle',source+';return {readTargetHypothesesBundle,makeTargetHypothesesBundle};')(importTargetCueHypotheses,read,write,release);}
const file=raw=>new File([JSON.stringify(raw)],'source.json');
function bundle(){const study=importTargetCueHypotheses(coherent());return {format:'skill-translator.target-cue-hypotheses-bundle/v1',study,original:{format:'skill-translator.target-cue-bundle/v1',study:study.target,framesControl:'original bytes retained by delegated reader'}};}
test('wrapper binds exact normalized original study before decoder invocation',async()=>{let calls=0;const a=adapter({read:async()=>{calls++;throw Error('decoder control');}}),b=bundle();b.original.study=structuredClone(b.original.study);b.original.study.target.source.steps[0].intent='swapped';await assert.rejects(a.readTargetHypothesesBundle(file(b)),/differs/);assert.equal(calls,0);});
test('raw source-only replay preserves every support-distinct hypothesis and delegates exact carrier',async()=>{const b=bundle(),h=structuredClone(b.study.hypotheses[0]);h.id='other';h.readings.forEach(r=>r.momentId='m2');b.study.hypotheses.push(h);let received;const a=adapter({read:async f=>{received=JSON.parse(await f.text());return{study:received.study,referenceSources:[],targetSource:{}};},write:async()=>new Blob([JSON.stringify(b.original)])});const loaded=await a.readTargetHypothesesBundle(file(b));assert.deepEqual(received,b.original);const saved=JSON.parse(await(await a.makeTargetHypothesesBundle(loaded.hypothesesStudy,loaded)).text());assert.deepEqual(saved.study.hypotheses,b.study.hypotheses);assert.deepEqual(saved.original,b.original);assert.equal(saved.study.interpretations,undefined);});
test('abort before decoder and after loaded admission retires acquired assets',async()=>{let calls=0,released=0;const c=new AbortController();c.abort();const a=adapter({read:async()=>{calls++;}});await assert.rejects(a.readTargetHypothesesBundle(file(bundle()),{signal:c.signal}),/replaced/);assert.equal(calls,0);const d=new AbortController(),b=adapter({read:async()=>{d.abort();return{originalAsset:true};},release:x=>{if(x?.originalAsset)released++;}});await assert.rejects(b.readTargetHypothesesBundle(file(bundle()),{signal:d.signal}),/replaced/);assert.equal(released,1);});
test('bounded file refuses before reading contents',async()=>{let read=false;await assert.rejects(adapter().readTargetHypothesesBundle({size:49*1024*1024,text(){read=true;}}),/48 MB/);assert.equal(read,false);});
