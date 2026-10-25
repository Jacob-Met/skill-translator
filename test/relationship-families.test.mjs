import test from 'node:test';
import assert from 'node:assert/strict';
import {DISCOVERY_FORMAT} from '../src/relationship-discovery.mjs';
import {inspectRelationshipFamilies,predictRelationshipFamilies} from '../src/relationship-families.mjs';
function study(rows){return {format:DISCOVERY_FORMAT,deviationMm:.00001,demonstrations:rows.map(([w,h,dx,dy],i)=>({id:'source-'+i,evidenceClass:'authored-example',correspondenceConfirmed:true,annotation:{title:'Independent authored family control',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:10,y:10},toleranceMm:1},{id:'b',label:'B',kind:'fraction',sourcePx:{x:10+dx,y:10+dy},toleranceMm:1}]}}))};}
const pair=(r,kind='horizontal')=>r.pairs.find(p=>p.kind===kind);
test('discovers a width response that fixed physical comparisons reject, without supplied pair or model selections',()=>{
 const raw=study([[200,150,30,40],[317,229,47.55,40],[251,313,37.65,40]]),before=JSON.stringify(raw),r=inspectRelationshipFamilies(raw);
 assert.deepEqual(pair(r).compatibleFamilies,['width-proportional']);assert.equal(pair(r).hypotheses.find(h=>h.family==='fixed').status,'contradicted');
 assert.deepEqual(pair(r,'vertical').compatibleFamilies,['fixed']);assert.equal(JSON.stringify(raw),before);
 const p=pair(predictRelationshipFamilies(raw,{widthMm:411,heightMm:177})).predictions[0];assert.equal(p.family,'width-proportional');assert.ok(Math.abs(p.expectedMm-61.65)<1e-9);
});
test('unchanged sizes retain all competing hypotheses and unfamiliar target predictions separate them',()=>{
 const raw=study([[200,150,30,40],[200,150,30,40]]),p=pair(predictRelationshipFamilies(raw,{widthMm:400,heightMm:150}));assert.equal(p.status,'ambiguous');assert.equal(p.compatibleFamilies.length,4);assert.equal(p.predictions.find(p=>p.family==='fixed').expectedMm,30);assert.equal(p.predictions.find(p=>p.family==='width-proportional').expectedMm,60);
});
test('uniformly scaled workpieces cannot distinguish the three proportional families',()=>{
 const p=pair(inspectRelationshipFamilies(study([[200,150,30,40],[300,225,45,60],[400,300,60,80]])),'distance');assert.deepEqual(p.compatibleFamilies,['width-proportional','height-proportional','diagonal-proportional']);assert.equal(p.status,'ambiguous');
});
test('a contradicting fresh demonstration removes the apparent family; missing endpoints never prove compatibility',()=>{
 const raw=study([[200,150,30,40],[317,229,47.55,40],[251,313,40.65,43]]);assert.equal(pair(inspectRelationshipFamilies(raw)).status,'none-compatible');
 const missing=study([[200,150,30,40],[317,229,47.55,40]]);missing.demonstrations[1].annotation.landmarks[1].id='c';assert.equal(pair(inspectRelationshipFamilies(missing)).status,'incomplete');
 assert.throws(()=>predictRelationshipFamilies(raw,{widthMm:NaN,heightMm:100}),/dimensions/);
});
test('independent width-response oracle on unfamiliar anisotropic dimensions',()=>{
 for(let i=1;i<=80;i++){
  const w=173+i*.7,h=161+i*.3,dx=7+i*.11,rows=[[w,h,dx,13],[w+31,h+67,dx*(w+31)/w,13],[w+87,h+23,dx*(w+87)/w,13]],raw=study(rows),p=pair(predictRelationshipFamilies(raw,{widthMm:419+i,heightMm:277+i}));
  assert.deepEqual(p.compatibleFamilies,['width-proportional']);assert.ok(Math.abs(p.predictions[0].expectedMm-dx*(419+i)/w)<1e-8);
 }
});
