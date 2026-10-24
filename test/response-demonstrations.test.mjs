import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrate,toImage} from '../src/geometry.mjs';
import {RESPONSE_SCHEMA,createResponseObservation} from '../src/response-family.mjs';
import {DEMONSTRATION_RESPONSE_SCHEMA,analyzeDemonstrationResponse,exportDemonstrationResponse,responseFromDemonstrations} from '../src/response-demonstrations.mjs';
const source={provenance:'Authored reference',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'reference',label:'Reference',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:1}]};
const referenceStudy={schema:RESPONSE_SCHEMA,source,landmarkId:'reference',coefficientLimit:2,observations:[],target:{widthMm:200,heightMm:160}};
function declaration(id,w,h,x,y){const corners=[{x:20,y:30},{x:920,y:80},{x:850,y:730},{x:80,y:680}];return {id,label:id,evidenceClass:'authored-example',annotation:{title:id,provenance:'Authored changed-camera annotation',source:{widthMm:w,heightMm:h,corners},landmarks:[{id:'distinct-id',label:'Unrelated display label',sourcePx:toImage(calibrate(corners),x/w,y/h),kind:'fraction',toleranceMm:1}]},landmarkId:'distinct-id',correspondenceConfirmed:true,xBoundMm:.001,yBoundMm:.001};}
const account=()=>({schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy:structuredClone(referenceStudy),demonstrations:[declaration('wide',200,80,45,50),declaration('tall',100,160,60,70)]});
test('independently calibrated annotations feed maintained family without rewriting source',()=>{
 const input=account(),before=JSON.stringify(input),out=analyzeDemonstrationResponse(input);
 assert.equal(out.analysis.status,'supported');assert.ok(out.analysis.axes.x.prediction.lower<=85&&out.analysis.axes.x.prediction.upper>=85);
 assert.ok(Math.abs(out.response.observations[0].xMm-45)<1e-10);assert.equal(JSON.stringify(input),before);
 assert.equal(out.sources[0].sourceReference.landmark.id,'distinct-id');assert.equal(out.response.observations[0].sourceReference.landmark.id,'reference');
});
test('input-only replay retains full source annotations and recomputes forged coordinates',()=>{
 const input=account(),saved=exportDemonstrationResponse(input);saved.derived={xMm:999};saved.demonstrations[0].derived={xMm:999};
 assert.deepEqual(responseFromDemonstrations(saved),responseFromDemonstrations(input));assert.deepEqual(saved.demonstrations[0].annotation,input.demonstrations[0].annotation);
});
test('correspondence and coordinate bounds are supplied explicitly rather than inferred',()=>{
 const input=account();input.demonstrations[0].correspondenceConfirmed=false;assert.throws(()=>responseFromDemonstrations(input),/confirm/);
 input.demonstrations[0].correspondenceConfirmed=true;input.demonstrations[0].landmarkId='reference';assert.throws(()=>responseFromDemonstrations(input),/existing mark/);
 input.demonstrations[0].landmarkId='distinct-id';delete input.demonstrations[0].xBoundMm;assert.throws(()=>responseFromDemonstrations(input),/bound/);
});
test('existing source-bound numeric observations coexist without id collision or rebinding',()=>{
 const input=account();input.referenceStudy.observations=[createResponseObservation(source,'reference',{id:'manual',label:'Authored numeric control',evidenceClass:'authored-example',widthMm:100,heightMm:80,xMm:20,yMm:30,xBoundMm:0,yBoundMm:0})];
 const received=responseFromDemonstrations(input);assert.equal(received.observations.length,3);assert.deepEqual(received.observations[0],input.referenceStudy.observations[0]);
 input.demonstrations[0].id='manual';assert.throws(()=>responseFromDemonstrations(input),/distinct/);
});
test('declared image identity survives while malformed identity refuses without claiming pixel admission',()=>{
 const input=account();input.demonstrations[0].annotation.source.image={sha256:'a'.repeat(64),widthPx:1000,heightPx:800,mimeType:'image/png',name:'authored.png',pixelCoordinates:'browser-oriented'};
 const out=analyzeDemonstrationResponse(input);assert.equal(out.sources[0].sourceReference.source.image.sha256,'a'.repeat(64));assert.match(out.limitations.join(' '),/not verification/);
 input.demonstrations[0].annotation.source.image.sha256='wrong';assert.throws(()=>analyzeDemonstrationResponse(input),/SHA-256/);
});
test('photo-backed coordinates use maintained full-image admission rather than only hash metadata',()=>{
 const input=account();input.demonstrations[0].annotation.source.image={sha256:'a'.repeat(64),widthPx:100,heightPx:80,mimeType:'image/png',name:'too-small.png',pixelCoordinates:'browser-oriented'};
 assert.throws(()=>analyzeDemonstrationResponse(input),/inside the source image/);
});
test('practice tolerance does not silently become a measurement bound',()=>{
 const input=account(),before=responseFromDemonstrations(input);input.demonstrations[0].annotation.landmarks[0].toleranceMm=50;
 assert.deepEqual(responseFromDemonstrations(input),before);
});
test('complete source custody refuses oversize accounts rather than exporting an unreopenable file',()=>{
 const input=account();input.demonstrations[0].annotation.unknowns=['x'.repeat(2_000_000)];
 assert.throws(()=>exportDemonstrationResponse(input),/exceeds2MB/);
});
test('reference-anchor expansion cannot produce an oversized numeric export from a small raw account',()=>{
 const input=account();input.referenceStudy.source.provenance='p'.repeat(300_000);
 input.demonstrations=Array.from({length:7},(_,i)=>({...structuredClone(input.demonstrations[0]),id:`source-${i}`}));
 assert.ok(new TextEncoder().encode(JSON.stringify(input)).length<2_000_000);
 assert.throws(()=>exportDemonstrationResponse(input),/Derived numeric response exceeds2MB/);
 assert.throws(()=>responseFromDemonstrations(input),/Derived numeric response exceeds2MB/);
});

test('exact-capacity account uses compact download bytes and remains reopenable',async()=>{
 const input=account();input.demonstrations=[];
 input.referenceStudy.source.provenance='';
 const size=value=>new TextEncoder().encode(JSON.stringify(value)).length;
 input.referenceStudy.source.provenance='p'.repeat(2_000_000-size(input));
 const saved=exportDemonstrationResponse(input);
 assert.equal(size(saved),2_000_000);
 assert.ok(new TextEncoder().encode(JSON.stringify(saved,null,2)).length>2_000_000);
 assert.deepEqual(exportDemonstrationResponse(JSON.parse(JSON.stringify(saved))),saved);
 const {readFile}=await import('node:fs/promises');
 const ui=await readFile(new URL('../web/response-demonstrations.mjs',import.meta.url),'utf8');
 assert.match(ui,/new Blob\(\[JSON.stringify\(value\)\]/);
});
