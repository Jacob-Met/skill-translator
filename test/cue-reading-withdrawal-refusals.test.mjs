import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectReadingWithdrawals as inspect} from '../src/cue-reading-withdrawals.mjs';
const study=JSON.parse(await readFile(new URL('./fixtures/repeated-cue-study.json',import.meta.url))).study;
const record={id:'record',kind:'record',readingId:'reading',entry:{cue:study.cues[0].id,value:'a',provenance:{kind:'hypothetical',basis:'Authored control'}}};
const correction={id:'correction',kind:'correct',readingId:'reading',replaces:'record',value:'b',reason:'Correct transcript'};
const withdrawal={id:'withdrawal',kind:'withdraw',readingId:'reading',replaces:'correction',reason:'Wrong inspection context'};
const input={maxErrors:0,basis:'One declared total bound',events:[record,correction,withdrawal]};
const invalid=[
 ['stale revision',x=>x.events[2].replaces='record'],
 ['unknown reading',x=>x.events[2].readingId='missing'],
 ['missing reason',x=>delete x.events[2].reason],
 ['blank reason',x=>x.events[2].reason='   '],
 ['oversized reason',x=>x.events[2].reason='x'.repeat(1001)],
 ['extra category',x=>x.events[2].value='a'],
 ['extra anchor',x=>x.events[2].provenance={kind:'unspecified'}],
 ['duplicate event ID',x=>x.events[2].id='record'],
 ['second withdrawal',x=>x.events.push({...withdrawal,id:'again'})],
 ['correction after withdrawal',x=>x.events.push({...correction,id:'later',replaces:'correction'})],
 ['record identity reuse',x=>x.events.push({...record,id:'new'})],
 ['withdrawal before record',x=>x.events=[withdrawal,record,correction]],
 ['missing original entry',x=>delete x.events[0].entry],
 ['unknown origin',x=>x.events[0].entry.provenance.kind='verified'],
 ['invalid budget',x=>x.maxErrors=3],
 ['missing basis',x=>x.basis=''],
 ['unknown input field',x=>x.derivedAnswer='b'],
 ['history limit',x=>x.events=Array.from({length:91},()=>record)],
];
for(const [name,edit]of invalid){const value=structuredClone(input);edit(value);const before=JSON.stringify(value);assert.throws(()=>inspect(study,value),name);assert.equal(JSON.stringify(value),before,name+' mutated input');}
const before=JSON.stringify(input),result=inspect(study,input);
assert.equal(JSON.stringify(input),before);assert.equal(result.active.length,0);assert.deepEqual(result.indexes,[0,1]);assert.equal(result.audit.length,3);assert.equal(result.audit[0].entry.value,'a');assert.equal(result.audit[1].before,'a');assert.equal(result.withdrawn[0].entry.value,'b');assert.deepEqual(result.withdrawn[0].entry.provenance,record.entry.provenance);
const newReading={...structuredClone(record),id:'new-event',readingId:'new-reading'};
const next=inspect(study,{...input,events:[...input.events,newReading]});assert.deepEqual(next.indexes,[0]);assert.equal(next.active.length,1);assert.equal(next.audit.length,4);assert.equal(next.withdrawn.length,1);
console.log(JSON.stringify({malformedHistoryControls:invalid.length,latestRevisionAndNewIdentityControls:2,status:'pass'}));
