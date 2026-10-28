import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  analyzeJointChallengeSequenceConflicts as diagnose,
  analyzeJointChallengeSequence, serializeJointChallengeSequence
} from '../src/joint-challenge-sequence.mjs';

const cases=JSON.parse(readFileSync(new URL('./support/joint-challenge-sequence-conflicts-cases.json',import.meta.url),'utf8'));
const source=name=>JSON.parse(JSON.stringify(cases[name]));

test('retrospective cross-round conflict uses original family and original round locations',()=>{
  const s=source('cross-round-pair'),before=serializeJointChallengeSequence(s),predictions=analyzeJointChallengeSequence(s).rounds[0].predictions;
  const r=diagnose(s);
  assert.equal(r.interpretation,'retrospective-workpiece-groups');
  assert.equal(r.baselineCombinationCount,25);assert.equal(r.analysis.combinationCount,0);
  assert.deepEqual(r.minimalGroups.map(g=>g.trialIds),[['first-workpiece','later-workpiece']]);
  assert.deepEqual(r.workpieces.map(w=>[w.trialId,w.origin,w.roundIndex,w.sealed]),[['first-workpiece','initial',0,true],['later-workpiece','later-round',1,false]]);
  assert.equal(r.workpieces[1].roundId,s.rounds[0].id);
  assert.deepEqual(analyzeJointChallengeSequence(s).rounds[0].predictions,predictions);
  assert.equal(serializeJointChallengeSequence(s),before);
  assert(Object.isFrozen(r)&&Object.isFrozen(r.workpieces)&&Object.isFrozen(r.minimalGroups[0]));
});

test('all five alternative minimal groups survive complete six-workpiece enumeration',()=>{
  const s=source('six-workpieces-five-alternative-conflicts'),r=diagnose(s);
  assert.equal(r.enumerationComplete,true);assert.equal(r.evaluatedNonemptySubsets,63);assert.equal(r.subsets.length,63);
  assert.equal(r.minimalGroups.length,5);
  const observations=new Map([...s.initial.results,...s.rounds.flatMap(x=>x.results)].map(x=>[x.observation.id,x.trialId]));
  for(const g of r.minimalGroups){
    assert.equal(g.trialIds.length,2);assert(g.trialIds.includes('round-6-workpiece'));
    assert(g.singleRemovalSupport.every(x=>x.combinationCount>0));
    assert(g.readingEliminations.every(x=>x.blockedMarks.length>0));
    for(const reading of g.readingEliminations)for(const mark of reading.blockedMarks)for(const rule of mark.rules){
      assert(rule.rejectingObservationIds.length>0);
      assert(rule.rejectingObservationIds.every(id=>g.trialIds.includes(observations.get(id))));
    }
  }
  assert.deepEqual(r.workpieces.map(w=>w.sealed),[true,true,true,true,true,false]);
});

test('sealed missing and imprecise outcomes do not eliminate original explanations',()=>{
  const r=diagnose(source('sealed-missing-and-imprecise'));
  assert.equal(r.analysis.missingCount,5);assert.equal(r.analysis.impreciseCount,1);
  assert(r.subsets.every(x=>x.combinationCount===25));assert.deepEqual(r.minimalGroups,[]);
  assert.equal(r.workpieces[1].sealed,true);assert.equal(r.workpieces[2].sealed,false);
});

test('a single source reading is shared across all retained rounds',()=>{
  const r=diagnose(source('one-global-source-reading'));
  assert.equal(r.baselineCombinationCount,45);assert.equal(r.analysis.combinationCount,0);
  assert.equal(r.minimalGroups.length,1);assert.equal(r.minimalGroups[0].trialIds.length,2);
  assert(r.subsets.filter(x=>x.trialIds.length===1).every(x=>x.combinationCount>0));
  assert.deepEqual(r.subsets.at(-1).viableReadingIds,[]);
});

test('multiple initial workpieces remain separate groups within one retained initial course',()=>{
  const r=diagnose(source('multiple-initial-workpieces-stay-separate'));
  assert.deepEqual(r.minimalGroups.map(g=>g.trialIds),[['initial-a','later-after-two-workpiece'],['initial-b','later-after-two-workpiece']]);
  assert.deepEqual(r.workpieces.map(w=>w.roundIndex),[0,0,1]);
  assert.equal(r.workpieces[0].roundId,r.workpieces[1].roundId);
  assert.notEqual(r.workpieces[0].trialId,r.workpieces[1].trialId);
});

test('current-round correction recomputes diagnosis without changing the earlier prediction',()=>{
  const before=source('cross-round-pair'),after=source('current-round-correction');
  assert.equal(diagnose(before).minimalGroups.length,1);assert.deepEqual(diagnose(after).minimalGroups,[]);
  assert.equal(diagnose(after).analysis.combinationCount,1);
  assert.deepEqual(before.initial,after.initial);assert.deepEqual(before.rounds[0].prefix,after.rounds[0].prefix);
  assert.deepEqual(analyzeJointChallengeSequence(before).rounds[0].predictions,analyzeJointChallengeSequence(after).rounds[0].predictions);
});

test('complete prefix admission and byte bound precede retrospective diagnostics',()=>{
  const s=source('cross-round-pair');s.rounds[0].prefix.initial.results[0].observation.label='Tampered prior label';
  assert.throws(()=>diagnose(s),/complete original prior-source prefix/);
  assert.throws(()=>diagnose(' '.repeat(4_000_001)),/4,000,000/);
});

test('derived conflict caches are ignored and a consistent initial-only course remains inspectable',()=>{
  const clean=source('consistent-initial'),forged=source('consistent-initial');
  forged.minimalGroups=[['invented']];forged.analysis={combinationCount:0};forged.workpieces=[];
  assert.deepEqual(diagnose(forged),diagnose(clean));assert.deepEqual(diagnose(clean).minimalGroups,[]);
  assert.equal(diagnose(clean).analysis.combinationCount,1);assert.equal(diagnose(clean).evaluatedNonemptySubsets,1);
});

test('a valid later round named initial retains its distinct source location',()=>{
  const s=source('cross-round-pair');s.rounds[0].id='initial';const r=diagnose(s);
  assert.equal(r.workpieces[1].roundId,'initial');assert.equal(r.workpieces[1].roundIndex,1);
  assert.equal(r.workpieces[1].origin,'later-round');assert.equal(r.workpieces[0].origin,'initial');
  assert.equal(r.analysis.combinationCount,0);assert.equal(r.minimalGroups.length,1);
});
