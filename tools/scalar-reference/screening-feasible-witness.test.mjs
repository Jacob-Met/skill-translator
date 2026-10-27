import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fitInstrumentChangeModels} from '../../src/instrument-change-models.mjs';
import {proposeInstrumentChanges} from '../../src/instrument-change-proposals.mjs';
import {normalizedStepWitness,compareWitness,finiteJSON} from './feasible-objective.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/step-screen-witnesses.json',import.meta.url),'utf8'));
for(const fixture of fixtures)test(fixture.id+' respects an explicit feasible step',()=>{
 const before=structuredClone(fixture.samples);
 const witness=normalizedStepWitness(fixture.samples,fixture.normalizedCandidate);
 const p=proposeInstrumentChanges(fixture.samples,{maximumGapSeconds:fixture.maximumGapSeconds});
 assert.deepEqual(fixture.samples,before);assert.deepEqual(p.samples,before);
 assert.equal(p.inquiries.length,1);
 assert.deepEqual(p.inquiries[0].sampleIndexes,before.map((_v,i)=>i));
 assert.notEqual(p.inquiries[0].status,'insufficient');
 assert.notEqual(p.inquiries[0].reason,'Timestamp-spacing ratios exceed the supported covariance calculation; no white-noise fallback is claimed.');
 const result=compareWitness({...fixture,family:'step',witness},fitInstrumentChangeModels(fixture.samples));
 assert.equal(result.violation,false,finiteJSON(result));
});
