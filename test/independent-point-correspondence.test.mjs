import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{calibrate,toImage,derive}from'../src/geometry.mjs';
import{inspectSpatialCorrespondence,SPATIAL_CORRESPONDENCE_FORMAT,createReviewedSpatialMapping}from'../src/spatial-correspondence.mjs';
import{INDEPENDENT_POINT_CORRESPONDENCE_FORMAT,inspectIndependentPointCorrespondence,importIndependentPointCorrespondence,reviewIndependentPointChoice}from'../src/independent-point-correspondence.mjs';
const base=()=>JSON.parse(readFileSync(new URL('./fixtures/point-choice-sequence.json',import.meta.url)));
const set=(task,points)=>{const h=calibrate(task.source.corners);task.landmarks.forEach((m,i)=>m.sourcePx=toImage(h,points[i][0]/100,points[i][1]/100));};
function fixture(a=[[40,40],[10,10],[80,10],[10,70]],b=[[10,70],[57,33],[10,10],[80,10]]){const s=base(),reference=s.moments[0].calibratedTask,observation=s.moments[1].calibratedTask;set(reference,a);set(observation,b);return{format:INDEPENDENT_POINT_CORRESPONDENCE_FORMAT,reference,observation,referencePointId:reference.landmarks[0].id,deviationMm:1e-6,maxStates:20000};}
test('a moved selected point is proposed where unchanged all-point rigid matching refuses',()=>{
 const raw=fixture(),before=JSON.stringify(raw),strict=inspectSpatialCorrespondence({...raw,format:SPATIAL_CORRESPONDENCE_FORMAT});assert.equal(strict.status,'no-compatible-mapping');
 const r=inspectIndependentPointCorrespondence(raw);assert.equal(r.status,'forced-selected-point');assert.equal(r.completeMappingCount,1);assert.deepEqual(r.possibleObservationIds,['local-1-1']);assert.deepEqual(r.forcedPair,{referenceId:'local-0-0',observationId:'local-1-1'});assert.equal(JSON.stringify(raw),before);
 assert.throws(()=>reviewIndependentPointChoice(raw),/exemption/);assert.throws(()=>reviewIndependentPointChoice(raw,{independentPointModelConfirmed:true}),/same task point/);
 const review=reviewIndependentPointChoice(raw,{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true});assert.equal(review.auxiliaryIdentitiesUnique,true);assert.throws(()=>createReviewedSpatialMapping(review.study,{semanticCorrespondenceConfirmed:true}));
});
test('a forced selected identity does not erase six auxiliary mappings',()=>{
 const tri=[[50,20],[50+15*Math.sqrt(3),65],[50-15*Math.sqrt(3),65]],raw=fixture([[50,50],...tri],[[60,45],...tri]);
 const r=inspectIndependentPointCorrespondence(raw);assert.equal(r.status,'forced-selected-point');assert.equal(r.completeMappingCount,6);assert.equal(r.rows.find(x=>x.observationPointId==='local-1-0').auxiliaryStatus,'ambiguous');
 assert.equal(reviewIndependentPointChoice(raw,{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true}).auxiliaryIdentitiesUnique,false);
});
test('repeated congruent auxiliary subsets keep every possible selected point',()=>{
 const square=[[20,20],[70,20],[70,70],[20,70]],r=inspectIndependentPointCorrespondence(fixture(square,square));
 assert.equal(r.status,'ambiguous-selected-point');assert.equal(r.completeMappingCount,8);assert.equal(r.possibleObservationIds.length,4);assert.equal(r.forcedPair,null);
 assert.throws(()=>reviewIndependentPointChoice(r.study,{independentPointModelConfirmed:true,semanticCorrespondenceConfirmed:true}),/ambiguity/);
});
test('one shared state budget cannot promote a found witness before every omission is checked',()=>{
 const raw=fixture(undefined,[[57,33],[10,10],[80,10],[10,70]]),full=inspectIndependentPointCorrespondence(raw);assert.equal(full.status,'forced-selected-point');
 const first=full.rows[0].states,r=inspectIndependentPointCorrespondence({...raw,maxStates:first});assert.ok(r.foundMappingCount>0);assert.equal(r.status,'budget-unresolved');assert.equal(r.completeMappingCount,null);assert.equal(r.forcedPair,null);assert.deepEqual(r.possibleObservationIds,[]);assert.equal(r.states,first);assert.equal(r.unevaluatedObservationIds.length,3);
 const one=inspectIndependentPointCorrespondence({...raw,maxStates:1});assert.equal(one.states,1);assert.equal(one.forcedPair,null);
});
test('complete original admission precedes point removal and rejects missing or extra annotations',()=>{
 const raw=fixture();for(const side of['reference','observation']){const fewer=structuredClone(raw);fewer[side].landmarks.pop();assert.throws(()=>importIndependentPointCorrespondence(fewer),/equal original sets/);}
 const bad=structuredClone(raw);bad.reference.landmarks[0].sourcePx={x:-999,y:20};assert.throws(()=>importIndependentPointCorrespondence(bad),/inside the source image/);
 assert.throws(()=>importIndependentPointCorrespondence({...raw,referencePointId:'not-original'}),/Select an original/);assert.throws(()=>importIndependentPointCorrespondence({...raw,model:'scale'}),/another/);
 const three=structuredClone(raw);three.reference.landmarks.pop();three.observation.landmarks.pop();assert.throws(()=>importIndependentPointCorrespondence(three),/4–7/);
 const extra=structuredClone(raw);extra.observation.landmarks.push({...extra.observation.landmarks[0],id:'extra'});assert.throws(()=>importIndependentPointCorrespondence(extra),/equal original/);
});
test('changed auxiliary geometry is a non-win and unchanged rigidity does not prove an independent physical point',()=>{
 const broken=fixture(undefined,[[14,60],[57,33],[10,10],[60,15]]);assert.equal(inspectIndependentPointCorrespondence(broken).status,'no-compatible-assignment');
 const raw=fixture(),same=structuredClone(raw);same.observation=structuredClone(raw.reference);const r=inspectIndependentPointCorrespondence(same);assert.equal(r.status,'forced-selected-point');assert.equal(r.forcedPair.observationId,raw.referencePointId);assert.match(r.boundary,/not evidence that a physical point is independent/);
});
test('original point-order permutation and source-only replay preserve identity without trusting derived claims',()=>{
 const raw=fixture(),expected=inspectIndependentPointCorrespondence(raw);raw.reference.landmarks.reverse();raw.observation.landmarks.reverse();raw.forcedPair={referenceId:'forged',observationId:'forged'};
 const r=inspectIndependentPointCorrespondence(raw);assert.deepEqual(r.forcedPair,expected.forcedPair);assert.equal(r.completeMappingCount,expected.completeMappingCount);assert.deepEqual(inspectIndependentPointCorrespondence(JSON.parse(JSON.stringify(raw))),r);
});
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[v,...p])):[[]];
test('independent full-permutation oracle agrees on unfamiliar perturbed sources',()=>{
 let seed=841;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 for(let course=0;course<30;course++){
  const a=Array.from({length:4},()=>[15+rand()*70,15+rand()*70]),b=a.map(p=>[...p]);b[0]=[15+rand()*70,15+rand()*70];if(course%3===0)b[2][0]+=2;const raw=fixture(a,b);raw.deviationMm=course%2?.1:3;
  const p=derive(raw.reference),q=derive(raw.observation),coords=t=>t.landmarks.map(m=>[m.uv.u*100,m.uv.v*100]),left=coords(p),right=coords(q),dist=(v,i,j)=>Math.hypot(v[i][0]-v[j][0],v[i][1]-v[j][1]);
  const accepted=permutations([0,1,2,3]).filter(map=>[1,2,3].every(i=>[1,2,3].every(j=>Math.abs(dist(left,i,j)-dist(right,map[i],map[j]))<=raw.deviationMm+1e-9)));
  const r=inspectIndependentPointCorrespondence(raw);assert.equal(r.complete,true);assert.equal(r.completeMappingCount,accepted.length);assert.deepEqual([...r.possibleObservationIds].sort(),[...new Set(accepted.map(map=>q.landmarks[map[0]].id))].sort());
 }
});
