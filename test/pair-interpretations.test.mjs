import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,placePractice,retryPractice,evaluatePractice,observePractice} from '../src/practice.mjs';
import {createPairInterpretations,importPairInterpretations,assessPairInterpretations} from '../src/pair-interpretations.mjs';
function fixture(edge=false){return {title:'Authored comparison',provenance:'Authored nominal control; no physical validation',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',kind:edge?'edge_offset_mm':'fraction',...(edge?{edge:'left'}:{}),sourcePx:{x:20,y:30},toleranceMm:1},{id:'b',label:'B',kind:edge?'edge_offset_mm':'fraction',...(edge?{edge:'right'}:{}),sourcePx:{x:edge?80:52,y:30},toleranceMm:1}]};}
const pair={id:'pair',label:'Declared separation',from:'a',to:'b',kind:'distance',toleranceMm:1};
const basis='Compare fixed nominal source separation with the existing per-mark adapted targets';
function place(source,session,a,b){for(const [id,xMm] of [['a',a],['b',b]])session=placePractice(source,session.reference.target.widthMm,100,session,id,{xMm,yMm:30});return session;}
test('opposing actual 32/64 mm rounds preserve original point scores, history and raw custody',()=>{
 const source=fixture();let session=place(source,createPractice(source,200,100),20,52);session=retryPractice(source,200,100,session);session=place(source,session,40,104);
 const before=JSON.stringify({source,session});const record=createPairInterpretations(source,session,pair,basis),report=assessPairInterpretations(record);
 assert.equal(report.sourceExpectedMm,32);assert.equal(report.adaptedExpectedMm,64);
 assert.deepEqual(report.rounds.map(r=>[r.fixed.status,r.adapted.status,r.originalPractice.passed]),[['within','outside',false],['outside','within',true]]);
 for(const round of report.rounds){const raw=round.round===1?session.history[0]:session;assert.deepEqual(round.originalPractice,evaluatePractice(source,200,100,raw.attempts));}
 assert.equal(JSON.stringify({source,session}),before);assert.deepEqual(record.source,source);assert.deepEqual(record.session,session);
 assert.deepEqual(assessPairInterpretations(JSON.parse(JSON.stringify({...record,report:{passed:true}}))),report);
});
test('opposite-edge rules compare 60/160 mm rather than assuming uniform scaling',()=>{
 const source=fixture(true),session=place(source,createPractice(source,200,100),20,180),r=assessPairInterpretations(createPairInterpretations(source,session,pair,basis));
 assert.equal(r.sourceExpectedMm,60);assert.equal(r.adaptedExpectedMm,160);assert.equal(r.rounds[0].originalPractice.passed,true);
});
test('equal expectations and equal assessments do not infer a preferred interpretation',()=>{
 const source=fixture(),same=assessPairInterpretations(createPairInterpretations(source,place(source,createPractice(source,100,100),20,52),pair,basis));
 assert.equal(same.expectationsCoincide,true);assert.equal(same.rounds[0].assessmentRelation,'same-assessment');
 const neither=assessPairInterpretations(createPairInterpretations(source,place(source,createPractice(source,200,100),20,100),pair,basis));assert.equal(neither.expectationsCoincide,false);assert.equal(neither.rounds[0].assessmentRelation,'same-assessment');assert.equal(neither.rounds[0].fixed.status,'outside');
});
test('missing endpoints and empty current rounds remain incomplete',()=>{
 const source=fixture();let session=createPractice(source,200,100);session=placePractice(source,200,100,session,'a',{xMm:20,yMm:30});session=retryPractice(source,200,100,session);
 const r=assessPairInterpretations(createPairInterpretations(source,session,pair,basis));assert.deepEqual(r.rounds.map(x=>x.fixed.status),['incomplete','incomplete']);assert.deepEqual(r.rounds[0].fixed.missing,['b']);assert.equal(r.rounds[1].fixed.observedMm,null);
});
test('wrong source, rules, dimensions, invalid criteria and malformed history are refused',()=>{
 const source=fixture(),session=createPractice(source,200,100);const record=createPairInterpretations(source,session,pair,basis);
 for(const mutate of [r=>r.source.landmarks[0].sourcePx.x++,r=>r.source.landmarks[0].toleranceMm++,r=>r.source.landmarks[0].kind='edge_offset_mm',r=>r.session.reference.target.widthMm=0,r=>r.pair.to='missing',r=>r.pair.toleranceMm=Infinity,r=>r.basis=' ',r=>r.session.history.push({round:1,attempts:[]})]){const raw=structuredClone(record);mutate(raw);assert.throws(()=>importPairInterpretations(raw));}
});

test('photo history and manual detachment survive raw reopening without changing actual scores',()=>{
 const source=fixture(),image={sha256:'a'.repeat(64),widthPx:220,heightPx:120,mimeType:'image/png',pixelCoordinates:'browser-oriented',name:'authored.png'};
 const observation={schema:'skill-translator-learner-observation/v1',evidenceClass:'authored-image-control',note:'Authored nominal rectangle',image,calibration:{widthMm:200,heightMm:100,corners:[{x:10,y:10},{x:210,y:10},{x:210,y:110},{x:10,y:110}]},points:[{id:'a',pixel:{x:50,y:40}},{id:'b',pixel:{x:114,y:40}}]};
 let session=observePractice(source,200,100,createPractice(source,200,100),observation);session=placePractice(source,200,100,session,'b',{xMm:72,yMm:30});session=retryPractice(source,200,100,session);
 const record=createPairInterpretations(source,session,pair,basis),restored=importPairInterpretations(JSON.parse(JSON.stringify(record))),r=assessPairInterpretations(restored);
 assert.deepEqual(restored.session,session);assert.deepEqual(r.rounds[0].detachedPhotoMarks,['b']);assert.deepEqual(r.rounds[0].photoObservation,session.history[0].photoObservation);assert.equal(r.rounds[0].fixed.status,'within');assert.equal(r.rounds[1].fixed.status,'incomplete');
 const forged=structuredClone(record);forged.session.history[0].attempts[0].xMm++;assert.throws(()=>importPairInterpretations(forged));
});
