import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGET_CUE_FORMAT,importTargetCueStudy,inspectTargetCueStudy} from '../src/target-cue-study.mjs';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
function target(){const reference=study([['0'],['1']],['A','B']),source=structuredClone(reference.comparison.examples[0].source);source.clip.sha256='f'.repeat(64);source.moments.forEach(m=>m.origin.clip.sha256=source.clip.sha256);return{format:TARGET_CUE_FORMAT,reference,target:{source,stepId:'s'},readings:[]};}
test('separate source-backed reading filters reference records without fitting or inferring target action',()=>{const s=target();s.readings=[{cueId:'c0',value:'0',momentId:'m1',basisKind:'visible-category',basis:'Observer category from retained before frame'}];const before=JSON.stringify(s),r=inspectTargetCueStudy(s);assert.deepEqual(r.report.compatibleExampleIndexes,[0]);assert.equal(r.referenceWasRefitted,false);assert.equal(r.targetDecisionInferred,false);assert.equal(r.readings[0].frame.image.sha256,s.target.source.moments[0].image.sha256);assert.equal(JSON.stringify(s),before);});
test('target evidence cannot be a renamed copy of reference before/after evidence',()=>{const s=target();s.target.source=structuredClone(s.reference.comparison.examples[0].source);s.target.source.steps[0].id='renamed';s.target.stepId='renamed';assert.throws(()=>importTargetCueStudy(s),/separate/);});
test('unknown/unrecorded categories remain reference evidence states rather than target labels',()=>{const s=target();s.readings=[{cueId:'c0',value:'novel',momentId:'m2',basisKind:'supplied-account',basis:'Author supplied category'}];const r=inspectTargetCueStudy(s);assert.equal(r.report.status,'outside-retained-evidence');assert.deepEqual(r.report.retainedLabels,[]);assert.equal(r.targetDecisionInferred,false);});
test('attribution, unique cues and source-frame anchors are admitted before findings',()=>{for(const patch of [r=>r.momentId='missing',r=>r.basis='',r=>r.basisKind='automatic',r=>r.cueId='missing']){const s=target();const row={cueId:'c0',value:'0',momentId:'m1',basisKind:'visible-category',basis:'Authored control'};patch(row);s.readings=[row];assert.throws(()=>importTargetCueStudy(s));}const s=target();s.readings=[{cueId:'c0',value:'0',momentId:'m1',basisKind:'visible-category',basis:'Authored'}];s.readings.push({...s.readings[0]});assert.throws(()=>importTargetCueStudy(s));});
test('raw replay retains separate complete sources and ignores saved findings',()=>{const s=target();s.report={invented:'A'};const accepted=importTargetCueStudy(s);assert.equal(accepted.report,undefined);assert.deepEqual(importTargetCueStudy(JSON.parse(JSON.stringify(accepted))),accepted);});
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
