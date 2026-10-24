import test from "node:test";
import assert from "node:assert/strict";
import {appendAnnotation} from "../src/authoring.mjs";
import {demonstration} from "../src/demo.mjs";
import {GeometryError,toImage,derive} from "../src/geometry.mjs";
const h=derive(demonstration).h;
const sourcePx=toImage(h,.3,.4);
const input={sourcePx,label:"Finger-held hinge alignment",
  kind:"fraction",toleranceMm:4,why:"Authored exploration, not measured contact"};
test("transactionally adds an annotated position to a local source",()=>{
  const before=JSON.stringify(demonstration);
  const a=appendAnnotation(demonstration,input,320,190);
  assert.equal(a.demo.landmarks.length,demonstration.landmarks.length+1);
  assert.equal(a.selected,3);
  assert.equal(a.target.landmarks.length,4);
  assert.equal(a.demo.landmarks.at(-1).sourcePx.x,sourcePx.x);
  assert.equal(JSON.stringify(demonstration),before);
  const b=appendAnnotation(a.demo,input,400,200);
  assert.notEqual(b.demo.landmarks.at(-1).id,a.demo.landmarks.at(-1).id);
  assert.equal(b.target.landmarks.length,5);
});
test("source pixel geometry and physical width are checked together",()=>{
  assert.throws(()=>appendAnnotation(demonstration,{...input,sourcePx:{x:900,y:500}},320,190),
    /outside/);
  const bad={...input,kind:"edge_offset_mm",edge:"right"};
  assert.throws(()=>appendAnnotation(demonstration,bad,1,190),
    /cannot fit/);
  assert.equal(demonstration.landmarks.length,3);
});
test("source authoring refuses unlabelled, unsupported, over-tolerance, nonfinite annotations",()=>{
  for(const invalid of [
    {...input,label:""},
    {...input,kind:"force-model"},
    {...input,kind:"edge_offset_mm",edge:"not-an-edge"},
    {...input,toleranceMm:0},
    {...input,toleranceMm:NaN},
    {...input,sourcePx:{x:NaN,y:1}}
  ])assert.throws(()=>appendAnnotation(demonstration,invalid,320,190),GeometryError);
});
test("authored source JSON retains the authored pixel and physical relationship upon reloading",()=>{
  const p=appendAnnotation(demonstration,{
    ...input,kind:"edge_offset_mm",edge:"bottom"
  },320,190);
  const restored=derive(JSON.parse(JSON.stringify(p.demo)));
  assert.equal(restored.landmarks.at(-1).edge,"bottom");
  assert.ok(restored.landmarks.at(-1).distanceMm>0);
  assert.equal(restored.landmarks.at(-1).label,input.label);
});
