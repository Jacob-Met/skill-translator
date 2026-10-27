import {createHash} from 'node:crypto';
import {readFileSync as readFrozenSource} from 'node:fs';
assert.equal(createHash('sha256').update(readFrozenSource(new URL('../../src/instrument-change-models.mjs',import.meta.url))).digest('hex'),'cd400e5bcf29f46ad5cf9c1cb4ca3e1a819911a4fb57635a00b45e54d51a703c','Frozen diagnostic requires the recorded model source');
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {fitInstrumentChangeModels} from '../../src/instrument-change-models.mjs';
import {proposeInstrumentChanges} from '../../src/instrument-change-proposals.mjs';
import {auditStepScreen,generateStepScreenCases,BASELINE_MODEL_BLOB} from './step-screen.mjs';
import {makeWitnessCases,compareWitness,finiteJSON} from './feasible-objective.mjs';
const started=performance.now(),summary={baselineModelBlob:BASELINE_MODEL_BLOB,
  cases:0,statusCounts:{},strictScreenGaps:0,materialScreenGaps:0,maximumScoreGap:0,
  productionSimulationMatches:0,screenWitnesses:[],feasible:[]};
for(const item of generateStepScreenCases()){
  const before=structuredClone(item.samples);
  const actual=fitInstrumentChangeModels(item.samples),audit=auditStepScreen(item.samples);
  assert.deepEqual({score:actual.step.score,rho:actual.step.rho,split:actual.step.split,
    left:actual.step.left,right:actual.step.right},
    {score:audit.screened.score,rho:audit.screened.rho,split:audit.screened.split,
      left:audit.screened.left,right:audit.screened.right},'frozen screen drift '+item.id);
  summary.productionSimulationMatches++;
  const p=proposeInstrumentChanges(item.samples,{maximumGapSeconds:item.maximumGapSeconds});
  assert.deepEqual(item.samples,before);assert.deepEqual(p.samples,before);
  assert.equal(p.inquiries.length,1,item.id+' grouped');
  assert.deepEqual(p.inquiries[0].sampleIndexes,item.samples.map((_s,i)=>i));
  assert.notEqual(p.inquiries[0].status,'insufficient');
  assert.notEqual(p.inquiries[0].reason,
    'Timestamp-spacing ratios exceed the supported covariance calculation; no white-noise fallback is claimed.');
  const status=p.inquiries[0].status;summary.statusCounts[status]=(summary.statusCounts[status]||0)+1;
  summary.cases++;
  if(audit.missedGlobalWinner){
    summary.strictScreenGaps++;
    if(audit.scoreGap>1e-7)summary.materialScreenGaps++;
    summary.maximumScoreGap=Math.max(summary.maximumScoreGap,audit.scoreGap||0);
    if(summary.screenWitnesses.length<20||audit.scoreGap>1e-7)
      summary.screenWitnesses.push({...item,actualStep:actual.step,actualStatus:status,audit});
  }
}
for(const item of makeWitnessCases()){
  const actual=fitInstrumentChangeModels(item.samples);
  const p=proposeInstrumentChanges(item.samples,{maximumGapSeconds:item.maximumGapSeconds});
  summary.feasible.push({...compareWitness(item,actual),samples:item.samples,
    maximumGapSeconds:item.maximumGapSeconds,publicStatus:p.inquiries[0].status,
    publicReason:p.inquiries[0].reason,fit:actual,witness:item.witness});
}
summary.elapsedMs=performance.now()-started;
console.log(finiteJSON(summary));
