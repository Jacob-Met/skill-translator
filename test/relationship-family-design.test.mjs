import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestRelationshipFamilySizes} from '../src/relationship-family-design.mjs';
import {inspectRelationshipFamilies} from '../src/relationship-families.mjs';
import {createReviewedSpatialMapping,SPATIAL_CORRESPONDENCE_FORMAT} from '../src/spatial-correspondence.mjs';
import {discoveryFromReviewedSpatialMapping} from '../src/relationship-discovery.mjs';
const annotation=(w,h,dx)=>({source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:0,y:0},toleranceMm:1},{id:'b',label:'B',kind:'fraction',sourcePx:{x:dx,y:0},toleranceMm:1}]});
const row=(id,w,h,dx)=>({id,evidenceClass:'authored-example',correspondenceConfirmed:true,annotation:annotation(w,h,dx)});
const study=(dx=23,deviationMm=.2)=>({format:'skill-translator.relationship-discovery/v1',deviationMm,demonstrations:[row('one',213,157,dx),row('two',213,157,dx)]});
test('automatically supplies anisotropic distinguishing sizes without entered candidates or preferred family',()=>{
 const raw=study(),before=JSON.stringify(raw),r=suggestRelationshipFamilySizes(raw,'a:b:horizontal');
 assert.equal(r.families.length,4);assert.equal(r.candidates.length,15);assert.ok(r.recommendation);assert.equal(r.recommendation.separatedPairs,6);
 assert.notEqual(r.recommendation.widthFactor,r.recommendation.heightFactor);assert.equal(JSON.stringify(raw),before);
});
test('future-reading intervals agree with actual maintained re-inference on unfamiliar sheets',()=>{
 const raw=study(),r=suggestRelationshipFamilySizes(raw,'a:b:horizontal');let checked=0;
 for(const c of r.candidates)for(const interval of c.intervals){
  for(const value of [interval.lowMm-.01,interval.lowMm+.01,(interval.lowMm+interval.highMm)/2,interval.highMm-.01,interval.highMm+.01]){
   if(value<0||value>c.widthMm)continue;
   const next=structuredClone(raw);next.demonstrations.push(row('fresh',c.widthMm,c.heightMm,value));
   const actual=inspectRelationshipFamilies(next).pairs.find(p=>p.id==='a:b:horizontal').compatibleFamilies.includes(interval.family);
   assert.equal(actual,value>=interval.lowMm&&value<=interval.highMm,JSON.stringify({c,interval,value}));checked++;
  }
 }
 assert.ok(checked>=250);
});
test('a received recommended demonstration retains its generating family and excludes separated alternatives',()=>{
 const raw=study(),c=suggestRelationshipFamilySizes(raw,'a:b:horizontal').recommendation;
 for(const interval of c.intervals){const next=structuredClone(raw);next.demonstrations.push(row('fresh',c.widthMm,c.heightMm,(interval.lowMm+interval.highMm)/2));
  assert.deepEqual(inspectRelationshipFamilies(next).pairs.find(p=>p.id==='a:b:horizontal').compatibleFamilies,[interval.family]);}
});
test('zero response, excessive exploratory spread and missing evidence cannot produce a success recommendation',()=>{
 assert.equal(suggestRelationshipFamilySizes(study(0),'a:b:horizontal').recommendation,null);
 assert.equal(suggestRelationshipFamilySizes(study(23,1000),'a:b:horizontal').recommendation,null);
 const raw=study();raw.demonstrations[1].annotation.landmarks[1].id='c';
 const r=suggestRelationshipFamilySizes(raw,'a:b:horizontal');assert.equal(r.pairStatus,'incomplete');assert.equal(r.recommendation,null);
});
test('single survivor and contradiction preserve their state; dimensions stay admitted',()=>{
 const raw=study();raw.demonstrations.push(row('third',317,229,23*317/213));raw.demonstrations.push(row('fourth',251,313,23*251/213));
 const r=suggestRelationshipFamilySizes(raw,'a:b:horizontal');assert.deepEqual(r.families,['width-proportional']);assert.equal(r.recommendation,null);
 raw.demonstrations.push(row('wrong',400,300,80));assert.equal(suggestRelationshipFamilySizes(raw,'a:b:horizontal').recommendation,null);
 const large=study();large.demonstrations=[row('one',9000,8000,23),row('two',9000,8000,23)];assert.ok(suggestRelationshipFamilySizes(large,'a:b:horizontal').candidates.every(c=>c.widthMm<=10000&&c.heightMm<=10000));
 assert.throws(()=>suggestRelationshipFamilySizes(raw,'foreign'),/Choose/);
});

test('existing source capacity suppresses an unusable next-demonstration recommendation without dropping evidence',()=>{
 const raw=study();while(raw.demonstrations.length<11)raw.demonstrations.push(row('source-'+raw.demonstrations.length,213,157,23));
 const before=JSON.stringify(raw),eleven=suggestRelationshipFamilySizes(raw,'a:b:horizontal');assert.equal(eleven.atCapacity,false);assert.ok(eleven.recommendation);assert.equal(JSON.stringify(raw),before);
 raw.demonstrations.push(row('last',213,157,23));const twelve=suggestRelationshipFamilySizes(raw,'a:b:horizontal');assert.equal(twelve.atCapacity,true);assert.equal(twelve.recommendation,null);assert.equal(raw.demonstrations.length,12);assert.equal(twelve.candidates.length,15);
});

test('tiny supported separations retain distinct round-trip-readable interval bounds',()=>{
 const r=suggestRelationshipFamilySizes(study(1e-7,0),'a:b:horizontal'),c=r.recommendation;assert.ok(c);assert.ok(c.minimumGapMm>1e-9&&c.minimumGapMm<.001);
 for(const interval of c.intervals){assert.equal(Number(String(interval.lowMm)),interval.lowMm);assert.equal(Number(String(interval.highMm)),interval.highMm);assert.notEqual(String(interval.lowMm),String(interval.highMm));}
});
test('reviewed local-ID mappings retain exact source provenance through prospective design',()=>{
 const reference=annotation(213,157,23);reference.landmarks.push({id:'c',label:'C',kind:'fraction',sourcePx:{x:7,y:31},toleranceMm:1});
 const observation=structuredClone(reference);observation.landmarks=[reference.landmarks[1],reference.landmarks[0],reference.landmarks[2]].map((m,i)=>({...m,id:['x','y','z'][i],sourcePx:{x:m.sourcePx.x+10,y:m.sourcePx.y+9}}));
 const mapping=createReviewedSpatialMapping({format:SPATIAL_CORRESPONDENCE_FORMAT,reference,observation,deviationMm:.000001},{semanticCorrespondenceConfirmed:true});
 const raw=discoveryFromReviewedSpatialMapping(mapping,{deviationMm:.2,evidenceClass:'authored-example'}),before=JSON.stringify(raw),r=suggestRelationshipFamilySizes(raw,'a:b:horizontal');assert.ok(r.recommendation);assert.equal(r.recommendation.separatedPairs,6);assert.equal(JSON.stringify(raw),before);
 const inferred=inspectRelationshipFamilies(raw),reading=inferred.pairs.find(p=>p.id==='a:b:horizontal').hypotheses[0].readings[1];assert.deepEqual(reading.sourcePointIds,{from:'y',to:'x'});assert.match(inferred.limitation,/not independent validation/);
});
