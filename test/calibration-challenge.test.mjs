import test from "node:test";
import assert from "node:assert/strict";
import {createObservation} from "../src/evidence.mjs";
import {createCalibrationHypothesis,exportCalibrationInvestigation} from "../src/calibration-evidence.mjs";
import {freezeChallengePlan,importChallengePlan,createChallengeResult,analyzeCalibrationChallenge,
  exportChallengeStudy,importChallengeStudy} from "../src/calibration-challenge.mjs";

const demo={title:"Authored reference",provenance:"Analytic controls only",
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[{id:"guide",label:"Guide",kind:"edge_offset_mm",edge:"left",sourcePx:{x:20,y:30},toleranceMm:2}]};
const obs=(id,fields={})=>createObservation(demo,{id,landmarkId:"guide",label:"Authored training",
  evidenceClass:"authored-example",widthMm:200,heightMm:160,xMm:20,yMm:60,uncertaintyMm:.1,...fields});
const alt=x=>createCalibrationHypothesis(demo,"guide",{id:"alternative",label:"Alternative reading",basis:"proposed-reading",
  reading:{...demo.source,sourcePx:{x,y:30}}});
const study=(observations=[obs("training")],hypotheses=[alt(10)])=>exportCalibrationInvestigation(demo,"guide",observations,hypotheses);
const trial=(id="new-sheet",widthMm=300,heightMm=240,uncertaintyMm=.1)=>({id,label:"Authored planned workpiece",widthMm,heightMm,uncertaintyMm});
const plan=(inputStudy=study(),trials=[trial()])=>freezeChallengePlan(inputStudy,
  {id:"frozen-plan",label:"Prospective authored control",prospectiveDeclaration:true,trials});
const result=(p,fields={})=>createChallengeResult(p,{trialId:p.trials[0].id,id:"challenge-result",label:"Separately authored result",
  evidenceClass:"authored-example",collectedAfterPlan:true,xMm:30,yMm:90,uncertaintyMm:.1,...fields});
const copy=x=>JSON.parse(JSON.stringify(x));

test("training fixes complete explanation predictions before challenge values exist",()=>{
  const s=study(),before=JSON.stringify(s),p=plan(s);
  assert.deepEqual(p.explanations.map(e=>e.id),["left:nominal","fraction:alternative"]);
  assert.deepEqual(p.explanations.map(e=>e.predictions[0]),[
    {trialId:"new-sheet",xMm:20,yMm:90},{trialId:"new-sheet",xMm:30,yMm:90}]);
  assert.equal(analyzeCalibrationChallenge(p,[]).status,"awaiting-results");
  assert.equal(JSON.stringify(s),before);assert.equal(Object.isFrozen(p.investigation.source.source),true);
  assert.throws(()=>{p.explanations[0].predictions[0].xMm=999;},TypeError);
});
test("a separately entered new-workpiece result distinguishes frozen explanations",()=>{
  const p=plan(),before=JSON.stringify(p),r=analyzeCalibrationChallenge(p,[result(p)]);
  assert.equal(r.status,"single-compatible");assert.deepEqual(r.survivingRules,["fraction"]);
  assert.equal(r.explanations.find(e=>e.id==="left:nominal").residuals[0].errorMm,10);
  assert.equal(r.explanations.find(e=>e.id==="fraction:alternative").residuals[0].errorMm,0);
  assert.equal(JSON.stringify(p),before);
});
test("a rejected training explanation cannot revive by fitting only the challenge",()=>{
  const p=plan(),r=analyzeCalibrationChallenge(p,[result(p,{xMm:60})]);
  assert.equal(r.status,"none-compatible");
  assert.equal(r.explanations.some(e=>e.id==="fraction:nominal"),false);
  assert.deepEqual(r.survivingRules,[]);
});
test("new-workpiece plans refuse training dimensions, repeated setups and absence of training",()=>{
  assert.throws(()=>plan(study(),[trial("reuse",200,160)]),/absent from the training/);
  assert.throws(()=>plan(study(),[trial(),trial("duplicate")]),/distinct planned workpiece/);
  assert.throws(()=>plan(study([])),/training observations/);
  assert.throws(()=>plan(study([obs("one"),obs("two",{xMm:100})],[])),/No training explanation/);
});
test("the prospective declaration is required without pretending to authenticate chronology",()=>{
  assert.throws(()=>freezeChallengePlan(study(),{id:"plan",label:"Plan",trials:[trial()]}),/Declare/);
  const p=plan();assert.throws(()=>result(p,{collectedAfterPlan:false}),/Declare/);
  assert.match(analyzeCalibrationChallenge(p,[result(p)]).collectionOrder,/User-declared/);
});
test("editing the exploratory investigation after freeze cannot change the detached plan",()=>{
  const s=study(),p=plan(s),before=JSON.stringify(p);
  s.hypotheses[0].reading.sourcePx.x=50;s.observations[0].xMm=88;s.source.title="Changed";
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(analyzeCalibrationChallenge(p,[result(p)]).survivingRules,["fraction"]);
});
test("worse achieved precision is retained but cannot widen the accepted frozen radius",()=>{
  const p=plan(),entry=result(p,{xMm:25,uncertaintyMm:6});
  const r=analyzeCalibrationChallenge(p,[entry]);
  assert.equal(r.status,"incomplete");assert.equal(r.qualifiedCount,0);assert.equal(r.insufficientPrecisionCount,1);
  assert.equal(r.trials[0].observation.uncertaintyMm,6);assert.equal(r.trials[0].uncertaintyMm,.1);
  assert.ok(r.explanations.every(e=>e.residuals[0].compatible===null));
});
test("a known qualified contradiction remains decisive beside a missing or imprecise challenge",()=>{
  const p=plan(study(),[trial(),trial("later",400,320)]),bad=result(p,{xMm:60});
  assert.equal(analyzeCalibrationChallenge(p,[bad]).status,"none-compatible");
  const imprecise=result(p,{id:"later-result",trialId:"later",xMm:40,yMm:120,uncertaintyMm:2});
  const r=analyzeCalibrationChallenge(p,[bad,imprecise]);
  assert.equal(r.status,"none-compatible");assert.equal(r.insufficientPrecisionCount,1);
});
test("incomplete plans expose provisional survivors without calling the full plan compatible",()=>{
  const p=plan(study(),[trial(),trial("later",400,320)]);
  const r=analyzeCalibrationChallenge(p,[result(p)]);
  assert.equal(r.status,"incomplete");assert.equal(r.missingCount,1);assert.deepEqual(r.survivingRules,["fraction"]);
  const completed=analyzeCalibrationChallenge(p,[result(p),result(p,{id:"later-result",trialId:"later",xMm:40,yMm:120})]);
  assert.equal(completed.status,"single-compatible");assert.equal(completed.qualifiedCount,2);
});
test("one frozen source reading must satisfy every challenge; per-result switching is refused",()=>{
  const training=study([obs("training",{widthMm:100,heightMm:80,xMm:25,yMm:30,uncertaintyMm:15})],[alt(30)]);
  const p=plan(training,[trial("one",200,160),trial("two",300,240)]);
  const first=result(p,{trialId:"one",xMm:20,yMm:60});
  const second=result(p,{id:"second-result",trialId:"two",xMm:30,yMm:90});
  const r=analyzeCalibrationChallenge(p,[first,second]);
  assert.equal(r.status,"none-compatible");assert.equal(r.rules.find(x=>x.rule==="left").requiresSwitching,true);
  assert.deepEqual(r.explanations.filter(e=>e.rule==="left").map(e=>e.residuals.map(r=>r.compatible)),[[true,false],[false,true]]);
});
test("source-bound result imports refuse changed dimensions, anchors, training ids and duplicate slots",()=>{
  const p=plan(),entry=result(p);
  for(const change of [e=>e.observation.widthMm++,e=>e.observation.sourceReference.landmark.sourcePx.x++,e=>e.observation.id="training"]){
    const changed=copy(entry);change(changed);assert.throws(()=>analyzeCalibrationChallenge(p,[changed]));
  }
  assert.throws(()=>result(p,{id:"training"}),/training observation/);
  const p2=plan(study(),[trial(),trial("later",400,320)]);
  assert.throws(()=>analyzeCalibrationChallenge(p2,[entry,{...copy(entry),observation:{...copy(entry.observation),id:"another"}}]),/already has a result/);
});
test("saved predictions must agree with retained training and may not add eliminated explanations",()=>{
  const p=plan();
  for(const change of [x=>x.explanations[0].predictions[0].xMm++,x=>x.explanations.pop(),
    x=>x.investigation.hypotheses[0].reading.sourcePx.x=11]){
    const changed=copy(p);change(changed);assert.throws(()=>importChallengePlan(changed),/Frozen predictions/);
  }
  const changed=copy(p);changed.investigation.source.source.widthMm++;
  assert.throws(()=>importChallengePlan(changed),/source reference/);
});
test("export and fresh reopen preserve inputs and recompute findings instead of trusting saved verdicts",()=>{
  const p=plan(),entry=result(p),saved=exportChallengeStudy(p,[entry]);
  saved.verdict="left with certainty";saved.results[0].observation.compatible=true;
  const reopened=importChallengeStudy(copy(saved));
  assert.equal(reopened.verdict,undefined);assert.equal(reopened.results[0].observation.compatible,undefined);
  assert.deepEqual(reopened.results,[entry]);
  assert.deepEqual(analyzeCalibrationChallenge(reopened.plan,reopened.results).survivingRules,["fraction"]);
  assert.equal(JSON.stringify(importChallengePlan(copy(p))),JSON.stringify(p));
});
test("bounded inputs and impossible target geometry cannot silently drop frozen explanations",()=>{
  assert.throws(()=>plan(study(),[]),/Plan 1/);
  assert.throws(()=>plan(study(),Array.from({length:7},(_,i)=>trial("trial-"+i,300+i,240))),/Plan 1/);
  assert.throws(()=>plan(study(),[trial("tiny",10,10)]),/clearance|fit|dimension/i);
  assert.throws(()=>plan(study(),[trial("bad",300,240,NaN)]),/radius/);
  assert.throws(()=>result(plan(),{xMm:NaN}),/Observed x/);
});
