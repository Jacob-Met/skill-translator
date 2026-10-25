import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCueBudget,inspectCueEffortBudget as inspect,createCueBudgetPlan,importCueBudgetPlan,recordCueBudgetReading,CUE_EFFORT_BUDGET_FORMAT} from '../src/cue-budget.mjs';
import {study} from './cue-budget-fixture.mjs';
const profile=costs=>({format:'skill-translator.cue-question-plan/v1',cues:costs.map((cost,i)=>({cueId:'c'+i,available:cost!==null,effort:cost??1,basis:'Authored acquisition conditions'}))});

test('partial budget supports cheap observations before an expensive complete question',()=>{
 const source=study([['A','0','0'],['B','0','1'],['C','1','0'],['D','1','1']],['A','B','C','D']);
 for(const [budget,labels,effort,first] of [[0,4,0,[]],[2,2,2,['c1','c2']],[3,2,2,['c1','c2']],[4,1,4,['c1','c2']],[10,1,4,['c1','c2']]]){
  const r=inspect(source,[],budget,profile([10,2,2]));
  assert.deepEqual([r.worstRemainingLabels,r.worstEffort,r.bestFirstCueIds],[labels,effort,first]);
 }
 assert.equal(inspect(source,[],10,profile([10,null,2])).worstEffort,10);
 assert.equal(inspect(source,[],8,profile([10,null,2])).worstRemainingLabels,2);
 assert.equal(inspect(source,[],20,profile([null,null,null])).worstEffort,0);
});

test('independent weighted policy-frontier oracle covers changed effort and unavailable cues',()=>{
 let seed=314159;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let trial=0;trial<70;trial++){
  const values=Array.from({length:4},()=>Array.from({length:3},()=>random()%5===0?null:String(random()%3)));
  const labels=['A','B','C','D'],costs=Array.from({length:3},()=>random()%5===0?null:1+random()%7);
  function oracle(rows,cues,budget){
   const candidates=[[new Set(rows.map(i=>labels[i])).size,0]];
   for(const cue of cues){if(costs[cue]===null||costs[cue]>budget)continue;
    const answers=[...new Set(rows.map(i=>values[i][cue]).filter(x=>x!==null))];
    if(rows.some(i=>values[i][cue]===null))answers.push('other');
    let combinations=[[0,0]];
    for(const answer of answers){const children=oracle(rows.filter(i=>values[i][cue]===null||values[i][cue]===answer),cues.filter(c=>c!==cue),budget-costs[cue]);
     combinations=combinations.flatMap(a=>children.map(b=>[Math.max(a[0],b[0]),Math.max(a[1],b[1])]));}
    candidates.push(...combinations.map(([n,c])=>[n,c+costs[cue]]));
   }
   const unique=[...new Map(candidates.map(p=>[JSON.stringify(p),p])).values()];
   return unique.filter(a=>!unique.some(b=>b[0]<=a[0]&&b[1]<=a[1]&&(b[0]<a[0]||b[1]<a[1])));
  }
  for(const budget of [0,1,3,8,21]){
   const expected=oracle([0,1,2,3],[0,1,2],budget).sort((a,b)=>a[0]-b[0]||a[1]-b[1])[0];
   const report=inspect(study(values,labels),[],budget,profile(costs));
   assert.deepEqual([report.worstRemainingLabels,report.worstEffort],expected);
   assert.ok(report.questions.every(q=>costs[Number(q.cueId.slice(1))]!==null));
  }
 }
});

test('unit effort parity and maximum supported effort declarations use sparse attainable thresholds',()=>{
 const source=study([['0','0','0'],['0','1','0'],['1','0','0'],['1','0','1']],['A','B','C','D']);
 for(let budget=0;budget<=8;budget++){
  const plain=inspectCueBudget(source,[],budget),weighted=inspect(source,[],budget,profile([1,1,1]));
  assert.deepEqual([weighted.worstRemainingLabels,weighted.worstEffort,weighted.bestFirstCueIds],
   [plain.worstRemainingLabels,plain.worstQuestionsUsed,plain.bestFirstCueIds]);
 }
 const large=inspect(source,[],8000,profile([1000,1000,1000]));
 assert.equal(large.worstEffort,2000);assert.equal(large.worstRemainingLabels,1);
 assert.equal(large.attainableThresholds,4);
 assert.ok(large.statesExamined<100);
});

test('weighted plateau and unknown/no-support retain unresolved boundaries',()=>{
 const source=study([['a','0'],['a','1'],['a','2'],['b','0'],['b','0'],['b','0']],['A','B','C','D','E','F']);
 for(const budget of [7,10,100])assert.equal(inspect(source,[],budget,profile([7,3])).worstEffort,7);
 source.rows[0].decision=null;assert.equal(inspect(source,[],10,profile([7,3])).worstRemainingLabels,null);
 const known=study([['0'],['1']],['A','B']);
 assert.equal(inspect(known,[{cueId:'c0',value:'novel'}],9,profile([4])).status,'outside-retained-evidence');
 for(const costs of [[0],[-1],[NaN],[1.5],[1001]])assert.throws(()=>inspect(known,[],1,profile(costs)));
});

test('maintained effort declaration is retained through v2 replay and supplied readings',()=>{
 const source=study([['0','0'],['0','1'],['1','0'],['1','1']],['A','B','C','D']);
 const conditions=profile([2,3]);conditions.cues.reverse();
 const saved=createCueBudgetPlan(source,[],5,conditions),copy=structuredClone(saved);
 assert.equal(saved.format,CUE_EFFORT_BUDGET_FORMAT);assert.deepEqual(saved.questionPlan.cues.map(c=>c.cueId),['c0','c1']);
 assert.deepEqual(importCueBudgetPlan({...saved,report:{worstEffort:0}},source),saved);
 const first=recordCueBudgetReading(saved,{cueId:'c0',value:'1'});
 assert.equal(first.budget,3);assert.deepEqual(first.questionPlan,saved.questionPlan);
 const done=recordCueBudgetReading(first,{cueId:'c1',value:'0'});assert.equal(done.budget,0);
 assert.deepEqual(inspect(done.study,done.readings,done.budget,done.questionPlan).retainedLabels,['C']);
 assert.deepEqual(saved,copy);
 const scarce=createCueBudgetPlan(source,[],2,profile([2,3]));
 assert.throws(()=>recordCueBudgetReading(scarce,{cueId:'c1',value:'1'}),/budget/);
 const unavailable=createCueBudgetPlan(source,[],8,profile([null,3]));
 assert.throws(()=>recordCueBudgetReading(unavailable,{cueId:'c0',value:'1'}),/available/);
 // An observation retained before a cue became unavailable remains evidence.
 const historical=createCueBudgetPlan(source,[{cueId:'c0',value:'1'}],3,profile([null,3]));
 assert.equal(inspect(source,historical.readings,3,historical.questionPlan).worstRemainingLabels,1);
 assert.throws(()=>importCueBudgetPlan({...saved,format:'skill-translator.cue-budget/v1'}),/v2/);
 assert.throws(()=>importCueBudgetPlan({...saved,questionPlan:undefined}));
 for(const change of [p=>p.cues.pop(),p=>p.cues[0].effort=0,p=>p.cues[0].basis='',p=>p.cues[0].available=1]){
  const bad=structuredClone(saved);change(bad.questionPlan);assert.throws(()=>importCueBudgetPlan(bad));
 }
});

test('CLI retains v2 conditions, charges readings, and refuses downgrades and mismatched conditions',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');const {fileURLToPath}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'cue-effort-budget-'));
 try{
  const source=study([['0','0'],['0','1'],['1','0'],['1','1']],['A','B','C','D']);
  // Deliberately source metadata only; this CLI does not claim PNG admission.
  const raw={format:'skill-translator.cue-bundle/v2',study:source,questionReadings:[],questionPlan:profile([2,3])};
  const input=join(dir,'source.json'),saved=join(dir,'report.json'),changed=join(dir,'changed.json');
  await writeFile(input,JSON.stringify(raw));
  const cli=fileURLToPath(new URL('../tools/inspect-cue-budget.mjs',import.meta.url));
  const run=(...args)=>{const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});if(result.error)throw result.error;return result;};
  const first=run(input,'4');assert.equal(first.status,0,first.stderr);
  const report=JSON.parse(first.stdout);assert.equal(report.input.format,CUE_EFFORT_BUDGET_FORMAT);
  assert.equal(report.report.worstRemainingLabels,2);assert.equal(report.report.worstEffort,2);assert.equal(report.report.completePlanEffort,5);
  report.report={worstEffort:0,worstRemainingLabels:1};await writeFile(saved,JSON.stringify(report));
  const reopened=run(saved);assert.equal(reopened.status,0,reopened.stderr);assert.equal(JSON.parse(reopened.stdout).report.worstRemainingLabels,2);
  const acquired=run(saved,'--read','c0','1');assert.equal(acquired.status,0,acquired.stderr);
  const next=JSON.parse(acquired.stdout);assert.equal(next.input.budget,2);assert.equal(next.report.worstEffort,0);assert.deepEqual(next.report.questions,[]);
  await writeFile(changed,JSON.stringify({...raw,questionPlan:profile([3,2])}));
  const mismatch=run(saved,'4',changed);assert.equal(mismatch.status,1);assert.equal(mismatch.stdout,'');assert.match(mismatch.stderr,/different declared/);
  for(const format of ['skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v3']){
   await writeFile(changed,JSON.stringify({...raw,format}));const refused=run(changed,'4');assert.equal(refused.status,1);assert.equal(refused.stdout,'');
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
