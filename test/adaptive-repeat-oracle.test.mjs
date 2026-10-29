import assert from 'node:assert/strict';
import {adaptiveRepeatPolicy} from '../src/adaptive-repeat-core.mjs';
// Independent explicit-history oracle: recount every original answer position for
// every row at each node, rather than propagate the candidate residual-cost state.
function oracle(rows,cues,h,history=[]){
 const alive=rows.filter(r=>history.filter(([c,a])=>r.values[c]!==null&&r.values[c]!==a).length<=r.remaining);
 if(!alive.length)return 0;
 if(alive.some(r=>r.decision===null))return Infinity;
 if(new Set(alive.map(r=>r.decision)).size===1)return 0;
 if(h===0)return Infinity;
 let best=Infinity;
 for(let c=0;c<cues;c++){
  const domain=[...new Set(rows.map(r=>r.values[c]).filter(x=>x!==null)),Symbol.for('outside')];
  let worst=0;
  for(const a of domain)worst=Math.max(worst,oracle(rows,cues,h-1,[...history,[c,a]]));
  best=Math.min(best,1+worst);
 }
 return best;
}
let seed=71;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let checked=0;
for(let t=0;t<120;t++){
 const cues=1+rand(3),rows=Array.from({length:2+rand(3)},(_,i)=>({values:Array.from({length:cues},()=>[null,'a','b'][rand(3)]),decision:['A','B'][i%2],remaining:rand(2)}));
 for(let h=0;h<=3;h++){
  const expected=oracle(rows,cues,h),actual=adaptiveRepeatPolicy(rows,cues,h);
  assert.equal(actual.minimumWorstAdditional??Infinity,expected);checked++;
 }
}
const rows=[[0,0,0],[0,1,0],[1,0,0],[1,0,1]].map((v,i)=>({values:v.map(String),decision:String(i),remaining:1}));
assert.equal(adaptiveRepeatPolicy(rows,3,6).minimumWorstAdditional,5);
assert.equal(adaptiveRepeatPolicy(rows,3,4).status,'no-adaptive-policy-within-bound');
assert.equal(adaptiveRepeatPolicy([{values:['OTHER'],decision:'a',remaining:0},{values:['x'],decision:'b',remaining:0}],1,1).minimumWorstAdditional,1);
assert.equal(adaptiveRepeatPolicy([{values:[null],decision:null,remaining:0}],1,3).status,'unknown-decision');
assert.throws(()=>adaptiveRepeatPolicy(rows,3,6,{maxWork:1}),/no partial/);
console.log(JSON.stringify({independentHistoryCourses:checked,controls:5,status:'pass'}));

const two=[{values:['a'],decision:'A',remaining:2},{values:['b'],decision:'B',remaining:2}];
assert.equal(adaptiveRepeatPolicy(two,1,5).minimumWorstAdditional,5);
assert.equal(oracle(two,1,5),5);
assert.equal(adaptiveRepeatPolicy(two,1,4).status,'no-adaptive-policy-within-bound');
const long='x'.repeat(1000);assert.equal(adaptiveRepeatPolicy([{values:[long],decision:'A',remaining:0},{values:['y'],decision:'B',remaining:0}],1,1).minimumWorstAdditional,1);
console.log(JSON.stringify({totalBudgetTwoAndMaintainedCategoryBound:4,status:'pass'}));
