import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadiness,recordReadiness,importReadiness,readinessFindings} from '../src/task-readiness.mjs';
import {readinessSequenceFixture} from './task-readiness-fixture.mjs';
import {createPrerequisiteRehearsal} from '../src/prerequisite-rehearsal.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {attachMomentCalibration,momentTask} from '../src/demonstration-sequence.mjs';
import {createPractice} from '../src/practice.mjs';

const definitions=source=>source.steps.map(s=>({stepId:s.id,checks:[{id:'done',prompt:'Result',basis:'Authored'}]}));
const prerequisite=source=>createPrerequisiteRehearsal(source,[{before:'prepare',after:'align',reason:'Authored support'}]);
const event=i=>i%2?{type:'choose',stepId:'align',prediction:'ready',reason:'  Authored judgment  '}:{type:'observe',stepId:'prepare',checkId:'done',value:'pass',note:'  Authored observation  ',evidenceClass:'authored-example'};
// The original public composition remains a differential reference, independent
// of the append entry point and without shipping an old production module.
const reference=(source,input,addition)=>{const accepted=importReadiness(source,input);return importReadiness(source,{...accepted,events:[...accepted.events,addition]});};
const error=fn=>{try{fn();assert.fail('Expected refusal');}catch(e){if(e.code==='ERR_ASSERTION')throw e;return {name:e.name,message:e.message};}};

test('one append preserves every manual prefix, canonical whitespace and raw input',()=>{
 const source=readinessSequenceFixture(),input=createReadiness(source,prerequisite(source),definitions(source));
 for(let n=0;n<500;n++){
  const addition={...event(n),forgedResult:{complete:true}},before=structuredClone(input),beforeEvent=structuredClone(addition);
  const result=recordReadiness(source,input,addition);
  assert.deepEqual(result,reference(source,input,addition));assert.deepEqual(input,before);assert.deepEqual(addition,beforeEvent);
  assert.equal(result.events.at(-1).forgedResult,undefined);
  input.events.push(addition);
 }
 assert.equal(importReadiness(source,input).events.length,500);
});

test('computed practice append preserves pass/fail/missing evidence and downstream retirement',()=>{
 let source=readinessSequenceFixture();const moment=source.moments[1];
 let capture=createCapture(moment.image,[{x:0,y:0},{x:319,y:0},{x:319,y:179},{x:0,y:179}],100,100,{origin:moment.origin});
 capture=appendCaptureMark(capture,{label:'Reference',sourcePx:{x:159.5,y:89.5},kind:'fraction',toleranceMm:1});
 source=attachMomentCalibration(source,moment.id,capture);
 const defs=definitions(source);defs[0].checks[0].placement={widthMm:100,heightMm:100};
 const input=createReadiness(source,prerequisite(source),defs),session=createPractice(momentTask(source,moment.id),100,100),values=new Set();
 for(let i=0;i<50;i++){
  const raw=structuredClone(session);if(i%3)raw.attempts=[{id:'authored-1',xMm:i%2?50:60,yMm:50}];raw.forgedDerived={passed:true};
  const addition=i%4===3?{type:'choose',stepId:'align',prediction:'ready',reason:'Judgment'}:{type:'practice',stepId:'prepare',checkId:'done',note:' Original practice ',session:raw};
  const before=structuredClone(input),a=recordReadiness(source,input,addition);assert.deepEqual(a,reference(source,input,addition));assert.deepEqual(input,before);
  const observation=readinessFindings(source,a).steps.find(s=>s.stepId==='prepare').checks[0].observation;if(observation)values.add(observation.value);
  if(addition.type==='practice')assert.equal(a.events.at(-1).session.forgedDerived,undefined);
  input.events.push(addition);
 }
 assert.deepEqual([...values].sort(),['fail','pass','unknown']);
 // Four individually admitted padded sessions fit the original raw budget.
 // Their ignored fields disappear before the old append replay counts bytes.
 const padded=()=>({...structuredClone(session),ignoredPadding:'x'.repeat(900000)});
 const paddingEvent=()=>({type:'practice',stepId:'prepare',checkId:'done',note:'Padded raw original',session:padded()});
 const paddedHistory={...input,events:Array.from({length:4},paddingEvent)},newPadded=paddingEvent();
 const compact=recordReadiness(source,paddedHistory,newPadded);
 assert.deepEqual(compact,reference(source,paddedHistory,newPadded));assert.equal(compact.events.length,5);
 assert.ok(compact.events.every(e=>e.session.ignoredPadding===undefined));
 const rawOverflow={...paddedHistory,events:[...paddedHistory.events,paddingEvent()]};
 assert.deepEqual(error(()=>recordReadiness(source,rawOverflow,newPadded)),error(()=>reference(source,rawOverflow,newPadded)));
 assert.match(error(()=>recordReadiness(source,rawOverflow,newPadded)).message,/4 MB/);
 const tooLarge=paddingEvent();tooLarge.session.ignoredPadding='x'.repeat(1000000);
 assert.deepEqual(error(()=>recordReadiness(source,paddedHistory,tooLarge)),error(()=>reference(source,paddedHistory,tooLarge)));
 assert.match(error(()=>recordReadiness(source,paddedHistory,tooLarge)).message,/1 MB/);
 const withChild=recordReadiness(source,input,{type:'observe',stepId:'align',checkId:'done',value:'pass',note:'Retained downstream result',evidenceClass:'authored-example'});
 const revisedEvent={type:'practice',stepId:'prepare',checkId:'done',note:'Missing placements on recheck',session};
 const revised=recordReadiness(source,withChild,revisedEvent);
 assert.deepEqual(revised,reference(source,withChild,revisedEvent));
 assert.equal(readinessFindings(source,revised).steps.find(s=>s.stepId==='align').checks[0].observation,null);
 assert.deepEqual(readinessFindings(source,revised).journal.at(-1).stepIds,['align']);
 const badSession=structuredClone(session);badSession.reference.target.widthMm=99;
 const wrong={type:'practice',stepId:'prepare',checkId:'done',note:'Wrong source',session:badSession};
 assert.deepEqual(error(()=>recordReadiness(source,input,wrong)),error(()=>reference(source,input,wrong)));
 const plain={type:'observe',stepId:'prepare',checkId:'done',value:'pass',note:'Bypass practice',evidenceClass:'reported-observation'};
 assert.deepEqual(error(()=>recordReadiness(source,input,plain)),error(()=>reference(source,input,plain)));
});

test('original-journal refusal precedes appended-event and capacity refusals',()=>{
 const source=readinessSequenceFixture(),base=createReadiness(source,prerequisite(source),definitions(source));
 for(const size of [0,499,500,501]){
  const input={...base,events:Array.from({length:size},(_,i)=>event(i))};
  for(const addition of [undefined,null,{},event(0),{...event(0),stepId:'foreign'}]){
   if(size<500&&addition?.stepId==='prepare'){assert.deepEqual(recordReadiness(source,input,addition),reference(source,input,addition));continue;}
   assert.deepEqual(error(()=>recordReadiness(source,input,addition)),error(()=>reference(source,input,addition)));
  }
 }
 for(const size of [1,500]){
  const input={...base,events:Array.from({length:size},(_,i)=>event(i))};input.events[0]={type:'unsupported',stepId:'prepare'};
  for(const addition of [undefined,event(1)]){
   const actual=error(()=>recordReadiness(source,input,addition));assert.match(actual.message,/Unsupported readiness journal action/);assert.deepEqual(actual,error(()=>reference(source,input,addition)));
  }
 }
 const changed=structuredClone(source);changed.steps[0].intent='Changed source';
 assert.deepEqual(error(()=>recordReadiness(changed,base,undefined)),error(()=>reference(changed,base,undefined)));
 assert.deepEqual(error(()=>recordReadiness(source,{...base,format:'wrong'},undefined)),error(()=>reference(source,{...base,format:'wrong'},undefined)));
});
