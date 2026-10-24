import test from "node:test";
import assert from "node:assert/strict";
import {createObservation,analyzeEvidence,proposeEvidenceVariation,
  exportEvidence,importEvidence,validateObservations,RULES} from "../src/evidence.mjs";

// Analytic positions are independent of the application's prediction routine.
const demo={provenance:"Authored analytic controls; no physical experiment",
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[{id:"guide",label:"Guide",kind:"edge_offset_mm",edge:"left",
    sourcePx:{x:20,y:30},toleranceMm:50}]};
const row=(id,fields={})=>createObservation(demo,{id,landmarkId:"guide",label:`Authored trial ${id}`,
  evidenceClass:"authored-example",widthMm:200,heightMm:160,xMm:20,yMm:60,uncertaintyMm:0.5,...fields});
test("a differently sized sheet distinguishes fixed-left clearance from four rival rules",()=>{
  const r=analyzeEvidence(demo,"guide",[row("trial-1")]);
  assert.deepEqual(r.compatibleRules,["left"]);assert.equal(r.status,"single-compatible");
  assert.equal(r.candidates.find(c=>c.rule==="fraction").maxErrorMm,20);
  assert.equal(r.authoredCount,1);assert.equal(r.reportedCount,0);
  // Large practice tolerance must not conceal a contradicted observation.
  assert.equal(r.candidates.find(c=>c.rule==="fraction").status,"contradicted");
});
test("same-size observations preserve all interpretations; repetitions do not create confidence",()=>{
  const data=[row("same-1",{widthMm:100,heightMm:80,xMm:20,yMm:30}),
    row("same-2",{widthMm:100,heightMm:80,xMm:20,yMm:30})];
  assert.deepEqual(analyzeEvidence(demo,"guide",data).compatibleRules,RULES);
  assert.equal(analyzeEvidence(demo,"guide",data).status,"unresolved");
});
test("fractional relationship predicts a held-out size without refitting",()=>{
  const rows=[row("train",{xMm:40,yMm:60}),row("held-out",{widthMm:150,heightMm:200,xMm:30,yMm:75})];
  const result=analyzeEvidence(demo,"guide",rows);
  assert.deepEqual(result.compatibleRules,["fraction"]);
  assert.equal(result.candidates[0].maxErrorMm,0);
});
test("all physical edges can be distinguished using independent analytic observations",()=>{
  for(const [rule,xMm,yMm] of [["left",20,60],["right",120,60],["top",40,30],["bottom",40,110]]){
    assert.deepEqual(analyzeEvidence(demo,"guide",[row("control",{xMm,yMm})]).compatibleRules,[rule]);
  }
});
test("uncertainty is a circular bound, not task tolerance or probability",()=>{
  const on=row("on",{xMm:23,yMm:64,uncertaintyMm:5});
  const outside=row("outside",{xMm:23,yMm:64,uncertaintyMm:4.99});
  assert.ok(analyzeEvidence(demo,"guide",[on]).compatibleRules.includes("left"));
  assert.ok(!analyzeEvidence(demo,"guide",[outside]).compatibleRules.includes("left"));
  assert.equal(analyzeEvidence(demo,"guide",[row("uncertain",{uncertaintyMm:1000})]).status,"unresolved");
});
test("mutually contradictory observations retain no candidate instead of averaging the failure away",()=>{
  const result=analyzeEvidence(demo,"guide",[row("left-trial"),row("fraction-trial",{xMm:40})]);
  assert.equal(result.status,"none-compatible");assert.deepEqual(result.compatibleRules,[]);
  assert.deepEqual(result.candidates.find(c=>c.rule==="left").contradictions,["fraction-trial"]);
  assert.equal(proposeEvidenceVariation(demo,"guide",[row("left-trial"),row("fraction-trial",{xMm:40})],1),null);
});
test("a rule that cannot fit an observed workpiece is explicitly contradicted",()=>{
  const result=analyzeEvidence(demo,"guide",[row("small",{widthMm:10,heightMm:80,xMm:2,yMm:30})]);
  const left=result.candidates.find(c=>c.rule==="left");
  assert.equal(left.status,"contradicted");assert.equal(left.residuals[0].predicted,null);
  assert.match(left.residuals[0].reason,/cannot fit/);
  assert.doesNotThrow(()=>JSON.parse(JSON.stringify(result)));
});
test("next-size proposal separates surviving candidates and explicitly reports unresolved pairs",()=>{
  const proposal=proposeEvidenceVariation(demo,"guide",[],1);
  assert.equal(proposal.totalPairs,10);assert.equal(proposal.separablePairs,10);
  assert.ok(proposal.widthMm!==100&&proposal.heightMm!==80);
  assert.deepEqual(proposeEvidenceVariation(demo,"guide",[],1),proposal);
  const indistinct=proposeEvidenceVariation(demo,"guide",[],1000);
  assert.equal(indistinct.separablePairs,0);
  assert.equal(proposeEvidenceVariation(demo,"guide",[row("resolved")],1),null);
});
test("edge coincidences remain unresolved even after every bounded variation",()=>{
  const edge=structuredClone(demo);edge.landmarks[0].sourcePx={x:0,y:0};
  const result=proposeEvidenceVariation(edge,"guide",[],0);
  assert.ok(result.separablePairs<result.totalPairs);
  assert.ok(result.pairs.some(p=>p.rules.includes("fraction")&&p.rules.includes("left")&&!p.distinguishable));
});
test("saved observations are bound to their source geometry and mark, not just reused ids",()=>{
  const bundle=exportEvidence(demo,[row("trial")]);
  assert.deepEqual(importEvidence(demo,JSON.parse(JSON.stringify(bundle))),bundle.observations);
  const reordered=structuredClone(bundle);
  const ref=reordered.observations[0].sourceReference;
  reordered.observations[0].sourceReference={landmark:ref.landmark,source:ref.source,provenance:ref.provenance};
  assert.deepEqual(importEvidence(demo,reordered),bundle.observations);
  for(const change of [d=>d.landmarks[0].sourcePx.x++,d=>d.source.widthMm++,d=>d.provenance="Different source"]){
    const changed=structuredClone(demo);change(changed);
    assert.throws(()=>importEvidence(changed,bundle),/source reference differs/);
  }
  assert.deepEqual(bundle.observations,[row("trial")]);
});
test("adding another source mark does not silently erase existing evidence",()=>{
  const expanded=structuredClone(demo);
  expanded.landmarks.push({...expanded.landmarks[0],id:"second",sourcePx:{x:40,y:50}});
  assert.equal(validateObservations(expanded,[row("trial")]).length,1);
  assert.equal(analyzeEvidence(expanded,"second",[row("trial")]).status,"no-evidence");
});
test("photographic source anchors distinguish different images with identical geometry",()=>{
  const photo=structuredClone(demo);
  photo.source.image={sha256:"a".repeat(64),widthPx:100,heightPx:80,name:"source-a.png",mimeType:"image/png"};
  const observed=createObservation(photo,{...row("photo-trial"),sourceReference:undefined});
  const bundle=exportEvidence(photo,[observed]);
  assert.equal(importEvidence(photo,bundle).length,1);
  const other=structuredClone(photo);other.source.image.sha256="b".repeat(64);
  assert.throws(()=>importEvidence(other,bundle),/source reference differs/);
  const renamed=structuredClone(photo);renamed.source.image.name="renamed.png";
  assert.equal(importEvidence(renamed,bundle).length,1);
  const resized=structuredClone(photo);resized.source.image.widthPx=200;
  assert.throws(()=>importEvidence(resized,bundle),/source reference differs/);
});
test("malformed, duplicate, mislabeled and out-of-sheet observations fail transactionally",()=>{
  const good=row("trial");
  for(const fields of [{xMm:NaN},{xMm:201},{yMm:-1},{widthMm:0},{uncertaintyMm:-1},
    {evidenceClass:"verified-expert"},{label:" "},{landmarkId:"absent"}]){
    assert.throws(()=>createObservation(demo,{...good,...fields}));
  }
  assert.throws(()=>validateObservations(demo,[good,good]),/distinct/);
  assert.throws(()=>importEvidence(demo,{schema:"wrong",observations:[good]}),/schema/);
  const bad=exportEvidence(demo,[good]);delete bad.observations[0].sourceReference;
  assert.throws(()=>importEvidence(demo,bad),/source reference/);
  assert.deepEqual(analyzeEvidence(demo,"guide",[good]).compatibleRules,["left"]);
});
