import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {explainReadingHistory} from '../src/cue-reading-history.mjs';
const study=JSON.parse(await readFile(new URL('./fixtures/repeated-cue-study.json',import.meta.url))).study;
let count=0;
for(let mask=0;mask<256;mask++)for(let budget=0;budget<=2;budget++){
 const events=[],state=new Map(),expect=[];let id=0;
 for(let r=0;r<2;r++){
  const readingId='r'+r,value=(mask>>(r*4))&1?'b':'a',recordId='e'+id++;events.push({id:recordId,kind:'record',readingId,entry:{cue:study.cues[0].id,value,provenance:{kind:'hypothetical',basis:'Authored'}}});state.set(readingId,{value,revision:recordId});snapshot();
  if(mask>>(r*4+1)&1){const current=state.get(readingId),v=mask>>(r*4+2)&1?'b':'a',eid='e'+id++;events.push({id:eid,kind:'correct',readingId,replaces:current.revision,value:v,reason:'Authored correction'});state.set(readingId,{value:v,revision:eid});snapshot();}
  if(mask>>(r*4+3)&1){events.push({id:'e'+id++,kind:'withdraw',readingId,replaces:state.get(readingId).revision,reason:'Authored exclusion'});state.delete(readingId);snapshot();}
 }
 function snapshot(){expect.push([0,1].filter(row=>[...state.values()].filter(x=>x.value!==['a','b'][row]).length<=budget));}
 const input={maxErrors:budget,basis:'Same budget across prefixes',events},before=JSON.stringify(input);const out=explainReadingHistory(study,input);let prior=[0,1];
 assert.deepEqual(out.stages.map(x=>x.indexes),expect);out.stages.forEach((s,i)=>{assert.deepEqual(s.entered,expect[i].filter(x=>!prior.includes(x)));assert.deepEqual(s.removed,prior.filter(x=>!expect[i].includes(x)));prior=expect[i];});assert.deepEqual(out.final.indexes,expect.at(-1));assert.equal(JSON.stringify(input),before);count++;
}
console.log(JSON.stringify({independentEventAccounts:count,status:'pass'}));
