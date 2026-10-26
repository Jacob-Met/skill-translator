import test from 'node:test';
import assert from 'node:assert/strict';
import {createCueQuestionInspector,inspectCueQuestions,inspectCueEffort} from '../src/cue-questions.mjs';
import {study} from './cue-budget-fixture.mjs';

const profile=()=>({format:'skill-translator.cue-question-plan/v1',cues:[
 {cueId:'c0',available:true,effort:2,basis:'Authored first-cue conditions'},
 {cueId:'c1',available:true,effort:3,basis:'Authored second-cue conditions'}
]});

for(const weighted of [false,true]){
 test(`reused ${weighted?'effort':'question'} inspector isolates admitted data and returned reports`,()=>{
  const source=study([[null,'0'],['A','1'],['B','1']],['left','middle','right']);
  const plan=weighted?profile():null;
  const savedSource=structuredClone(source),savedPlan=structuredClone(plan);
  const expected=readings=>weighted?inspectCueEffort(savedSource,readings,savedPlan):inspectCueQuestions(savedSource,readings);
  const inspect=createCueQuestionInspector(source,plan);
  const first=inspect();assert.deepEqual(first,expected([]));
  // The reusable interface must not give a caller write access to its memo.
  first.questions[0].outcomes[0].exampleIndexes.push(999);
  first.questions[0].outcomes[0].answer='changed returned answer';
  first.questions.length=0;first.retainedLabels.push('invented');
  first.compatibleExampleIndexes.length=0;first.bestFirstCueIds.push('invented');
  first.readings.push({cueId:'invented',value:'invented'});
  if(weighted){first.plan.cues[0].effort=999;first.plan.cues[0].available=false;}
  assert.deepEqual(inspect(),expected([]));
  const child=[{cueId:'c0',value:' A '}];
  assert.deepEqual(inspect(child),expected(child));
  // A session uses the source and declarations admitted when it was prepared.
  source.rows[0].decision='changed';source.rows[0].values[0]='changed';
  source.cues[0].id='changed';source.cues.push({id:'extra',label:'Extra',basis:'Changed'});
  if(plan){plan.cues[0].effort=1000;plan.cues[0].available=false;plan.cues.reverse();}
  assert.deepEqual(inspect(),expected([]));
  assert.deepEqual(inspect(child),expected(child));
 });

 test(`reused ${weighted?'effort':'question'} inspector recovers after rejected readings`,()=>{
  const source=study([['A','0'],['B','1'],[null,'1']],['left','middle','right']);
  const plan=weighted?profile():null,inspect=createCueQuestionInspector(source,plan);
  const expected=weighted?inspectCueEffort(source,[],plan):inspectCueQuestions(source,[]);
  for(const readings of [null,[{cueId:'c0',value:'A'},{cueId:'c0',value:'B'}],[{cueId:'c0',value:'A'},{cueId:'c1',value:''}]]){
   const oneShot=()=>weighted?inspectCueEffort(source,readings,plan):inspectCueQuestions(source,readings);
   let original;try{oneShot();}catch(error){original=error;}
   assert.ok(original,'one-shot inspector must reject the control');
   assert.throws(()=>inspect(readings),error=>error.name===original.name&&error.message===original.message);
   assert.deepEqual(inspect(),expected,'a refusal must not affect the next valid reading state');
  }
 });
}
