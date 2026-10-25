import assert from 'node:assert/strict';
import {inspectCueBudget} from '../../../src/cue-budget.mjs';
import {study} from '../../../test/cue-budget-fixture.mjs';
let seed=267061;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed;};
let checked=0;
for(let trial=0;trial<80;trial++){
 const n=6,k=4,table=Array.from({length:n},()=>Array.from({length:k},()=>rnd()%7===0?null:String((rnd()>>>8)%3))),labels=Array.from({length:n},(_,i)=>String(i%5));
 const memo=new Map();
 const pareto=pairs=>{const a=[...new Map(pairs.map(p=>[p.join(','),p])).values()];return a.filter(p=>!a.some(q=>q[0]<=p[0]&&q[1]<=p[1]&&(q[0]<p[0]||q[1]<p[1])));};
 function oracle(ids,cues,budget){
  const key=JSON.stringify([ids,cues,budget]);if(memo.has(key))return memo.get(key);
  let choices=[[new Set(ids.map(i=>labels[i])).size,0]];
  if(budget)for(const c of cues){
   let answers=[...new Set(ids.map(i=>table[i][c]).filter(v=>v!==null))];if(ids.some(i=>table[i][c]===null))answers.push('NOT_IN_TABLE');
   let composed=[[0,0]];
   for(const a of answers){const rows=ids.filter(i=>table[i][c]===null||table[i][c]===a);const child=oracle(rows,cues.filter(x=>x!==c),budget-1);composed=pareto(composed.flatMap(x=>child.map(y=>[Math.max(x[0],y[0]),Math.max(x[1],y[1])])));}
   choices.push(...composed.map(([a,b])=>[a,b+1]));
  }
  const result=pareto(choices);memo.set(key,result);return result;
 }
 const source=study(table,labels);
 for(let b=0;b<=4;b++){
  const actual=inspectCueBudget(source,[],b),expected=oracle([0,1,2,3,4,5],[0,1,2,3],b).sort((a,b)=>a[0]-b[0]||a[1]-b[1])[0];
  assert.deepEqual([actual.worstRemainingLabels,actual.worstQuestionsUsed],expected,`trial${trial}budget${b}`);checked++;
  for(const question of actual.questions)for(const child of question.outcomes){
   const remaining=[0,1,2,3].filter(i=>`c${i}`!==question.cueId);
   const frontier=oracle(child.exampleIndexes,remaining,question.worstQuestionsUsed-1).filter(p=>p[0]<=question.worstRemainingLabels);
   assert.ok(frontier.length);assert.equal(child.remainingQuestionsUsed,Math.min(...frontier.map(p=>p[1])));
  }
 }
}
console.log(JSON.stringify({source:'1e41566186e056489858405ad2eb324f5b1db4bb',seed:267061,independentTables:80,budgetPairs:checked,branchThresholds:'all verified',status:'passed'}));
