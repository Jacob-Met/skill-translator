import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeToolAccess,createToolStudy,importToolStudy} from '../src/tool-access.mjs';
const source={title:'Authored edge access',provenance:'Analytic authored control',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'a',label:'A',sourcePx:{x:20,y:20},kind:'edge_offset_mm',edge:'left',toleranceMm:1},{id:'b',label:'B',sourcePx:{x:80,y:60},kind:'edge_offset_mm',edge:'right',toleranceMm:1}],unknowns:['Force and material response unknown']};
const tool={label:'Authored tool',basis:'Analytic fixture, not measured equipment',evidenceClass:'authored-example',minDepthMm:0,maxDepthMm:25,halfWidthMm:10,edges:['left','right','top','bottom']};
test('opposite-edge adaptation enumerates every minimal complete setup',()=>{
 const r=analyzeToolAccess(source,100,80,tool);
 assert.deepEqual(r.rows.map(r=>r.compatibleEdges),[['left','top'],['right','bottom']]);
 assert.deepEqual(r.minimalSetups.map(s=>s.edges),[['left','right'],['right','top'],['left','bottom'],['top','bottom']]);
 assert.deepEqual(r.uncovered,[]);assert.deepEqual(r.rows.map(r=>[r.xMm,r.yMm]),[[20,20],[80,60]]);
});
test('changed workpiece keeps fixed clearances while changing approaches',()=>{
 const r=analyzeToolAccess(source,200,160,tool);
 assert.deepEqual(r.rows.map(r=>[r.xMm,r.yMm]),[[20,40],[180,120]]);
 assert.deepEqual(r.minimalSetups.map(s=>s.edges),[['left','right']]);
});
test('unavailable edge and incomplete coverage remain explicit',()=>{
 const r=analyzeToolAccess(source,200,160,{...tool,edges:['left']});
 assert.deepEqual(r.uncovered,['b']);assert.deepEqual(r.minimalSetups,[]);
 const a=r.rows[1].approaches.find(a=>a.edge==='right');assert.equal(a.conflicts.length,0);assert.equal(a.compatible,false);
 assert.equal(analyzeToolAccess(source,100,80,{...tool,edges:[]}).uncovered.length,2);
});
test('signed throat and lateral margins explain distinct failures',()=>{
 const r=analyzeToolAccess(source,100,80,{...tool,minDepthMm:21,halfWidthMm:25});
 const a=r.rows[0].approaches.find(a=>a.edge==='left');
 assert.equal(a.margins.minimumDepthMm,-1);assert.equal(a.margins.firstSideMm,-5);
 assert.deepEqual(a.conflicts,['minimumDepthMm','firstSideMm']);assert.deepEqual(r.uncovered,['a','b']);
});
test('boundary contact accepted; smaller throat refuses',()=>{
 assert.equal(analyzeToolAccess(source,100,80,{...tool,maxDepthMm:20,halfWidthMm:20}).uncovered.length,0);
 assert.equal(analyzeToolAccess(source,100,80,{...tool,maxDepthMm:19.99,halfWidthMm:20}).uncovered.length,2);
});
test('zero depth modeled explicitly; placement tolerance never enlarges reach',()=>{
 const s=structuredClone(source);s.landmarks[0].sourcePx.x=0;s.landmarks[0].toleranceMm=50;
 assert.equal(analyzeToolAccess(s,100,80,{...tool,edges:['left'],maxDepthMm:0}).rows[0].compatibleEdges[0],'left');
 assert.equal(analyzeToolAccess(source,100,80,{...tool,maxDepthMm:19}).uncovered.length,2);
});
test('invalid inputs and impossible invariant refuse',()=>{
 for(const patch of [{maxDepthMm:NaN},{minDepthMm:26},{halfWidthMm:-1},{edges:['left','left']},{edges:['spine']},{basis:''},{evidenceClass:'verified'}])assert.throws(()=>analyzeToolAccess(source,100,80,{...tool,...patch}));
 assert.throws(()=>analyzeToolAccess(source,10,80,tool),/cannot fit/);
});
test('source-bound reopen recomputes and ignores saved verdicts',()=>{
 const bundle=createToolStudy(source,200,160,tool),saved=JSON.parse(JSON.stringify(bundle));saved.result={uncovered:[],safe:true};
 assert.deepEqual(importToolStudy(saved),bundle);
 for(const mutate of [b=>b.source.landmarks[0].sourcePx.x=21,b=>b.source.source.widthMm=101]){const b=structuredClone(bundle);mutate(b);assert.throws(()=>importToolStudy(b),/differ/);}
 assert.deepEqual(source.unknowns,bundle.source.unknowns);
});
test('tool comparison changes setup without changing source or prior inputs',()=>{
 const before=JSON.stringify(source),a=createToolStudy(source,200,160,tool),b=createToolStudy(source,200,160,{...tool,maxDepthMm:200,halfWidthMm:0});
 assert.equal(analyzeToolAccess(b.source,200,160,b.tool).minimalSetups.length,4);
 assert.equal(a.tool.maxDepthMm,25);assert.equal(JSON.stringify(source),before);
});

test('large source metadata cannot produce an unreopenable study',()=>{assert.throws(()=>createToolStudy({...source,extra:'x'.repeat(262144)},100,80,tool),/256 KiB/);});
