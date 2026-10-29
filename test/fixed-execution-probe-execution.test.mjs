import fs from 'node:fs';
import assert from 'node:assert/strict';
import {executeFixedReadings} from '../src/cue-fixed-execution.mjs';
const saved={original:JSON.parse(fs.readFileSync(process.env.FIXED_SOURCE_BUNDLE??new URL('./fixtures/repeated-cue-study.json',import.meta.url),'utf8')),inputs:{maxErrors:1,basis:'One declared hypothetical total disagreement',events:[]}};
saved.original.study.cues=saved.original.study.cues.slice(0,1);saved.original.study.rows.forEach(r=>r.values=r.values.slice(0,1));
const planning={maxAdditional:6,basis:'Follow one frozen count vector; no independent reliability assumption'};
const source=JSON.stringify(saved), courses=[];
for(let mask=0;mask<8;mask++){
 const answers=Array.from({length:3},(_,i)=>({cue:saved.original.study.cues[0].id,value:saved.original.study.rows[mask>>i&1].values[0],provenance:{kind:'hypothetical',basis:'Explicit authored categorical course'}}));
 const state=executeFixedReadings(saved.original.study,saved.inputs,planning,answers);
 assert.equal(state.status,'schedule-complete');assert.equal(state.remaining,0);assert.equal(state.account.labels.length,1);
 assert.throws(()=>executeFixedReadings(saved.original.study,saved.inputs,planning,[...answers,answers[0]]),/exhausted/);
 courses.push({mask,labels:state.account.labels,disagreements:state.account.rows.map(r=>r.disagreements)});
}
assert.equal(JSON.stringify(saved),source);
console.log(JSON.stringify({passed:true,courses},null,2));
