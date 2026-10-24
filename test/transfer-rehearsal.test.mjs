import test from 'node:test';
import assert from 'node:assert/strict';
import {createRehearsal,importRehearsal,inspectRehearsal,placeRehearsal,revealRehearsal,submitRehearsal,advanceRehearsal} from '../src/transfer-rehearsal.mjs';
const source=()=>({title:'Authored control',provenance:'Synthetic axes',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[
 {id:'edge',label:'Left clearance',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:40},toleranceMm:1},
 {id:'ratio',label:'Quarter width',kind:'fraction',sourcePx:{x:25,y:20},toleranceMm:1}]});
const plan=[{widthMm:200,heightMm:160},{widthMm:80,heightMm:120}];
const fresh=()=>createRehearsal(source(),plan);
test('different workpieces use maintained physical and proportional semantics',()=>{
 let s=fresh();s=placeRehearsal(s,'edge',{xMm:20,yMm:80});s=placeRehearsal(s,'ratio',{xMm:50,yMm:40});
 assert.equal(inspectRehearsal(s).trials[0].result,null);
 s=submitRehearsal(s);assert.equal(inspectRehearsal(s).trials[0].result.passed,true);
 s=advanceRehearsal(s);s=placeRehearsal(s,'edge',{xMm:20,yMm:60});s=placeRehearsal(s,'ratio',{xMm:20,yMm:30});s=submitRehearsal(s);
 assert.equal(inspectRehearsal(s).trials[1].result.passed,true);assert.equal(inspectRehearsal(s).complete,true);
});
test('requesting targets retains the exact pre-help attempt and persists after changes',()=>{
 let s=placeRehearsal(fresh(),'edge',{xMm:40,yMm:80});s=revealRehearsal(s);s=placeRehearsal(s,'edge',{xMm:20,yMm:80});
 const r=inspectRehearsal(s).trials[0];assert.equal(r.reveals[0].priorAttempts[0].xMm,40);assert.equal(r.attempts[0].xMm,20);
 assert.equal(r.assistance,'targets_requested');assert.equal(r.result,null);
 assert.deepEqual(inspectRehearsal(importRehearsal(JSON.parse(JSON.stringify(s)))),inspectRehearsal(s));
});
test('submission freezes partial attempts and preserves missing marks',()=>{
 let s=submitRehearsal(placeRehearsal(fresh(),'edge',{xMm:21,yMm:80}));
 assert.equal(inspectRehearsal(s).trials[0].result.complete,false);assert.deepEqual(inspectRehearsal(s).trials[0].result.missing,['ratio']);
 assert.throws(()=>placeRehearsal(s,'ratio',{xMm:50,yMm:40}),/cannot be revised/);assert.throws(()=>revealRehearsal(s),/cannot be revised/);
 const next=advanceRehearsal(s);assert.deepEqual(inspectRehearsal(next).trials[0],inspectRehearsal(s).trials[0]);
});
test('every new size starts with no placements or requested targets',()=>{
 const s=advanceRehearsal(submitRehearsal(revealRehearsal(fresh()))),t=inspectRehearsal(s).trials[1];
 assert.deepEqual(t.attempts,[]);assert.deepEqual(t.reveals,[]);assert.equal(t.result,null);assert.equal(t.assistance,'no_targets_requested_in_this_record');
});
test('event chronology and stored verdict tampering are checked or recomputed',()=>{
 assert.throws(()=>advanceRehearsal(fresh()),/Submit/);
 assert.throws(()=>importRehearsal({...fresh(),events:[{type:'submit'},{type:'place',id:'edge',xMm:20,yMm:80}]}),/cannot be revised/);
 const s=submitRehearsal(fresh());s.results={passed:true};assert.equal(inspectRehearsal(s).trials[0].result.passed,false);
 s.events=[{type:'unknown'}];assert.throws(()=>importRehearsal(s),/Unsupported/);
});
test('invalid workpieces and placements refuse without mutating accepted record',()=>{
 const s=fresh(),before=JSON.stringify(s);
 for(const point of [{xMm:-1,yMm:5},{xMm:201,yMm:5},{xMm:NaN,yMm:5}])assert.throws(()=>placeRehearsal(s,'edge',point));
 assert.throws(()=>placeRehearsal(s,'missing',{xMm:10,yMm:10}));assert.equal(JSON.stringify(s),before);
 for(const p of [[plan[0]],Array(2),[plan[0],plan[0]],[plan[0],{widthMm:10,heightMm:10}]])assert.throws(()=>createRehearsal(source(),p));
 const invalidImage=source();invalidImage.source.image={sha256:'bad',widthPx:100,heightPx:80};assert.throws(()=>createRehearsal(invalidImage,plan),/image identity/);
});
test('source and plan custody are copied and action/source budgets enforced',()=>{
 const d=source(),p=structuredClone(plan),s=createRehearsal(d,p);d.landmarks[0].sourcePx.x=99;p[0].widthMm=999;
 assert.equal(s.source.landmarks[0].sourcePx.x,20);assert.equal(s.plan[0].widthMm,200);
 assert.throws(()=>importRehearsal({...s,events:Array.from({length:2049},()=>({type:'reveal'}))}),/2048/);
 const oversized=source();oversized.provenance='漢'.repeat(90000);assert.throws(()=>createRehearsal(oversized,plan),/256 KiB/);
});
