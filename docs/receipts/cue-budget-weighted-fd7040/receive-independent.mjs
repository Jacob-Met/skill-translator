import assert from 'node:assert/strict';
import {inspectCueEffortBudget} from '../../../src/cue-budget.mjs';
import {study} from '../../../test/cue-budget-fixture.mjs';
let seed=267117;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed;};
let checked=0;
for(let trial=0;trial<60;trial++){
 const costs=Array.from({length:4},()=>{const x=(rnd()>>>8)%6;return x===0?null:[1,5,13,101,997][x-1];});
 const profile={format:'skill-translator.cue-question-plan/v1',cues:costs.map((v,i)=>({cueId:`c${i}`,available:v!==null,effort:v??1,basis:'Independent review varied cost'}))};
 const n=6,k=4,table=Array.from({length:n},()=>Array.from({length:k},()=>rnd()%7===0?null:String((rnd()>>>8)%3))),labels=Array.from({length:n},(_,i)=>String(i%5));
 const memo=new Map();
 const pareto=pairs=>{const a=[...new Map(pairs.map(p=>[p.join(','),p])).values()];return a.filter(p=>!a.some(q=>q[0]<=p[0]&&q[1]<=p[1]&&(q[0]<p[0]||q[1]<p[1])));};
 function oracle(ids,cues,budget){
  const key=JSON.stringify([ids,cues,budget]);if(memo.has(key))return memo.get(key);
  let choices=[[new Set(ids.map(i=>labels[i])).size,0]];
  if(budget)for(const c of cues){
   if(costs[c]===null||costs[c]>budget)continue;
   let answers=[...new Set(ids.map(i=>table[i][c]).filter(v=>v!==null))];if(ids.some(i=>table[i][c]===null))answers.push('NOT_IN_TABLE');
   let composed=[[0,0]];
   for(const a of answers){const rows=ids.filter(i=>table[i][c]===null||table[i][c]===a);const child=oracle(rows,cues.filter(x=>x!==c),budget-costs[c]);composed=pareto(composed.flatMap(x=>child.map(y=>[Math.max(x[0],y[0]),Math.max(x[1],y[1])])));}
   choices.push(...composed.map(([a,b])=>[a,b+costs[c]]));
  }
  const result=pareto(choices);memo.set(key,result);return result;
 }
 const source=study(table,labels);
 for(const b of [0,1,4,13,111,1000,4000]){
  const actual=inspectCueEffortBudget(source,[],b,profile),expected=oracle([0,1,2,3,4,5],[0,1,2,3],b).sort((a,b)=>a[0]-b[0]||a[1]-b[1])[0];
  assert.deepEqual([actual.worstRemainingLabels,actual.worstEffort],expected,`trial${trial}budget${b}`);checked++;
  for(const question of actual.questions)for(const child of question.outcomes){
   const remaining=[0,1,2,3].filter(i=>`c${i}`!==question.cueId);
   const frontier=oracle(child.exampleIndexes,remaining,question.worstEffort-costs[Number(question.cueId.slice(1))]).filter(p=>p[0]<=question.worstRemainingLabels);
   assert.ok(frontier.length);assert.equal(child.remainingEffort,Math.min(...frontier.map(p=>p[1])));
  }
 }
}
console.log(JSON.stringify({source:'ef512837641f1b6ebdf33b9f72437d88a3a86be6',seed:267117,independentTables:60,budgetPairs:checked,branchThresholds:'all verified',status:'passed'}));
