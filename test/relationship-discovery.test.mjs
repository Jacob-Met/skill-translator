import test from 'node:test';
import assert from 'node:assert/strict';
import {DISCOVERY_FORMAT,discoverRelationships,importRelationshipDiscovery,compareDiscoveredTransfer} from '../src/relationship-discovery.mjs';
export function sample(points=[[20,30],[50,70]],width=200,height=150){return {title:'Authored geometry control',provenance:'Analytic authored example',source:{widthMm:width,heightMm:height,corners:[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}]},landmarks:points.map((p,i)=>({id:['a','b','c'][i],label:['A','B','C'][i],kind:'fraction',sourcePx:{x:p[0],y:p[1]},toleranceMm:1}))};}
export function account(annotations=[sample(),sample([[80,40],[40,70]],240,180)]){return {format:DISCOVERY_FORMAT,deviationMm:.001,demonstrations:annotations.map((annotation,i)=>({id:`example-${i}`,annotation,correspondenceConfirmed:true,evidenceClass:'authored-example'}))};}
test('discovers rotation-invariant distance while rejecting directed components without authored pair entries',()=>{
 const raw=account(),before=JSON.stringify(raw),r=discoverRelationships(raw);
 assert.deepEqual(r.counts,{repeatable:1,contradicted:2,incomplete:0});
 const d=r.candidates.find(c=>c.kind==='distance');assert.equal(d.status,'repeatable');assert.ok(Math.abs(d.minMm-50)<1e-9);
 assert.equal(JSON.stringify(raw),before);assert.equal(r.candidates.length,3);
});
test('an unfamiliar scaled demonstration changes the previously repeatable proposal and retains contradiction witnesses',()=>{
 const raw=account();raw.demonstrations.push({...raw.demonstrations[0],id:'scale-control',annotation:sample([[12,14],[72,94]],317,229)});
 const r=discoverRelationships(raw);assert.equal(r.counts.repeatable,0);const d=r.candidates.find(c=>c.kind==='distance');assert.equal(d.status,'contradicted');assert.equal(d.witnesses.maximum,'scale-control');assert.ok(d.spreadMm>49.99);
});
test('missing correspondence cannot be discarded to claim complete support',()=>{
 const raw=account();raw.demonstrations[1].annotation.landmarks[1].id='c';
 assert.deepEqual(discoverRelationships(raw).counts,{repeatable:0,contradicted:0,incomplete:3});
 raw.demonstrations[1].correspondenceConfirmed=false;assert.throws(()=>discoverRelationships(raw),/Confirm/);
});
test('raw-only replay ignores forged findings and rejects invalid identities and threshold',()=>{
 const raw=account();raw.candidates=[{status:'repeatable'}];assert.equal(importRelationshipDiscovery(raw).candidates,undefined);
 const reopened=discoverRelationships(JSON.parse(JSON.stringify(importRelationshipDiscovery(raw))));assert.equal(reopened.counts.repeatable,1);
 raw.demonstrations[1].id=raw.demonstrations[0].id;assert.throws(()=>discoverRelationships(raw),/unique/);
 raw.demonstrations[1].id='two';raw.deviationMm=NaN;assert.throws(()=>discoverRelationships(raw),/deviation/);
});
test('image-backed annotations reuse maintained metadata and in-image admission without claiming pixel verification',()=>{
 const raw=account();raw.demonstrations[0].annotation.source.image={sha256:'bad'};assert.throws(()=>discoverRelationships(raw));
 raw.demonstrations[0].annotation.source.image={sha256:'a'.repeat(64),widthPx:200,heightPx:150,mimeType:'image/png',pixelCoordinates:'browser-oriented',name:'source.png'};
 assert.equal(discoverRelationships(raw).counts.repeatable,1);
 raw.demonstrations[0].annotation.source.image.widthPx=100;assert.throws(()=>discoverRelationships(raw),/inside the source image/);
});
test('new workpiece comparison exposes existing authored adaptation disagreement without changing rules',()=>{
 const raw=account(),before=JSON.stringify(raw),r=compareDiscoveredTransfer(raw,400,300),d=r.candidates.find(c=>c.kind==='distance');
 assert.ok(Math.abs(d.authoredTargetMm-100)<1e-9);assert.ok(d.outsideObservedRangeMm>49.99);assert.equal(JSON.stringify(raw),before);
 assert.throws(()=>compareDiscoveredTransfer(raw,0,300),/Target width/);
});
test('independent direct coordinate oracle across unfamiliar sheets, permutations and translations',()=>{
 for(let n=1;n<=70;n++){
  const a=[10+n/3,11+n/7],b=[45+n/4,61+n/9],dx=b[0]-a[0],dy=b[1]-a[1];
  const r=discoverRelationships(account([sample([a,b],211+n,193+n),sample([a.map(x=>x+7),b.map(x=>x+7)],313+n,297+n)]));
  assert.equal(r.counts.repeatable,3);
  for(const [kind,want] of [['horizontal',dx],['vertical',dy],['distance',Math.sqrt(dx*dx+dy*dy)]])assert.ok(Math.abs(r.candidates.find(c=>c.kind===kind).minMm-want)<1e-9);
 }
});
