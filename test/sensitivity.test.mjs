import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSensitivity,exportSensitivity,importSensitivity} from '../src/sensitivity.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
const source=()=>({provenance:'Authored analytic calibration control',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'a',label:'Center',kind:'fraction',sourcePx:{x:50,y:40},toleranceMm:1}]});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('zero perturbation is one unchanged nominal case without mutating accepted source',()=>{
  const demo=source(),before=JSON.stringify(demo),r=analyzeSensitivity(demo,'a',200,160);
  assert.equal(r.totalScenarios,1);near(r.maxSampledShiftMm,0);near(r.nominal.xMm,100);near(r.nominal.yMm,80);assert.equal(JSON.stringify(demo),before);
});
test('known pixel uncertainty transfers by independent physical scale',()=>{
  const r=analyzeSensitivity(source(),'a',200,160,{landmarkPx:2});
  near(r.sampledRange.minXmm,96);near(r.sampledRange.maxXmm,104);near(r.sampledRange.minYmm,76);near(r.sampledRange.maxYmm,84);
  near(r.maxSampledShiftMm,Math.sqrt(32));assert.equal(r.exceedsDeclaredTolerance,true);assert.equal(r.invalidScenarios,0);
});
test('physical offsets depend on source width while proportional positions depend on target width',()=>{
  const demo=source();demo.landmarks[0].sourcePx.x=20;
  const fraction=analyzeSensitivity(demo,'a',200,160,{sourceWidthMm:10,targetWidthMm:20});
  near(fraction.sampledRange.minXmm,36);near(fraction.sampledRange.maxXmm,44);
  Object.assign(demo.landmarks[0],{kind:'edge_offset_mm',edge:'left'});
  const fixed=analyzeSensitivity(demo,'a',200,160,{sourceWidthMm:10,targetWidthMm:20});
  near(fixed.sampledRange.minXmm,18);near(fixed.sampledRange.maxXmm,22);
  near(fixed.influences.find(x=>x.key==='targetWidthMm').maxIndividualShiftMm,0);
  near(fraction.influences.find(x=>x.key==='sourceWidthMm').maxIndividualShiftMm,0);
});
test('skewed known calibration maps its nominal point and reproduces bounded experiments',()=>{
  const demo=source();demo.source.corners=[{x:10,y:10},{x:150,y:20},{x:130,y:120},{x:20,y:100}];
  demo.landmarks[0].sourcePx=toImage(calibrate(demo.source.corners),.4,.6);
  const a=analyzeSensitivity(demo,'a',200,160,{cornerPx:2,landmarkPx:1,sourceWidthMm:2,targetHeightMm:3});
  near(a.nominal.xMm,80);near(a.nominal.yMm,96);assert.ok(a.maxSampledShiftMm>0);assert.ok(a.totalScenarios<=159);
  assert.deepEqual(a,analyzeSensitivity(demo,'a',200,160,{cornerPx:2,landmarkPx:1,sourceWidthMm:2,targetHeightMm:3}));
});
test('invalid geometric and dimension scenarios stay explicit rather than becoming zero samples',()=>{
  const r=analyzeSensitivity(source(),'a',200,160,{cornerPx:50,sourceWidthMm:100,targetWidthMm:300});
  assert.ok(r.invalidScenarios>0);assert.equal(r.validScenarios+r.invalidScenarios,r.totalScenarios);assert.equal(r.status,'some-scenarios-refused');
  assert.ok(r.invalid.every(s=>s.reason&&!Object.hasOwn(s,'shiftMm')));assert.ok(r.valid.every(s=>Number.isFinite(s.shiftMm)));near(r.valid.find(s=>s.id==='nominal').xMm,100);
});
test('session reopening recomputes sampled effects and ignores fabricated metrics',()=>{
  const demo=source();demo.source.image={sha256:'a'.repeat(64),widthPx:101,heightPx:81};
  const bundle=exportSensitivity(demo,'a',200,160,{landmarkPx:2});bundle.maxSampledShiftMm=0;bundle.exceedsDeclaredTolerance=false;
  const reopened=importSensitivity(bundle);near(reopened.analysis.maxSampledShiftMm,Math.sqrt(32));assert.equal(reopened.analysis.exceedsDeclaredTolerance,true);assert.deepEqual(reopened.demo.source.image,demo.source.image);
  reopened.demo.landmarks[0].sourcePx.x=1;assert.equal(bundle.source.landmarks[0].sourcePx.x,50);
});
test('unsupported assumptions and inputs refuse before producing a result',()=>{
  for(const settings of [{cornerPx:Infinity},{landmarkPx:-1},{confidence:.95},{cornerPx:51}])assert.throws(()=>analyzeSensitivity(source(),'a',200,160,settings));
  assert.throws(()=>analyzeSensitivity(source(),'missing',200,160));assert.throws(()=>importSensitivity({schema:'unknown'}));
});
