import test from 'node:test';import assert from 'node:assert/strict';
import{createSequence,appendMoment}from'../src/demonstration-sequence.mjs';import{frameOrigin}from'../src/frame-origin.mjs';import{defaultAppearanceRequest,admitAppearanceRequest,inspectAppearanceSamples}from'../src/appearance-pair.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:100,sha256:'a'.repeat(64),durationSeconds:4};let sequence=createSequence(clip,{title:'Authored admission control'});
for(let i=0;i<2;i++){const image={name:'frame.png',mimeType:'image/png',sha256:String(i+1).repeat(64),widthPx:160,heightPx:90,pixelCoordinates:'browser-oriented'};sequence=appendMoment(sequence,{id:'m'+i,label:'Original '+i,image,origin:frameOrigin(clip,i,{mediaTime:i+.1,width:160,height:90},image)});}

import {admitAppearanceValues,inspectAppearanceValues,FORMAT} from '../src/appearance-values-research.mjs';
const row=(s,decision)=>({source:s,request:defaultAppearanceRequest(s,'m0','m1',{widthPx:80,radius:4}),basis:'Authored paired raster control',decision,decisionBasis:'Authored label; not a physical outcome'});
const raw={format:FORMAT,basis:'Common sampled appearance inquiry',references:[row(sequence,'A'),row(sequence,'B')],target:null};
const flat=v=>({widthPx:80,heightPx:45,rgba:Uint8ClampedArray.from({length:80*45*4},(_,i)=>i%4===3?255:v)});
const samples=raw.references.map(()=>({before:flat(20),after:flat(30)}));
test('canonical pair custody retains both frames and ignores forged stored values',()=>{const before=structuredClone(raw);const report=inspectAppearanceValues({...raw,values:[999],inference:{label:'forged'}},samples);assert.deepEqual(report.study,admitAppearanceValues(raw));assert.equal(report.inference,null);assert.deepEqual(raw,before);assert.ok(report.values.every(v=>v.value===0&&v.comparison.alternatives.length===81));});
test('changed source identity and mixed quantity definitions refuse',()=>{for(const change of [r=>r.references[1].request.request.frames[0].sha256='f'.repeat(64),r=>r.references[1].request=defaultAppearanceRequest(sequence,'m0','m1',{widthPx:80,radius:3})]){const r=structuredClone(raw);change(r);assert.throws(()=>admitAppearanceValues(r));}});
test('renamed target cannot manufacture separate evidence',()=>{const target=row(sequence,null);assert.throws(()=>admitAppearanceValues({...raw,target}));});
test('complete sample population and unknown declarations retained',()=>{assert.throws(()=>inspectAppearanceValues(raw,samples.slice(0,1)));const r=structuredClone(raw);r.references[0].decision=null;assert.equal(admitAppearanceValues(r).references[0].decision,null);assert.throws(()=>admitAppearanceValues({...raw,references:[raw.references[0]]}));});
