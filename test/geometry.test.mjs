import test from "node:test";
import assert from "node:assert/strict";
import {GeometryError,calibrate,toImage,fromImage,derive,adapt,
  toDisplay,fromDisplay,evaluate} from "../src/geometry.mjs";
import {demonstration} from "../src/demo.mjs";
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,a+" != "+b);
test("calibrates source page and round-trips independent perspective locations",()=>{
  const h=calibrate(demonstration.source.corners);
  for(const [u,v] of [[0,0],[1,1],[0.3,0.8],[0.9,0.1]]){
    const p=toImage(h,u,v),got=fromImage(h,p);
    near(got.u,u);near(got.v,v);
  }
});
test("refuses collapsed, crossed, concave and nonfinite corners",()=>{
  const base=demonstration.source.corners;
  for(const corners of [
    [base[0],base[0],base[2],base[3]],
    [base[0],base[2],base[1],base[3]],
    [{x:0,y:0},{x:100,y:0},{x:10,y:10},{x:0,y:100}],
    [{x:NaN,y:1},...base.slice(1)]
  ])assert.throws(()=>calibrate(corners),GeometryError);
});
test("source annotations map back to exact pixel evidence without invented forces",()=>{
  const d=derive(demonstration);
  assert.equal(d.landmarks.length,3);
  for(const mark of d.landmarks){
    assert.ok(mark.uv.u>=0&&mark.uv.u<=1);
    assert.ok(mark.uv.v>=0&&mark.uv.v<=1);
    const p=toImage(d.h,mark.uv.u,mark.uv.v);
    near(p.x,mark.sourcePx.x);near(p.y,mark.sourcePx.y);
    assert.equal("forceNewton" in mark,false);
  }
});
test("fixed-mm and proportional goals transfer differently when resizing",()=>{
  const d=derive(demonstration),a=adapt(d,240,160),b=adapt(d,420,90);
  const by=(arr,id)=>arr.landmarks.find(m=>m.id===id);
  const sa=by(a,"spine-clearance"),sb=by(b,"spine-clearance");
  near(sa.xMm,sb.xMm);near(sb.yMm/90,sa.yMm/160);
  const ca=by(a,"center-registration"),cb=by(b,"center-registration");
  near(cb.xMm/420,ca.xMm/240);near(cb.yMm/90,ca.yMm/160);
  const ta=by(a,"top-index"),tb=by(b,"top-index");
  near(ta.yMm,tb.yMm);near(tb.xMm/420,ta.xMm/240);
});
test("refuses incompatible target dimensions instead of changing a physical invariant",()=>{
  const d=derive(demonstration);
  const small=d.landmarks.find(m=>m.id==="spine-clearance").distanceMm/2;
  assert.throws(()=>adapt(d,small,100),/cannot fit/);
  assert.throws(()=>adapt(d,0,100),GeometryError);
});
test("handed display mirrors pixels, never physical task coordinates",()=>{
  const target=adapt(derive(demonstration),310,170);
  const p=target.landmarks[0],box={x:55,y:20,width:620,height:340};
  const right=toDisplay(p,target,box,false),left=toDisplay(p,target,box,true);
  near(right.x+left.x,2*box.x+box.width);near(right.y,left.y);
  const physical=fromDisplay(left,target,box,true);
  near(physical.xMm,p.xMm);near(physical.yMm,p.yMm);
  assert.equal(evaluate(p,physical).within,true);
});
test("learner feedback uses millimetres and a genuine tolerance",()=>{
  const m=adapt(derive(demonstration),250,200).landmarks[0];
  assert.equal(evaluate(m,{xMm:m.xMm+1,yMm:m.yMm}).within,true);
  const bad=evaluate(m,{xMm:m.xMm+8,yMm:m.yMm+6});
  near(bad.errorMm,10);assert.equal(bad.within,false);
});
test("bad and repeated source annotations are refused",()=>{
  const missing=structuredClone(demonstration);
  missing.landmarks[0].sourcePx.x=10000;
  assert.throws(()=>derive(missing),/outside/);
  const duplicate=structuredClone(demonstration);
  duplicate.landmarks[1].id=duplicate.landmarks[0].id;
  assert.throws(()=>derive(duplicate),/distinct/);
});
