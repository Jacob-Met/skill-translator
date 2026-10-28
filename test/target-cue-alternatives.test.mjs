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
test('partial evidence retains union while unknown reference stays compatible everywhere',()=>{
 const s=input(),before=JSON.stringify(s),r=inspectTargetCueAlternatives(s);
 assert.deepEqual(r.possibleExampleIndexes,[0,1,3]);assert.deepEqual(r.alwaysCompatibleExampleIndexes,[3]);assert.deepEqual(r.excludedExampleIndexes,[2]);assert.equal(r.targetDecisionInferred,false);assert.equal(JSON.stringify(s),before);
});
test('all 64 interpretations match independent direct row filtering and preserve original indices',()=>{
 const s=input([['0','0','0'],['1','2','3'],[null,'1',null],['3',null,'2']]);
 s.alternatives=[0,1,2].map(c=>({cueId:'c'+c,readings:['0','1','2','3'].map(v=>reading('c'+c,v))}));
 const r=inspectTargetCueAlternatives(s);assert.equal(r.interpretations.length,64);
 for(const x of r.interpretations){const allowed=s.target.reference.rows.flatMap((row,i)=>row.values.every((v,c)=>v===null||v===x.choices[c].value)?[i]:[]);assert.deepEqual(x.report.compatibleExampleIndexes,allowed);}
});
test('novel categories keep explicit unsupported interpretations and no fabricated common label',()=>{
 const s=input([['dry'],['damp']]);s.alternatives[0].readings[1].value='novel';const r=inspectTargetCueAlternatives(s);
 assert.deepEqual(r.unsupportedInterpretationIndexes,[1]);assert.deepEqual(r.alwaysCompatibleExampleIndexes,[]);
});
test('explicit combination declaration, source anchoring, unique categories and fixed-reading conflicts are required',()=>{
 for(const mutate of [s=>s.combinationDeclaration='independent probability',s=>s.alternatives[0].readings[1].value=' dry ',s=>s.alternatives[0].readings[0].momentId='missing',s=>s.target.readings=[reading('c0','dry')],s=>s.alternatives[0].readings[0].basis='',s=>s.alternatives[0].readings[0].cueId='c1']){const s=input();mutate(s);assert.throws(()=>importTargetCueAlternatives(s));}
});
test('input-only replay drops derived findings and preserves attributed sources',()=>{
 const s=input();s.interpretations=['invented'];const a=importTargetCueAlternatives(s);assert.equal(a.interpretations,undefined);assert.deepEqual(importTargetCueAlternatives(JSON.parse(JSON.stringify(a))),a);
});
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
