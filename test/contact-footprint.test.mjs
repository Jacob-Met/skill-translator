import test from 'node:test';import assert from 'node:assert/strict';
import {declaredPatch,inspectContactPatch,createContactStudy,importContactStudy,saveContactPatch,removeContactPatch,retargetContactStudy,inspectContactStudy} from '../src/contact-footprint.mjs';
const demo={provenance:'Authored axes',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'guide',label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:40},toleranceMm:1}]};
const rectangle=(extra={})=>({label:'Authored stamp contact patch',provenance:'Analytic fixture',evidenceKind:'authored',kind:'rectangle',widthMm:50,heightMm:10,anchorMm:{x:0,y:0},angleDeg:0,...extra});
const inspect=p=>inspectContactPatch(demo,'guide',100,80,p);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} versus${b}`);
test('a point fits while a finite patch overhangs; rotation changes the declared envelope',()=>{
 const a=inspect(rectangle()),b=inspect(rectangle({angleDeg:90}));
 assert.deepEqual(a.mark,b.mark);assert.equal(a.clearancesMm.left,-5);assert.equal(a.state,'overhang');
 assert.deepEqual(b.clearancesMm,{left:15,right:75,top:15,bottom:15});assert.equal(b.state,'inside');
});
test('rectangle analytic extrema equal independently enumerated corners over many orientations',()=>{
 for(let degrees=-359;degrees<360;degrees+=7){const p=inspect(rectangle({angleDeg:degrees,anchorMm:{x:4,y:-2}}));
  near(p.extrema.minX,Math.min(...p.corners.map(c=>c.x)));near(p.extrema.maxX,Math.max(...p.corners.map(c=>c.x)));
  near(p.extrema.minY,Math.min(...p.corners.map(c=>c.y)));near(p.extrema.maxY,Math.max(...p.corners.map(c=>c.y)));
 }
});
test('circle extrema are analytic and orientation changes only an offset registration center',()=>{
 const raw={label:'Disk',provenance:'Authored',evidenceKind:'authored',kind:'circle',radiusMm:10,anchorMm:{x:3,y:4},angleDeg:0};
 const a=inspect(raw),b=inspect({...raw,angleDeg:90});assert.deepEqual(a.center,{x:17,y:36});assert.deepEqual(b.center,{x:24,y:37});
 assert.deepEqual(a.extrema,{minX:7,maxX:27,minY:26,maxY:46});assert.deepEqual(b.extrema,{minX:14,maxX:34,minY:27,maxY:47});
});
test('offset anchor lands exactly on the unchanged transferred goal',()=>{
 const p=inspect(rectangle({angleDeg:37,anchorMm:{x:12,y:3}})),c=Math.cos(37*Math.PI/180),s=Math.sin(37*Math.PI/180);
 near(p.center.x+c*12-s*3,p.mark.xMm);near(p.center.y+s*12+c*3,p.mark.yMm);
 const changed=inspectContactPatch(demo,'guide',200,160,rectangle());assert.equal(changed.mark.xMm,20);assert.equal(changed.mark.yMm,80);
});
test('exact edge contact remains distinct from a clear interior and preserves zero clearance',()=>{
 const p=inspect(rectangle({widthMm:40}));assert.equal(p.clearancesMm.left,0);assert.equal(p.state,'numerical_boundary');assert.ok(p.numericBoundaryScaleMm<1e-9);
});
test('invalid geometry, ungrounded source identity and outside anchors refuse',()=>{
 for(const patch of [rectangle({widthMm:0}),rectangle({heightMm:NaN}),rectangle({angleDeg:Infinity}),rectangle({anchorMm:{x:26,y:0}}),rectangle({provenance:''})])assert.throws(()=>declaredPatch(patch));
 assert.throws(()=>inspectContactPatch(demo,'unknown',100,80,rectangle()));assert.throws(()=>inspectContactPatch(demo,'guide',10,80,rectangle()));
});
test('a saved study replays actual declarations and ignores stored conclusions',()=>{
 const s=saveContactPatch(createContactStudy(demo,'guide',100,80),'wide',rectangle());
 const raw=JSON.parse(JSON.stringify(s));raw.results=[{state:'inside',minimumClearanceMm:100}];
 assert.deepEqual(importContactStudy(raw),s);assert.equal(inspectContactStudy(raw)[0].state,'overhang');
 raw.source.landmarks[0].sourcePx.x=30;assert.throws(()=>importContactStudy(raw),/differs/);
 const changed=structuredClone(demo);changed.landmarks[0].toleranceMm=2;assert.throws(()=>importContactStudy(s,changed),/differs/);
});
test('editing and removing alternatives retain stable IDs without changing source/task rules',()=>{
 let s=saveContactPatch(createContactStudy(demo,'guide',100,80),'wide',rectangle());s=saveContactPatch(s,'other',rectangle({widthMm:10}));const before=JSON.stringify(s);
 assert.throws(()=>saveContactPatch(s,'wide',rectangle({widthMm:0})));assert.equal(JSON.stringify(s),before);
 s=saveContactPatch(s,'wide',rectangle({angleDeg:90}));assert.deepEqual(s.patches.map(p=>p.id),['wide','other']);assert.equal(inspectContactStudy(s)[0].state,'inside');assert.deepEqual(s.source,demo);
 s=removeContactPatch(s,'wide');assert.deepEqual(s.patches.map(p=>p.id),['other']);assert.throws(()=>removeContactPatch(s,'missing'));
});
test('retargeting recomputes transferred positions while retaining declared patches',()=>{
 const s=saveContactPatch(createContactStudy(demo,'guide',100,80),'wide',rectangle()),next=retargetContactStudy(s,'guide',200,160);
 assert.deepEqual(next.patches,s.patches);assert.deepEqual(inspectContactStudy(next)[0].mark,{id:'guide',xMm:20,yMm:80});assert.equal(inspectContactStudy(s)[0].mark.yMm,40);
});
test('dense alternatives, source identity and budgets are checked before acceptance',()=>{
 const s=createContactStudy(demo,'guide',100,80);assert.throws(()=>importContactStudy({...s,patches:Array(1)}));
 assert.throws(()=>importContactStudy({...s,patches:Array.from({length:9},(_,i)=>({id:'p'+i,...rectangle()}))}));
 const bad=structuredClone(demo);bad.source.image={sha256:'bad',widthPx:100,heightPx:80};assert.throws(()=>createContactStudy(bad,'guide',100,80),/image identity/);
 const large=structuredClone(demo);large.provenance='漢'.repeat(90000);assert.throws(()=>createContactStudy(large,'guide',100,80),/256 KiB/);
});
