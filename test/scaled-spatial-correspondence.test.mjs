import test from 'node:test';
import assert from 'node:assert/strict';
import {SPATIAL_CORRESPONDENCE_FORMAT,SCALED_SPATIAL_CORRESPONDENCE_FORMAT,COMMON_SCALE_MODEL,inspectSpatialCorrespondence,createReviewedSpatialMapping,importReviewedSpatialMapping} from '../src/spatial-correspondence.mjs';
import {discoveryFromReviewedSpatialMapping,importRelationshipDiscovery} from '../src/relationship-discovery.mjs';
import {inspectRelationshipFamilies} from '../src/relationship-families.mjs';
import {createFreshRelationshipFamilyReview,importRelationshipFamilyReview,assessRelationshipFamilyReview} from '../src/relationship-family-review.mjs';
const annotation=(points,prefix,widthMm=400,heightMm=300)=>({title:'Authored independent scale control',source:{widthMm,heightMm,corners:[{x:0,y:0},{x:widthMm,y:0},{x:widthMm,y:heightMm},{x:0,y:heightMm}]},landmarks:points.map(([x,y],i)=>({id:`${prefix}-${i}`,label:`${prefix} ${i}`,kind:'fraction',sourcePx:{x,y},toleranceMm:1}))});
const points=[[19,23],[43,31],[29,71],[103,89]],order=[2,0,3,1],other=order.map(i=>[210-1.6*points[i][1],40+1.6*points[i][0]]);
const study=(a=points,b=other,deviationMm=.001)=>({format:SCALED_SPATIAL_CORRESPONDENCE_FORMAT,model:COMMON_SCALE_MODEL,reference:annotation(a,'ref'),observation:annotation(b,'local',640,450),deviationMm,maxStates:20000});
test('automatic common scale recovers a shuffled pattern from original geometry without manual scale or pairs',()=>{
 const raw=study(),before=JSON.stringify(raw),r=inspectSpatialCorrespondence(raw);assert.equal(r.status,'unique');assert.equal(r.numericalSlackMm,1e-9);assert.deepEqual(r.forcedPairs,points.map((_,i)=>({referenceId:`ref-${i}`,observationId:`local-${order.indexOf(i)}`})));
 const interval=r.witnessScaleIntervals[0];assert.ok(interval.lower<1.6&&interval.upper>1.6);assert.equal(interval.includesUnitScale,false);assert.equal(JSON.stringify(raw),before);
 const fixed={...raw,format:SPATIAL_CORRESPONDENCE_FORMAT};delete fixed.model;assert.equal(inspectSpatialCorrespondence(fixed).status,'no-compatible-mapping');
});
test('fixed-model uniqueness cannot survive a broader scale model without recomputation',()=>{
 const a=[[47,3],[19,59],[7,53]],b=[[52.342596508562565,10.341958886012435],[23.003283631056547,66.57452818192542],[8.410563185811043,60.57540590874851]],raw=study(a,b,3),fixed={...raw,format:SPATIAL_CORRESPONDENCE_FORMAT};delete fixed.model;
 assert.equal(inspectSpatialCorrespondence(fixed).status,'unique');const r=inspectSpatialCorrespondence(raw);assert.equal(r.status,'ambiguous');assert.equal(r.completeMappingCount,2);assert.throws(()=>createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true}),/uniquely/);
});
test('symmetry, coincident sources and a found incomplete witness retain ambiguity rather than fitted certainty',()=>{
 const square=[[20,20],[50,20],[50,50],[20,50]];assert.equal(inspectSpatialCorrespondence(study(square,square.map(([x,y])=>[x*1.8,y*1.8]))).completeMappingCount,8);
 const same=Array.from({length:7},()=>[20,20]),raw=study(same,same),all=inspectSpatialCorrespondence(raw);assert.equal(all.completeMappingCount,5040);assert.equal(all.witnessMappings.length,8);assert.deepEqual(all.forcedPairs,[]);assert.deepEqual(all.witnessScaleIntervals[0],{lower:0,lowerInclusive:false,upper:null,includesUnitScale:true});
 const partial=inspectSpatialCorrespondence({...raw,maxStates:8});assert.equal(partial.foundMappingCount,1);assert.equal(partial.status,'budget-unresolved');assert.deepEqual(partial.forcedPairs,[]);assert.equal(partial.completeMappingCount,null);
});
test('distortion and missing points cannot be normalized away; zero-bound float input discloses numeric slack',()=>{
 const changed=other.map(p=>[...p]);changed[0][0]+=9;assert.equal(inspectSpatialCorrespondence(study(points,changed)).status,'no-compatible-mapping');assert.equal(inspectSpatialCorrespondence(study(points,other.slice(1))).status,'different-point-count');
 const p=[[12,18],[43,21],[27,64],[82,47],[67,91]],q=p.map(([x,y])=>[100+1.3*(x*Math.cos(.37)-y*Math.sin(.37)),20+1.3*(x*Math.sin(.37)+y*Math.cos(.37))]);assert.equal(inspectSpatialCorrespondence(study(p,q,0)).status,'unique');
});
test('finite scale-bound overflow refuses rather than masquerading as an unbounded scale family',()=>{
 const tiny=[[0,0],[1e-320,0],[0,1e-320]],same=[[20,20],[20,20],[20,20]];
 assert.throws(()=>inspectSpatialCorrespondence(study(tiny,same,0)),/finite numeric support/);
 assert.equal(inspectSpatialCorrespondence(study(same,same,0)).witnessScaleIntervals[0].upper,null);
});
test('reviewed scale provenance recomputes complete mappings and refuses hidden downgrades or changed intervals',()=>{
 const raw=study();assert.throws(()=>createReviewedSpatialMapping(raw),/Review/);const reviewed=createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true});assert.deepEqual(importReviewedSpatialMapping(JSON.parse(JSON.stringify(reviewed))),reviewed);
 for(const change of [r=>r.format='skill-translator.reviewed-spatial-mapping/v1',r=>r.study.format=SPATIAL_CORRESPONDENCE_FORMAT,r=>r.scaleInterval.lower=1,r=>r.pairs[0].observationId='local-0']){const r=structuredClone(reviewed);change(r);assert.throws(()=>importReviewedSpatialMapping(r));}
});
test('original scaled sources reach maintained family inference and source-only comparison replay without renaming',()=>{
 const raw=study(),mapping=createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true}),discovery=discoveryFromReviewedSpatialMapping(mapping,{deviationMm:.001,evidenceClass:'authored-example'}),families=inspectRelationshipFamilies(discovery),pair=families.pairs.find(p=>p.id==='ref-0:ref-1:distance');
 assert.deepEqual(pair.compatibleFamilies,['width-proportional']);assert.deepEqual(discovery.demonstrations[0].annotation,raw.reference);assert.deepEqual(discovery.demonstrations[1].annotation,raw.observation);assert.deepEqual(importRelationshipDiscovery(JSON.parse(JSON.stringify(discovery))),discovery);
 const review=createFreshRelationshipFamilyReview(discovery,pair.id,{widthMm:800,heightMm:500});assert.deepEqual(importRelationshipFamilyReview(JSON.parse(JSON.stringify(review))),review);const assessed=assessRelationshipFamilyReview(review);assert.equal(assessed.rounds.length,0);assert.equal(assessed.pair.predictions.length,1);assert.equal(assessed.pair.predictions[0].family,'width-proportional');
});
test('complete scaled search agrees with an independent full-permutation interval oracle',()=>{
 const permutations=xs=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(rest=>[x,...rest])):[[]];
 for(let seed=1;seed<=36;seed++){
  const n=3+seed%3,a=Array.from({length:n},(_,i)=>[20+(seed*17+i*31)%97,20+(seed*23+i*i*11)%109]),scale=.4+seed/20,b=[...a].reverse().map(([x,y])=>[350-scale*y,30+scale*x]);if(seed%4===0)b[0][0]+=3;
  const expected=permutations(a.map((_,i)=>i)).filter(m=>{let low=0,high=Infinity;for(let i=0;i<n;i++)for(let j=0;j<i;j++){const da=Math.hypot(a[i][0]-a[j][0],a[i][1]-a[j][1]),db=Math.hypot(b[m[i]][0]-b[m[j]][0],b[m[i]][1]-b[m[j]][1]);if(da===0){if(db>.001+1e-9)return false;}else{low=Math.max(low,(db-.001-1e-9)/da);high=Math.min(high,(db+.001+1e-9)/da);}}return low<=high&&high>0;});
  const r=inspectSpatialCorrespondence(study(a,b));assert.equal(r.complete,true);assert.equal(r.completeMappingCount,expected.length);
  const forced=expected.length?a.flatMap((_,i)=>expected.every(m=>m[i]===expected[0][i])?[{referenceId:`ref-${i}`,observationId:`local-${expected[0][i]}`}]:[]):[];assert.deepEqual(r.forcedPairs,forced);
 }
});
