import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCueBudget,createCueBudgetPlan,importCueBudgetPlan,recordCueBudgetReading} from '../src/cue-budget.mjs';
import {study} from './cue-budget-fixture.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('an unaffordable complete plan still exposes useful partial discrimination', () => {
  const source=study([['0','0'],['0','1'],['1','0'],['1','1']],['A','B','C','D']);
  const saved=structuredClone(source);
  const zero=inspectCueBudget(source,[],0),one=inspectCueBudget(source,[],1),two=inspectCueBudget(source,[],2);
  assert.equal(zero.worstRemainingLabels,4);assert.equal(zero.worstQuestionsUsed,0);
  assert.equal(one.completePlanQuestions,2);assert.equal(one.worstRemainingLabels,2);
  assert.equal(one.status,'partial-discrimination');assert.deepEqual(one.bestFirstCueIds,['c0','c1']);
  assert.equal(two.worstRemainingLabels,1);assert.equal(two.worstQuestionsUsed,2);
  assert.deepEqual(source,saved);
  assert.equal(inspectCueBudget(source,[{cueId:'c0',value:'1'}],1).worstRemainingLabels,1);
});

test('independent exhaustive policy oracle over held-back tables and all budgets', () => {
  let seed=721;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let trial=0;trial<90;trial++){
    const values=Array.from({length:4},()=>Array.from({length:3},()=>random()%5===0?null:String(random()%3)));
    const labels=['A','B','C',trial%2?'A':'D'];
    // Enumerate attainable policy pairs. Keep every nondominated pair rather
    // than choosing one child optimum before composing a parent policy.
    function oracle(rows,cues,budget){
      const stop=[new Set(rows.map(i=>labels[i])).size,0];let candidates=[stop];
      if(!budget)return candidates;
      for(const cue of cues){
        const answers=[...new Set(rows.map(i=>values[i][cue]).filter(x=>x!==null))];
        if(rows.some(i=>values[i][cue]===null))answers.push('other');
        const children=answers.map(answer=>oracle(rows.filter(i=>values[i][cue]===null||values[i][cue]===answer),cues.filter(c=>c!==cue),budget-1));
        let combinations=[[0,0]];
        for(const choices of children)combinations=combinations.flatMap(a=>choices.map(b=>[Math.max(a[0],b[0]),Math.max(a[1],b[1])]));
        candidates.push(...combinations.map(([labels,used])=>[labels,used+1]));
      }
      candidates=[...new Map(candidates.map(pair=>[JSON.stringify(pair),pair])).values()];
      return candidates.filter(a=>!candidates.some(b=>b[0]<=a[0]&&b[1]<=a[1]&&(b[0]<a[0]||b[1]<a[1])));
    }
    let previous=[Infinity,Infinity];
    for(let budget=0;budget<=3;budget++){
      const expected=oracle([0,1,2,3],[0,1,2],budget).sort((a,b)=>a[0]-b[0]||a[1]-b[1])[0];
      const result=inspectCueBudget(study(values,labels),[],budget);
      assert.deepEqual([result.worstRemainingLabels,result.worstQuestionsUsed],expected);
      assert.ok(result.worstRemainingLabels<previous[0] || (result.worstRemainingLabels===previous[0]&&result.worstQuestionsUsed<=previous[1]));previous=[result.worstRemainingLabels,result.worstQuestionsUsed];
    }
  }
});

test('unknown categories overlap branches, unknown decisions and novel readings never succeed',()=>{
  const source=study([[null,'0'],['A','1'],['B','2']],['left','middle','right']);
  const r=inspectCueBudget(source,[],1);
  const q=r.questions.find(q=>q.cueId==='c0');
  assert.deepEqual(q.outcomes.map(b=>b.exampleIndexes),[[0,1],[0,2],[0]]);
  assert.equal(r.worstRemainingLabels,1);
  source.rows[0].decision=null;
  assert.equal(inspectCueBudget(source,[],2).status,'unknown-decision');
  assert.equal(inspectCueBudget(source,[],2).worstRemainingLabels,null);
  const known=study([['0'],['1']],['A','B']);
  assert.equal(inspectCueBudget(known,[{cueId:'c0',value:'novel'}],1).status,'outside-retained-evidence');
});

test('stopping beats redundant questions and changed declarations recompute',()=>{
  const source=study([['same'],['same']],['A','B']);
  assert.equal(inspectCueBudget(source,[],8).worstQuestionsUsed,0);
  assert.deepEqual(inspectCueBudget(source,[],8).bestFirstCueIds,[]);
  source.rows[1].values[0]='different';
  assert.equal(inspectCueBudget(source,[],1).worstRemainingLabels,1);
  for(const budget of [-1,9,0.5,'1',NaN])assert.throws(()=>inspectCueBudget(source,[],budget));
  assert.throws(()=>inspectCueBudget(source,[{cueId:'missing',value:'x'}],1));
  assert.throws(()=>inspectCueBudget(source,[{cueId:'c0',value:'same'},{cueId:'c0',value:'same'}],1));
});

test('source-only plan replay refuses changed metadata and ignores derived rankings',()=>{
  const source=study([['0'],['1']],['A','B']),plan=createCueBudgetPlan(source,[],1);
  assert.deepEqual(importCueBudgetPlan({...plan,report:{worstRemainingLabels:0}},source),plan);
  const changed=structuredClone(source);changed.rows[0].decision='different';
  assert.throws(()=>importCueBudgetPlan(plan,changed),/changed/);
  const imageChanged=structuredClone(source);imageChanged.comparison.examples[0].source.moments[0].image.sha256='a'.repeat(64);
  assert.throws(()=>importCueBudgetPlan(plan,imageChanged));
  assert.throws(()=>importCueBudgetPlan({...plan,readings:undefined}));
});

test('actual CLI save/reopen recomputes and matching-source failure emits no result',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'cue-budget-'));
  try {
    const source=study([['0','0'],['0','1'],['1','0'],['1','1']],['A','B','C','D']);
    const original=join(dir,'source.json'),saved=join(dir,'report.json'),changed=join(dir,'changed.json');
    await writeFile(original,JSON.stringify(source));
    const cli=fileURLToPath(new URL('../tools/inspect-cue-budget.mjs',import.meta.url));
    const run=(...args)=>{const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});if(result.error)throw result.error;return result;};
    const first=run(original,'1');assert.equal(first.status,0,first.stderr);
    const report=JSON.parse(first.stdout);assert.equal(report.report.worstRemainingLabels,2);
    report.report={status:'fake-success',worstRemainingLabels:0};await writeFile(saved,JSON.stringify(report));
    const reopen=run(saved);assert.equal(reopen.status,0,reopen.stderr);
    assert.equal(JSON.parse(reopen.stdout).report.worstRemainingLabels,2);
    const acquired=run(saved,'--read','c0','1');assert.equal(acquired.status,0,acquired.stderr);
    const actual=JSON.parse(acquired.stdout);assert.equal(actual.input.budget,0);
    assert.deepEqual(actual.report.compatibleExampleIndexes,[2,3]);
    const more=run(saved,'2',original);assert.equal(more.status,0,more.stderr);
    assert.equal(JSON.parse(more.stdout).report.worstRemainingLabels,1);
    source.rows[0].decision='changed';await writeFile(changed,JSON.stringify(source));
    const refused=run(saved,'2',changed);assert.equal(refused.status,1);assert.equal(refused.stdout,'');assert.match(refused.stderr,/changed/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

// Independent review exposed this plateau counterexample to branch-local ties.
test('more budget cannot worsen the minimum questions at the same ambiguity',()=>{
  const source=study([['a','0'],['a','1'],['a','2'],['b','0'],['b','0'],['b','0']],['A','B','C','D','E','F']);
  for(const budget of [1,2,8]){
    const report=inspectCueBudget(source,[],budget);
    assert.equal(report.worstRemainingLabels,3);assert.equal(report.worstQuestionsUsed,1);
    assert.deepEqual(report.bestFirstCueIds,['c0']);
    const first=report.questions.find(q=>q.cueId==='c0');
    assert.equal(first.worstQuestionsUsed,1);
    assert.ok(first.outcomes.every(o=>o.remainingQuestionsUsed===0&&o.nextCueIds.length===0));
  }
});

test('a supplied category advances the plan without mutating accepted evidence',()=>{
  const source=study([['0','0'],['0','1'],['1','0'],['1','1']],['A','B','C','D']);
  const plan=createCueBudgetPlan(source,[],2),before=structuredClone(plan);
  const one=recordCueBudgetReading(plan,{cueId:'c0',value:'1'});
  assert.equal(one.budget,1);assert.deepEqual(one.readings,[{cueId:'c0',value:'1'}]);
  assert.deepEqual(inspectCueBudget(one.study,one.readings,one.budget).compatibleExampleIndexes,[2,3]);
  const two=recordCueBudgetReading(one,{cueId:'c1',value:'0'});
  assert.equal(two.budget,0);assert.deepEqual(inspectCueBudget(two.study,two.readings,two.budget).retainedLabels,['C']);
  assert.deepEqual(plan,before);
  assert.throws(()=>recordCueBudgetReading(one,{cueId:'c0',value:'0'}));
  assert.throws(()=>recordCueBudgetReading(two,{cueId:'c1',value:'1'}),/budget/);
  const outside=recordCueBudgetReading(plan,{cueId:'c0',value:'unseen'});
  assert.equal(inspectCueBudget(outside.study,outside.readings,outside.budget).status,'outside-retained-evidence');
});
