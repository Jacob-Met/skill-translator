import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSharedMotionGroups} from '../src/shared-motion-groups.mjs';
import {fitProperPointPattern} from '../src/point-pattern-fit.mjs';
import {discoverRelationships,importRelationshipDiscovery} from '../src/relationship-discovery.mjs';
import {motionStudy,groupedFrames,turn,annotation} from './helpers/shared-motion-fixture.mjs';
const keys=result=>result.groups.map(g=>g.ids.join(',')).sort();
test('discovers two complete independently moving groups without any supplied group labels',()=>{
 const raw=motionStudy(),before=structuredClone(raw),r=inspectSharedMotionGroups(raw);
 assert.equal(r.status,'complete');assert.deepEqual(keys(r),['p0,p1,p2','p3,p4,p5']);assert.equal(r.counts.evaluated,57);
 assert.equal(r.counts.supported,8);assert.deepEqual(r.ungroupedPointIds,[]);assert.deepEqual(raw,before);
 for(const g of r.groups){assert.equal(g.motions.length,3);assert.ok(g.motions.every(f=>f.maxResidualMm<1e-10));}
 assert.ok(Math.abs(r.groups[0].motions[0].angleDegrees-27)<1e-10);
});
test('a changed source point removes its old group without accepting forged conclusions',()=>{
 const raw=motionStudy(),frames=groupedFrames();frames[2][2]=[frames[2][2][0]+12,frames[2][2][1]+8];
 const changed=motionStudy(frames);changed.groups=inspectSharedMotionGroups(raw).groups;
 const r=inspectSharedMotionGroups(changed);assert.ok(!keys(r).includes('p0,p1,p2'));assert.ok(keys(r).includes('p3,p4,p5'));
 assert.ok(r.subsets.some(s=>s.ids.join(',')==='p0,p1,p2'&&s.status==='outside-fit-threshold'));
});
test('all source pairs matter: two individually near-reference fits do not certify their difference',()=>{
 const base=[[20,20],[60,20],[35,65]],plus=base.map(p=>[...p]),minus=base.map(p=>[...p]);plus[2][0]+=1;minus[2][0]-=1;
 const raw=motionStudy([base,plus,minus],.55),r=inspectSharedMotionGroups(raw),whole=r.subsets.find(s=>s.ids.length===3);
 assert.equal(whole.status,'outside-fit-threshold');assert.equal(whole.witness.fromSourceId,'source-1');assert.equal(whole.witness.toSourceId,'source-2');
});
test('reflections may retain two-point alternatives but cannot become one proper-motion group',()=>{
 const base=[[20,20],[70,25],[35,80]],mirror=base.map(([x,y])=>[160-x,y]);
 const r=inspectSharedMotionGroups(motionStudy([base,mirror],.001));
 assert.deepEqual(keys(r),['p0,p1','p0,p2','p1,p2']);assert.ok(r.subsets.some(s=>s.ids.length===3&&s.status==='outside-fit-threshold'));
});
test('collapsed configurations remain unresolved and cannot be reported as a fitted group',()=>{
 const r=inspectSharedMotionGroups(motionStudy([[[30,30],[30,30],[30,30]],[[80,80],[80,80],[80,80]]],10));
 assert.deepEqual(r.groups,[]);assert.equal(r.counts.unresolvedOrientation,4);assert.deepEqual(r.ungroupedPointIds,['p0','p1','p2']);
});
test('missing point observations remain explicit while independently complete groups survive',()=>{
 const raw=motionStudy();raw.demonstrations[1].annotation.landmarks.splice(2,1);
 const r=inspectSharedMotionGroups(raw);assert.deepEqual(r.missing,[{id:'p2',sourceIds:['source-1']}]);
 assert.deepEqual(keys(r),['p0,p1','p3,p4,p5']);assert.ok(r.groups.every(g=>!g.ids.includes('p2')));
 const again=inspectSharedMotionGroups(importRelationshipDiscovery(raw));assert.deepEqual(again,r);
});
test('thirteen fully observed points refuse grouping while the original all-pair consumer still works',()=>{
 const points=Array.from({length:13},(_,i)=>[10+i*11,20+(i%4)*17]),raw=motionStudy([points,points.map(([x,y])=>[x+3,y+5])]);
 const r=inspectSharedMotionGroups(raw);assert.equal(r.status,'capacity');assert.equal(r.groups.length,0);assert.equal(r.subsets.length,0);
 assert.equal(discoverRelationships(raw).candidates.length,234);
});
test('enumerates every admitted subset at capacity with bounded reported work',()=>{
 const points=Array.from({length:12},(_,i)=>[10+i*10,20+(i%3)*15]),raw=motionStudy([points,points.map(([x,y])=>[x+4,y+7])]);
 const r=inspectSharedMotionGroups(raw);assert.equal(r.counts.evaluated,4083);assert.equal(r.groups.length,1);assert.equal(r.groups[0].ids.length,12);
 assert.equal(r.work.fits,4084);assert.equal(r.work.pointFits,r.work.maxSubsetPointFits+12);
});
test('source and mark ordering do not alter complete groups, and a uniform coordinate transform preserves them',()=>{
 const raw=motionStudy(),baseline=keys(inspectSharedMotionGroups(raw)),permuted=structuredClone(raw);
 permuted.demonstrations.reverse();for(const d of permuted.demonstrations)d.annotation.landmarks.reverse();
 assert.deepEqual(keys(inspectSharedMotionGroups(permuted)),baseline);
 const moved=motionStudy(groupedFrames().map(f=>turn(f,13,0,0)),.01);
 assert.deepEqual(keys(inspectSharedMotionGroups(moved)),baseline);
});
test('threshold changes recompute from the same sources and invalid inputs are refused',()=>{
 const raw=motionStudy(),low=inspectSharedMotionGroups(raw),high=inspectSharedMotionGroups({...raw,deviationMm:100});
 assert.equal(high.groups.length,1);assert.equal(high.groups[0].ids.length,6);assert.equal(low.groups.length,2);
 for(const v of [-1,NaN,Infinity,'1'])assert.throws(()=>inspectSharedMotionGroups({...raw,deviationMm:v}));
});
test('independent known proper transforms recover angle, centroid shift and all nominal residuals',()=>{
 const target=[[17,23],[53,71],[91,29],[114,92]];
 for(const angle of [-179,-75,0,44,173]){const observed=turn(target,angle,26,31),fit=fitProperPointPattern(target.map((p,i)=>({id:'p'+i,target:{xMm:p[0],yMm:p[1]},attempt:{xMm:observed[i][0],yMm:observed[i][1]}}))).fit;
 assert.ok(fit);assert.ok(Math.abs(fit.angleDegrees-angle)<1e-10);assert.ok(Math.abs(fit.centroidDxMm-26)<1e-10);assert.ok(Math.abs(fit.centroidDyMm-31)<1e-10);assert.ok(fit.residuals.every(r=>r.errorMm<1e-10));}
});
