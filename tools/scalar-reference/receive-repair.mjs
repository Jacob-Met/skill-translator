// Reusable receiving against the current implementation; no frozen solver guard.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createSequence} from '../../src/demonstration-sequence.mjs';
import {fitInstrumentChangeModels} from '../../src/instrument-change-models.mjs';
import * as studyAPI from '../../src/instrument-change-study.mjs';
import {makeWitnessCases,normalizedStepWitness,normalize,compareWitness,finiteJSON,SCORE_TOLERANCE} from './feasible-objective.mjs';
const audit=JSON.parse(fs.readFileSync(new URL('../../docs/receipts/scalar-reference-20261027/baseline-screen-audit.json',import.meta.url),'utf8'));
const fixtures=[...makeWitnessCases(),...audit.screenWitnesses.map(item=>({...item,family:'step',
 witness:normalizedStepWitness(item.samples,{split:item.audit.exhaustive.split,rho:item.audit.exhaustive.rho,
 left:item.audit.exhaustive.normalizedLeft,right:item.audit.exhaustive.normalizedRight})}))];
const source=createSequence({name:'authored-repair-control.webm',mimeType:'video/webm',
 sizeBytes:1,sha256:'0'.repeat(64),durationSeconds:10},{title:'Authored repair receiving'});
const records=[];let failures=0;
for(const item of fixtures){
 const record={id:item.id,sampleCount:item.samples.length};
 try{
  const samplesBefore=structuredClone(item.samples),sourceBefore=structuredClone(source);
  const model=fitInstrumentChangeModels(item.samples),d=compareWitness(item,model);
  Object.assign(record,d);
  const first=item.samples[0].timeSeconds,last=item.samples.at(-1).timeSeconds;
  const raw={format:studyAPI.INSTRUMENT_CHANGE_FORMAT,source,evidenceClass:'authored-example',
   instrument:{name:'Numerical control',quantity:'Supplied scalar',unit:'Authored units',calibrationBasis:'Authored numerical fixture'},
   samples:item.samples,clock:{anchors:[{instrumentSeconds:first,clipSeconds:1},{instrumentSeconds:last,clipSeconds:9}],
   verification:{instrumentSeconds:first+(last-first)/2,clipSeconds:5},toleranceSeconds:.001,basis:'Authored affine mapping'},
   maximumGapSeconds:item.maximumGapSeconds};
  const rawBefore=structuredClone(raw),imported=studyAPI.importInstrumentChangeStudy(source,raw);
  const report=studyAPI.inspectInstrumentChangeStudy(source,raw);
  assert.deepEqual(raw,rawBefore);assert.deepEqual(item.samples,samplesBefore);assert.deepEqual(source,sourceBefore);
  assert.deepEqual(imported.samples,samplesBefore);assert.deepEqual(report.study,imported);
  assert.equal(report.clock.checkPassed,true);assert.deepEqual(report.gaps,[]);
  assert.equal(report.inquiries.length,1);const q=report.inquiries[0];
  assert.deepEqual(q.sampleIndexes,item.samples.map((_s,i)=>i));
  const scores={step:model.step.score,...Object.fromEntries(Object.entries(model.alternatives).map(([k,v])=>[k,v.score]))};
  assert.equal(Object.keys(scores).length,6);
  const finite=Object.values(scores).every(Number.isFinite);
  const expected=!finite?'numerically-unresolved':model.improvement>Math.log(item.samples.length)?
   'preferred':model.improvement>0?'weakly-separated':'alternative-preferred';
  assert.equal(q.status,expected);
  if(finite)assert.deepEqual(q.fit,model);
  else{assert.equal(q.fit,undefined);assert.equal(q.boundary,undefined);assert.equal(q.navigation.available,false);}
  const selectable=['preferred','weakly-separated'].includes(q.status);
  if(selectable){
   const selection=studyAPI.selectInstrumentChange(source,raw,0);
   const playback=studyAPI.instrumentChangePlaybackRange(source,raw,selection);
   assert.deepEqual(playback.sampleIndexes,[...q.leftIndexes.slice(-3),...q.rightIndexes.slice(0,3)]);
   assert.ok(playback.startSeconds>=1-1e-10&&playback.endSeconds<=9+1e-10&&playback.endSeconds>playback.startSeconds);
  }else assert.throws(()=>studyAPI.selectInstrumentChange(source,raw,0),/Choose/);
  record.study={status:q.status,selectable,navigationAvailable:q.navigation.available,scores,
   improvement:finite?model.improvement:null,originalsPreserved:true,clockCheckPassed:true};
  // These two low-offset signals permit a useful check on published means.
  if(['step-screen-1352761069-105','step-screen-1352761069-107'].includes(item.id)){
   const data=normalize(item.samples);
   const returned=normalizedStepWitness(item.samples,{split:model.step.split,rho:model.step.rho,
    left:(model.step.left-data.origin)/data.scale,right:(model.step.right-data.origin)/data.scale});
   record.returnedStepObjective={score:returned.best.score,reportedScore:model.step.score,
    absoluteDifference:Math.abs(returned.best.score-model.step.score)};
   assert.ok(record.returnedStepObjective.absoluteDifference<=SCORE_TOLERANCE,'Reported step score differs from directly evaluated returned means');
  }
  if(d.violation)failures++;
 }catch(error){record.error=error.message;failures++;}
 records.push(record);
}
console.log(finiteJSON({scope:'Independent feasible bounds and maintained study APIs; authored metadata only',
 modelSha256:createHash('sha256').update(fs.readFileSync(new URL('../../src/instrument-change-models.mjs',import.meta.url))).digest('hex'),
 cases:records.length,failures,records}));
if(failures)process.exitCode=1;
