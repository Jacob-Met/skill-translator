import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSharedMotionSpans,inspectMotionSpan} from '../src/shared-motion-spans.mjs';
import {inspectSharedMotionGroups} from '../src/shared-motion-groups.mjs';
import {createSequenceDiscovery,sequenceDiscoveryInputs} from '../src/sequence-discovery.mjs';
import {removeMomentCalibration} from '../src/demonstration-sequence.mjs';
import {motionSequence,groupedFrames,turn} from './helpers/shared-motion-fixture.mjs';
const options={correspondenceConfirmed:true,commonFixedPlaneConfirmed:true,basis:'Authored original planar geometry',evidenceClass:'authored-example',deviationMm:.01};
const account=(frames,threshold=.01)=>createSequenceDiscovery(motionSequence({frames}),{...options,deviationMm:threshold});
const key=s=>s.ids.join(',')+'@'+s.startIndex+':'+s.endIndex;
const keys=r=>r.spans.map(key).sort();
function separation(){const frames=groupedFrames();frames.push(structuredClone(frames[2]));frames[3][2][0]+=20;frames[3][2][1]+=8;return frames;}
test('finds a changing group without manual interval boundaries and retains overlapping alternatives',()=>{
 const raw=account(separation()),before=structuredClone(raw),result=inspectSharedMotionSpans(raw);
 assert.equal(result.status,'complete');assert.equal(result.counts.pointSets,57);assert.equal(result.counts.intervals,6);
 assert.deepEqual(keys(result),['authored-1,authored-2,authored-3@0:2','authored-1,authored-2,authored-4,authored-5,authored-6@2:3','authored-1,authored-2@0:3','authored-4,authored-5,authored-6@0:3'].sort());
 const whole=inspectSharedMotionGroups(sequenceDiscoveryInputs(raw).study);
 assert.ok(!whole.groups.some(g=>g.ids.join(',')==='authored-1,authored-2,authored-3'));
 assert.deepEqual(raw,before);assert.deepEqual(raw.sequence.steps,[]);
});
test('selected-span evidence uses every pair and explains why a neighboring retained moment fails',()=>{
 const raw=account(separation()),r=inspectSharedMotionSpans(raw),span=r.spans.find(s=>s.ids.join(',')==='authored-1,authored-2,authored-3');
 const detail=inspectMotionSpan(raw,span);assert.equal(detail.status,'supported');assert.equal(detail.motions.length,3);
 assert.equal(detail.extensions.before.status,'recording-edge');assert.equal(detail.extensions.after.status,'outside-fit-threshold');
 assert.ok(detail.extensions.after.witness.maxResidualMm>10);assert.deepEqual(detail.momentIds,['moment-0','moment-1','moment-2']);
 assert.equal(inspectMotionSpan(raw,{...span,endMomentId:'moment-3'}).status,'outside-fit-threshold');
});
test('all pairs matter, including a nonreference contradiction inside a proposed interval',()=>{
 const base=[[20,20],[60,20],[35,65]],plus=structuredClone(base),minus=structuredClone(base);plus[2][0]+=1;minus[2][0]-=1;
 const r=inspectSharedMotionSpans(account([base,plus,minus],.55));
 assert.ok(r.spans.some(s=>s.ids.length===3&&s.startIndex===0&&s.endIndex===1));
 assert.ok(!r.spans.some(s=>s.ids.length===3&&s.endIndex===2));
});
test('uncalibrated original moments break contiguity instead of silently bridging a gap',()=>{
 const frames=[...groupedFrames(),...groupedFrames()],raw=account(frames);
 raw.sequence=removeMomentCalibration(raw.sequence,'moment-2');const r=inspectSharedMotionSpans(raw);
 assert.ok(r.spans.length);assert.ok(r.spans.every(s=>s.endIndex<2||s.startIndex>2));
 const triple=r.spans.find(s=>s.ids.length===3&&s.startIndex===0);assert.ok(triple);
 assert.equal(inspectMotionSpan(raw,triple).extensions.after.status,'uncalibrated-moment');
 assert.equal(r.timeline[2].calibrated,false);assert.equal(raw.sequence.moments.length,6);
});
test('a missing point breaks only spans containing that point, preserving other complete groups',()=>{
 const frames=[...groupedFrames(),...groupedFrames()],raw=account(frames);
 raw.sequence.moments[2].calibratedTask.landmarks.splice(2,1);
 const r=inspectSharedMotionSpans(raw);
 assert.ok(r.spans.some(s=>s.ids.join(',')==='authored-4,authored-5,authored-6'&&s.startIndex===0&&s.endIndex===5));
 assert.ok(r.spans.filter(s=>s.ids.includes('authored-3')).every(s=>s.endIndex<2||s.startIndex>2));
 assert.deepEqual(r.missing,[{id:'authored-3',momentIds:['moment-2']}]);
 const short=r.spans.find(s=>s.ids.includes('authored-3')&&s.endIndex===1);assert.equal(inspectMotionSpan(raw,short).extensions.after.status,'missing-point');
});
test('a reflection keeps overlapping pair explanations without promoting a triple or task boundary',()=>{
 const base=[[20,20],[70,25],[35,80]],mirror=base.map(([x,y])=>[160-x,y]),r=inspectSharedMotionSpans(account([base,mirror]));
 assert.equal(r.spans.length,3);assert.ok(r.spans.every(s=>s.ids.length===2&&s.sampleCount===2));
 assert.equal(r.counts.outsidePairTests,1);
});
test('collapsed points do not produce a successful span even under a loose threshold',()=>{
 const r=inspectSharedMotionSpans(account([[[30,30],[30,30],[30,30]],[[80,80],[80,80],[80,80]]],100));
 assert.deepEqual(r.spans,[]);assert.equal(r.counts.unresolvedPairTests,4);assert.equal(r.counts.supportedPointSetIntervals,0);
});
test('reopen and changed source recompute spans rather than accepting saved conclusions',()=>{
 const raw=account(separation()),r=inspectSharedMotionSpans(raw);
 const saved=JSON.parse(JSON.stringify({...raw,spans:r.spans}));
 saved.sequence.moments[1].calibratedTask.landmarks[2].sourcePx.x+=30;
 const changed=inspectSharedMotionSpans(saved);
 assert.ok(!keys(changed).includes('authored-1,authored-2,authored-3@0:2'));assert.ok(keys(changed).includes('authored-4,authored-5,authored-6@0:3'));
 assert.deepEqual(inspectSharedMotionSpans(JSON.parse(JSON.stringify(raw))),r);
});
test('point ordering and a global proper transform do not change the temporal frontier',()=>{
 const frames=separation(),raw=account(frames),r=inspectSharedMotionSpans(raw);
 for(const moment of raw.sequence.moments)moment.calibratedTask.landmarks.reverse();
 assert.deepEqual(keys(inspectSharedMotionSpans(raw)),keys(r));
 assert.deepEqual(keys(inspectSharedMotionSpans(account(frames.map(f=>turn(f,11,0,0))))),keys(r));
});
test('maximum admitted population and moments are exhaustive with a declared finite fit budget',()=>{
 const points=Array.from({length:12},(_,i)=>[25+i*10,40+(i%3)*15]);
 const frames=Array.from({length:12},(_,i)=>points.map(([x,y])=>[x+i,y+i/2]));
 const r=inspectSharedMotionSpans(account(frames));
 assert.equal(r.counts.pointSets,4083);assert.equal(r.counts.intervals,66);assert.equal(r.spans.length,1);
 assert.equal(r.spans[0].ids.length,12);assert.equal(r.spans[0].sampleCount,12);assert.equal(r.work.fits,269478);assert.equal(r.work.pointFits,r.work.maxSubsetPointFits);
});
test('reference population beyond capacity refuses completely and malformed selections or ordering are rejected',()=>{
 const points=Array.from({length:13},(_,i)=>[25+i*10,40+(i%3)*15]),raw=account([points,points.map(([x,y])=>[x+4,y+3])]);
 const r=inspectSharedMotionSpans(raw);assert.equal(r.status,'capacity');assert.deepEqual(r.spans,[]);
 const small=account(groupedFrames());
 assert.throws(()=>inspectMotionSpan(small,{ids:['authored-1','authored-1'],startMomentId:'moment-0',endMomentId:'moment-1'}));
 assert.throws(()=>inspectMotionSpan(small,{ids:['authored-1','authored-2'],startMomentId:'moment-2',endMomentId:'moment-1'}));
 small.sequence.moments.reverse();assert.throws(()=>inspectSharedMotionSpans(small),/increasing/);
});
