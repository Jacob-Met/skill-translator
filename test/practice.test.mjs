import test from "node:test";
import assert from "node:assert/strict";
import {createPractice,evaluatePractice,placePractice,retryPractice,importPractice} from "../src/practice.mjs";
const demo={provenance:"Authored complete-task control",
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[
    {id:"left",label:"Left guide",kind:"edge_offset_mm",edge:"left",sourcePx:{x:20,y:20},toleranceMm:1},
    {id:"center",label:"Center",kind:"fraction",sourcePx:{x:50,y:40},toleranceMm:2},
    {id:"top",label:"Top guide",kind:"edge_offset_mm",edge:"top",sourcePx:{x:75,y:10},toleranceMm:1}]};
const exact=[{id:"left",xMm:20,yMm:40},{id:"center",xMm:100,yMm:80},{id:"top",xMm:150,yMm:10}];
const result=a=>evaluatePractice(demo,200,160,a);
test("a complete mixed-rule task requires every observed placement, not only the selected mark",()=>{
  assert.equal(result([]).passed,false);assert.equal(result([]).rmsErrorMm,null);
  assert.deepEqual(result(exact.slice(0,1)).missing,["center","top"]);
  assert.equal(result(exact.slice(0,1)).complete,false);assert.equal(result(exact.slice(0,1)).translation,null);
  assert.equal(result(exact).passed,true);assert.equal(result(exact).rmsErrorMm,0);
});
test("common translation is diagnosed without silently correcting or passing the actual task",()=>{
  const shifted=exact.map(p=>({...p,xMm:p.xMm+4,yMm:p.yMm+3}));
  const r=result(shifted);
  assert.equal(r.complete,true);assert.equal(r.passed,false);assert.equal(r.rmsErrorMm,5);
  assert.equal(r.translation.dxMm,4);assert.equal(r.translation.dyMm,3);
  assert.equal(r.translation.remainingRmsMm,0);assert.equal(r.translation.wouldMeetAll,true);
  assert.deepEqual(shifted,exact.map(p=>({...p,xMm:p.xMm+4,yMm:p.yMm+3})));
});
test("opposing local errors remain after removing a zero common displacement",()=>{
  const bad=exact.map((p,i)=>({...p,xMm:p.xMm+[6,-6,0][i]}));
  const r=result(bad);assert.equal(r.translation.dxMm,0);assert.equal(r.passed,false);
  assert.ok(r.translation.remainingRmsMm>4);assert.equal(r.translation.wouldMeetAll,false);
});
test("partial shared-displacement diagnostics never count as a complete outcome",()=>{
  const r=result(exact.slice(0,2).map(p=>({...p,yMm:p.yMm+4})));
  assert.equal(r.translation.partial,true);assert.equal(r.translation.wouldMeetAll,false);assert.equal(r.passed,false);
});
test("placements reject unknown, repeated, nonfinite and out-of-sheet coordinates",()=>{
  for(const a of [[...exact,exact[0]],[{...exact[0],id:"absent"}],[{...exact[0],xMm:NaN}],
    [{...exact[0],xMm:201}],[{...exact[0],yMm:-1}]])assert.throws(()=>result(a));
  assert.throws(()=>result([exact[0],exact[0]]),/one placement/);
});
test("editing one mark retains the rest, and a refused edit preserves the session",()=>{
  let session=createPractice(demo,200,160);
  for(const p of exact)session=placePractice(demo,200,160,session,p.id,p);
  const changed=placePractice(demo,200,160,session,"center",{xMm:102,yMm:80});
  assert.equal(changed.attempts.length,3);assert.equal(changed.attempts.find(p=>p.id==="left").xMm,20);
  assert.equal(session.attempts.find(p=>p.id==="center").xMm,100);
  assert.throws(()=>placePractice(demo,200,160,session,"center",{xMm:-2,yMm:80}));
  assert.equal(result(session.attempts).passed,true);
});
test("retry archives original incomplete or complete placements and starts an empty round",()=>{
  let s=createPractice(demo,200,160);assert.throws(()=>retryPractice(demo,200,160,s),/at least one/);
  s=placePractice(demo,200,160,s,"left",exact[0]);
  const next=retryPractice(demo,200,160,s);
  assert.equal(next.round,2);assert.equal(next.attempts.length,0);
  assert.deepEqual(next.history[0].attempts,[exact[0]]);
  assert.equal(result(next.history[0].attempts).complete,false);
  assert.deepEqual(importPractice(demo,200,160,JSON.parse(JSON.stringify(next))),next);
});
test("saved session binds source pixels, transfer rules, tolerances, photo identity and target dimensions",()=>{
  const s=createPractice(demo,200,160);
  for(const modify of [d=>d.landmarks[0].sourcePx.x++,d=>d.landmarks[0].edge="right",
    d=>d.landmarks[0].toleranceMm++,d=>d.source.widthMm++,d=>d.provenance="Different source"]){
    const altered=structuredClone(demo);modify(altered);
    assert.throws(()=>importPractice(altered,200,160,s),/differ/);
  }
  assert.throws(()=>importPractice(demo,210,160,s),/differ/);
  const photo=structuredClone(demo);photo.source.image={sha256:"a".repeat(64),widthPx:100,heightPx:80};
  const photographed=createPractice(photo,200,160);photo.source.image.sha256="b".repeat(64);
  assert.throws(()=>importPractice(photo,200,160,photographed),/differ/);
});
test("session imports recompute results and reject forged round ordering",()=>{
  let s=createPractice(demo,200,160);s.passed=true;s.results=["invented"];
  const clean=importPractice(demo,200,160,s);
  assert.equal("passed" in clean,false);assert.equal(result(clean.attempts).passed,false);
  assert.throws(()=>importPractice(demo,200,160,{...s,round:2}),/history/);
  assert.throws(()=>importPractice(demo,200,160,{...s,round:2,history:[{round:4,attempts:[]}]}),/order/);
});
