import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGET_CUE_FORMAT,importTargetCueStudy,inspectTargetCueStudy} from '../src/target-cue-study.mjs';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';

import {TARGET_ALTERNATIVES_FORMAT,importTargetCueAlternatives,inspectTargetCueAlternatives} from '../src/target-cue-alternatives.mjs';
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
test('complete hypotheses exclude marginal crosses without changing independent contract',()=>{const s=coherent(),before=JSON.stringify(s),r=inspectTargetCueHypotheses(s);assert.deepEqual(r.possibleExampleIndexes,[0,1]);assert.deepEqual(r.crossProduct.possibleExampleIndexes,[0,1,2,3]);assert.deepEqual(r.additionalCrossProductExampleIndexes,[2,3]);assert.equal(JSON.stringify(s),before);assert.equal(r.targetDecisionInferred,false);});
test('unknowns and unsupported hypotheses retain explicit witnesses',()=>{const s=coherent([['0','0'],[null,null]]),r=inspectTargetCueHypotheses(s);assert.deepEqual(r.alwaysCompatibleExampleIndexes,[1]);const t=coherent([['0','0'],['0','1']]);assert.deepEqual(inspectTargetCueHypotheses(t).unsupportedHypothesisIds,['h1']);});
test('all 64 independent missing-category populations match explicit row filtering',()=>{for(let mask=0;mask<64;mask++){const rows=Array.from({length:3},(_,i)=>[0,1].map(c=>mask&(1<<(i*2+c))?null:String((i+c)%2))),s=coherent(rows),r=inspectTargetCueHypotheses(s);for(const h of r.interpretations)assert.deepEqual(h.report.compatibleExampleIndexes,rows.flatMap((row,i)=>row.every((v,c)=>v===null||v===h.readings[c].value)?[i]:[]));}});
test('cue order is immaterial while attribution and complete vocabulary are enforced',()=>{const s=coherent();s.hypotheses[1].readings.reverse();assert.deepEqual(inspectTargetCueHypotheses(s).possibleExampleIndexes,[0,1]);for(const mutate of [s=>s.declaration='inferred',s=>s.hypotheses[1].readings.pop(),s=>s.hypotheses[1].id='h0',s=>s.hypotheses[0].basis='',s=>s.hypotheses[0].readings[0].momentId='made-up',s=>s.hypotheses[1].readings=s.hypotheses[0].readings]){const t=coherent();mutate(t);assert.throws(()=>importTargetCueHypotheses(t));}});
test('source-only replay drops findings and fixed-reading conflicts refuse',()=>{const s=coherent();s.interpretations=['fake'];const a=importTargetCueHypotheses(s);assert.equal(a.interpretations,undefined);assert.deepEqual(importTargetCueHypotheses(JSON.parse(JSON.stringify(a))),a);s.target.readings=[reading('c0','0')];assert.throws(()=>importTargetCueHypotheses(s));});

test('same categorical vector retains separate original frame attribution without extra categorical vote',()=>{const s=coherent(),h=structuredClone(s.hypotheses[0]);h.id='other-frame';h.readings.forEach(r=>r.momentId='m2');s.hypotheses.push(h);const r=inspectTargetCueHypotheses(s);assert.equal(r.interpretations.length,3);assert.equal(r.categoricalVectors.length,2);assert.deepEqual(r.categoricalVectors[0].hypothesisIds,['h0','other-frame']);assert.equal(r.crossProductProvenance.find(p=>p.cueId==='c0'&&p.value==='0').attributions.length,2);assert.deepEqual(r.possibleExampleIndexes,[0,1]);});
