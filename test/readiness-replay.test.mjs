import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadiness,readinessFindings,importReadiness} from '../src/task-readiness.mjs';
import {createPrerequisiteRehearsal} from '../src/prerequisite-rehearsal.mjs';
import {readinessSequenceFixture} from './task-readiness-fixture.mjs';

function fixture(count=8){
  const source=readinessSequenceFixture();
  source.steps=Array.from({length:count},(_,i)=>({...source.steps[0],id:`s${i}`,title:`Step ${i}`}));
  return source;
}
const observe=(stepId,value='pass',checkId='first')=>({type:'observe',stepId,checkId,value,note:'Authored observation',evidenceClass:'authored-example'});
const choose=stepId=>({type:'choose',stepId,prediction:'ready',reason:'Authored readiness prediction'});
function study(source,edges){return createReadiness(source,createPrerequisiteRehearsal(source,edges),source.steps.map(s=>({stepId:s.id,checks:['first','second'].map(id=>({id,prompt:`Check ${id}`,basis:'Declared control'}))})));}

// Independent iterative oracle: compute reachability by repeated edge relaxation,
// then completion in topological ID order. It shares neither the memo nor DFS.
function oracle(input){
 const observations=new Map(input.source.steps.map(s=>[s.id,new Map()])),choices=[];
 const state=()=>{
  const done=new Set(),states=new Map();
  for(const step of input.source.steps){
   const blockedBy=input.prerequisites.dependencies.filter(e=>e.after===step.id&&!done.has(e.before)).map(e=>e.before);
   const checks=input.definitions.find(d=>d.stepId===step.id).checks.map(c=>({...c,observation:observations.get(step.id).get(c.id)||null}));
   const complete=!blockedBy.length&&checks.every(c=>c.observation?.value==='pass');
   if(complete)done.add(step.id);
   states.set(step.id,{stepId:step.id,ready:!blockedBy.length,complete,blockedBy,checks});
  }
  return states;
 };
 for(const [index,e] of input.events.entries()){
  if(e.type==='choose'){
   const s=state().get(e.stepId);choices.push({type:'choice',eventIndex:index,stepId:e.stepId,prediction:e.prediction,reason:e.reason,evidenceReady:s.ready,blockedBy:s.blockedBy,matchesDeclaredEvidence:e.prediction==='uncertain'?null:(e.prediction==='ready')===s.ready});
  }else{
   const reach=new Set([e.stepId]);let changed=true;
   while(changed){changed=false;for(const edge of input.prerequisites.dependencies)if(reach.has(edge.before)&&!reach.has(edge.after)){reach.add(edge.after);changed=true;}}
   reach.delete(e.stepId);
   for(const id of reach)observations.get(id).clear();
   observations.get(e.stepId).set(e.checkId,{value:e.value,note:e.note,evidenceClass:e.evidenceClass,eventIndex:index});
  }
 }
 return {steps:input.definitions.map(d=>state().get(d.stepId)),choices};
}

test('compiled replay agrees with independent mixed-history DAG oracle',()=>{
 let seed=91037;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const source=fixture();
 for(let run=0;run<50;run++){
  const edges=[];for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if(random()<0.4)edges.push({before:`s${i}`,after:`s${j}`,reason:'Declared dependency'});
  for(let i=edges.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[edges[i],edges[j]]=[edges[j],edges[i]];}
  const input=study(source,edges);
  input.events=Array.from({length:150},()=>{const id=`s${Math.floor(random()*8)}`;return random()<0.5?{...choose(id),prediction:['ready','blocked','uncertain'][Math.floor(random()*3)]}:observe(id,['pass','unknown','fail'][Math.floor(random()*3)],random()<0.5?'first':'second');});
  const original=structuredClone(input),expected=oracle(input),actual=readinessFindings(source,input);
  assert.deepEqual(actual.steps,expected.steps);assert.deepEqual(actual.journal.filter(e=>e.type==='choice'),expected.choices);assert.deepEqual(input,original);
 }
});

test('joins retire both checks and preserve direct and transitive witness order',()=>{
 const source=fixture(5),edges=[['s0','s2'],['s2','s4'],['s0','s1'],['s1','s4']].map(([before,after])=>({before,after,reason:'Declared diamond'}));
 const input=study(source,edges);
 for(const s of source.steps)for(const checkId of ['first','second'])input.events.push(observe(s.id,'pass',checkId));
 input.events.push(choose('s4'),observe('s0'),choose('s4'));
 const result=readinessFindings(source,input);
 assert.equal(result.journal[0].evidenceReady,true);
 assert.deepEqual(result.journal[1].stepIds,['s2','s4','s1']);
 assert.deepEqual(result.journal[2].blockedBy,['s2','s1']);
 assert.ok(result.steps.find(s=>s.stepId==='s4').checks.every(c=>c.observation===null));
 assert.equal(result.steps.find(s=>s.stepId==='s3').complete,true);
});

test('no-evidence and cache lifecycle never accept saved findings or leak across calls',()=>{
 const source=fixture(3),input=study(source,[{before:'s0',after:'s1',reason:'Declared dependency'}]);
 const empty=readinessFindings(source,input);assert.deepEqual(empty.steps.map(s=>[s.ready,s.complete]),[[true,false],[false,false],[true,false]]);
 input.events=[observe('s1'),choose('s1'),observe('s0'),choose('s1')];
 const expected=readinessFindings(source,input),mutated=readinessFindings(source,input);
 mutated.steps[0].checks[0].observation.value='fail';mutated.steps[1].blockedBy.length=0;
 assert.deepEqual(readinessFindings(source,input),expected);
 const forged={...input,steps:[{complete:true}],journal:[{evidenceReady:true}],statusMemo:{s1:{complete:true}}};
 assert.deepEqual(importReadiness(source,forged),input);
 assert.deepEqual(readinessFindings(source,forged),expected);
 const before=structuredClone(input);
 assert.throws(()=>readinessFindings(source,{...input,events:[...input.events,{type:'complete',stepId:'s1'}]}),/Unsupported/);
 assert.deepEqual(input,before);
 const changed=structuredClone(source);changed.steps[0].intent='Changed source';assert.throws(()=>readinessFindings(changed,input),/changed/);
});
