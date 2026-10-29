import{profileTranslatedBrightnessIntervals}from'../src/visual-translation.mjs';
const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
function context(n,even){const make=k=>{const rgba=new Uint8ClampedArray(n*n*4);let pos=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const inside=x>0&&y>0&&x<n-1&&y<n-1,i=inside?pos++:-1;const v=k===0||k===3?30:k===1?(i>=(even?18:33)?40:30):even?40:(i>=16?40:30);rgba.set([v,v,v,255],4*(y*n+x));}return{widthPx:n,heightPx:n,rgba};};const frames=[0,1,2,3].map(make),p=pairs.map(([i,j])=>profileTranslatedBrightnessIntervals(frames[i],frames[j],{radius:1}));return{frames,source:{format:'AUTHORED-ISOLATED-ADAPTER-CONTROL',frameCount:4,n},profiles:p.map(x=>x.profile),intervals:p.map(x=>x.intervals),optimalIntegerResidual:p.reduce((s,x)=>s+x.profile.candidates[4].absoluteResidual,0)};}

import assert from 'node:assert/strict';import{minimizeQuadrupleAppearanceCosts}from'../src/appearance-quadruple.mjs';import{profileTranslatedSamples}from'../src/visual-translation.mjs';import{inspectSelectedBrightness}from'../src/appearance-brightness-consistency.mjs';import{writeFile}from'node:fs/promises';
const reports=[];let accountCount=0,refusals=0;
for(const even of[false,true]){const ctx=context(even?8:9,even);const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],incumbent=pairs.map(([a,b])=>profileTranslatedSamples(ctx.frames[a],ctx.frames[b],{radius:1}));assert.deepEqual(ctx.profiles,incumbent);const suppliedProfiles=ctx.profiles;const r=minimizeQuadrupleAppearanceCosts(suppliedProfiles,{limit:20});assert.deepEqual(r,minimizeQuadrupleAppearanceCosts(incumbent,{limit:20}));ctx.optimalIntegerResidual=r.optimalIntegerResidual;const answers=[];
 for(let offset=0;offset<r.count;offset+=20){const page=minimizeQuadrupleAppearanceCosts(ctx.profiles,{offset,limit:20}).page;for(let i=0;i<page.indexes.length;i++){const selection={source:structuredClone(ctx.source),positions:page.accounts[i].positions,indexes:page.indexes[i]};const answer=inspectSelectedBrightness(ctx,selection);assert.equal(answer.selectedIntegerResidual,r.optimalIntegerResidual);assert.equal(answer.status,even?'feasible':'contradiction');answers.push(answer);accountCount++;
 for(const mutate of[s=>s.source.n++,s=>s.indexes[0]=-1,s=>s.positions[1].dx+=10,s=>s.indexes.push(4)]){const bad=structuredClone(selection);mutate(bad);assert.throws(()=>inspectSelectedBrightness(ctx,bad));refusals++;}
 }}
 assert.equal(answers.length,even?32:4);assert.equal(r.optimalIntegerResidual,even?1380:2160);
 if(even){assert(answers.some(a=>a.intervals.some(i=>i.lower<i.upper)));assert(answers.some(a=>a.intervals[0].lower+a.intervals[3].lower!==a.intervals[1].lower));}
 else assert(answers.every(a=>a.intervals.every(i=>i.lower===i.upper)&&BigInt(a.sum.integer)<0n));
 // A valid but nonoptimal zero account must not pass the maintained optimum gate.
 if(!even){assert.throws(()=>inspectSelectedBrightness(ctx,{source:ctx.source,positions:Array.from({length:4},()=>({dx:0,dy:0})),indexes:[4,4,4,4,4,4]}),/minimum-cost/);refusals++;}
 reports.push({even,channelCount:ctx.profiles[0].channelCount,maintainedResult:r,answers});
}
// Explicit native simulation of parent ownership gate; not browser/worker execution.
let revision=0,worker={},source='A',selected='first';const capture=()=>({revision,worker,source,selected});const current=t=>t.revision===revision&&t.worker===worker&&t.source===source&&t.selected===selected;
const old=capture();selected='second';assert(!current(old));selected='first';revision++;assert(!current(old));const beforeABA=capture();source='B';revision++;source='A';revision++;assert(!current(beforeABA));const beforeWorker=capture();worker={};assert(!current(beforeWorker));
console.log({accountCount,refusals,scope:'Native authored raster and gate controls; no browser claim'});
