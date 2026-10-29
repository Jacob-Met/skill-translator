import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {explainReadingConflict} from '../src/cue-reading-conflict.mjs';
const study=JSON.parse(await readFile(new URL('./fixtures/repeated-cue-study.json',import.meta.url))).study;
const entry=value=>({cue:study.cues[0].id,value,provenance:{kind:'hypothetical',basis:'Authored control'}});
let cases=0,certificates=0;
for(let n=1;n<=6;n++)for(let bits=0;bits<2**n;bits++)for(let budget=0;budget<=2;budget++){
 const values=Array.from({length:n},(_,i)=>bits>>i&1?'b':'a');const input={maxErrors:budget,basis:'One total bound',events:values.map((v,i)=>({id:'e'+i,kind:'record',readingId:'r'+i,entry:entry(v)}))},before=JSON.stringify(input),out=explainReadingConflict(study,input);
 const fit=positions=>[0,1].filter(row=>positions.filter(i=>values[i]!==['a','b'][row]).length<=budget);assert.equal(out.certificate===null,fit(values.map((_,i)=>i)).length>0);
 if(out.certificate){certificates++;const c=out.certificate,positions=c.members.map(m=>m.position);assert.deepEqual(fit(positions),[]);for(let mask=0;mask<2**positions.length-1;mask++)assert.ok(fit(positions.filter((_,i)=>mask>>i&1)).length);for(const w of c.removalWitnesses)assert.deepEqual(w.examples.map(e=>e.index),fit(positions.filter(i=>i!==w.removedPosition)));}
 assert.equal(JSON.stringify(input),before);cases++;
}
const events=[{id:'e',kind:'record',readingId:'r',entry:entry('a')},{id:'c',kind:'correct',readingId:'r',replaces:'e',value:'b',reason:'Transcript repair'},{id:'n',kind:'record',readingId:'s',entry:entry('a')}];let out=explainReadingConflict(study,{maxErrors:0,basis:'Declared',events});assert.equal(out.certificate.members[0].revision,'c');assert.equal(out.certificate.members[0].entry.value,'b');events.push({id:'w',kind:'withdraw',readingId:'r',replaces:'c',reason:'Context error'});assert.equal(explainReadingConflict(study,{maxErrors:0,basis:'Declared',events}).certificate,null);
const unknown=structuredClone(study);unknown.rows[0].values[0]=null;unknown.rows[0].decision=null;assert.equal(explainReadingConflict(unknown,{maxErrors:0,basis:'Declared',events:events.slice(0,3)}).certificate,null);
console.log(JSON.stringify({independentAccounts:cases,certificates,revisionWithdrawalUnknownControls:'pass'}));
