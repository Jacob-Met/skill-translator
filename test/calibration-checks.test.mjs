import test from "node:test";
import assert from "node:assert/strict";
import {createCalibrationCheck as make,analyzeCalibration as analyze,
  exportCalibrationChecks as save,importCalibrationChecks as restore,
  validateCalibrationChecks} from "../src/calibration-checks.mjs";

// Independent analytic source camera. These physical coordinates are specified
// first; the test never derives its reference measurements from the fitted map.
const px=(xMm,yMm)=>{const u=xMm/240,v=yMm/160,d=1+u/4+v/10;
  return {x:(420*u+30*v+40)/d,y:(-10*u+280*v+30)/d};};
function demo(){return {title:"Authored projective fixture",source:{widthMm:240,heightMm:160,
  corners:[px(0,0),px(240,0),px(240,160),px(0,160)]},landmarks:[
  {id:"center",label:"Center",kind:"fraction",sourcePx:px(120,80),toleranceMm:2},
  {id:"edge",label:"Edge",kind:"edge_offset_mm",edge:"left",sourcePx:px(10,80),toleranceMm:2}]};}
const raw=(id,xMm,yMm,extra={})=>({id,label:"Independently specified authored coordinate",evidenceClass:"authored-example",
  independentMeasurement:true,sourcePx:px(xMm,yMm),xMm,yMm,uncertaintyMm:.1,...extra});
const checks=d=>[[60,40],[180,40],[180,120],[60,120]].map(([x,y],i)=>make(d,raw("check-"+i,x,y)));

test("independent projective checkpoints and extent recover analytic physical values",()=>{
  const d=demo(),r=analyze(d,checks(d));assert.equal(r.status,"compatible-at-checks");
  assert.ok(r.maxErrorMm<1e-10);assert.ok(Math.abs(r.coverage.areaFraction-.25)<1e-10);
  assert.equal(r.coverage.landmarks[0].withinCheckHull,true);assert.equal(r.coverage.landmarks[1].withinCheckHull,false);
  assert.equal(r.reportedCount,0);assert.equal(r.authoredCount,4);
});
test("wrong stated dimensions produce physical residuals despite a perfect corner fit",()=>{
  const d=demo();d.source.widthMm=300;
  const r=analyze(d,checks(d));assert.equal(r.status,"incompatible");assert.equal(r.incompatibleCount,4);
  assert.ok(Math.abs(r.maxErrorMm-45)<1e-9);
});
test("an interior displacement contradicts the calibration while the four corners still agree",()=>{
  const d=demo();const row=make(d,raw("center",120,80,{sourcePx:px(125,80)}));
  const r=analyze(d,[row]);assert.equal(r.status,"incompatible");assert.ok(Math.abs(r.results[0].dxMm-5)<1e-9);
  assert.ok(Math.abs(r.results[0].dyMm)<1e-9);
});
test("combined physical uncertainty is a supplied bound, not a fitted confidence score",()=>{
  const d=demo();const row=raw("center",120,80,{sourcePx:px(123,84),uncertaintyMm:5});
  assert.equal(analyze(d,[make(d,row)]).status,"compatible-at-checks");
  row.uncertaintyMm=4.99;assert.equal(analyze(d,[make(d,row)]).status,"incompatible");
});
test("fitted corners cannot manufacture independent validation or spatial coverage",()=>{
  const d=demo();const rows=[[0,0],[240,0],[240,160],[0,160]].map(([x,y],i)=>make(d,raw("corner-"+i,x,y)));
  const r=analyze(d,rows);assert.equal(r.status,"no-independent-checks");assert.equal(r.fittedCornerCount,4);
  assert.equal(r.coverage.areaFraction,0);assert.equal(r.maxErrorMm,null);
  assert.ok(r.results.every(x=>x.status==="fitted-corner"));
});
test("empty, one-point and collinear checks never imply area coverage",()=>{
  const d=demo();assert.equal(analyze(d,[]).status,"no-independent-checks");
  for(const rows of [[raw("a",60,80)],[raw("a",60,80),raw("b",120,80),raw("c",180,80)]]){
    const r=analyze(d,rows.map(x=>make(d,x)));assert.equal(r.coverage.areaFraction,0);
    assert.ok(r.coverage.landmarks.every(x=>!x.withinCheckHull));
  }
});
test("the same point repeated does not expand spatial coverage",()=>{
  const d=demo();const r=analyze(d,[make(d,raw("a",60,80)),make(d,raw("b",60,80))]);
  assert.equal(r.coverage.hull.length,1);assert.equal(r.coverage.areaFraction,0);
});
test("check ordering does not change aggregate diagnostics or hull",()=>{
  const d=demo(),rows=checks(d),a=analyze(d,rows),b=analyze(d,[...rows].reverse());
  assert.deepEqual(a.coverage,b.coverage);assert.equal(a.status,b.status);assert.equal(a.maxErrorMm,b.maxErrorMm);
});
test("export/reopen retains checks and recomputes outcomes; embedded claimed results are ignored",()=>{
  const d=demo(),rows=checks(d),bundle=JSON.parse(JSON.stringify(save(d,rows)));
  bundle.status="incompatible";bundle.checks[0].errorMm=1234;
  assert.deepEqual(restore(d,bundle),rows);assert.equal(analyze(d,restore(d,bundle)).status,"compatible-at-checks");
});
test("calibration and source-image changes reject old checks, including empty bundles",()=>{
  const d=demo();d.source.image={sha256:"a".repeat(64),widthPx:500,heightPx:400,mimeType:"image/png",name:"source.png",pixelCoordinates:"browser-oriented",coordinateConvention:"browser-oriented"};
  const rows=checks(d),bundle=save(d,rows),empty=save(d,[]);
  for(const alter of [x=>x.source.widthMm++,x=>x.source.corners[0].x++,x=>x.source.image.sha256="b".repeat(64),
    x=>x.source.image.coordinateConvention="different",x=>x.source.video={sha256:"c".repeat(64),presentationTime:2}]){
    const changed=structuredClone(d);alter(changed);
    assert.throws(()=>restore(changed,bundle),/different source/);
    assert.throws(()=>restore(changed,empty),/different source/);
    assert.throws(()=>analyze(changed,rows),/source differs/);
  }
});
test("landmark edits preserve calibration checks while recalculating their check proximity",()=>{
  const d=demo(),rows=checks(d);d.landmarks[0].sourcePx=px(20,20);
  const r=analyze(d,rows);assert.equal(r.status,"compatible-at-checks");
  assert.equal(r.coverage.landmarks[0].withinCheckHull,false);
});
test("reordered object keys are stable but forged/missing source anchors are not rebound",()=>{
  const d=demo(),row=make(d,raw("a",60,80)),r=structuredClone(row);
  r.sourceReference={corners:r.sourceReference.corners,heightMm:160,widthMm:240};
  assert.deepEqual(validateCalibrationChecks(d,[r]),[row]);delete r.sourceReference;
  assert.throws(()=>validateCalibrationChecks(d,[r]),/source differs/);
});
test("invalid measurements, duplicates and oversized files are rejected transactionally",()=>{
  const d=demo(),row=raw("a",60,80);
  for(const change of [{xMm:NaN},{yMm:Infinity},{uncertaintyMm:-1},{uncertaintyMm:1001},
    {xMm:-1},{yMm:161},{independentMeasurement:false},{evidenceClass:"verified"},{label:" "}]){
    assert.throws(()=>make(d,{...row,...change}));
  }
  const a=make(d,row);assert.throws(()=>analyze(d,[a,a]),/distinct/);
  assert.throws(()=>analyze(d,Array(101).fill(a)),/100/);assert.deepEqual(a,make(d,row));
});
test("pixels outside an image are refused; observations outside the mapped page remain explicit contradictions",()=>{
  const d=demo();d.source.image={sha256:"a".repeat(64),widthPx:600,heightPx:500,mimeType:"image/png",name:"source.png",pixelCoordinates:"browser-oriented"};
  assert.throws(()=>make(d,raw("bad",60,80,{sourcePx:{x:601,y:20}})),/Source pixel x/);
  const r=analyze(d,[make(d,raw("outside",120,80,{sourcePx:{x:550,y:350}}))]);
  assert.equal(r.status,"incompatible");assert.equal(r.results[0].status,"outside-calibrated-page");
});
test("reported measurements remain distinct from authored controls",()=>{
  const d=demo(),r=analyze(d,[...checks(d),make(d,raw("measured",120,80,{evidenceClass:"reported-measurement"}))]);
  assert.equal(r.reportedCount,1);assert.equal(r.authoredCount,4);assert.equal(r.independentCount,5);
});
test("renaming identical source-image bytes preserves check identity",()=>{
  const d=demo();d.source.image={sha256:"a".repeat(64),widthPx:600,heightPx:500,mimeType:"image/png",name:"source.png",pixelCoordinates:"browser-oriented"};
  const bundle=save(d,checks(d));d.source.image.name="renamed.png";
  assert.equal(analyze(d,restore(d,bundle)).status,"compatible-at-checks");
});
