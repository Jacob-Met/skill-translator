import test from 'node:test';
import assert from 'node:assert/strict';
import {SPATIAL_CORRESPONDENCE_FORMAT,createReviewedSpatialMapping} from '../src/spatial-correspondence.mjs';
import {discoveryFromReviewedSpatialMapping,discoverRelationships,importRelationshipDiscovery,MAPPED_DISCOVERY_FORMAT} from '../src/relationship-discovery.mjs';
import {inspectRelationshipFamilies} from '../src/relationship-families.mjs';
import {createDiscoveredPairReview} from '../src/discovered-pair-review.mjs';
import {importPairInterpretations} from '../src/pair-interpretations.mjs';
const annotation=(points,prefix)=>({title:'Independent mapped triangle',source:{widthMm:400,heightMm:300,corners:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}]},landmarks:points.map(([x,y],i)=>({id:`${prefix}-${i}`,label:`${prefix} ${i}`,kind:'fraction',sourcePx:{x,y},toleranceMm:1}))});
const reference=annotation([[20,20],[70,25],[35,95]],'ref'),observation=annotation([[55,55],[130,40],[125,90]],'local');
function mapped(){const reviewed=createReviewedSpatialMapping({format:SPATIAL_CORRESPONDENCE_FORMAT,reference,observation,deviationMm:.00001},{semanticCorrespondenceConfirmed:true});return discoveryFromReviewedSpatialMapping(reviewed,{deviationMm:.00001,evidenceClass:'authored-example'});}
test('one reviewed map removes same-ID entry while original names and observed geometry remain intact',()=>{
 const study=mapped(),r=discoverRelationships(study);assert.equal(study.format,MAPPED_DISCOVERY_FORMAT);assert.deepEqual(study.demonstrations[0].annotation,reference);assert.deepEqual(study.demonstrations[1].annotation,observation);assert.equal(r.counts.incomplete,0);assert.equal(r.counts.repeatable,3);
 const p=r.candidates.find(p=>p.from==='ref-0'&&p.to==='ref-1'&&p.kind==='distance');assert.deepEqual(p.readings[1].sourcePointIds,{from:'local-1',to:'local-2'});assert.ok(Math.abs(p.readings[0].valueMm-p.readings[1].valueMm)<1e-9);assert.deepEqual(importRelationshipDiscovery(JSON.parse(JSON.stringify(study))),study);
});
test('mapped sources reach existing family inference and native reviewed-pair replay without source rewriting',()=>{
 const study=mapped(),f=inspectRelationshipFamilies(study);assert.equal(f.pairs.find(p=>p.id==='ref-0:ref-1:distance').status,'ambiguous');
 const review=createDiscoveredPairReview(study,'ref-0:ref-1:distance',{widthMm:800,heightMm:600,toleranceMm:2,basis:'Investigate this source-derived distance relationship.'});assert.deepEqual(importPairInterpretations(review).discoveryEvidence.study,study);assert.deepEqual(review.source,reference);assert.equal(review.session.attempts.length,0);
});
test('downgrade, hidden renaming and stale mapping sources are refused, never treated as same-ID evidence',()=>{
 const original=mapped();for(const change of [s=>s.format='skill-translator.relationship-discovery/v1',s=>s.demonstrations[1].annotation.landmarks[0].id='ref-2',s=>s.demonstrations[0].annotation.title='changed',s=>s.demonstrations[1].spatialMapping.pairs[0].observationId='local-0',s=>s.demonstrations[1].spatialMapping.semanticCorrespondenceConfirmed=false]){const s=structuredClone(original);change(s);assert.throws(()=>importRelationshipDiscovery(s));}assert.deepEqual(mapped(),original);
});
