import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSpatialCorrespondence as inspect,createReviewedSpatialMapping as review,importReviewedSpatialMapping as reopen,reviewedSpatialMappingForSources} from '../src/spatial-correspondence.mjs';
import {exactAxisInjections,exactAxisCandidates} from '../src/axis-distance-support.mjs';
import {discoveryFromReviewedSpatialMapping} from '../src/relationship-discovery.mjs';
import {createPractice,placePractice,evaluatePractice} from '../src/practice.mjs';
import {createRelationshipFamilyReview,importRelationshipFamilyReview,assessRelationshipFamilyReview} from '../src/relationship-family-review.mjs';
const p=[[17,23],[61,29],[32,83],[109,67]],order=[2,0,3,1],q=order.map(i=>[35+1.6*p[i][0],29+1.3*p[i][1]]);
const annotation=(ps,prefix,w,h)=>({title:'Extra observed source points',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:ps.map(([x,y],i)=>({id:prefix+i,label:prefix+i,kind:'fraction',sourcePx:{x,y},toleranceMm:1}))});
const study=(target=[...q,[270,210]])=>({format:'skill-translator.spatial-correspondence/v4',model:'reference-complete-independent-axis-magnitudes',reference:annotation(p,'ref-',400,300),observation:annotation(target,'obs-',640,390),deviationMm:.001});
test('complete reference roles are inferred with untouched extra observations and explicit unmatched IDs',()=>{
 const raw=study(),before=structuredClone(raw),r=inspect(raw);assert.equal(r.status,'unique');assert.deepEqual(r.forcedPairs,p.map((_,i)=>({referenceId:'ref-'+i,observationId:'obs-'+order.indexOf(i)})));assert.deepEqual(r.witnessUnmatchedObservationIds,[['obs-4']]);assert.deepEqual(r.universallyUnmatchedObservationIds,['obs-4']);assert.deepEqual(raw,before);const saved=review(raw,{semanticCorrespondenceConfirmed:true});assert.equal(saved.format,'skill-translator.reviewed-spatial-mapping/v4');assert.deepEqual(saved.unmatchedObservationIds,['obs-4']);assert.deepEqual(reopen(JSON.parse(JSON.stringify(saved))),saved);
});
test('duplicate extra role destroys uniqueness and full coincident injection populations stay ambiguous',()=>{
 const raw=study([...q,q[1]]),r=inspect(raw);assert.equal(r.completeMappingCount,2);assert.equal(r.status,'ambiguous');assert.equal(r.forcedPairs.some(p=>p.referenceId==='ref-0'),false);assert.deepEqual(r.universallyUnmatchedObservationIds,[]);assert.throws(()=>review(raw,{semanticCorrespondenceConfirmed:true}),/uniquely/);
 for(let n=3;n<=7;n++){const result=exactAxisInjections(Array.from({length:n},()=>[0,0]),Array.from({length:7},()=>[0,0]));assert.equal(result.count,Array.from({length:n},(_,i)=>7-i).reduce((a,b)=>a*b,1));assert.deepEqual(result.forced,[]);}
});
test('missing roles, found-but-incomplete search and constraint exhaustion never become identity',()=>{
 const raw=study(q.slice(0,3)),r=inspect(raw);assert.equal(r.status,'missing-observation-roles');assert.equal(r.complete,false);assert.deepEqual(r.forcedPairs,[]);assert.throws(()=>review(raw,{semanticCorrespondenceConfirmed:true}),/uniquely/);
 const result=exactAxisInjections(p,[...p.map(([x,y])=>[35+1.6*x,29+1.3*y]),[270,210]],{maxStates:5});assert.equal(result.foundMappingCount,1);assert.equal(result.count,null);assert.deepEqual(result.forced,[]);assert.throws(()=>exactAxisInjections(p,[...q,[270,210]],{maxWork:20}),/capacity/);assert.throws(()=>exactAxisInjections(p,[...q,[Infinity,1]]),/finite/);
});
test('old equal-point models retain refusal and cannot hide extra-point provenance',()=>{
 for(const [format,model]of [['v1',undefined],['v2','common-positive-pair-distance-scale'],['v3','independent-reference-axis-magnitudes']]){const raw={...study(),format:'skill-translator.spatial-correspondence/'+format};if(model)raw.model=model;else delete raw.model;assert.equal(inspect(raw).status,'different-point-count');}
 const saved=review(study(),{semanticCorrespondenceConfirmed:true});for(const change of [r=>r.unmatchedObservationIds=[],r=>r.format='skill-translator.reviewed-spatial-mapping/v3',r=>r.study.model='independent-reference-axis-magnitudes',r=>r.study.observation.landmarks.pop(),r=>r.pairs[0].observationId='obs-4']){const r=structuredClone(saved);change(r);assert.throws(()=>reopen(r));}
 const changed=structuredClone(saved.study.observation);changed.landmarks[4].sourcePx.x+=1;assert.throws(()=>reviewedSpatialMappingForSources(saved,saved.study.reference,changed),/different original/);
});
test('all original extra points survive maintained relationship and actual Practice reopening',()=>{
 const raw=study(),mapping=review(raw,{semanticCorrespondenceConfirmed:true,sourceEvidenceClass:'authored-example'}),discovery=discoveryFromReviewedSpatialMapping(mapping,{deviationMm:.001,evidenceClass:'authored-example'});assert.deepEqual(discovery.demonstrations[1].annotation,raw.observation);
 let session=createPractice(raw.reference,800,600);session=placePractice(raw.reference,800,600,session,'ref-0',{xMm:20,yMm:30});session=placePractice(raw.reference,800,600,session,'ref-1',{xMm:70,yMm:35});const before=structuredClone(session),saved=createRelationshipFamilyReview(discovery,'ref-0:ref-1:horizontal',session),report=assessRelationshipFamilyReview(saved);assert.equal(report.rounds[0].observedMm,50);assert.equal(report.rounds[0].alternatives[0].expectedMm,88);assert.deepEqual(report.rounds[0].originalPractice,evaluatePractice(raw.reference,800,600,session.attempts));assert.deepEqual(session,before);assert.deepEqual(importRelationshipFamilyReview(JSON.parse(JSON.stringify(saved))),saved);assert.equal(saved.study.demonstrations[1].annotation.landmarks.length,5);
});
test('independent subset decomposition agrees with complete injection count and forced matches',()=>{
 const subsets=(n,k,start=0,a=[])=>k===0?[a]:Array.from({length:n-start},(_,i)=>start+i).flatMap(j=>subsets(n,k-1,j+1,[...a,j]));
 for(let t=0;t<6;t++){const reference=p.map(([x,y],i)=>[x+t*.37*(i+1),y+t*.19*(i%2)]),a=t*.19,c=Math.cos(a),s=Math.sin(a),target=order.map(i=>{const x=reference[i][0]*(.7+t*.13),y=reference[i][1]*(1.9-t*.07);return[20+c*x-s*y,40+s*x+c*y];});target.splice(t%5,0,t%3===0?[...target[1]]:[241+t,197-t]);const result=exactAxisInjections(reference,target),population=[];for(const ids of subsets(5,4)){const r=exactAxisCandidates(reference,ids.map(i=>target[i]));assert.ok(r.complete&&r.count<=8);population.push(...r.mappings.map(m=>m.mapping.map(j=>ids[j])));}assert.equal(result.count,population.length);assert.deepEqual(result.forced,reference.flatMap((_,i)=>{const possible=new Set(population.map(m=>m[i]));return possible.size===1?[[i,[...possible][0]]]:[];}));}
});
