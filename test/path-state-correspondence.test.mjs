import test from 'node:test';
import assert from 'node:assert/strict';
import {proposePathCorrespondences} from '../src/path-correspondence.mjs';
import {inspectSequencePath} from '../src/sequence-path.mjs';
import {createPathTiming,importPathTiming,inspectPathTiming} from '../src/path-timing.mjs';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
const labels=['Guide open','Point touching guide','Guide released','Operation ended'];
const options={sameCoordinateFrame:true,maxDistanceMm:.001,sharedVisibleStateCategories:true};
function account(texts,points=texts.map(()=>[20,20]),times=undefined){const path=pathAccount(pathFixture(points,times?{times}:{}));path.sequence.moments.forEach((m,i)=>m.visibleState=texts[i]);return path;}
test('already-authored state categories disambiguate repeated geometry and reach unchanged timing',()=>{
 const a=account(labels,undefined,[0,1,4,6]),b=account(labels,undefined,[10,12,13,19]),before=JSON.stringify([a,b]);
 const baseline=proposePathCorrespondences(a,b,{sameCoordinateFrame:true,maxDistanceMm:.001});assert.equal(baseline.alignmentCount,'63');assert.equal(baseline.status,'endpoints-only');
 const r=proposePathCorrespondences(a,b,options);assert.equal(r.alignmentCount,'1');assert.equal(r.forcedPairs.length,4);assert.equal(r.proposals.length,3);assert.equal(r.stateConstraint.excludedGeometricPairs,12);
 const study=createPathTiming(a,b,r.proposals.map((p,i)=>({...p,label:'Confirmed authored phase '+i})));
 assert.deepEqual(inspectPathTiming(study).rows.map(r=>r.elapsedRatio),[2,1/3,3]);assert.deepEqual(importPathTiming(JSON.parse(JSON.stringify(study))),study);assert.equal(JSON.stringify([a,b]),before);
 assert.ok(study.correspondences.every(c=>c.basis.includes('declared shared literal visible-state categories')));
});
test('generic descriptions and absent descriptions remain ambiguous; blanks impose no agreement evidence',()=>{
 const known=account(labels),generic=account(Array(4).fill('Point visible')),empty=account(Array(4).fill(''));
 for(const [a,b]of [[generic,generic],[empty,empty],[known,empty]])assert.equal(proposePathCorrespondences(a,b,options).alignmentCount,'63');
 const r=proposePathCorrespondences(known,empty,options);assert.equal(r.stateConstraint.unknownSamples.right.length,4);assert.equal(r.stateConstraint.excludedGeometricPairs,0);assert.ok([...r.forcedPairs,...r.ambiguousPairs].every(p=>p.visibleStates.constrained===false&&p.visibleStates.right===null));
 const partial=account([labels[0],'',labels[2],labels[3]]);assert.ok(BigInt(proposePathCorrespondences(known,partial,options).alignmentCount)>=1n);
});
test('category agreement cannot rescue geometry or contradicted order; no synonym interpretation is invented',()=>{
 const a=account(labels);
 for(const b of [account([labels[0],labels[2],labels[1],labels[3]]),account(labels,labels.map(()=>[25,20])),account([labels[0],'Point contacting guide',labels[2],labels[3]])]){
  const r=proposePathCorrespondences(a,b,options);assert.equal(r.status,'no-alignment');assert.deepEqual(r.proposals,[]);
 }
});
test('state descriptions follow selected original identities rather than array positions',()=>{
 const a=account(labels),b=account(labels);a.samples.splice(1,1);b.samples.splice(1,1);
 const r=proposePathCorrespondences(a,b,options);assert.equal(r.alignmentCount,'1');assert.deepEqual(r.stateConstraint.descriptions.left.map(x=>x.text),[labels[0],labels[2],labels[3]]);assert.deepEqual(r.proposals.map(p=>p.left.toMomentId),['moment-2','moment-3']);
});
test('missing geometry stays unavailable and malformed declaration refuses',()=>{
 const a=account(labels),b=account(labels);b.samples[1].markId=null;
 const r=proposePathCorrespondences(a,b,options);assert.equal(r.status,'missing-observations');assert.equal(r.stateConstraint.excludedGeometricPairs,null);assert.deepEqual(r.proposals,[]);
 assert.throws(()=>proposePathCorrespondences(a,a,{...options,sharedVisibleStateCategories:'yes'}));
 assert.throws(()=>proposePathCorrespondences(a,a,{...options,sameCoordinateFrame:false}));
});
test('default geometry remains unchanged; source admission alone trims outer whitespace and ignores forged findings',()=>{
 const a=account(labels),b=account(labels),baseOptions={sameCoordinateFrame:true,maxDistanceMm:.001};
 assert.deepEqual(proposePathCorrespondences(a,b,baseOptions),proposePathCorrespondences(a,b,{...baseOptions,sharedVisibleStateCategories:false}));
 b.sequence.moments[1].visibleState='  '+labels[1]+'  ';b.findings={alignmentCount:'999',stateConstraint:{excludedGeometricPairs:999}};
 assert.equal(proposePathCorrespondences(a,b,options).alignmentCount,'1');b.sequence.moments[1].visibleState='Different authored category';assert.equal(proposePathCorrespondences(a,b,options).alignmentCount,'0');
});
test('120 independent complete-path enumerations agree on counts and necessary pairs with unknown categories',()=>{
 let seed=413577;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let course=0;course<120;course++){
  const make=()=>{const n=2+Math.floor(random()*4),states=Array.from({length:n},()=>['A','B',''][Math.floor(random()*3)]),points=Array.from({length:n},()=>[20+Math.floor(random()*3),20+Math.floor(random()*3)]);return account(states,points);};
  const left=make(),right=make(),a=inspectSequencePath(left).samples,b=inspectSequencePath(right).samples,bound=1.5;
  let count=0,common=null;function visit(i,j,path){if(i>=a.length||j>=b.length)return;const x=a[i].position,y=b[j].position,s=left.sequence.moments[i].visibleState,t=right.sequence.moments[j].visibleState;if(Math.hypot(x.xMm-y.xMm,x.yMm-y.yMm)>bound||(s&&t&&s!==t))return;const next=[...path,i+','+j];if(i===a.length-1&&j===b.length-1){count++;const set=new Set(next);common=common===null?set:new Set([...common].filter(k=>set.has(k)));return;}visit(i+1,j,next);visit(i,j+1,next);visit(i+1,j+1,next);}visit(0,0,[]);
  const actual=proposePathCorrespondences(left,right,{...options,maxDistanceMm:bound});assert.equal(actual.alignmentCount,String(count));assert.deepEqual(actual.forcedPairs.map(p=>p.leftIndex+','+p.rightIndex).sort(),[...(common??[])].sort());
 }
});
