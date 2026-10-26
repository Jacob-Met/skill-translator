import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeInstrumentChanges} from '../src/instrument-change-proposals.mjs';
const samples=(kind,n=47)=>Array.from({length:n},(_,i)=>({timeSeconds:i*.13,value:kind==='flat'?3:kind==='ramp'?2+i/7:kind==='spike'?(i===31?8:3):kind==='sine'?3+Math.sin(4*Math.PI*i/(n-1)):i<23?3:7}));
test('proposes a retained sample boundary without entered threshold, direction or run length',()=>{
 const raw=samples('step'),before=JSON.stringify(raw),r=proposeInstrumentChanges(raw,{maximumGapSeconds:.2}),q=r.inquiries[0];assert.equal(q.status,'preferred');assert.equal(q.boundary.beforeIndex,22);assert.equal(q.boundary.afterIndex,23);assert.equal(q.leftIndexes.length,23);assert.equal(q.rightIndexes.length,24);assert.equal(JSON.stringify(raw),before);assert.deepEqual(r.samples,raw);
});
test('flat trend isolated spike and oscillation alternatives remain visible rather than called changes',()=>{
 for(const kind of ['flat','ramp','spike','sine']){const q=proposeInstrumentChanges(samples(kind),{maximumGapSeconds:.2}).inquiries[0];assert.equal(q.status,'alternative-preferred',kind);assert.ok(Object.keys(q.fit.alternatives).includes(kind==='flat'?'constant':kind==='ramp'?'linear':kind==='sine'?'periodic':kind));}
});
test('a changed level across an unobserved gap never becomes a sampled change boundary',()=>{
 const raw=[...samples('flat',17),...samples('flat',19).map(s=>({...s,timeSeconds:s.timeSeconds+20,value:9}))],r=proposeInstrumentChanges(raw,{maximumGapSeconds:.2});assert.deepEqual(r.gaps,[{beforeIndex:16,afterIndex:17}]);assert.equal(r.inquiries.length,2);assert.ok(r.inquiries.every(q=>q.status==='alternative-preferred'));assert.ok(r.inquiries.every(q=>!(q.boundary.beforeIndex===16&&q.boundary.afterIndex===17)));
});
test('unit conversion and timestamp offset preserve a clear model comparison and original indexes',()=>{
 const raw=samples('step'),q=proposeInstrumentChanges(raw,{maximumGapSeconds:.2}).inquiries[0],shifted=raw.map(s=>({timeSeconds:17+2*s.timeSeconds,value:-1000*s.value+1e8})),r=proposeInstrumentChanges(shifted,{maximumGapSeconds:.4}).inquiries[0];assert.equal(r.status,q.status);assert.equal(r.boundary.beforeIndex,q.boundary.beforeIndex);assert.equal(r.boundary.afterIndex,q.boundary.afterIndex);assert.ok(Math.abs(r.fit.improvement-q.fit.improvement)<1e-7);
});
test('missing and numerically unsupported courses remain explicitly unavailable',()=>{
 assert.equal(proposeInstrumentChanges(samples('step',5),{maximumGapSeconds:.2}).inquiries[0].status,'insufficient');const raw=samples('step',9);raw[1].timeSeconds=1e-15;assert.equal(proposeInstrumentChanges(raw,{maximumGapSeconds:.2}).inquiries[0].status,'insufficient');
 const close=samples('step',9);close[1].timeSeconds=1e-15;assert.equal(proposeInstrumentChanges(close,{maximumGapSeconds:1}).inquiries[0].status,'numerically-unresolved');
});
test('malformed samples and invalid adjacency cannot silently become a preferred result',()=>{
 for(const values of [[...samples('flat'),{timeSeconds:0,value:2}],samples('flat').map((s,i)=>i===3?{...s,value:NaN}:s),samples('flat').map((s,i)=>i===3?{...s,timeSeconds:Infinity}:s)])assert.throws(()=>proposeInstrumentChanges(values,{maximumGapSeconds:.2}));
 for(const maximumGapSeconds of [0,-1,Infinity,'1',3601])assert.throws(()=>proposeInstrumentChanges(samples('flat'),{maximumGapSeconds}));
});
