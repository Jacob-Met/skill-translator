import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCueReadingSupport} from '../src/cue-reading-support.mjs';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
function study(values,labels){
 const examples=values.map((_,i)=>{
 const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:String(i+1).repeat(64),durationSeconds:10};
 let source=createSequence(clip,{title:'Authored example'});
 for(const n of [1,2]){const image={name:'frame.png',mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};source=appendMoment(source,{id:'m'+n,label:'Moment',visibleState:'Authored',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});}
 source=upsertStep(source,{id:'s',beforeMomentId:'m1',afterMomentId:'m2',title:'Step',intent:'Authored',visibleChange:'Authored',sensoryCue:'',recoveryCue:''});
 return {source,stepId:'s'};
 });
 return {format:CUE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples},cues:values[0].map((_,i)=>({id:'c'+i,label:'Cue',basis:'Authored'})),rows:values.map((v,i)=>({values:v,decision:labels[i],basis:'Authored'}))};
}


const read=values=>values.map((value,i)=>({cueId:'c'+i,value}));
test('three jointly unsupported readings have supported proper subsets and original-row witnesses',()=>{
 const values=Array.from({length:8},(_,i)=>[String(i&1),String((i>>1)&1),String((i>>2)&1)]).slice(1,7),s=study(values,values.map(v=>v[0]===v[1]?'same':'different')),readings=read(['0','0','0']),before=JSON.stringify({s,readings}),r=inspectCueReadingSupport(s,readings);
 assert.equal(r.status,'unsupported-combination');assert.deepEqual(r.compatibleExampleIndexes,[]);assert.deepEqual(r.minimalUnsupportedGroups.map(g=>g.cueIds),[['c0','c1','c2']]);
 const g=r.minimalUnsupportedGroups[0];assert.equal(g.exampleWitnesses.length,6);assert.ok(g.exampleWitnesses.every(row=>row.exclusions.length));assert.ok(g.removalWitnesses.every(w=>w.compatibleExampleIndexes.length));assert.equal(JSON.stringify({s,readings}),before);
 for(const w of g.removalWitnesses)assert.deepEqual(w.compatibleExampleIndexes,values.flatMap((v,i)=>readings.every((q,j)=>q.cueId===w.cueId||v[j]===q.value)?[i]:[]));
});
test('all inclusion-minimal groups are retained, including larger groups beside singleton groups',()=>{
 const s=study([['1','0','1'],['0','1','1']],['A','B']),r=inspectCueReadingSupport(s,read(['0','0','0']));
 assert.deepEqual(r.minimalUnsupportedGroups.map(g=>g.cueIds),[['c0','c1'],['c2']]);assert.deepEqual(r.readings,read(['0','0','0']));
 assert.deepEqual(r.minimalUnsupportedGroups[1].removalWitnesses[0].compatibleExampleIndexes,[0,1]);
});
test('unknown source categories retain compatibility regardless of unknown decision labels',()=>{
 const s=study([['1','0','1'],[null,null,null]],['A',null]),r=inspectCueReadingSupport(s,read(['0','0','0']));
 assert.equal(r.status,'compatible-retained-examples');assert.deepEqual(r.compatibleExampleIndexes,[1]);assert.deepEqual(r.minimalUnsupportedGroups,[]);
 s.rows[1].values[1]='1';const missing=inspectCueReadingSupport(s,read(['0','0','0']));const witness=missing.minimalUnsupportedGroups.find(g=>g.cueIds.includes('c1')).exampleWitnesses[1];assert.deepEqual(witness.unknownCueIds,['c0']);assert.deepEqual(witness.exclusions,[{cueId:'c1',suppliedValue:'0',retainedValue:'1'}]);
});
test('novel categories, empty readings and malformed reading admission remain explicit',()=>{
 const s=study([['a'],['b']],['A','B']);assert.deepEqual(inspectCueReadingSupport(s,read(['new'])).minimalUnsupportedGroups[0].cueIds,['c0']);
 const empty=inspectCueReadingSupport(s);assert.equal(empty.status,'no-readings');assert.deepEqual(empty.compatibleExampleIndexes,[0,1]);
 for(const bad of [[{cueId:'other',value:'a'}],[{cueId:'c0',value:''}],[...read(['a']),...read(['b'])]])assert.throws(()=>inspectCueReadingSupport(s,bad));
});
test('independent exhaustive subset oracle agrees on1024 binary/null source and reading tables',()=>{
 for(let seed=0;seed<128;seed++){
  const values=Array.from({length:4},(_,i)=>Array.from({length:3},(_,j)=>{const v=(seed*17+i*7+j*11+(seed>>(i+j)%7))%3;return v===2?null:String(v);})),s=study(values,['A','B','A','B']);
  for(let target=0;target<8;target++){
   const readings=read([0,1,2].map(i=>String((target>>i)&1))),survivors=mask=>values.flatMap((row,i)=>readings.every((r,j)=>!(mask&(1<<j))||row[j]===null||row[j]===r.value)?[i]:[]),unsupported=Array.from({length:7},(_,i)=>i+1).filter(mask=>!survivors(mask).length),minimal=unsupported.filter(mask=>!unsupported.some(other=>other!==mask&&(mask&other)===other));
   const r=inspectCueReadingSupport(s,readings);assert.deepEqual(r.compatibleExampleIndexes,survivors(7));assert.deepEqual(r.minimalUnsupportedGroups.map(g=>g.readingIndexes.reduce((m,j)=>m|(1<<j),0)),minimal);
   for(const g of r.minimalUnsupportedGroups){assert.ok(g.exampleWitnesses.every(w=>w.exclusions.length));for(const w of g.removalWitnesses){const mask=g.readingIndexes.reduce((m,j)=>readings[j].cueId===w.cueId?m:m|(1<<j),0);assert.deepEqual(w.compatibleExampleIndexes,survivors(mask));}}
  }
 }
});
test('complete eight-reading capacity retains irrelevant readings and six-way exclusion witness',()=>{
 const values=Array.from({length:6},(_,i)=>Array.from({length:8},(_,j)=>i===j?'1':'0')),s=study(values,['A','B','C','D','E','F']),r=inspectCueReadingSupport(s,read(Array(8).fill('0')));
 assert.equal(r.readings.length,8);assert.equal(r.minimalUnsupportedGroups.length,1);assert.deepEqual(r.minimalUnsupportedGroups[0].cueIds,['c0','c1','c2','c3','c4','c5']);assert.ok(r.minimalUnsupportedGroups[0].exampleWitnesses.every(w=>w.exclusions.length===1));
});
