import {createHash} from 'node:crypto';
import {readFileSync as readFrozenSource} from 'node:fs';
assert.equal(createHash('sha256').update(readFrozenSource(new URL('../../src/instrument-change-models.mjs',import.meta.url))).digest('hex'),'cd400e5bcf29f46ad5cf9c1cb4ca3e1a819911a4fb57635a00b45e54d51a703c','Frozen diagnostic requires the recorded model source');
// Actual maintained import, study, selection and playback APIs; authored metadata control.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSequence} from '../../src/demonstration-sequence.mjs';
import * as baseStudy from '../../src/instrument-change-study.mjs';
import * as gateStudy from './interventions/step-gate-all/instrument-change-study.mjs';
import {fitInstrumentChangeModels as baseFit} from '../../src/instrument-change-models.mjs';
import {fitInstrumentChangeModels as gateFit} from './interventions/step-gate-all/instrument-change-models.mjs';
import {makeWitnessCases,finiteJSON,normalizedStepWitness,compareWitness} from './feasible-objective.mjs';
const audit=JSON.parse(fs.readFileSync(new URL('../../docs/receipts/scalar-reference-20261027/baseline-screen-audit.json',import.meta.url),'utf8'));
const fixtures=[...makeWitnessCases(),...audit.screenWitnesses];
const explicit=JSON.parse(fs.readFileSync(new URL('./fixtures/step-screen-witnesses.json',import.meta.url),'utf8'));
const source=createSequence({name:'authored-numerical-control.webm',mimeType:'video/webm',
 sizeBytes:1,sha256:'0'.repeat(64),durationSeconds:10},{title:'Authored numerical control'});
const sourceBefore=structuredClone(source),records=[];
for(const item of fixtures){
 const first=item.samples[0].timeSeconds,last=item.samples.at(-1).timeSeconds;
 const raw={format:baseStudy.INSTRUMENT_CHANGE_FORMAT,source,evidenceClass:'authored-example',
 instrument:{name:'Numerical control',quantity:'Supplied scalar',unit:'Authored units',
 calibrationBasis:'Authored numerical fixture; no physical calibration'},
 samples:item.samples,clock:{anchors:[{instrumentSeconds:first,clipSeconds:1},
 {instrumentSeconds:last,clipSeconds:9}],verification:{instrumentSeconds:first+(last-first)/2,clipSeconds:5},
 toleranceSeconds:.001,basis:'Authored affine mapping for API receiving'},maximumGapSeconds:item.maximumGapSeconds};
 const before=structuredClone(raw),record={id:item.id,sampleCount:item.samples.length};
 for(const [label,api,fit] of [['baseline',baseStudy,baseFit],['gateOnly',gateStudy,gateFit]]){
  const imported=api.importInstrumentChangeStudy(source,raw),report=api.inspectInstrumentChangeStudy(source,raw);
  assert.deepEqual(imported.samples,item.samples);assert.deepEqual(report.study,imported);
  assert.deepEqual(raw,before);assert.deepEqual(source,sourceBefore);
  assert.equal(report.clock.checkPassed,true);assert.ok(Math.abs(report.clock.residualSeconds)<=.001);
  assert.equal(report.inquiries.length,1);assert.deepEqual(report.gaps,[]);
  const q=report.inquiries[0],model=fit(item.samples);
  assert.deepEqual(q.sampleIndexes,item.samples.map((_v,i)=>i));
  const scores={step:model.step.score,...Object.fromEntries(Object.entries(model.alternatives).map(([k,v])=>[k,v.score]))};
  assert.equal(Object.keys(scores).length,6);
  const finite=Object.values(scores).every(Number.isFinite);
  const expected=!finite?'numerically-unresolved':model.improvement>Math.log(item.samples.length)?
   'preferred':model.improvement>0?'weakly-separated':'alternative-preferred';
  assert.equal(q.status,expected);
  if(finite)assert.deepEqual(q.fit,model);
  else{assert.equal(q.fit,undefined);assert.equal(q.boundary,undefined);
   assert.equal(q.navigation.available,false);assert.equal(q.navigation.reason,'numerically-unresolved');}
  const selectable=['preferred','weakly-separated'].includes(q.status);
  if(selectable){
   const selection=api.selectInstrumentChange(source,raw,0);
   const playback=api.instrumentChangePlaybackRange(source,raw,selection);
   const context=[...q.leftIndexes.slice(-3),...q.rightIndexes.slice(0,3)];
   assert.deepEqual(playback.sampleIndexes,context);
   assert.ok(playback.startSeconds>=1-1e-10&&playback.endSeconds<=9+1e-10);
   assert.ok(playback.endSeconds>playback.startSeconds);
  }else assert.throws(()=>api.selectInstrumentChange(source,raw,0),/Choose/);
  record[label]={status:q.status,scores,improvement:finite?model.improvement:null,
   selectable,navigationAvailable:q.navigation.available,
   originalIndexesPreserved:true,sourceAndSamplesPreserved:true,clockCheckPassed:report.clock.checkPassed};
 }
 record.statusChanged=record.baseline.status!==record.gateOnly.status;records.push(record);
}
const explicitBounds=explicit.map(item=>{
 const witness=normalizedStepWitness(item.samples,item.normalizedCandidate);
 return {...compareWitness({...item,family:'step',witness},baseFit(item.samples)),
   gateOnly:compareWitness({...item,family:'step',witness},gateFit(item.samples)),normalizedCandidate:item.normalizedCandidate};
});
console.log(finiteJSON({scope:'Maintained study/import/selection/playback APIs using authored metadata; no browser or media playback execution',
 cases:records.length,statusChanges:records.filter(x=>x.statusChanged).length,records,explicitBounds}));
