import {createHash} from 'node:crypto';
import {readFileSync as readFrozenSource} from 'node:fs';
assert.equal(createHash('sha256').update(readFrozenSource(new URL('../../src/instrument-change-models.mjs',import.meta.url))).digest('hex'),'cd400e5bcf29f46ad5cf9c1cb4ca3e1a819911a4fb57635a00b45e54d51a703c','Frozen diagnostic requires the recorded model source');
// Temporary gate-only causal experiment. Quadratic exhaustive scoring is not a production repair.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fitInstrumentChangeModels as baseline} from '../../src/instrument-change-models.mjs';
import {proposeInstrumentChanges as proposal} from '../../src/instrument-change-proposals.mjs';
import {fitInstrumentChangeModels as intervention} from './interventions/step-gate-all/instrument-change-models.mjs';
import {proposeInstrumentChanges as interventionProposal} from './interventions/step-gate-all/instrument-change-proposals.mjs';
import {finiteJSON} from './feasible-objective.mjs';
const audit=JSON.parse(fs.readFileSync(new URL('../../docs/receipts/scalar-reference-20261027/baseline-screen-audit.json',import.meta.url),'utf8'));
const fields=x=>({score:x.score,rho:x.rho,split:x.split,left:x.left,right:x.right});
const results=[];
for(const w of audit.screenWitnesses){
 const before=structuredClone(w.samples),base=baseline(w.samples),changed=intervention(w.samples);
 assert.deepEqual(base.step,fields(w.audit.screened));
 assert.deepEqual(changed.step,fields(w.audit.exhaustive));
 assert.deepEqual(base.alternatives,changed.alternatives);
 assert.deepEqual(w.samples,before);
 const b=proposal(w.samples,{maximumGapSeconds:w.maximumGapSeconds});
 const c=interventionProposal(w.samples,{maximumGapSeconds:w.maximumGapSeconds});
 assert.equal(b.inquiries.length,1);assert.equal(c.inquiries.length,1);
 assert.deepEqual(b.samples,before);assert.deepEqual(c.samples,before);
 assert.deepEqual(c.inquiries[0].sampleIndexes,b.inquiries[0].sampleIndexes);
 const winningRho=w.audit.perRho.find(p=>p.rho===w.audit.exhaustive.rho);
 const skipped=winningRho.bestSkipped;
 assert.equal(skipped.split,w.audit.exhaustive.split);
 assert.equal(skipped.score,w.audit.exhaustive.score);
 assert.ok(skipped.roughScore>=skipped.incumbentAtSkip);
 assert.ok(skipped.score<skipped.incumbentAtSkip);
 assert.equal(skipped.guard,false);assert.equal(skipped.wouldVerify,false);
 results.push({id:w.id,n:w.n,baseline:base.step,intervention:changed.step,
   scoreGap:base.step.score-changed.step.score,baselineStatus:b.inquiries[0].status,
   interventionStatus:c.inquiries[0].status,baselineImprovement:base.improvement,
   interventionImprovement:changed.improvement,statusChanged:b.inquiries[0].status!==c.inquiries[0].status,
   skipped,roughFloorActive:skipped.roughSSE/w.n<=1e-24,
   directFloorActive:skipped.directSSE/w.n<=1e-24});
}
console.log(finiteJSON({scope:'Exact one-condition step gate intervention; diagnostic only',
 baselineModelBlob:'7ac7c9030b692bea794ee50a2b4b726ce44ef2d3',cases:results.length,
 allScreenedAndExhaustiveMatches:true,allAlternativeFamiliesUnchanged:true,
 statusChanges:results.filter(r=>r.statusChanged).length,results}));
