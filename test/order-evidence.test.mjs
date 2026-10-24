import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createOrderStudy as create,importOrderStudy as reopen,orderEvidenceFindings as inspect,declareOrderPrerequisites as declare} from '../src/order-evidence.mjs';
function source(hash='a',overlap=false){
 const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:hash.repeat(64),durationSeconds:10};
 let s=createSequence(clip,{title:'Authored temporal control'});
 for(const n of [1,2,3,4]){
  const image={name:`frame-${n}.png`,mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};
  s=appendMoment(s,{id:`m${n}`,label:`Frame ${n}`,image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});
 }
 s=upsertStep(s,{id:'a',beforeMomentId:'m1',afterMomentId:overlap?'m3':'m2',title:'Repeated label',intent:'Declared account A'});
 return upsertStep(s,{id:'b',beforeMomentId:'m2',afterMomentId:'m4',title:'Repeated label',intent:'Declared account B'});
}
const matches=[{referenceStepId:'a',comparisonStepId:'a'},{referenceStepId:'b',comparisonStepId:'b'}];
const comparison=(s,m=matches)=>({id:'example',label:'Another authored control',sequence:s,matches:m});
test('two explicit correspondences yield chronology; changing one mapping yields opposite-order witnesses',()=>{
 const a=source(),b=source('b'),first=inspect(create(a,[comparison(b)])).pairs[0];
 assert.deepEqual(first.candidate,{before:'a',after:'b'});
 const swapped=inspect(create(a,[comparison(b,[{referenceStepId:'a',comparisonStepId:'b'},{referenceStepId:'b',comparisonStepId:'a'}])])).pairs[0];
 assert.equal(swapped.candidate,null);assert.equal(swapped.oppositeOrders,true);
 assert.deepEqual(swapped.witnesses.map(w=>w.relation),['a-before-b','b-before-a']);
});
test('overlap, missing mappings and a single example do not manufacture a stable candidate',()=>{
 for(const study of [create(source()),create(source(),[comparison(source('b',true))]),create(source(),[comparison(source('b'),matches.slice(0,1))])]){
  const p=inspect(study).pairs[0];assert.equal(p.candidate,null);assert.equal(p.unresolved,true);
 }
});
test('shared endpoint is explicitly at-or-before and witnesses retain original frame ids and times',()=>{
 const p=inspect(create(source(),[comparison(source('b'))])).pairs[0];
 assert.equal(p.witnesses[0].a.end,p.witnesses[0].b.start);
 assert.deepEqual(p.witnesses[1].a,{stepId:'a',beforeMomentId:'m1',afterMomentId:'m2',start:1,end:2});
});
test('repeated labels never imply a correspondence and duplicate targets refuse',()=>{
 const a=source(),b=source('b');assert.equal(inspect(create(a,[comparison(b,[])])).pairs[0].witnesses[1].relation,'unmapped');
 for(const m of [[matches[0],matches[0]],[matches[0],{referenceStepId:'b',comparisonStepId:'a'}],[{referenceStepId:'bad',comparisonStepId:'a'}]])assert.throws(()=>create(a,[comparison(b,m)]));
});
test('same retained evidence refuses even after renaming authored labels',()=>{
 const a=source(),renamed=structuredClone(a);renamed.title='Renamed';renamed.steps[0].title='Renamed too';assert.throws(()=>create(a,[comparison(renamed)]));
});
test('source-bound reopen recomputes forged findings and requires explicit comparisons',()=>{
 const study=create(source(),[comparison(source('b'))]);assert.deepEqual(reopen({...JSON.parse(JSON.stringify(study)),pairs:[],candidate:'fake'}),study);
 const broken=structuredClone(study);delete broken.comparisons;assert.throws(()=>reopen(broken));
 assert.throws(()=>create(study.reference,Array(8).fill(study.comparisons[0])));
});
test('explicit adoption uses maintained DAG contract; unsupported edges and missing reasons refuse',()=>{
 const study=create(source(),[comparison(source('b'))]),before=JSON.stringify(study);
 const lesson=declare(study,[{before:'a',after:'b',reason:'  Expert-supplied requirement  ',ignored:'extra'}]);
 assert.equal(lesson.attempt,null);assert.deepEqual(lesson.source,study.reference);
 assert.deepEqual(lesson.dependencies,[{before:'a',after:'b',reason:'Expert-supplied requirement'}]);
 assert.throws(()=>declare(study,[{before:'b',after:'a',reason:'Wrong direction'}]));
 assert.throws(()=>declare(study,[{before:'a',after:'b',reason:''}]));
 assert.throws(()=>declare(study,[]));assert.equal(JSON.stringify(study),before);
});

test('reordering equal-start interval witnesses does not create another source',()=>{
 const first=source();first.steps[1].beforeMomentId='m1';
 const reordered=structuredClone(first);reordered.steps.reverse();
 assert.throws(()=>create(first,[comparison(reordered)]),/already included/);
});
