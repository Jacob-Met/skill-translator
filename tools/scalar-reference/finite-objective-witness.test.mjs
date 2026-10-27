// Owner-ready acceptance targets. Several deliberately fail on the pinned
// unrepaired baseline; they are not part of npm test until adopted with repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fitInstrumentChangeModels} from '../../src/instrument-change-models.mjs';
import {proposeInstrumentChanges} from '../../src/instrument-change-proposals.mjs';
import {makeWitnessCases,compareWitness,finiteJSON} from './feasible-objective.mjs';
for(const item of makeWitnessCases())test(item.id+' has an admitted feasible full-grid bound',()=>{
  const before=structuredClone(item.samples);
  const proposal=proposeInstrumentChanges(item.samples,{maximumGapSeconds:item.maximumGapSeconds});
  assert.deepEqual(item.samples,before);
  assert.deepEqual(proposal.samples,before);
  assert.equal(proposal.inquiries.length,1);
  assert.deepEqual(proposal.inquiries[0].sampleIndexes,item.samples.map((_s,i)=>i));
  assert.notEqual(proposal.inquiries[0].status,'insufficient');
  assert.notEqual(proposal.inquiries[0].reason,
    'Timestamp-spacing ratios exceed the supported covariance calculation; no white-noise fallback is claimed.');
  const diagnostic=compareWitness(item,fitInstrumentChangeModels(item.samples));
  assert.equal(diagnostic.violation,false,finiteJSON(diagnostic));
});
