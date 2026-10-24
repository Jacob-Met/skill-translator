import test from "node:test";
import assert from "node:assert/strict";
import {calibrate,toImage} from "../src/geometry.mjs";
import {createObservation,analyzeEvidence,proposeEvidenceVariation,RULES} from "../src/evidence.mjs";
import {createCalibrationHypothesis,analyzeCalibrationEvidence,proposeCalibrationVariation,
  exportCalibrationInvestigation,importCalibrationInvestigation,validateCalibrationHypotheses}
  from "../src/calibration-evidence.mjs";

const demo={title:"Analytic sheet",provenance:"Authored controls, no physical measurement",
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[{id:"guide",label:"Guide",kind:"edge_offset_mm",edge:"left",
    sourcePx:{x:20,y:30},toleranceMm:50}]};
const observation=(id,fields={},source=demo)=>createObservation(source,{id,landmarkId:"guide",
  label:`Authored trial ${id}`,evidenceClass:"authored-example",widthMm:200,heightMm:160,
  xMm:20,yMm:60,uncertaintyMm:0.1,...fields});
function hypothesis(id,fields={},source=demo){
  return createCalibrationHypothesis(source,"guide",{id,label:`Alternative ${id}`,basis:"proposed-reading",
    reading:{widthMm:source.source.widthMm,heightMm:source.source.heightMm,
      corners:source.source.corners,sourcePx:source.landmarks[0].sourcePx,...fields}});
}
test("nominal-only analysis exactly preserves maintained rule outcomes and residuals",()=>{
  for(const rows of [[],[observation("one")],[observation("one"),observation("two",{xMm:40})]]){
    const baseline=analyzeEvidence(demo,"guide",rows);
    const result=analyzeCalibrationEvidence(demo,"guide",rows);
    assert.equal(result.status,baseline.status);
    assert.deepEqual(result.survivingRules,baseline.compatibleRules);
    assert.deepEqual(result.hypotheses[0].candidates.map(c=>c.residuals),baseline.candidates.map(c=>c.residuals));
  }
});
test("a source reading reopens a nominal single-rule conclusion without fabricating certainty",()=>{
  const rows=[observation("trial")];
  assert.deepEqual(analyzeEvidence(demo,"guide",rows).compatibleRules,["left"]);
  const alternative=hypothesis("smaller-x",{sourcePx:{x:10,y:30}});
  const result=analyzeCalibrationEvidence(demo,"guide",rows,[alternative]);
  assert.equal(result.status,"unresolved");assert.equal(result.sensitive,true);
  assert.deepEqual(result.survivingRules,["fraction","left"]);
  assert.deepEqual(result.rules[0].supportingHypothesisIds,["smaller-x"]);
  assert.deepEqual(result.rules[1].supportingHypothesisIds,["nominal"]);
});
test("one coherent reference must explain every observation; per-row calibration switching is refused",()=>{
  const rows=[observation("first"),observation("second",{widthMm:300,heightMm:240,xMm:30,yMm:90})];
  const result=analyzeCalibrationEvidence(demo,"guide",rows,[hypothesis("thirty",{sourcePx:{x:30,y:30}})]);
  assert.equal(result.status,"none-compatible");assert.deepEqual(result.survivingRules,[]);
  const left=result.rules.find(r=>r.rule==="left");
  assert.equal(left.requiresSwitching,true);assert.equal(left.status,"contradicted");
  assert.deepEqual(result.hypotheses[0].candidates[1].contradictions,["second"]);
  assert.deepEqual(result.hypotheses[1].candidates[1].contradictions,["first"]);
});
test("known perspective and source physical dimensions condition the same maintained predictor",()=>{
  // Independent forward projective map: x=(100u+10v+5)/(1+.2u), y=(5u+80v+7)/(1+.2u).
  const project=(u,v)=>({x:(100*u+10*v+5)/(1+.2*u),y:(5*u+80*v+7)/(1+.2*u)});
  const corners=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>project(u,v));
  const variant=hypothesis("perspective",{widthMm:120,heightMm:90,corners,sourcePx:project(.25,.4)});
  const rows=[observation("test",{widthMm:240,heightMm:180,xMm:30,yMm:72,uncertaintyMm:1e-6})];
  const r=analyzeCalibrationEvidence(demo,"guide",rows,[variant]);
  assert.deepEqual(r.rules.find(x=>x.rule==="left").supportingHypothesisIds,["perspective"]);
  assert.ok(r.hypotheses[1].candidates[1].residuals[0].errorMm<1e-10);
});
test("changing only reference dimensions changes fixed clearance, not proportional coordinates",()=>{
  const r=analyzeCalibrationEvidence(demo,"guide",[observation("size",{xMm:30})],
    [hypothesis("wider-source",{widthMm:150})]);
  assert.deepEqual(r.survivingRules,["left"]);
  assert.equal(r.rules[1].status,"reading-sensitive");
  assert.equal(r.hypotheses[1].candidates[0].residuals[0].predicted.xMm,40);
});
test("repeated identical readings and observations are not votes or confidence",()=>{
  const rows=[observation("same",{widthMm:100,heightMm:80,xMm:20,yMm:30})];
  const r=analyzeCalibrationEvidence(demo,"guide",rows,[hypothesis("again"),hypothesis("third")]);
  assert.equal(r.status,"unresolved");assert.deepEqual(r.survivingRules,RULES);
  assert.ok(r.rules.every(x=>x.status==="all-readings-compatible"));
  assert.equal("confidence" in r,false);assert.equal("probability" in r,false);
  const empty=analyzeCalibrationEvidence(demo,"guide",[],[hypothesis("again")]);
  assert.equal(empty.status,"no-evidence");assert.ok(empty.rules.every(r=>r.status==="untested"));
});
test("prediction-set planning matches nominal planner when reference is exact",()=>{
  const baseline=proposeEvidenceVariation(demo,"guide",[],.5);
  const planned=proposeCalibrationVariation(demo,"guide",[],[],.5);
  assert.equal(planned.widthMm,baseline.widthMm);assert.equal(planned.heightMm,baseline.heightMm);
  assert.equal(planned.separablePairs,baseline.separablePairs);
  assert.equal(planned.minSeparationMm,baseline.minSeparationMm);
});
test("next observations compare closest surviving explanation pairs, not averaged predictions",()=>{
  const rows=[observation("one")],alternatives=[hypothesis("half",{sourcePx:{x:10,y:30}})];
  const p=proposeCalibrationVariation(demo,"guide",rows,alternatives,.1);
  assert.equal(p.totalPairs,1);assert.equal(p.status,"separating-dimensions");
  const fraction=p.predictions.find(r=>r.rule==="fraction").points;
  const left=p.predictions.find(r=>r.rule==="left").points;
  assert.deepEqual(fraction.map(p=>p.hypothesisId),["half"]);
  assert.deepEqual(left.map(p=>p.hypothesisId),["nominal"]);
  assert.ok(Math.abs(p.pairs[0].separationMm-Math.abs(p.widthMm*.1-20))<1e-9);
  const vague=proposeCalibrationVariation(demo,"guide",rows,alternatives,1000);
  assert.equal(vague.status,"no-separating-dimensions");assert.equal(vague.separablePairs,0);
  assert.equal(proposeCalibrationVariation(demo,"guide",rows,[],.1),null);
});
test("edge-coincident rules remain inseparable under all tested source readings",()=>{
  const edge=structuredClone(demo);edge.landmarks[0].sourcePx={x:0,y:0};
  const p=proposeCalibrationVariation(edge,"guide",[],[hypothesis("again",{},edge)],0);
  const pair=p.pairs.find(p=>p.rules[0]==="fraction"&&p.rules[1]==="left");
  assert.equal(pair.separationMm,0);assert.equal(pair.distinguishable,false);
});
test("the full saved investigation round-trips, recomputes verdicts, and keeps source anchors unchanged",()=>{
  const data=[observation("trial")],variants=[hypothesis("alternate",{sourcePx:{x:10,y:30}})];
  const before=JSON.stringify({demo,data,variants});
  const bundle=exportCalibrationInvestigation(demo,"guide",data,variants);
  bundle.verdict="definitely fraction";bundle.probability=1;
  const loaded=importCalibrationInvestigation(JSON.parse(JSON.stringify(bundle)),demo);
  assert.equal(loaded.verdict,undefined);assert.equal(loaded.probability,undefined);
  assert.deepEqual(loaded.observations,data);assert.deepEqual(loaded.hypotheses,variants);
  assert.equal(JSON.stringify({demo,data,variants}),before);
  assert.deepEqual(analyzeCalibrationEvidence(loaded.source,loaded.landmarkId,loaded.observations,loaded.hypotheses).survivingRules,
    ["fraction","left"]);
});
test("altered source, stale observation, missing anchors and different image identities are refused",()=>{
  const photo=structuredClone(demo);
  photo.source.image={sha256:"a".repeat(64),widthPx:200,heightPx:180,name:"original.png"};
  const bundle=exportCalibrationInvestigation(photo,"guide",[observation("one",{},photo)],[hypothesis("alt",{},photo)]);
  const renamed=structuredClone(photo);renamed.source.image.name="renamed.png";
  assert.doesNotThrow(()=>importCalibrationInvestigation(bundle,renamed));
  for(const change of [d=>d.source.image.sha256="b".repeat(64),d=>d.source.widthMm++,d=>d.landmarks[0].sourcePx.x++]){
    const changed=structuredClone(photo);change(changed);
    assert.throws(()=>importCalibrationInvestigation(bundle,changed),/different source/);
  }
  const stale=structuredClone(bundle);stale.observations[0].sourceReference.landmark.sourcePx.x++;
  assert.throws(()=>importCalibrationInvestigation(stale),/source reference differs/);
  const bad=structuredClone(bundle);delete bad.hypotheses[0].sourceReference;
  assert.throws(()=>importCalibrationInvestigation(bad),/Hypothesis source reference/);
});
test("invalid hypotheses are refused atomically without weakening original observation bounds",()=>{
  const good=hypothesis("good");
  for(const fields of [{widthMm:0},{sourcePx:{x:NaN,y:30}},
    {sourcePx:{x:1000,y:30}},{corners:[{x:0,y:0},{x:0,y:0},{x:100,y:80},{x:0,y:80}]}]){
    assert.throws(()=>hypothesis("bad",fields));
  }
  assert.throws(()=>hypothesis("nominal"),/distinct id/);
  assert.throws(()=>validateCalibrationHypotheses(demo,"guide",[good,good]),/distinct id/);
  assert.throws(()=>analyzeCalibrationEvidence(demo,"guide",[],Array(25).fill(good)),/at most/);
  assert.throws(()=>proposeCalibrationVariation(demo,"guide",[],[],NaN),/radius/);
  const photo=structuredClone(demo);photo.source.image={sha256:"a".repeat(64),widthPx:100,heightPx:80};
  const out=[{x:-1,y:0},{x:100,y:0},{x:100,y:80},{x:-1,y:80}];
  assert.throws(()=>hypothesis("outside-image",{corners:out},photo),/inside the original image/);
  const impossible=structuredClone(photo);impossible.source.image.widthPx=90;
  assert.throws(()=>exportCalibrationInvestigation(impossible,"guide",[],[]),/inside the original image/);
  assert.equal(good.reading.sourcePx.x,20);
});
