import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCueSupport} from '../src/cue-support.mjs';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
test('alternative remaining combinations can retain opposing held-label accounts',()=>{const s=study([['0','1'],['0','0'],['1','1']],['A','A','B']);const c=inspectCueSupport(s).omissions[0].combinations;assert.deepEqual(c.map(x=>x.cueIds),[['c0'],['c1']]);assert.deepEqual(c.map(x=>x.comparison),['same-declared-label','opposing-declared-label']);assert.deepEqual(c.map(x=>x.exact.map(w=>w.index)),[[1],[2]]);});
test('independent row partition across unknowns and renamed cues',()=>{let seed=731;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);for(let trial=0;trial<160;trial++){const values=Array.from({length:6},()=>Array.from({length:4},()=>rand()<.2?null:String(Math.floor(rand()*3)))),s=study(values,['A','B','A','B','A','B']);s.cues.forEach((c,i)=>c.id='renamed_'+i);const before=JSON.stringify(s);for(const o of inspectCueSupport(s).omissions)for(const c of o.combinations){const cols=c.cueIds.map(id=>s.cues.findIndex(cue=>cue.id===id)),expected={exact:[],unknownCompatible:[],excluded:[]};for(let i=0;i<values.length;i++){if(i===o.index)continue;const pairs=cols.map(j=>[values[i][j],values[o.index][j]]);const kind=pairs.some(([a,b])=>a!==null&&b!==null&&a!==b)?'excluded':pairs.some(([a,b])=>a===null||b===null)?'unknownCompatible':'exact';expected[kind].push(i);}for(const key of Object.keys(expected))assert.deepEqual(c[key].map(row=>row.index),expected[key]);}assert.equal(JSON.stringify(s),before);}});
test('raw reopen recomputes while invalid cue declarations refuse',()=>{const s=study([['0'],['0'],['1']],['A','A','B']);assert.deepEqual(inspectCueSupport(JSON.parse(JSON.stringify(s))),inspectCueSupport(s));s.cues[0].id='';assert.throws(()=>inspectCueSupport(s));});
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
test('XOR finite separation has no withheld pattern witness',()=>{const s=study([['0','0'],['0','1'],['1','0'],['1','1']],['A','B','B','A']),before=JSON.stringify(s),r=inspectCueSupport(s);for(const o of r.omissions){assert.equal(o.status,'distinguished');assert.deepEqual(o.combinations[0].cueIds,['c0','c1']);assert.deepEqual(o.combinations[0].exact,[]);assert.equal(o.combinations[0].comparison,'no-exact-support');}assert.equal(JSON.stringify(s),before);});
test('replicated categories retain exact original-index witnesses',()=>{const r=inspectCueSupport(study([['0'],['0'],['1'],['1']],['A','A','B','B']));assert.deepEqual(r.omissions.map(o=>o.combinations[0].exact.map(x=>x.index)),[[1],[0],[3],[2]]);assert.ok(r.omissions.every(o=>o.combinations[0].comparison==='same-declared-label'));});
test('opposing withheld label stays opposing and never refits training',()=>{const r=inspectCueSupport(study([['0'],['0'],['1'],['1']],['B','A','B','B']));assert.equal(r.omissions[0].combinations[0].comparison,'opposing-declared-label');});
test('unknown held cue is compatible rather than exact evidence',()=>{const r=inspectCueSupport(study([[null],['0'],['1']],['A','A','B']));const c=r.omissions[0].combinations[0];assert.deepEqual(c.exact,[]);assert.equal(c.unknownCompatible.length,2);assert.equal(c.comparison,'no-exact-support');});
test('two examples and unknown training labels remain unavailable',()=>{assert.ok(inspectCueSupport(study([['0'],['1']],['A','B'])).omissions.every(o=>o.status==='insufficient-other-examples'));assert.equal(inspectCueSupport(study([['0'],['1'],['2']],['A',null,'B'])).omissions[0].status,'unknown-decisions');});

