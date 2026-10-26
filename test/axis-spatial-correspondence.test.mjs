import test from 'node:test';
import assert from 'node:assert/strict';
import {AXIS_SPATIAL_CORRESPONDENCE_FORMAT,AXIS_SCALE_MODEL,inspectSpatialCorrespondence,createReviewedSpatialMapping,importReviewedSpatialMapping,reviewedSpatialMappingForSources} from '../src/spatial-correspondence.mjs';
import {discoveryFromReviewedSpatialMapping,importRelationshipDiscovery} from '../src/relationship-discovery.mjs';
import {inspectRelationshipFamilies} from '../src/relationship-families.mjs';
import {createPractice,placePractice,evaluatePractice} from '../src/practice.mjs';
import {createRelationshipFamilyReview,importRelationshipFamilyReview,assessRelationshipFamilyReview} from '../src/relationship-family-review.mjs';
import {cmp,sub,mul} from '../vendor/chronos/exact-halfplanes.mjs';
const p=[[19,23],[43,31],[29,71],[103,89]],order=[2,0,3,1];
const annotation=(points,prefix,w=400,h=300)=>({title:'Authored independent-axis control',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:points.map(([x,y],i)=>({id:`${prefix}-${i}`,label:`${prefix} ${i}`,kind:'fraction',sourcePx:{x,y},toleranceMm:1}))});
const study=(points=p,target=order.map(i=>[1.6*p[i][0],1.3*p[i][1]]))=>({format:AXIS_SPATIAL_CORRESPONDENCE_FORMAT,model:AXIS_SCALE_MODEL,reference:annotation(points,'ref'),observation:annotation(target,'local',640,390),deviationMm:.001,maxStates:20000,maxConstraintWork:200000});
test('unequal inferred magnitudes recover shuffled original IDs and retain a correlated exact polygon',()=>{
 const raw=study(),before=JSON.stringify(raw),result=inspectSpatialCorrespondence(raw);assert.equal(result.status,'unique');assert.equal(result.completeWitnessedMappingCount,1);assert.deepEqual(result.forcedPairs,p.map((_,i)=>({referenceId:`ref-${i}`,observationId:`local-${order.indexOf(i)}`})));assert.equal(JSON.stringify(raw),before);
 const support=result.witnessAxisSupports[0],unseal=x=>[BigInt(x.numerator),BigInt(x.denominator)],polygon=support.outerSquaredScalePolygon.map(p=>p.map(unseal));assert.ok(support.hasConservativeWitness);assert.ok(support.witnessSquaredScales);assert.ok(polygon.length>3);
 const maximum=axis=>polygon.map(p=>p[axis]).reduce((a,b)=>cmp(a,b)>0?a:b),corner=[maximum(0),maximum(1)],sides=polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length];return cmp(sub(mul(sub(b[0],a[0]),sub(corner[1],a[1])),mul(sub(b[1],a[1]),sub(corner[0],a[0]))),[0n,1n]);});assert.ok(sides.some(x=>x>0)&&sides.some(x=>x<0),'marginal maxima must not become an admitted rectangular scale family');
});
test('a common-scale unique triangle keeps both independent-axis correspondences and cannot be promoted',()=>{
 const a=[[20,20],[60,20],[20,50]],raw=study(a,a.map(([x,y])=>[1.5*x,1.5*y])),narrow={...raw,format:'skill-translator.spatial-correspondence/v2',model:'common-positive-pair-distance-scale'};
 assert.equal(inspectSpatialCorrespondence(narrow).status,'unique');const result=inspectSpatialCorrespondence(raw);assert.equal(result.status,'ambiguous');assert.equal(result.completeMappingCount,2);assert.deepEqual(result.forcedPairs,[{referenceId:'ref-0',observationId:'local-0'}]);assert.throws(()=>createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true}),/uniquely/);
});
test('reflections do not become positive directed response rules or silently changed original coordinates',()=>{
 const raw=study(p,order.map(i=>[300-1.6*p[i][0],1.3*p[i][1]])),mapping=createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true}),discovery=discoveryFromReviewedSpatialMapping(mapping,{deviationMm:.001,evidenceClass:'authored-example'}),families=inspectRelationshipFamilies(discovery);
 assert.equal(families.pairs.find(p=>p.id==='ref-0:ref-1:horizontal').status,'none-compatible');assert.deepEqual(families.pairs.find(p=>p.id==='ref-0:ref-1:vertical').compatibleFamilies,['height-proportional']);assert.deepEqual(discovery.demonstrations[1].annotation,raw.observation);
});
test('original axis sources reach maintained families and actual practice without changing scores or source IDs',()=>{
 const raw=study(),mapping=createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true,sourceEvidenceClass:'authored-example'}),discovery=discoveryFromReviewedSpatialMapping(mapping,{deviationMm:.001,evidenceClass:'authored-example'}),families=inspectRelationshipFamilies(discovery);
 assert.deepEqual(families.pairs.find(p=>p.id==='ref-0:ref-1:horizontal').compatibleFamilies,['width-proportional']);assert.deepEqual(families.pairs.find(p=>p.id==='ref-0:ref-1:vertical').compatibleFamilies,['height-proportional']);assert.deepEqual(importRelationshipDiscovery(JSON.parse(JSON.stringify(discovery))),discovery);
 let session=createPractice(raw.reference,800,600);session=placePractice(raw.reference,800,600,session,'ref-0',{xMm:38,yMm:46});session=placePractice(raw.reference,800,600,session,'ref-1',{xMm:81,yMm:62});const before=JSON.stringify(session);
 const review=createRelationshipFamilyReview(discovery,'ref-0:ref-1:horizontal',session),report=assessRelationshipFamilyReview(review);assert.equal(report.rounds[0].observedMm,43);assert.ok(Math.abs(report.rounds[0].alternatives[0].expectedMm-48)<1e-9);assert.deepEqual(report.rounds[0].originalPractice,evaluatePractice(raw.reference,800,600,session.attempts));assert.equal(JSON.stringify(session),before);assert.deepEqual(importRelationshipFamilyReview(JSON.parse(JSON.stringify(review))),review);
});
test('source, full polygon and explicit version custody refuse edited or downgraded support',()=>{
 const raw=study();assert.throws(()=>createReviewedSpatialMapping(raw),/Review/);const reviewed=createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true});assert.deepEqual(importReviewedSpatialMapping(JSON.parse(JSON.stringify(reviewed))),reviewed);
 for(const alter of [r=>r.axisSupport.outerSquaredScalePolygon[0][0].numerator='1',r=>r.axisSupport.witnessSquaredScales[0].numerator='1',r=>r.format='skill-translator.reviewed-spatial-mapping/v2',r=>r.study.model='common-positive-pair-distance-scale',r=>r.pairs[0].observationId='local-0']){const changed=structuredClone(reviewed);alter(changed);assert.throws(()=>importReviewedSpatialMapping(changed));}
 const changed=structuredClone(raw.reference);changed.title='different original';assert.throws(()=>reviewedSpatialMappingForSources(reviewed,changed,raw.observation),/different original/);
});
test('missing points, finite budgets and distortion cannot masquerade as supported identity',()=>{
 const raw=study();assert.equal(inspectSpatialCorrespondence({...raw,observation:annotation([[10,10],[20,20],[40,25]],'local')}).status,'different-point-count');
 assert.throws(()=>inspectSpatialCorrespondence({...raw,maxConstraintWork:1}),/capacity exhausted/);const partial=inspectSpatialCorrespondence({...raw,maxStates:1});assert.equal(partial.status,'budget-unresolved');assert.deepEqual(partial.forcedPairs,[]);assert.equal(partial.completeMappingCount,null);
 const changed=structuredClone(raw);changed.observation.landmarks[0].sourcePx.x+=6;assert.equal(inspectSpatialCorrespondence(changed).status,'no-compatible-mapping');
});
test('straight-point correspondence remains useful while an unobserved axis stays genuinely unbounded',()=>{
 const raw=study([[20,20],[20,40],[20,70]],[[30,30],[30,60],[30,105]]),result=inspectSpatialCorrespondence(raw);assert.equal(result.status,'unique');const support=result.witnessAxisSupports[0];assert.equal(support.supportKind,'one-observed-axis');assert.deepEqual(support.unconstrainedAxes,['horizontal']);assert.equal(support.outerSquaredScaleIntervals[0].upper,null);assert.equal(support.outerSquaredScaleIntervals[0].lowerInclusive,false);assert.notEqual(support.outerSquaredScaleIntervals[1].upper,null);
 const review=createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true});assert.deepEqual(importReviewedSpatialMapping(JSON.parse(JSON.stringify(review))),review);
 const same=Array.from({length:7},()=>[20,20]),all=inspectSpatialCorrespondence(study(same,same));assert.equal(all.completeMappingCount,5040);assert.equal(all.completeWitnessedMappingCount,5040);assert.deepEqual(all.forcedPairs,[]);assert.deepEqual(all.witnessAxisSupports[0].unconstrainedAxes,['horizontal','vertical']);assert.equal(all.witnessMappings.length,8);
});
test('a single numerical outer candidate cannot be reviewed without an inner witness',()=>{
 const raw=study(p,[[46.40225030205302,92.3],[30.400000000000002,29.900000000000002],[164.8,115.7],[68.8,40.300000000000004]]),result=inspectSpatialCorrespondence(raw);
 assert.equal(result.completeMappingCount,1);assert.equal(result.completeWitnessedMappingCount,0);assert.equal(result.status,'boundary-unresolved');assert.deepEqual(result.forcedPairs,[]);assert.throws(()=>createReviewedSpatialMapping(raw,{semanticCorrespondenceConfirmed:true}),/uniquely/);
});
