import test from 'node:test';import assert from 'node:assert/strict';
import {createObservation,analyzeEvidence} from '../src/evidence.mjs';
import {selectEvidenceConflictAlternative as select} from '../src/evidence-conflict-alternatives.mjs';
const demo={provenance:'Authored rank controls',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'guide',label:'Guide',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:1}]};
const row=(id,x,y=60,r=.5)=>createObservation(demo,{id,landmarkId:'guide',label:id,evidenceClass:'authored-example',widthMm:200,heightMm:160,xMm:x,yMm:y,uncertaintyMm:r});
test('each actual two-record explanation carries all maintained rejection witnesses',()=>{
 const rows=[row('a',20),row('b',20),row('c',40)];
 const a=select(demo,'guide',rows,'0'),b=select(demo,'guide',rows,'1');
 assert.deepEqual(a.witness.map(o=>o.id),['a','c']);assert.deepEqual(b.witness.map(o=>o.id),['b','c']);
 for(const g of[a,b]){assert.equal(g.groupCount,'2');assert.ok(g.ruleWitnesses.every(w=>w.observations.length>0));}
 assert.deepEqual(select(demo,'guide',[...rows].reverse(),'1'),b);
});
test('last of900complete source-bound alternatives remains accessible',()=>{
 const rows=Array.from({length:60},(_,i)=>row('r'+String(i).padStart(2,'0'),i<30?20:40)),before=JSON.stringify(rows);
 const r=select(demo,'guide',rows,'899');assert.equal(r.groupCount,'900');assert.deepEqual(r.witness.map(o=>o.id),['r29','r59']);assert.equal(JSON.stringify(rows),before);
 assert.throws(()=>select(demo,'guide',rows,'900'),/outside/);
});
test('every rank agrees with independently exhaustive actual geometric subset groups',()=>{
 let seed=11;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);let checked=0;
 for(let run=0;run<80;run++){
  const rows=Array.from({length:1+Math.floor(rnd()*8)},(_,i)=>row('r'+i,[20,40,120,90][Math.floor(rnd()*4)],[30,60,110][Math.floor(rnd()*3)],[.5,21,80][Math.floor(rnd()*3)]));
  const a=analyzeEvidence(demo,'guide',rows);let size=Infinity,groups=[];
  for(let mask=1;mask<1<<rows.length;mask++){
   const ids=rows.filter((_,i)=>mask&(1<<i)).map(o=>o.id);
   if(!a.candidates.every(c=>ids.some(id=>c.contradictions.includes(id))))continue;
   if(ids.length<size){size=ids.length;groups=[];}if(ids.length===size)groups.push(ids);
  }
  groups.sort((a,b)=>a.join('/').localeCompare(b.join('/')));
  for(let rank=0;rank<groups.length;rank++){const r=select(demo,'guide',rows,String(rank));assert.deepEqual(r.witness.map(o=>o.id),groups[rank]);assert.equal(r.groupCount,String(groups.length));checked++;}
 }
 assert.ok(checked>80);
});
test('malformed rank, no-conflict inputs and changed raw source refuse',()=>{
 const rows=[row('a',20),row('b',40)];for(const rank of[-1,0,'-1','01','1.5','1e0',''])assert.throws(()=>select(demo,'guide',rows,rank),/index/);
 assert.throws(()=>select(demo,'guide',[], '0'),/No contradictory/);const bad=structuredClone(rows);bad[0].sourceReference.source.widthMm=101;assert.throws(()=>select(demo,'guide',bad,'0'),/reference/);
});
