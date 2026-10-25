import assert from 'node:assert/strict';
import {analyzeResponseHoldouts} from '../src/response-holdout.mjs';
import {DEMONSTRATION_RESPONSE_SCHEMA,responseFromDemonstrations} from '../src/response-demonstrations.mjs';
import {RESPONSE_SCHEMA} from '../src/response-family.mjs';
const make=(width,height,x,y)=>({title:'Independent authored annotation',provenance:'Software control, not physical observation',source:{widthMm:width,heightMm:height,corners:[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}]},landmarks:[{id:'point',label:'Retained point',sourcePx:{x,y},kind:'fraction',toleranceMm:1}]});
const referenceStudy={schema:RESPONSE_SCHEMA,source:make(100,100,50,50),landmarkId:'point',coefficientLimit:2,target:{widthMm:120,heightMm:120},observations:[]};
const account={schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy,demonstrations:[[120,100,60,50],[100,120,50,60],[120,120,60,60]].map(([w,h,x,y],i)=>({id:`source-${i}`,label:'Additional original annotation '+i,evidenceClass:'authored-example',annotation:make(w,h,x,y),landmarkId:'point',correspondenceConfirmed:true,xBoundMm:0,yBoundMm:0}))};
assert.throws(()=>analyzeResponseHoldouts(account),/Unsupported response/);
const numeric=responseFromDemonstrations(account),audit=analyzeResponseHoldouts(numeric);
assert.ok(audit.rows.every(x=>x.status==='contained'));
assert.equal(numeric.demonstrations,undefined);
assert.ok(numeric.observations.every(x=>x.annotation===undefined));
assert.ok(account.demonstrations.every(x=>x.annotation.landmarks[0].sourcePx));
console.log(JSON.stringify({originalSources:account.demonstrations.length,rawAccountRefused:true,numericAuditStatuses:audit.rows.map(x=>x.status),numericExportRetainsAdditionalAnnotations:false,scope:'Authored source-custody probe, no original media or physical inference'},null,2));


const {analyzeDemonstrationHoldouts}=await import('../src/demonstration-holdout.mjs');
const before=JSON.stringify(account),result=analyzeDemonstrationHoldouts(account);
assert.equal(JSON.stringify(account),before);
assert.deepEqual(result.account,account);
assert.ok(result.rows.every((r,i)=>r.sourceKind==='retained-annotation'&&r.inspection==='extra:source-'+i));
const altered=structuredClone(account);altered.demonstrations[2].annotation.landmarks[0].sourcePx.x=61;
assert.ok(analyzeDemonstrationHoldouts(altered).rows.every(r=>r.omission.status==='excluded'));
const denied=structuredClone(account);denied.demonstrations[1].correspondenceConfirmed=false;
assert.throws(()=>analyzeDemonstrationHoldouts(denied),/confirm/);
const mixed=structuredClone(account);mixed.referenceStudy.observations=[numeric.observations[0]];mixed.demonstrations.shift();
const m=analyzeDemonstrationHoldouts(mixed);assert.equal(m.rows[0].sourceKind,'supplied-numeric-observation');assert.equal(m.rows[0].inspection,'reference');
assert.deepEqual(analyzeDemonstrationHoldouts(JSON.parse(JSON.stringify(result.account))),result);
console.log('PASS source-retaining audit: custody, changed source, unconfirmed correspondence, mixed numeric rows and input-only replay');
