import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeJointChallengeConflicts as diagnose} from '../src/joint-challenge-conflicts.mjs';
import {exportJointChallengeStudy as save,importJointChallengeStudy as reopen} from '../src/joint-challenge.mjs';
import {jointSourceReading,createJointCalibrationHypothesis} from '../src/joint-calibration.mjs';
import {authoredJointSource,makeJointStudy,futureTrial,makeChallenge,outcomeAt,alternativeGroupCourse} from './support/joint-challenge-conflict-fixtures.mjs';

const groups=report=>report.minimalGroups.map(group=>[...group.trialIds].sort().join(',')).sort();
const product=lists=>lists.reduce((rows,list)=>rows.flatMap(row=>list.map(value=>[...row,value])),[[]]);

// Independent small Cartesian calculation. The fixture has rectangular pixel
// corners, so this oracle computes physical predictions directly from each
// original source point and reading; it never uses residual masks or cached
// prediction coordinates from the implementation.
function oracle(plan,results) {
  const count=mask=>{
    let total=0;
    for(const reading of plan.readings) {
      const sourceReading=plan.investigation.hypotheses.find(h=>h.id===reading.id)?.reading
        ??jointSourceReading(plan.investigation.source);
      const candidates=product(reading.marks.map(mark=>mark.candidates.map(candidate=>candidate.rule)));
      for(const rules of candidates) {
        const ruleFor=new Map(reading.marks.map((mark,index)=>[mark.landmarkId,rules[index]]));
        const compatible=results.every(result=>{
          const trialIndex=plan.trials.findIndex(trial=>trial.id===result.trialId);
          if(!(mask&(1<<trialIndex)))return true;
          const trial=plan.trials[trialIndex],o=result.observation;
          if(o.uncertaintyMm>trial.uncertaintyMm)return true;
          const point=sourceReading.points.find(point=>point.landmarkId===o.landmarkId).sourcePx;
          const u=point.x/100,v=point.y/80,rule=ruleFor.get(o.landmarkId);
          const x=rule==='left'?u*sourceReading.widthMm:rule==='right'?trial.widthMm-(1-u)*sourceReading.widthMm:u*trial.widthMm;
          const y=rule==='top'?v*sourceReading.heightMm:rule==='bottom'?trial.heightMm-(1-v)*sourceReading.heightMm:v*trial.heightMm;
          return Math.hypot(x-o.xMm,y-o.yMm)<=o.uncertaintyMm+1e-9;
        });
        if(compatible)total++;
      }
    }
    return total;
  };
  const counts=Array.from({length:1<<plan.trials.length},(_,mask)=>count(mask));
  const minimal=[];
  for(let mask=1;mask<counts.length;mask++) {
    if(counts[mask])continue;
    // Check every proper subset, independently of the single-removal shortcut.
    if(counts.every((number,other)=>other===mask||(other&mask)!==other||number>0)) {
      minimal.push(plan.trials.filter((_,index)=>mask&(1<<index)).map(trial=>trial.id).sort().join(','));
    }
  }
  return {counts,groups:minimal.sort()};
}

test('all workpiece subsets retain the family when no qualified outcomes exist',()=>{
  const plan=makeChallenge(makeJointStudy(),[futureTrial('one'),futureTrial('two',300,240)]);
  const empty=diagnose(plan,[]);
  assert.equal(empty.evaluatedNonemptySubsets,3);
  assert.equal(empty.enumerationComplete,true);
  assert.equal(empty.analysis.status,'awaiting-results');
  assert.deepEqual(empty.minimalGroups,[]);
  assert.ok(empty.subsets.every(subset=>subset.combinationCount===empty.baselineCombinationCount));
  const imprecise=diagnose(plan,[outcomeAt(plan,'guide',199,159,'one',.2)]);
  assert.deepEqual(imprecise.minimalGroups,[]);
  assert.equal(imprecise.analysis.qualifiedCount,0);
  assert.deepEqual(imprecise.subsets,empty.subsets);
});

test('one contradictory workpiece remains diagnostic with missing and imprecise marks',()=>{
  const plan=makeChallenge();
  const rows=[outcomeAt(plan,'guide',199,159)];
  const missing=diagnose(plan,rows);
  assert.deepEqual(groups(missing),['future']);
  assert.deepEqual(missing.minimalGroups[0].missingSlots,[{trialId:'future',landmarkId:'index'}]);
  rows.push(outcomeAt(plan,'index',90,100,'future',.2));
  const report=diagnose(plan,rows),group=report.minimalGroups[0];
  assert.equal(report.analysis.status,'none-compatible');
  assert.deepEqual(group.qualifiedObservationIds,['future-guide']);
  assert.deepEqual(group.impreciseObservationIds,['future-index']);
  assert.deepEqual(group.missingSlots,[]);
  assert.equal(group.singleRemovalSupport[0].combinationCount,report.baselineCombinationCount);
  assert.ok(group.readingEliminations.every(reading=>reading.blockedMarks.length>0));
  for(const reading of group.readingEliminations)for(const mark of reading.blockedMarks)for(const rule of mark.rules) {
    assert.deepEqual(rule.rejectingObservationIds,['future-guide']);
  }
});

test('individually compatible workpieces can contradict one fixed rule jointly',()=>{
  const {plan,results}=alternativeGroupCourse();
  const report=diagnose(plan,results.filter(row=>row.trialId!=='three'));
  assert.deepEqual(groups(report),['one,two']);
  assert.equal(report.analysis.missingCount,2);
  const group=report.minimalGroups[0];
  assert.ok(group.singleRemovalSupport.every(removal=>removal.combinationCount>0));
  assert.deepEqual(group.readingEliminations[0].blockedMarks.map(mark=>mark.landmarkId),['guide']);
});

test('returns every minimal group including alternatives of different sizes',()=>{
  const {plan,results}=alternativeGroupCourse();
  const report=diagnose(plan,results);
  assert.deepEqual(groups(report),['one,two','three']);
  assert.equal(report.contradictorySubsetCount,5);
  assert.equal(report.evaluatedNonemptySubsets,7);
  assert.deepEqual(report.minimalGroups.map(group=>group.trialIds.length),[1,2]);
  assert.equal(report.analysis.missingCount,1);
});

test('cross-mark source switching is a conflict even though each mark has support somewhere',()=>{
  const plan=makeChallenge();
  const report=diagnose(plan,[outcomeAt(plan,'guide',20,60),outcomeAt(plan,'index',90,100)]);
  assert.equal(report.analysis.requiresSourceSwitching,true);
  assert.deepEqual(groups(report),['future']);
  const eliminated=report.minimalGroups[0].readingEliminations;
  assert.ok(eliminated.every(reading=>reading.blockedMarks.length>0));
  assert.ok(eliminated.some(reading=>reading.blockedMarks.some(mark=>mark.landmarkId==='guide')));
  assert.ok(eliminated.some(reading=>reading.blockedMarks.some(mark=>mark.landmarkId==='index')));
});

test('every subset count and all minimal groups match an independent small Cartesian oracle',()=>{
  const course=alternativeGroupCourse();
  const wide=makeChallenge(makeJointStudy(),[futureTrial('one'),futureTrial('two',300,240),futureTrial('three',400,320)]);
  const cases=[
    course,
    {plan:wide,results:[]},
    {plan:wide,results:[outcomeAt(wide,'guide',20,60,'one'),outcomeAt(wide,'index',90,100,'one')]},
    {plan:wide,results:[outcomeAt(wide,'guide',30,60,'one'),outcomeAt(wide,'index',90,100,'one'),outcomeAt(wide,'guide',30,90,'two'),outcomeAt(wide,'index',90,150,'two'),outcomeAt(wide,'guide',399,319,'three',.2)]}
  ];
  for(const {plan,results} of cases) {
    const expected=oracle(plan,results),actual=diagnose(plan,results);
    assert.equal(actual.baselineCombinationCount,expected.counts[0]);
    for(const subset of actual.subsets)assert.equal(subset.combinationCount,expected.counts[subset.mask]);
    assert.deepEqual(groups(actual),expected.groups);
  }
});

test('trial and outcome ordering cannot change the source-identified conflict groups',()=>{
  const {plan,results}=alternativeGroupCourse();
  const reordered=makeChallenge(plan.investigation,[plan.trials[2],plan.trials[0],plan.trials[1]]);
  const a=diagnose(plan,results),b=diagnose(reordered,[...results].reverse());
  assert.deepEqual(groups(a),groups(b));
  const counts=report=>Object.fromEntries(report.subsets.map(subset=>[[...subset.trialIds].sort().join(','),subset.combinationCount]));
  assert.deepEqual(counts(a),counts(b));
});

test('six workpieces and 72 outcomes remain factored while all 63 subsets are inspected',()=>{
  const source=structuredClone(authoredJointSource);
  source.landmarks=Array.from({length:12},(_,index)=>({...source.landmarks[0],id:'mark-'+index,sourcePx:{x:10+index*5,y:20+index}}));
  const study=makeJointStudy(source,false);
  study.hypotheses=Array.from({length:24},(_,index)=>createJointCalibrationHypothesis(source,{
    id:'reading-'+index,label:'Explicit same-geometry reading',basis:'proposed-reading',reading:jointSourceReading(source)
  }));
  const plan=makeChallenge(study,Array.from({length:6},(_,index)=>futureTrial('t'+index,200+index*10,160+index*10,1000)));
  const results=plan.trials.flatMap(trial=>source.landmarks.map(mark=>outcomeAt(plan,mark.id,mark.sourcePx.x*trial.widthMm/100,mark.sourcePx.y*trial.heightMm/80,trial.id,1000)));
  const report=diagnose(plan,results);
  assert.equal(results.length,72);
  assert.equal(report.evaluatedNonemptySubsets,63);
  assert.equal(report.subsets.length,63);
  assert.ok(report.subsets.every(subset=>subset.combinationCount===25*5**12));
  assert.deepEqual(report.minimalGroups,[]);
});

test('source-only replay recomputes diagnostics without changing exports or accepting forged anchors',()=>{
  const {plan,results}=alternativeGroupCourse();
  const original=JSON.stringify(save(plan,results)),before=JSON.stringify(results);
  const expected=diagnose(plan,results);
  assert.equal(JSON.stringify(save(plan,results)),original);
  assert.equal(JSON.stringify(results),before);
  const forged=JSON.parse(original);
  forged.conflicts={enumerationComplete:true,minimalGroups:[]};
  forged.plan.readings=[{id:'invented',marks:[]}];
  const reopened=reopen(JSON.stringify(forged));
  assert.deepEqual(diagnose(reopened.plan,reopened.results),expected);
  assert.equal(JSON.stringify(save(reopened.plan,reopened.results)),original);
  assert.equal('conflicts' in save(plan,results),false);
  const bad=structuredClone(results);
  bad[0].observation.sourceReference.landmark.sourcePx.x++;
  assert.throws(()=>diagnose(plan,bad),/source|reference/i);
  const unknown=structuredClone(results);unknown[0].trialId='not-planned';
  assert.throws(()=>diagnose(plan,unknown),/trial|plan/i);
});
