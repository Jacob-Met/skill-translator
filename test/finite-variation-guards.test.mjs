import test from 'node:test';
import assert from 'node:assert/strict';
import {derive} from '../src/geometry.mjs';
import {proposeEvidenceVariation,scoreInterpretation,createObservation,exportEvidence,importEvidence} from '../src/evidence.mjs';
import {proposeCalibrationVariation,createCalibrationHypothesis,analyzeCalibrationEvidence,
  exportCalibrationInvestigation,importCalibrationInvestigation} from '../src/calibration-evidence.mjs';

const source=()=>({provenance:'Authored numerical guard controls; no measured physical precision',
 source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
 landmarks:[{id:'guide',label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:30},toleranceMm:50}]});
const variant=(demo,id,sourcePx)=>createCalibrationHypothesis(demo,'guide',{id,label:id,basis:'proposed-reading',
 reading:{widthMm:demo.source.widthMm,heightMm:demo.source.heightMm,corners:demo.source.corners,sourcePx}});
const planners=[
 ['nominal',(d,r)=>proposeEvidenceVariation(d,'guide',[],r)],
 ['calibration',(d,r,h=[])=>proposeCalibrationVariation(d,'guide',[],h,r)],
];

function checkActualMidpoints(demo,plan,hypotheses=[]){
 const readings=analyzeCalibrationEvidence(demo,'guide',[],hypotheses).hypotheses;
 const states=new Map(readings.map(h=>[h.id,derive({...demo,source:{...demo.source,...h.reading},
   landmarks:[{...demo.landmarks[0],sourcePx:h.reading.sourcePx}]})]));
 let shared=0,distinct=0;
 assert.equal(plan.pairs.length,10);
 for(const pair of plan.pairs){
  const points=pair.rules.map((rule,i)=>{
   const p=plan.predictions.find(x=>x.rule===rule);
   return p.points?p.points.find(x=>x.hypothesisId===pair.closestHypothesisIds[i]):{...p,hypothesisId:'nominal'};
  });
  assert.ok(points.every(Boolean));
  const midpoint={id:'same-observation',widthMm:plan.widthMm,heightMm:plan.heightMm,
   xMm:(points[0].xMm+points[1].xMm)/2,yMm:(points[0].yMm+points[1].yMm)/2,uncertaintyMm:plan.uncertaintyMm};
  const received=pair.rules.map((rule,i)=>{const d=states.get(points[i].hypothesisId);
   return scoreInterpretation(d.landmarks[0],d.source,midpoint,rule);});
  const both=received.every(x=>x.compatible);
  if(both){shared++;assert.equal(pair.distinguishable,false,`${pair.rules} shares an actually admitted midpoint at radius ${plan.uncertaintyMm}`);}
  if(pair.distinguishable){distinct++;assert.equal(both,false);}
 }
 assert.equal(plan.separablePairs,plan.pairs.filter(p=>p.distinguishable).length);
 return {shared,distinct};
}

for(const [name,plan] of planners){
 test(`${name}: one-to-two numerical allowances cannot falsely separate a received midpoint`,()=>{
  const d=source(),r=10.49999999925,p=plan(d,r);
  assert.equal(p.widthMm,170);assert.equal(p.heightMm,136);
  const pair=p.pairs.find(x=>x.rules.join('/')==='fraction/top');
  assert.equal(pair.separationMm,21);assert.equal(pair.distinguishable,false);
  const original=derive(d),row={id:'known-midpoint',widthMm:170,heightMm:136,xMm:34,yMm:40.5,uncertaintyMm:r};
  assert.ok(['fraction','top'].every(rule=>scoreInterpretation(original.landmarks[0],original.source,row,rule).compatible));
  assert.ok(checkActualMidpoints(d,p).shared>0);
 });
 test(`${name}: touching, broader and clearly separated receiver disks keep their actual outcomes`,()=>{
  const d=source();let shared=0,distinct=0;
  for(const r of [0,0.5,10.5-1e-9,10.5-0.75e-9,10.5-0.5e-9,10.5,11,1000]){
   const p=plan(d,r),counts=checkActualMidpoints(d,p);shared+=counts.shared;distinct+=counts.distinct;
   if(r===0.5)assert.equal(p.separablePairs,10);
   if(r===1000)assert.equal(p.separablePairs,0);
  }
  assert.ok(shared>0&&distinct>0);
 });
 test(`${name}: zero declared uncertainty still includes both receiver allowances`,()=>{
  const d=source();d.landmarks[0].sourcePx={x:2e-9,y:30};const p=plan(d,0);
  const pair=p.pairs.find(x=>x.rules.join('/')==='fraction/left');
  assert.ok(pair.separationMm>1e-9&&pair.separationMm<2e-9);
  assert.equal(pair.distinguishable,false);checkActualMidpoints(d,p);
 });
}

test('calibration alternatives use the actual closest surviving readings without source averaging',()=>{
 const d=source(),h=[variant(d,'left-shift',{x:18,y:30}),variant(d,'upper-shift',{x:20,y:28})];
 const before=JSON.stringify({d,h});let shared=0,distinct=0,nonNominal=false;
 for(const radius of [0,0.5,7-0.75e-9,9-0.75e-9,10.5-0.75e-9,11,1000]){
  const p=proposeCalibrationVariation(d,'guide',[],h,radius);const c=checkActualMidpoints(d,p,h);shared+=c.shared;distinct+=c.distinct;
  nonNominal ||= p.pairs.some(x=>x.closestHypothesisIds.some(id=>id!=='nominal'));
 }
 assert.ok(nonNominal&&shared>0&&distinct>0);assert.equal(JSON.stringify({d,h}),before);
});

test('source evidence and calibration investigations reopen unchanged; planning never changes acceptance',()=>{
 const d=source(),h=[variant(d,'repeat',{x:20,y:30})];
 const observation=createObservation(d,{id:'same',landmarkId:'guide',label:'Authored same-size reading',evidenceClass:'authored-example',
  widthMm:100,heightMm:80,xMm:20,yMm:30,uncertaintyMm:0});
 const evidence=exportEvidence(d,[observation]),investigation=exportCalibrationInvestigation(d,'guide',[observation],h);
 const before=JSON.stringify({d,h,evidence,investigation});
 for(const r of [0,10.49999999925,1000]){
  const a=proposeEvidenceVariation(d,'guide',importEvidence(d,structuredClone(evidence)),r);
  const reopened=importCalibrationInvestigation(structuredClone(investigation));
  const b=proposeCalibrationVariation(reopened.source,'guide',reopened.observations,reopened.hypotheses,r);
  assert.equal(a.widthMm,b.widthMm);assert.equal(a.heightMm,b.heightMm);assert.equal(a.separablePairs,b.separablePairs);
 }
 assert.equal(JSON.stringify({d,h,evidence,investigation}),before);
});
