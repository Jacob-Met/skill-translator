import fs from 'node:fs';import assert from 'node:assert/strict';
import {executeFixedReadings} from '../src/cue-fixed-execution.mjs';
const saved={original:JSON.parse(fs.readFileSync(process.env.FIXED_SOURCE_BUNDLE??new URL('./fixtures/repeated-cue-study.json',import.meta.url),'utf8')),inputs:{maxErrors:1,basis:'One declared hypothetical total disagreement',events:[]}};
saved.original.study.cues=saved.original.study.cues.slice(0,1);saved.original.study.rows.forEach(r=>r.values=r.values.slice(0,1));
const planning={maxAdditional:6,basis:'Independent finite sequence oracle'};
let checked=0, refusals=0;
for(const a of [null,'a','b'])for(const b of [null,'a','b'])for(const budget of [0,1,2]){
 const study=structuredClone(saved.original.study);study.rows[0].values=[a];study.rows[1].values=[b];
 const inputs={maxErrors:budget,basis:'Authored total mismatch bound',events:[]};
 const start=executeFixedReadings(study,inputs,planning,[]);
 if(!start.schedule){assert.equal(start.next,null);continue;}
 const walk=(answers)=>{
  const expected=study.rows.flatMap((r,i)=>answers.filter(x=>r.values[0]!==null&&r.values[0]!==x.value).length<=budget?[i]:[]);
  const state=executeFixedReadings(study,inputs,planning,answers);assert.deepEqual(state.account.indexes,expected);checked++;
  if(answers.length===start.schedule.length||!expected.length){assert.throws(()=>executeFixedReadings(study,inputs,planning,[...answers,{cue:study.cues[0].id,value:'a',provenance:{kind:'hypothetical',basis:'Beyond stop'}}]));refusals++;return;}
  for(const value of ['a','b','outside'])walk([...answers,{cue:study.cues[0].id,value,provenance:{kind:'hypothetical',basis:'Enumerated answer'}}]);
 };walk([]);
}
console.log(JSON.stringify({checked,terminalRefusals:refusals,pass:true}));
