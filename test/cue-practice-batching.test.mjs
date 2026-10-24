import fs from 'node:fs';import assert from 'node:assert/strict';
import {createCuePractice,importCuePractice,inspectCuePractice} from './fixtures/cue-practice-before142.mjs';import test from 'node:test';
import {importCuePractice as nextImport,inspectCuePractice as nextInspect} from '../src/cue-practice.mjs';
const replay=(source,value)=>({session:nextImport(source,value),findings:nextInspect(source,value)});
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {attachMomentCalibration} from '../src/demonstration-sequence.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../docs/receipts/decision-practice-20261024/source.json',import.meta.url))).sequence;
const layouts=[[],['pre-recovery'],['pre-sensory'],['pre-recovery','pre-sensory'],['post-recovery'],['post-sensory'],['pre-recovery','post-sensory']];
let cases=0,refusals=0;
function compare(value){let expected,error;try{expected={session:importCuePractice(source,value),findings:inspectCuePractice(source,value)};}catch(e){error=e;}if(error){assert.throws(()=>replay(source,value));refusals++;}else assert.deepEqual(replay(source,value),expected);cases++;}
test('batched replay preserves 847 accepted and refused histories against pinned prior reducer',()=>{
for(const a of layouts)for(const b of layouts){const raw=createCuePractice(source,source.steps.map(s=>s.id),'seen-before');for(const [i,step]of source.steps.entries()){const layout=i?a:b;for(const timing of ['pre','post']){for(const item of layout.filter(k=>k.startsWith(timing)))raw.events.push({type:'request-cue',stepId:step.id,field:item.endsWith('recovery')?'recoveryCue':'sensoryCue'});if(timing==='pre')raw.events.push({type:'answer',stepId:step.id,response:{expectedChange:'',cue:'Inspect',recovery:'',uncertain:true}});}raw.events.push({type:'reveal',stepId:step.id},{type:'reflect',stepId:step.id,comparison:'unsure',note:'',...(i?{reconsideration:{anchors:['sensoryCue'],judgment:'',question:'What was felt?'}}:{})});if(i<source.steps.length-1)raw.events.push({type:'advance',stepId:step.id});}compare(raw);for(let n=0;n<=raw.events.length;n++)compare({...raw,events:raw.events.slice(0,n)});for(const field of ['force','intent'])compare({...raw,events:[{type:'request-cue',stepId:source.steps[0].id,field},...raw.events]});compare({...raw,events:raw.events.filter(e=>e.type!=='answer')});const reversed=structuredClone(raw);reversed.events.reverse();compare(reversed);const forged=structuredClone(raw);for(const e of forged.events)if(e.type==='request-cue'){e.beforeAnswer=false;e.text='Invented';}compare(forged);const wrong=structuredClone(raw);wrong.source.steps[0].intent='Changed';compare(wrong);}
assert.equal(cases,847);assert.equal(refusals,245);
});
test('calibrated source replay stays exact and refuses changed calibration',()=>{
let source=JSON.parse(fs.readFileSync(new URL('../docs/receipts/decision-practice-20261024/source.json',import.meta.url))).sequence;
const moment=source.moments[0],w=moment.image.widthPx,h=moment.image.heightPx;
const task=appendCaptureMark(createCapture(moment.image,[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],100,80,{title:'Authored calibrated source'}),{label:'Guide',kind:'fraction',sourcePx:{x:40,y:30},toleranceMm:2,why:'Software control'});
source=attachMomentCalibration(source,moment.id,task);const id=source.steps[0].id,raw=createCuePractice(source,[id]);raw.events=[{type:'request-cue',stepId:id,field:'recoveryCue'},{type:'answer',stepId:id,response:{expectedChange:'',cue:'Inspect the guide',recovery:'',uncertain:true}}];
assert.deepEqual(replay(source,raw),{session:importCuePractice(source,raw),findings:inspectCuePractice(source,raw)});
const changed=structuredClone(task);changed.landmarks[0].sourcePx.x=41;const updated=attachMomentCalibration(source,moment.id,changed);assert.throws(()=>importCuePractice(updated,raw));assert.throws(()=>replay(updated,raw));});

import {maximumCuePractice} from './fixtures/max-cue-practice.mjs';
test('maximum 24-step text and 143 events remain exact; trailing invalid action refuses',()=>{
 const {source:s,practice}=maximumCuePractice(source);
 assert.equal(practice.events.length,143);
 assert.deepEqual(replay(s,practice),{session:importCuePractice(s,practice),findings:inspectCuePractice(s,practice)});
 assert.equal(nextInspect(s,practice).complete,true);
 for(const importer of [importCuePractice,nextImport])assert.throws(()=>importer(s,{...practice,events:[...practice.events,{type:'answer',stepId:s.steps[23].id,response:{}}]}));
});
