import test from 'node:test';import assert from 'node:assert/strict';
import {raw} from './condition-outcomes-fixture.mjs';
import {CONDITION_OUTCOMES_FORMAT,importConditionOutcomes,inspectConditionOutcomes} from '../src/condition-outcomes.mjs';
const study=(labels=['acceptable','unacceptable','unknown','unknown'],includePointScore=false)=>({format:CONDITION_OUTCOMES_FORMAT,conditions:structuredClone(raw),includePointScore,judgments:labels.map((outcome,i)=>({round:i+1,outcome,basis:'Authored outcome control'}))});
test('shortened-arm outcome distinguishes length; translated unacceptable outcome exposes missing positional requirement',()=>{
 let x=study(),f=inspectConditionOutcomes(x);assert.deepEqual(f.minimal.map(h=>h.criterionIds),[['condition/length']]);
 x.judgments[2].outcome='unacceptable';f=inspectConditionOutcomes(x);assert.equal(f.counts.consistent,0);assert(f.hypotheses.every(h=>h.contradictedRounds.includes(3)));
 x.includePointScore=true;f=inspectConditionOutcomes(x);assert.deepEqual(f.minimal.map(h=>h.criterionIds),[['@original-point-score']]);
});
test('additional requirement can invalidate a consistent conjunction and cannot use categorical-cover pruning',()=>{
 const x=study(['unknown','acceptable','unacceptable','unknown']);
 x.conditions.session.history[2].attempts=[{id:'m0',xMm:20,yMm:50},{id:'m1',xMm:50,yMm:50},{id:'m2',xMm:50,yMm:71}];
 const f=inspectConditionOutcomes(x);assert.equal(f.hypotheses.find(h=>h.mask===2).status,'consistent');assert.equal(f.hypotheses.find(h=>h.mask===3).status,'contradicted');assert(f.hypotheses.find(h=>h.mask===3).contradictedRounds.includes(2));
});
test('missing endpoint is unresolved; unknown outcome never contributes a vote',()=>{
 const f=inspectConditionOutcomes(study(['acceptable','unknown','unknown','unacceptable']));
 assert.equal(f.hypotheses.find(h=>h.mask===2).status,'unresolved');assert.deepEqual(f.hypotheses.find(h=>h.mask===2).unresolvedRounds,[4]);
 const none=inspectConditionOutcomes(study(['unknown','unknown','unknown','unknown']));assert.equal(none.contrast,false);assert.equal(none.minimal.length,0);assert.equal(none.counts['insufficient-contrast'],3);
});
test('source-only replay discards supplied findings and preserves exact raw history and bases',()=>{
 const x=study(),before=JSON.stringify(x);assert.deepEqual(importConditionOutcomes({...x,minimal:['forged']}),x);assert.deepEqual(inspectConditionOutcomes(JSON.parse(before)),inspectConditionOutcomes(x));assert.equal(JSON.stringify(x),before);
 const bad=structuredClone(x);bad.conditions.source.landmarks[0].toleranceMm=3;assert.throws(()=>importConditionOutcomes(bad),/differ/);
 for(const mutate of [v=>v.judgments[0].basis='',v=>v.judgments[0].round=2,v=>v.judgments.pop(),v=>delete v.judgments[0],v=>v.includePointScore='yes']){const b=structuredClone(x);mutate(b);assert.throws(()=>importConditionOutcomes(b));}
});
test('independent direct conjunction oracle checks all81 supplied-label assignments',()=>{
 // Compare maintained-derived results with a direct three-valued evaluator for
 // every possible supplied label assignment over the four actual rounds.
 const labels=['acceptable','unacceptable','unknown'];
 for(let n=0;n<81;n++){
  const ls=Array.from({length:4},(_,i)=>labels[Math.floor(n/3**i)%3]);const f=inspectConditionOutcomes(study(ls,true));
  for(const h of f.hypotheses){let bad=[],unknown=[];
   for(const r of f.rows){if(r.outcome==='unknown')continue;const selected=r.statuses.filter((_,i)=>h.mask&(1<<i));const result=selected.some(s=>s==='outside')?false:selected.every(s=>s==='within')?true:null;
    if(result===null)unknown.push(r.round);else if(result!==(r.outcome==='acceptable'))bad.push(r.round);
   }
   assert.deepEqual(h.contradictedRounds,bad);assert.deepEqual(h.unresolvedRounds,unknown);
  }
 }
});
test('maximum13 criteria enumerate8191 conjunctions without dropping originals',()=>{
 const x=study(undefined,true);x.conditions.conditions=Array.from({length:12},(_,i)=>({...raw.conditions[i%2],id:'criterion'+i}));
 const f=inspectConditionOutcomes(x);assert.equal(f.criteria.length,13);assert.equal(f.hypotheses.length,8191);assert.equal(Object.values(f.counts).reduce((a,b)=>a+b),8191);
});
