import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {inspectReadingWithdrawals as inspect} from '../src/cue-reading-withdrawals.mjs';
const s=JSON.parse(await readFile(new URL('./fixtures/repeated-cue-study.json',import.meta.url))).study;
let cases=0;
for(let n=1;n<=5;n++)for(let values=0;values<2**n;values++)for(let removed=0;removed<2**n;removed++)for(let budget=0;budget<=2;budget++){
 const events=Array.from({length:n},(_,i)=>({id:'e'+i,kind:'record',readingId:'r'+i,entry:{cue:s.cues[0].id,value:values>>i&1?'b':'a',provenance:{kind:'hypothetical',basis:'Authored'}}}));
 for(let i=0;i<n;i++)if(removed>>i&1)events.push({id:'w'+i,kind:'withdraw',readingId:'r'+i,replaces:'e'+i,reason:'Wrong inspection context'});
 const input={events,maxErrors:budget,basis:'One total bound'},before=JSON.stringify(input),out=inspect(s,input);
 const expected=[0,1].filter(row=>Array.from({length:n},(_,i)=>!(removed>>i&1)&&((values>>i&1)!==row)).filter(Boolean).length<=budget);
 assert.deepEqual(out.indexes,expected);assert.equal(out.audit.length,events.length);assert.equal(JSON.stringify(input),before);cases++;
}
console.log(JSON.stringify({independentDeletionMaskCases:cases,status:'pass'}));
