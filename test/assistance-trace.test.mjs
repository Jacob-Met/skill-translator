import test from 'node:test';import assert from 'node:assert/strict';
import {createRehearsal,placeRehearsal,revealRehearsal,submitRehearsal,advanceRehearsal} from '../src/transfer-rehearsal.mjs';
import {inspectAssistanceTrace} from '../src/assistance-trace.mjs';
const source={source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',sourcePx:{x:25,y:25},kind:'fraction',toleranceMm:1},{id:'b',label:'B',sourcePx:{x:75,y:75},kind:'fraction',toleranceMm:1}]};
const fresh=()=>createRehearsal(source,[{widthMm:100,heightMm:100},{widthMm:200,heightMm:100}]);
test('revisions before first help remain visible separately from post-help correction',()=>{
 let r=placeRehearsal(fresh(),'a',{xMm:45,yMm:25});r=placeRehearsal(r,'a',{xMm:30,yMm:25});r=revealRehearsal(r);r=placeRehearsal(r,'a',{xMm:25,yMm:25});r=submitRehearsal(r);
 const t=inspectAssistanceTrace(r,0,'a');assert.deepEqual(t.entries.map(e=>e.evaluation.errorMm),[20,5,5,0,0]);assert.deepEqual(t.entries.map(e=>e.requestsBefore),[0,0,0,1,1]);assert.deepEqual(t.entries.filter(e=>e.type==='place').map(e=>e.movementMm),[null,15,5]);
});
test('repeated and worsening placements are retained without assumed recovery',()=>{
 let r=placeRehearsal(fresh(),'a',{xMm:25,yMm:25});r=placeRehearsal(r,'a',{xMm:25,yMm:25});r=placeRehearsal(r,'a',{xMm:40,yMm:25});r=submitRehearsal(r);
 const t=inspectAssistanceTrace(r,0,'a');assert.equal(t.entries.length,4);assert.equal(t.entries[1].movementMm,0);assert.equal(t.final.evaluation.errorMm,15);
});
test('unplaced marks preserve request boundaries without fabricated coordinates',()=>{
 let r=revealRehearsal(fresh());r=revealRehearsal(r);r=submitRehearsal(r);const t=inspectAssistanceTrace(r,0,'a');assert.deepEqual(t.entries.map(e=>e.requestsAfter),[1,2,2]);assert.ok(t.entries.every(e=>e.point===null&&e.evaluation===null));assert.equal(t.final.placed,false);
});
test('unsubmitted traces expose neither coordinate histories nor computed targets',()=>{
 const r=revealRehearsal(placeRehearsal(fresh(),'a',{xMm:45,yMm:25}));const t=inspectAssistanceTrace(r,0,'a');assert.deepEqual(t.entries,[]);assert.equal(t.target,null);assert.equal(t.final,null);
});
test('selected trial uses its changed dimensions and original global event indices',()=>{
 let r=submitRehearsal(fresh());r=advanceRehearsal(r);r=placeRehearsal(r,'b',{xMm:150,yMm:75});r=placeRehearsal(r,'a',{xMm:50,yMm:25});r=submitRehearsal(r);const t=inspectAssistanceTrace(r,1,'a');assert.deepEqual(t.entries.map(e=>e.actionIndex),[3,4]);assert.equal(t.entries[0].requestsBefore,0);assert.equal(t.entries[0].evaluation.errorMm,0);assert.deepEqual(t.target,{xMm:50,yMm:25});
});
test('imported cached traces cannot alter raw records or recomputed results',()=>{
 const r=submitRehearsal(placeRehearsal(fresh(),'a',{xMm:45,yMm:25})),before=JSON.stringify(r);const t=inspectAssistanceTrace({...r,entries:[{evaluation:{errorMm:0}}]},0,'a');assert.equal(t.entries[0].evaluation.errorMm,20);assert.equal(JSON.stringify(r),before);assert.deepEqual(inspectAssistanceTrace(JSON.parse(before),0,'a'),t);
});
test('unknown marks, invalid trials and invalid histories are refused',()=>{
 const r=fresh();for(const i of [-1,2,.5,'0'])assert.throws(()=>inspectAssistanceTrace(r,i,'a'));assert.throws(()=>inspectAssistanceTrace(r,0,'foreign'));assert.throws(()=>inspectAssistanceTrace({...r,events:[{type:'advance'}]},0,'a'));
});
