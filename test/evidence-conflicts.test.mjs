import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation,analyzeEvidence,exportEvidence,importEvidence} from '../src/evidence.mjs';
import {explainEvidenceConflicts} from '../src/evidence-conflicts.mjs';
const demo={provenance:'Authored controls, not physical measurements',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'guide',label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:30},toleranceMm:50}]};
const row=(id,fields={})=>createObservation(demo,{id,landmarkId:'guide',label:id,evidenceClass:'authored-example',widthMm:200,heightMm:160,xMm:20,yMm:60,uncertaintyMm:.5,...fields});
const explain=rows=>explainEvidenceConflicts(demo,'guide',rows);
test('joint conflict has exact witnesses although neither observation alone rejects the family',()=>{
 const rows=[row('left'),row('fraction',{xMm:40})],before=JSON.stringify(rows),r=explain(rows);
 assert.equal(r.minimumSize,2);assert.equal(r.groupCount,'1');assert.equal(r.ruleWitnesses.length,5);
 for(const item of r.ruleWitnesses){assert.ok(item.observations.length);assert.ok(item.observations.every(x=>!x.compatible));}
 assert.ok(r.participation.every(p=>p.inEverySmallestGroup));assert.equal(JSON.stringify(rows),before);
 assert.equal(explain([rows[0]]).status,'compatible-family');assert.equal(explain([rows[1]]).status,'compatible-family');
 assert.deepEqual(explain(importEvidence(demo,exportEvidence(demo,rows))),r);
});
test('all equally small alternatives counted without singling out a bad observation',()=>{
 const r=explain([row('left-a'),row('left-b'),row('fraction',{xMm:40}),row('neutral',{widthMm:100,heightMm:80,xMm:20,yMm:30})]);
 assert.equal(r.minimumSize,2);assert.equal(r.groupCount,'2');
 assert.deepEqual(r.participation.map(x=>[x.observationId,x.groupCount,x.inEverySmallestGroup]),[['fraction','2',true],['left-a','1',false],['left-b','1',false],['neutral','0',false]]);
});
test('single-row exclusion supersedes larger jointly contradictory groups',()=>{
 const r=explain([row('left'),row('fraction',{xMm:40}),row('outside',{xMm:95,yMm:95})]);
 assert.equal(r.minimumSize,1);assert.equal(r.groupCount,'1');assert.deepEqual(r.witness.map(x=>x.id),['outside']);
});
test('empty and compatible inputs never claim a contradiction',()=>{
 assert.equal(explain([]).status,'no-evidence');assert.equal(explain([row('left')]).minimumSize,null);
});
test('exhaustive independent subset oracle agrees on minimum, count and each record membership',()=>{
 let seed=1729;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(let run=0;run<120;run++){
  const rows=Array.from({length:1+Math.floor(random()*8)},(_,i)=>row('o'+i,{xMm:[20,40,120,95][Math.floor(random()*4)],yMm:[30,60,110][Math.floor(random()*3)],uncertaintyMm:[.5,21,80][Math.floor(random()*3)]}));
  const evidence=analyzeEvidence(demo,'guide',rows);let min=Infinity,groups=[];
  for(let mask=1;mask<(1<<rows.length);mask++){
   const ids=rows.filter((_,i)=>mask&(1<<i)).map(x=>x.id);
   if(!evidence.candidates.every(c=>ids.some(id=>c.contradictions.includes(id))))continue;
   if(ids.length<min){min=ids.length;groups=[];}if(ids.length===min)groups.push(ids);
  }
  const r=explain(rows);assert.equal(r.minimumSize,Number.isFinite(min)?min:null);assert.equal(r.groupCount,String(groups.length));
  for(const p of r.participation)assert.equal(p.groupCount,String(groups.filter(g=>g.includes(p.observationId)).length));
  assert.deepEqual(explain([...rows].reverse()),r);
 }
});
test('complete sixty-row family counts all900 equal two-record groups',()=>{
 const rows=Array.from({length:60},(_,i)=>row('r'+String(i).padStart(2,'0'),{xMm:i<30?20:40}));const r=explain(rows);
 assert.equal(r.minimumSize,2);assert.equal(r.groupCount,'900');assert.ok(r.participation.every(x=>x.groupCount==='30'&&!x.inEverySmallestGroup));
});
test('source custody, unknown landmarks and observation capacity remain enforced',()=>{
 const bad=row('bad');bad.sourceReference.source.widthMm=101;
 assert.throws(()=>explain([bad]),/reference/);assert.throws(()=>explainEvidenceConflicts(demo,'missing',[]),/unknown/);
 assert.throws(()=>explain(Array.from({length:61},(_,i)=>row('r'+i))),/60/);
});
