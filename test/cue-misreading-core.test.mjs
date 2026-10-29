import assert from 'node:assert/strict';
import {inspect} from '../src/cue-misreading-core.mjs';
function oracle(input){
 const {rows,cues,maxErrors,readings}=input,used=new Set(readings.map(r=>cues.indexOf(r.cue)));
 const domains=cues.map((_,j)=>[...new Set(rows.map(r=>r.values[j]).filter(v=>v!==null)),null]);
 let worlds=[];
 for(let i=0;i<rows.length;i++){
  const prior=readings.filter(a=>rows[i].values[cues.indexOf(a.cue)]!==null&&rows[i].values[cues.indexOf(a.cue)]!==a.value).length;
  function enumerate(j,answers,errors){
   if(errors>maxErrors)return;
   if(j===cues.length){worlds.push({i,answers});return;}
   if(used.has(j)){enumerate(j+1,[...answers,undefined],errors);return;}
   for(const a of domains[j])enumerate(j+1,[...answers,a],errors+(rows[i].values[j]!==null&&rows[i].values[j]!==a?1:0));
  }
  enumerate(0,[],prior);
 }
 function query(ws,left){
  const labels=new Set(ws.map(w=>rows[w.i].decision));
  if(!ws.length||labels.has(null))return null;
  if(labels.size===1)return 0;
  let best=null;
  for(const j of left){
   const branches=domains[j].map(a=>ws.filter(w=>w.answers[j]===a)).filter(x=>x.length);
   const values=branches.map(b=>query(b,left.filter(k=>k!==j)));
   if(values.every(v=>v!==null)){const v=1+Math.max(...values);best=best===null?v:Math.min(best,v);}
  }
  return best;
 }
 return {indexes:[...new Set(worlds.map(w=>w.i))],worstQuestions:query(worlds,cues.map((_,j)=>j).filter(j=>!used.has(j)))};
}
let seed=17427;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let count=0;
for(let trial=0;trial<180;trial++){
 const cues=['a','b','c','d'].slice(0,2+rand(3));
 const rows=Array.from({length:2+rand(3)},()=>({decision:['A','B',null][rand(3)],values:cues.map(()=>['a','b',null][rand(3)])}));
 const readings=trial%2?[{cue:cues[0],value:['a','b','unseen'][rand(3)]}]:[];
 for(let maxErrors=0;maxErrors<=2;maxErrors++){
  const input={rows,cues,readings,maxErrors,basis:'Authored test assumption'};
  const a=inspect(input),b=oracle(input);
  assert.deepEqual(a.indexes,b.indexes);assert.equal(a.worstQuestions,b.worstQuestions);count++;
 }
}
const fixture=n=>({rows:[{decision:'A',values:Array(n).fill('a')},{decision:'B',values:Array(n).fill('b')}],cues:Array.from({length:n},(_,i)=>'c'+i),readings:[],maxErrors:1,basis:'Authored assumption'});
assert.equal(inspect(fixture(3)).worstQuestions,3);
assert.equal(inspect(fixture(2)).worstQuestions,null);
assert.throws(()=>inspect({...fixture(3),basis:''}));
assert.throws(()=>inspect(fixture(3),1));
console.log(JSON.stringify({independentWorldCases:count,authoredControls:4,status:'pass'}));
