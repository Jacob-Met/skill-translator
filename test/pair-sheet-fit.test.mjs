import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,placePractice} from '../src/practice.mjs';
import {createPairInterpretations,assessPairInterpretations} from '../src/pair-interpretations.mjs';
import {inspectPairSheetFit} from '../src/pair-sheet-fit.mjs';
import {nominalGeometryPolicy,inspectAnnotationBound as newAnnotation} from '../src/annotation-bound.mjs';
import {fixture} from './fixtures/pair-sheet-fixture.mjs';
import {readFileSync} from 'node:fs';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/annotation-policy-baseline.json',import.meta.url),'utf8'));

test('a guarded32mm band is excluded everywhere on10x10 while actual original scores remain unchanged',()=>{
 const raw=fixture(),before=JSON.stringify(raw),scores=assessPairInterpretations(raw),r=inspectPairSheetFit(raw);
 assert.equal(r.fixed.status,'excluded');assert.equal(r.adapted.status,'not-ruled-out');assert.deepEqual(r.exactSquaredExtrema.maximum.squared,{numerator:'200',denominator:'1'});assert.equal(scores.rounds[0].fixed.status,'outside');assert.equal(scores.rounds[0].originalPractice.passed,true);assert.deepEqual(assessPairInterpretations(raw),scores);assert.equal(JSON.stringify(raw),before);
 assert.deepEqual(inspectPairSheetFit({...JSON.parse(before),sheetFit:{status:'not-ruled-out'}}),r);
});
test('attainable and exact touching bands stay distinct from strict exclusion',()=>{
 const touching=inspectPairSheetFit(fixture(6,3,4,1,[]));assert.deepEqual(touching.exactSquaredExtrema.maximum.squared,{numerator:'25',denominator:'1'});assert.equal(touching.fixed.status,'boundary-unresolved');
 assert.equal(inspectPairSheetFit(fixture(5,3,4,1,[])).fixed.status,'not-ruled-out');
 assert.equal(inspectPairSheetFit(fixture(7,3,4,1,[])).fixed.status,'excluded');
 assert.equal(inspectPairSheetFit(fixture(32,10,10,40,[])).fixed.status,'not-ruled-out');
});
test('rounded diagonal WITHIN witness never becomes false exact-geometric impossibility',()=>{
 const expected=Math.hypot(10,10)+1,raw=fixture(expected,10,10,1-1e-9,[{id:'a',xMm:0,yMm:0},{id:'b',xMm:10,yMm:10}]);
 // Remove source offset to preserve the exact authored binary64 expectation.
 raw.source.landmarks[0].sourcePx={x:0,y:0};raw.source.landmarks[1].sourcePx={x:expected,y:0};
 raw.session.reference.landmarks[0].sourcePx={x:0,y:0};raw.session.reference.landmarks[1].sourcePx={x:expected,y:0};
 const actual=assessPairInterpretations(raw);assert.equal(actual.sourceExpectedMm,expected);assert.equal(actual.rounds[0].fixed.status,'within');
 const r=inspectPairSheetFit(raw);assert.equal(r.fixed.status,'boundary-unresolved');assert.deepEqual(r.fixed.withinRounds,[1]);assert.equal(r.fixed.operationalAllowanceMm,1);
});
test('near-boundary guard is inherited, explicit and conservative on both sides',()=>{
 const guard=2*nominalGeometryPolicy(3,4).guardMm;
 assert.equal(inspectPairSheetFit(fixture(6+guard/2,3,4,1,[])).fixed.status,'boundary-unresolved');
 assert.equal(inspectPairSheetFit(fixture(6+4*guard,3,4,1,[])).fixed.status,'excluded');
 assert.equal(inspectPairSheetFit(fixture(6-4*guard,3,4,1,[])).fixed.status,'not-ruled-out');
});
test('missing attempts do not suppress whole-sheet geometry and raw source mismatches refuse',()=>{
 const raw=fixture(32,10,10,1,[]);assert.equal(inspectPairSheetFit(raw).fixed.status,'excluded');assert.equal(assessPairInterpretations(raw).rounds[0].fixed.status,'incomplete');
 raw.source.landmarks[0].sourcePx.x++;assert.throws(()=>inspectPairSheetFit(raw));
});
test('mixed edge and fraction rules retain their native expectations',()=>{
 const raw=fixture(60,200,100,1,[]);raw.source.landmarks[0].kind='edge_offset_mm';raw.source.landmarks[0].edge='left';raw.source.landmarks[1].kind='edge_offset_mm';raw.source.landmarks[1].edge='right';
 const session=createPractice(raw.source,200,100),r=inspectPairSheetFit(createPairInterpretations(raw.source,session,raw.pair,raw.basis));assert.equal(r.fixed.expectedMm,60);assert.equal(r.adapted.expectedMm,160);assert.equal(r.fixed.status,'not-ruled-out');assert.equal(r.adapted.status,'not-ruled-out');
});
test('shared numerical policy extraction preserves existing annotation reports byte-for-byte',()=>{
 for(const [w,h]of [[10,10],[100,50],[240,160]]){
  assert.deepEqual(nominalGeometryPolicy(w,h),{scale:Math.max(1,w,h),guardMm:Math.max(1,w,h)*1e-9});
  const raw=fixture(32,w,h,1,[]),setup={demo:raw.source,widthMm:w,heightMm:h,session:raw.session};
  const observation={schema:'skill-translator-learner-observation/v1',evidenceClass:'authored-image-control',image:{sha256:'a'.repeat(64),widthPx:120,heightPx:120,mimeType:'image/png',pixelCoordinates:'browser-oriented',name:'authored.png'},calibration:{widthMm:w,heightMm:h,corners:[{x:10,y:10},{x:110,y:10},{x:110,y:110},{x:10,y:110}]},points:[{id:'a',pixel:{x:30,y:40}},{id:'b',pixel:{x:62,y:40}}]};
  for(const [x,y]of [[0,0],[1,0],[0,2],[2,3]]){const declaration={id:'a',halfWidthPx:x,halfHeightPx:y};assert.equal(JSON.stringify(newAnnotation(setup,observation,declaration)),JSON.stringify(baseline.cases.find(c=>c.widthMm===w&&c.heightMm===h&&c.halfWidthPx===x&&c.halfHeightPx===y).report));}
 }
});
