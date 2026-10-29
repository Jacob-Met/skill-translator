import assert from 'node:assert/strict';
import {certificate} from '../src/cue-misreading-core.mjs';
let seed=123,cases=0;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
for(let t=0;t<300;t++){
 const k=1+rnd(5),rows=['A','B'].map(decision=>({decision,values:Array.from({length:k},()=>['a','b',null][rnd(3)])})),prior=Array.from({length:k},()=>rnd(3)?undefined:['a','b','OTHER'][rnd(3)]);
 for(let E=0;E<=2;E++){
  let exists=false;function visit(j,answers){if(j===k){if(rows.every(r=>answers.filter((v,i)=>r.values[i]!==null&&r.values[i]!==v).length<=E))exists=true;return;}for(const v of prior[j]===undefined?['a','b','OTHER']:[prior[j]])visit(j+1,[...answers,v]);}visit(0,[]);
  const c=certificate(rows,prior,E);assert.equal(c.length>0,exists);for(const x of c){assert.ok(x.mismatches.every(m=>m.length<=E));prior.forEach((v,j)=>{if(v!==undefined)assert.equal(x.answers[j],v);});}cases++;
 }
}
console.log(JSON.stringify({cases,status:'pass'}));
