import test from 'node:test';import assert from 'node:assert/strict';
import {pathFixture} from './helpers/sampled-path-fixture.mjs';
import {createEdgeStudy,importEdgeStudy,inspectEdgeStudy} from '../src/sequence-edge-study.mjs';
function entry(m,status='unreviewed'){
 return {report:{format:'skill-translator.sequence-edge-report/v1',momentId:m.id,image:m.image,origin:m.origin,roi:[0,0,300,200],method:{name:'opencv-canny-hough-segments/v1',sourceDecode:'unchanged-u8-opaque',cannyLow:50,cannyHigh:150,aperture:3,l2Gradient:true,rhoPx:1,thetaRadians:Math.PI/180,votes:40,minimumLengthPx:80,maximumGapPx:10,opencvVersion:'authored control',numpyVersion:'authored control'},points:[],candidates:[]},selection:{status,basis:status==='rejected'?'Observer rejects these empty proposals':''}};
}
test('original moment order and explicit uninspected gaps survive unordered independent entries',()=>{
 const source=pathFixture(),entries=[entry(source.moments[2],'rejected'),entry(source.moments[0])],before=structuredClone({source,entries}),study=createEdgeStudy(source,entries),found=inspectEdgeStudy(study);
 assert.deepEqual(study.entries.map(e=>e.report.momentId),['moment-0','moment-2']);assert.deepEqual(found.moments.map(m=>m.status),['unreviewed','uninspected','rejected']);assert.equal(found.moments[0].candidateCount,0);assert.equal(found.moments[1].candidateCount,null);assert.deepEqual({source,entries},before);assert.deepEqual(importEdgeStudy(JSON.parse(JSON.stringify(study))),study);
});
test('source steps retain authored text and their exact independently reviewed anchors',()=>{
 const source=pathFixture();source.steps=[{id:'one',beforeMomentId:'moment-0',afterMomentId:'moment-2',title:'Authored inspection',intent:'Observer goal',visibleChange:'Authored change; not inferred from edges'}];
 const f=inspectEdgeStudy(createEdgeStudy(source,[entry(source.moments[0],'rejected')]));assert.equal(f.steps[0].authoredVisibleChange,source.steps[0].visibleChange);assert.equal(f.steps[0].before.status,'rejected');assert.equal(f.steps[0].after.status,'uninspected');assert.match(f.boundary,/no persistent feature identity/);
});
test('duplicate moments, wrong images, absent moments and duplicated source records refuse transactionally',()=>{
 const source=pathFixture(),e=entry(source.moments[0]),before=structuredClone(source);assert.throws(()=>createEdgeStudy(source,[e,e]));
 for(const change of [v=>v.report.image.sha256='0'.repeat(64),v=>v.report.momentId='absent',v=>v.sequence=source,v=>v.report.origin.mediaTimeSeconds++]){const bad=structuredClone(e);change(bad);assert.throws(()=>createEdgeStudy(source,[bad]));}assert.deepEqual(source,before);
});
test('all retained moments can remain uninspected without fabricating zero-candidate observations',()=>{
 const source=pathFixture(),study=createEdgeStudy(source,[]);assert.equal(study.entries.length,0);assert.ok(inspectEdgeStudy(study).moments.every(m=>m.status==='uninspected'&&m.candidateCount===null));
});
