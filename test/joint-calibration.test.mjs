import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeJointCalibration as analyze,createJointCalibrationHypothesis as hypothesis,
  jointSourceReading,exportJointCalibration as save,importJointCalibration as reopen,
  MAX_JOINT_MARKS,MAX_JOINT_HYPOTHESES} from '../src/joint-calibration.mjs';
import {createObservation,analyzeEvidence,RULES} from '../src/evidence.mjs';

const source={provenance:'Authored analytic rectangles; no physical measurement',
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[['guide',20,30],['index',60,50]].map(([id,x,y])=>({id,label:id,
    kind:'edge_offset_mm',edge:'left',sourcePx:{x,y},toleranceMm:50}))};
const ids=['guide','index'];
const clone=structuredClone;
function reading(s=source,width=150,id='wide'){
  return hypothesis(s,{id,label:'Explicit global page reading',basis:'proposed-reading',
    reading:{...jointSourceReading(s),widthMm:width}});
}
function row(id,mark,x,y,extra={},s=source){
  return createObservation(s,{id,landmarkId:mark,label:`Authored ${id}`,evidenceClass:'authored-example',
    widthMm:200,heightMm:160,xMm:x,yMm:y,uncertaintyMm:0.01,...extra});
}
const incompatible=()=>[row('g','guide',20,60),row('i','index',90,100)];
const coherent=()=>[row('g','guide',30,60),row('i','index',90,100)];

test('individually supported marks cannot silently switch global source readings',()=>{
  const r=analyze(source,ids,incompatible(),[reading()]);
  assert.equal(r.status,'none-compatible');assert.equal(r.requiresSourceSwitching,true);
  assert.equal(r.combinationCount,0);assert.deepEqual(r.viableReadingIds,[]);
  assert.deepEqual(r.marginals.map(m=>m.supportingReadingIds),[['nominal'],['wide']]);
  assert.deepEqual(r.marginals.map(m=>m.jointRules),[[],[]]);
});
test('one coherent wide reading retains left clearance for both original marks',()=>{
  const r=analyze(source,ids,coherent(),[reading()]);
  assert.equal(r.status,'one-joint-explanation');assert.equal(r.combinationCount,1);
  assert.equal(r.requiresSourceSwitching,false);assert.deepEqual(r.viableReadingIds,['wide']);
  assert.deepEqual(r.hypotheses[1].marks.map(m=>m.survivingRules),[['left'],['left']]);
});
test('nominal scoring preserves maintained evidence residuals, including impossible clearances',()=>{
  const rows=[row('a','guide',23,64,{uncertaintyMm:5}),
    row('b','guide',2,30,{widthMm:10,heightMm:80}),row('c','index',120,100)];
  const r=analyze(source,ids,rows);
  for(const mark of r.hypotheses[0].marks){
    const maintained=analyzeEvidence(source,mark.landmarkId,rows);
    assert.deepEqual(mark.survivingRules,maintained.compatibleRules);
    for(const c of mark.candidates){const old=maintained.candidates.find(v=>v.rule===c.rule);
      assert.deepEqual(c.residuals,old.residuals);assert.equal(c.status,old.status);
      assert.deepEqual(c.contradictions,old.contradictions);}
  }
});
// Independent rectangle geometry and explicit small Cartesian enumeration. No
// application prediction/scoring or returned survivor sets feed this oracle.
function oracle(rows,widths){
  let count=0;
  for(const sw of widths)for(const a of RULES)for(const b of RULES){
    const chosen={guide:a,index:b};
    if(rows.every(r=>{
      const p=source.landmarks.find(m=>m.id===r.landmarkId).sourcePx;
      const u=p.x/100,v=p.y/80,w=r.widthMm,h=r.heightMm,rule=chosen[r.landmarkId];
      const x=rule==='left'?u*sw:rule==='right'?w-(1-u)*sw:u*w;
      const y=rule==='top'?v*80:rule==='bottom'?h-(1-v)*80:v*h;
      return x>=0&&x<=w&&y>=0&&y<=h&&Math.hypot(x-r.xMm,y-r.yMm)<=r.uncertaintyMm+1e-9;
    }))count++;
  }
  return count;
}
test('factorized counts agree with independent small Cartesian geometry',()=>{
  for(const rows of [[],incompatible(),coherent(),[row('g','guide',20,60)],
    [row('g','guide',40,60,{uncertaintyMm:25}),row('i','index',120,100,{uncertaintyMm:45})]]){
    const r=analyze(source,ids,rows,[reading(),reading(source,120,'middle')]);
    assert.equal(r.combinationCount,oracle(rows,[100,150,120]));
  }
});
test('a mark keeps one rule across every row rather than changing rules per observation',()=>{
  const rows=[row('left','guide',20,60),row('fraction','guide',40,60),row('index','index',120,100)];
  const r=analyze(source,ids,rows);
  assert.equal(r.status,'none-compatible');assert.equal(r.requiresSourceSwitching,false);
  assert.deepEqual(r.hypotheses[0].marks[0].survivingRules,[]);
  assert.deepEqual(r.hypotheses[0].marks[0].candidates.find(c=>c.rule==='left').contradictions,['fraction']);
});
test('missing marks stay untested, while a decisive contradiction outranks partial evidence',()=>{
  const none=analyze(source,ids,[]);assert.equal(none.status,'no-evidence');assert.equal(none.combinationCount,25);
  const partial=analyze(source,ids,[row('g','guide',20,60)]);
  assert.equal(partial.status,'partial-evidence');assert.equal(partial.combinationCount,5);
  assert.deepEqual(partial.missingMarkIds,['index']);
  assert.ok(partial.hypotheses[0].marks[1].candidates.every(c=>c.status==='untested'));
  const impossible=analyze(source,ids,[row('g','guide',199,159)]);
  assert.equal(impossible.status,'none-compatible');assert.equal(impossible.combinationCount,0);
  assert.deepEqual(impossible.missingMarkIds,['index']);assert.equal(impossible.requiresSourceSwitching,false);
});
test('every original mark must remain explicit and inside the page even when unselected',()=>{
  const s=clone(source);s.landmarks.push({...s.landmarks[0],id:'unused',sourcePx:{x:90,y:70}});
  const good=reading(s);assert.equal(analyze(s,ids,[],[good]).hypotheses.length,2);
  for(const mutate of [h=>h.reading.points.pop(),h=>h.reading.points.push(clone(h.reading.points[0])),
    h=>h.reading.points[2].sourcePx.x=101,h=>h.reading.points[2].landmarkId='invented']){
    const h=clone(good);mutate(h);assert.throws(()=>analyze(s,ids,[],[h]));
  }
  const extra=row('unused-row','unused',180,140,{},s);
  const r=analyze(s,ids,[extra],[good]);assert.equal(r.unselectedObservationCount,1);assert.equal(r.status,'no-evidence');
  const saved=save(s,ids,[extra],[good]);assert.equal(reopen(saved).observations.length,1);
});
test('global photo readings cannot move corners or any mark beyond original image bounds',()=>{
  const s=clone(source);s.source.image={sha256:'a'.repeat(64),widthPx:100,heightPx:80};
  const good=reading(s);assert.doesNotThrow(()=>analyze(s,ids,[],[good]));
  const shifted=clone(good);shifted.reading.corners.forEach(p=>p.x+=10);shifted.reading.points.forEach(p=>p.sourcePx.x+=10);
  assert.throws(()=>analyze(s,ids,[],[shifted]),/image frame/);
  const negative=clone(good);negative.reading.corners.forEach(p=>p.x-=10);negative.reading.points.forEach(p=>p.sourcePx.x-=10);
  assert.throws(()=>analyze(s,ids,[],[negative]),/image frame/);
});
test('source, observation and hypothesis anchors each reject source drift',()=>{
  const bundle=save(source,ids,coherent(),[reading()]);
  for(const mutate of [b=>b.source.source.widthMm++,b=>b.source.provenance='Another experiment',
    b=>b.sourceReference.marks[0].landmark.sourcePx.x++,
    b=>b.observations[0].sourceReference.landmark.sourcePx.x++,
    b=>b.hypotheses[0].sourceReference.marks[1].landmark.sourcePx.y++]){
    const bad=clone(bundle);mutate(bad);assert.throws(()=>reopen(bad));
  }
  const other=clone(source);other.landmarks[1].sourcePx.x++;
  assert.throws(()=>reopen(bundle,other),/different source/);
  assert.deepEqual(reopen(bundle,source),bundle);
});
test('saved arrays must be explicit; missing or null cannot default to a different investigation',()=>{
  const bundle=save(source,ids,coherent(),[reading()]);
  for(const key of ['landmarkIds','observations','hypotheses'])for(const value of [null,undefined]){
    const bad=clone(bundle);if(value===undefined)delete bad[key];else bad[key]=value;
    assert.throws(()=>reopen(bad),`${key} ${value}`);
  }
  for(const key of ['corners','points']){const bad=clone(bundle);delete bad.hypotheses[0].reading[key];assert.throws(()=>reopen(bad));}
});
test('forged saved verdicts are discarded and coherent evidence is recomputed',()=>{
  const bundle=save(source,ids,incompatible(),[reading()]);
  bundle.results={status:'one-joint-explanation',combinationCount:1};
  bundle.hypotheses[0].viable=true;bundle.hypotheses[0].combinationCount=999;
  const restored=reopen(JSON.parse(JSON.stringify(bundle)));
  assert.equal('results' in restored,false);assert.equal('viable' in restored.hypotheses[0],false);
  assert.equal(analyze(restored.source,restored.landmarkIds,restored.observations,restored.hypotheses).combinationCount,0);
});
test('selection, evidence and hypothesis input ordering do not change scientific outcomes',()=>{
  const hs=[reading(),reading(source,120,'middle')],rows=coherent();
  const a=analyze(source,ids,rows,hs),b=analyze(source,[...ids].reverse(),[...rows].reverse(),[...hs].reverse());
  assert.deepEqual(a.selectedIds,b.selectedIds);assert.equal(a.status,b.status);assert.equal(a.combinationCount,b.combinationCount);
  assert.deepEqual([...a.viableReadingIds].sort(),[...b.viableReadingIds].sort());
  const normalize=r=>r.hypotheses.map(h=>({id:h.id,marks:h.marks.map(m=>({id:m.landmarkId,rules:m.survivingRules}))})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(normalize(a),normalize(b));
  const reordered=clone(hs[0]);reordered.reading.points.reverse();
  assert.deepEqual(analyze(source,ids,rows,[reordered]),analyze(source,ids,rows,[hs[0]]));
});
test('12 marks and 24 alternatives stay factorized with exact finite counts, never probabilities',()=>{
  assert.equal(MAX_JOINT_MARKS,12);assert.equal(MAX_JOINT_HYPOTHESES,24);
  const s=clone(source);s.landmarks=Array.from({length:12},(_,i)=>({...source.landmarks[0],id:`m-${i}`,sourcePx:{x:10+i*5,y:30}}));
  const chosen=s.landmarks.map(m=>m.id),hs=Array.from({length:24},(_,i)=>reading(s,101+i,`h-${i}`));
  const r=analyze(s,chosen,[],hs);
  assert.equal(r.combinationCount,25*5**12);assert.ok(Number.isSafeInteger(r.combinationCount));
  assert.equal(r.hypotheses.length,25);assert.equal(r.hypotheses.reduce((n,h)=>n+h.marks.reduce((n,m)=>n+m.candidates.length,0),0),1500);
  assert.ok(JSON.stringify(r).length<600000);assert.match(r.limitations.join(' '),/not confidence, probabilities/);
  assert.equal('probability' in r,false);assert.equal('combinations' in r,false);
  assert.throws(()=>analyze(s,chosen,[],[...hs,reading(s,150,'overflow')]));
  s.landmarks.push({...s.landmarks[0],id:'m-12'});assert.throws(()=>analyze(s,s.landmarks.map(m=>m.id),[]));
});
test('invalid selections and duplicate global identities refuse transactionally',()=>{
  for(const chosen of [[],['guide'],['guide','guide'],['guide','missing']])assert.throws(()=>analyze(source,chosen,[]));
  assert.throws(()=>analyze(source,ids,[],[reading(),reading()]));
  const h=reading();h.id='nominal';assert.throws(()=>analyze(source,ids,[],[h]));
  assert.equal(analyze(source,ids,coherent(),[reading()]).status,'one-joint-explanation');
});
