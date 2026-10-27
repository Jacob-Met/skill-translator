import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fitInstrumentChangeModels as candidate} from '../../src/instrument-change-models.mjs';
import {proposeInstrumentChanges} from '../../src/instrument-change-proposals.mjs';
import {generateStepScreenCases} from './step-screen.mjs';
import {auditAlternativeScreens} from './alternative-screen.mjs';
import {finiteJSON} from './feasible-objective.mjs';
const sha=createHash('sha256').update(fs.readFileSync(new URL('../../src/instrument-change-models.mjs',import.meta.url))).digest('hex');
assert.ok(['cd400e5bcf29f46ad5cf9c1cb4ca3e1a819911a4fb57635a00b45e54d51a703c','4232ef2c3aeebe654f369372c2af5c8435b13bb1d76bba300f3c09c22e841922'].includes(sha),'Frozen alternative formulas require a recorded model');
const original=[...generateStepScreenCases()].map(x=>({...x,corpus:'retained-224'}));
const targeted=JSON.parse(fs.readFileSync(new URL('../../docs/receipts/scalar-reference-20261027/alternative-targeted-fixtures.json',import.meta.url),'utf8'));
assert.equal(targeted.length,14);
const started=performance.now(),summary={candidateSha256:sha,cases:0,corpora:{},simulationMatches:{spike:0,decaying:0},
 families:{spike:{strictGaps:0,materialGaps:0,maxGap:0},decaying:{strictGaps:0,materialGaps:0,maxGap:0}},witnesses:[],negativeControls:[]};
const identity=x=>({score:x.score,...(x.rho===undefined?{}:{rho:x.rho}),...(x.index===undefined?{}:{index:x.index})});
for(const item of [...original,...targeted]){
 const before=structuredClone(item.samples),actual=candidate(item.samples),audit=auditAlternativeScreens(item.samples);
 const p=proposeInstrumentChanges(item.samples,{maximumGapSeconds:item.maximumGapSeconds});
 assert.deepEqual(item.samples,before);assert.deepEqual(p.samples,before);assert.equal(p.inquiries.length,1);
 assert.deepEqual(p.inquiries[0].sampleIndexes,before.map((_s,i)=>i));assert.notEqual(p.inquiries[0].status,'insufficient');
 assert.notEqual(p.inquiries[0].reason,'Timestamp-spacing ratios exceed the supported covariance calculation; no white-noise fallback is claimed.');
 let material=false;
 for(const family of ['spike','decaying']){
  assert.deepEqual(actual.alternatives[family],identity(audit[family].screened),item.id+' '+family+' simulator');
  summary.simulationMatches[family]++;
  if(audit[family].missedGlobalWinner){summary.families[family].strictGaps++;summary.families[family].maxGap=Math.max(summary.families[family].maxGap,audit[family].scoreGap);
   if(audit[family].scoreGap>1e-7){summary.families[family].materialGaps++;material=true;}}
 }
 if(material)summary.witnesses.push({...item,actualStatus:p.inquiries[0].status,actual,audit});
 if(item.id.startsWith('alt-gate-negative'))summary.negativeControls.push({id:item.id,status:p.inquiries[0].status,scores:actual.alternatives,
  gaps:{spike:audit.spike.scoreGap,decaying:audit.decaying.scoreGap}});
 summary.cases++;summary.corpora[item.corpus]=(summary.corpora[item.corpus]||0)+1;
}
summary.elapsedMs=performance.now()-started;
console.log(finiteJSON(summary));
