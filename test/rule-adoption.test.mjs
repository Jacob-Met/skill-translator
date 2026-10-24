import test from "node:test";
import assert from "node:assert/strict";
import {createObservation} from "../src/evidence.mjs";
import {createPractice,placePractice,importPractice} from "../src/practice.mjs";
import {createRuleAdoption as choose,reviewRuleChoices as review,compareAdoptionTargets as compare,
  exportRuleAdoption as save,importRuleAdoption as reopen} from "../src/rule-adoption.mjs";
function source(){return {title:"Authored transfer task",provenance:"Analytic authored fixture",source:{widthMm:200,heightMm:100,
  corners:[{x:0,y:0},{x:400,y:0},{x:400,y:200},{x:0,y:200}]},landmarks:[
  {id:"guide",label:"Guide mark",kind:"fraction",sourcePx:{x:40,y:100},toleranceMm:2,why:"Original fractional interpretation"},
  {id:"center",label:"Center",kind:"fraction",sourcePx:{x:200,y:100},toleranceMm:2}]};}
const raw=(extra={})=>({id:"observed-1",landmarkId:"guide",label:"Independently specified geometric fixture",
  evidenceClass:"authored-example",widthMm:400,heightMm:150,xMm:20,yMm:75,uncertaintyMm:.01,...extra});
const select=[{landmarkId:"guide",rule:"left"}];
test("an observed fixed-left relationship changes the actual target while retaining unselected marks",()=>{
  const d=source(),o=[createObservation(d,raw())],a=choose(d,o,select),c=compare(a,400,150);
  assert.deepEqual(c.marks[0].before,{xMm:40,yMm:75});assert.deepEqual(c.marks[0].after,{xMm:20,yMm:75});
  assert.equal(c.marks[0].movementMm,20);assert.equal(c.marks[1].movementMm,0);
  assert.equal(a.decisions[0].decisionClass,"only-compatible-in-tested-rule-family");
  assert.equal(a.decisions[0].authoredCount,1);assert.equal(a.decisions[0].reportedCount,0);
});
test("the original source, evidence, reasons and pixel geometry remain recoverable and unchanged",()=>{
  const d=source(),o=[createObservation(d,raw())],before=JSON.stringify({d,o}),a=choose(d,o,select);
  assert.equal(JSON.stringify({d,o}),before);assert.deepEqual(a.originalDemo,d);
  assert.deepEqual(a.adoptedDemo.source,d.source);assert.equal(a.decisions[0].originalMark.why,d.landmarks[0].why);
  assert.match(a.adoptedDemo.landmarks[0].why,/Explicit left/);assert.match(a.adoptedDemo.provenance,/not verified physical skill/);
  a.adoptedDemo.landmarks[0].sourcePx.x=999;assert.equal(d.landmarks[0].sourcePx.x,40);
});
test("a user choice among indistinguishable surviving rules preserves the unresolved alternatives",()=>{
  const d=source(),o=[createObservation(d,raw({widthMm:200,heightMm:100,xMm:20,yMm:50}))],a=choose(d,o,select);
  assert.equal(a.decisions[0].decisionClass,"user-choice-among-compatible-rules");
  assert.equal(a.decisions[0].compatibleRules.length,5);assert.match(a.limitation,/does not resolve/);
});
test("untested and contradicted rules cannot be promoted by a choice",()=>{
  const d=source(),o=[createObservation(d,raw())];assert.throws(()=>choose(d,[],select),/no observations/);
  assert.throws(()=>choose(d,o,[{landmarkId:"guide",rule:"fraction"}]),/contradicted/);
  assert.throws(()=>choose(d,o,[{landmarkId:"center",rule:"left"}]),/no observations/);
});
test("inconsistent observations retain no usable choice rather than discarding a failure",()=>{
  const d=source(),o=[createObservation(d,raw()),createObservation(d,raw({id:"other",xMm:90}))];
  assert.equal(review(d,o)[0].status,"none-compatible");assert.throws(()=>choose(d,o,select),/contradicted/);
});
test("saved decisions recompute support and derived source instead of trusting claimed output",()=>{
  const d=source(),a=choose(d,[createObservation(d,raw())],select),bundle=save(a);
  bundle.adoptedDemo.landmarks[0].edge="right";bundle.adoptedDemo.interpretationDecision.decisions[0].compatibleRules=["right"];
  const restored=reopen(JSON.parse(JSON.stringify(bundle)));assert.equal(restored.adoptedDemo.landmarks[0].edge,"left");
  assert.deepEqual(restored.decisions[0].compatibleRules,["left"]);assert.deepEqual(restored.originalDemo,d);
});
test("a forged choice or stale source anchor is refused on reopening",()=>{
  const d=source(),bundle=save(choose(d,[createObservation(d,raw())],select));
  const rule=structuredClone(bundle);rule.selections[0].rule="right";assert.throws(()=>reopen(rule),/contradicted/);
  const stale=structuredClone(bundle);stale.originalDemo.source.widthMm=201;assert.throws(()=>reopen(stale),/reference differs/);
});
test("previous practice placements cannot silently acquire the new rule targets",()=>{
  const d=source(),a=choose(d,[createObservation(d,raw())],select);
  const old=placePractice(d,400,150,createPractice(d,400,150),"guide",{xMm:40,yMm:75});
  assert.throws(()=>importPractice(a.adoptedDemo,400,150,old),/source, rules/);
  const next=createPractice(a.adoptedDemo,400,150);assert.deepEqual(next.attempts,[]);assert.equal(next.round,1);
});
test("invalid, duplicate or unsupported choices are refused",()=>{
  const d=source(),o=[createObservation(d,raw())];
  for(const c of [[],[...select,...select],[{landmarkId:"missing",rule:"left"}],[{landmarkId:"guide",rule:"bogus"}]])assert.throws(()=>choose(d,o,c));
});
test("reported evidence stays distinct and target comparison recomputes a forged derived source",()=>{
  const d=source(),a=choose(d,[createObservation(d,raw({evidenceClass:"reported-measurement"}))],select);
  a.adoptedDemo.landmarks[0].edge="right";assert.equal(compare(a,400,150).marks[0].after.xMm,20);
  assert.equal(a.decisions[0].reportedCount,1);assert.equal(a.decisions[0].authoredCount,0);
});
test("a valid new interpretation remains usable when the original physical clearance cannot fit",()=>{
  const d=source();d.landmarks[0].kind="edge_offset_mm";d.landmarks[0].edge="left";
  const a=choose(d,[createObservation(d,raw({xMm:40}))],[{landmarkId:"guide",rule:"fraction"}]);
  const c=compare(a,10,100);assert.equal(c.original,null);assert.match(c.originalError,/cannot fit/);
  assert.equal(c.marks[0].before,null);assert.equal(c.marks[0].after.xMm,1);
});
