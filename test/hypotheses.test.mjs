import test from "node:test";
import assert from "node:assert/strict";
import {derive,adapt,GeometryError} from "../src/geometry.mjs";
import {demonstration} from "../src/demo.mjs";
import {compareInterpretations,proposeVariation} from "../src/hypotheses.mjs";
const d=derive(demonstration);
const mark=id=>d.landmarks.find(m=>m.id===id);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+" != "+b);
test("two interpretations coincide at the original annotated sheet",()=>{
  const m=mark("spine-clearance");
  const c=compareInterpretations(m,d.source,240,160,"fraction");
  near(c.separationMm,0);
  assert.equal(c.distinguishableByMark,false);
});
test("resizing separates fixed physical clearance from percentage of width",()=>{
  const m=mark("spine-clearance");
  const c=compareInterpretations(m,d.source,480,160,"fraction");
  const expected=adapt(d,480,160).landmarks[0];
  near(c.primary.xMm,expected.xMm);
  near(c.rival.xMm,m.uv.u*480);
  assert.ok(c.separationMm>15);
  assert.equal(c.distinguishableByMark,true);
});
test("fixed top-edge indexing separates from fractional vertical interpretation",()=>{
  const m=mark("top-index");
  const c=compareInterpretations(m,d.source,240,320,"fraction");
  near(c.primary.yMm,m.distanceMm);
  near(c.rival.yMm,2*m.distanceMm);
  assert.ok(c.separationMm>0);
});
test("competing left/right/top/bottom rules produce bounded explicit predictions",()=>{
  const m=mark("center-registration");
  for(const edge of ["left","right","top","bottom"]){
    const c=compareInterpretations(m,d.source,400,280,edge);
    assert.ok(Number.isFinite(c.separationMm));
  }
  assert.throws(()=>compareInterpretations(m,d.source,400,280,"fraction"),GeometryError);
});
test("counterfactual plans select a valid dimension change with nonzero separation",()=>{
  const m=mark("center-registration");
  const p=proposeVariation(m,d.source,"left");
  assert.ok(p.widthMm!==240||p.heightMm!==160);
  assert.ok(p.separationMm>0);
  const once=proposeVariation(m,d.source,"left");
  assert.deepEqual(p,once);
});
test("physical alternatives refuse target dimensions too narrow for their offset",()=>{
  const m=mark("center-registration");
  assert.throws(()=>compareInterpretations(m,d.source,10,160,"right"),/cannot fit/);
  assert.throws(()=>compareInterpretations(m,d.source,400,160,"unknown"),/Unknown/);
});
