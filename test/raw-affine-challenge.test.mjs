import test from 'node:test';
import assert from 'node:assert/strict';
import {RESPONSE_SCHEMA,createResponseObservation} from '../src/response-family.mjs';
import {DEMONSTRATION_RESPONSE_SCHEMA} from '../src/response-demonstrations.mjs';
import {freezeRawAffineChallenge,receiveRawAffineResult,removeRawAffineResult,validateRawAffineChallenge,analyzeRawAffineChallenge,encodeRawAffineChallenge} from '../src/raw-affine-challenge.mjs';
function annotation(w=100,h=80,x=20,y=30){return {title:'Authored source',provenance:'Analytic source, not physical evidence',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:[{id:'mark',label:'Explicit mark',sourcePx:{x,y},kind:'fraction',toleranceMm:1}]};}
const observation=(id,ann)=>({id,label:'Authored reading',evidenceClass:'authored-example',annotation:ann,landmarkId:'mark',correspondenceConfirmed:true,xBoundMm:0,yBoundMm:0});
function training(){const source=annotation();return {schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy:{schema:RESPONSE_SCHEMA,source,landmarkId:'mark',coefficientLimit:2,observations:[],target:{widthMm:100,heightMm:80}},demonstrations:[observation('training-raw',annotation())]};}
const plan=[{id:'challenge-a',label:'Separate A',widthMm:110,heightMm:80},{id:'challenge-b',label:'Separate B',widthMm:120,heightMm:80}];
const frozen=()=>freezeRawAffineChallenge(training(),plan,true);
test('raw training and calibrated outcomes preserve one frozen family and reveal joint contradiction',()=>{
 let a=frozen();const original=encodeRawAffineChallenge(a),ranges=analyzeRawAffineChallenge(a).analysis.rows.map(r=>r.frozenPrediction);
 a=receiveRawAffineResult(a,'challenge-a',observation('ignored',annotation(110,80,30,30)));
 a=receiveRawAffineResult(a,'challenge-b',observation('ignored',annotation(120,80,30,30)));
 const r=analyzeRawAffineChallenge(a);assert.equal(r.analysis.status,'contradicted');assert.ok(r.analysis.rows.every(r=>r.individuallyCompatible));
 assert.deepEqual(r.analysis.rows.map(r=>r.frozenPrediction),ranges);assert.deepEqual(a.trainingAccount,JSON.parse(original).trainingAccount);
 assert.equal(r.challenge.training.observations.length,1);assert.equal(r.challenge.results.length,2);
});
test('full raw sources reopen and forged derived rows cannot alter recomputation',()=>{
 const a=receiveRawAffineResult(frozen(),'challenge-a',observation('ignored',annotation(110,80,30,30))),raw=JSON.parse(encodeRawAffineChallenge(a));
 raw.derived={status:'compatible-complete'};raw.results[0].derived={xMm:999};
 assert.deepEqual(analyzeRawAffineChallenge(raw).analysis,analyzeRawAffineChallenge(a).analysis);
 assert.deepEqual(validateRawAffineChallenge(raw).results[0].annotation,a.results[0].annotation);
});
test('plan dimensions, explicit correspondence and bounds cannot be silently inferred',()=>{
 const a=frozen();assert.throws(()=>receiveRawAffineResult(a,'challenge-a',observation('x',annotation(111))),/dimensions/);
 const raw=observation('x',annotation(110));raw.correspondenceConfirmed=false;assert.throws(()=>receiveRawAffineResult(a,'challenge-a',raw),/confirm/);
 raw.correspondenceConfirmed=true;delete raw.xBoundMm;assert.throws(()=>receiveRawAffineResult(a,'challenge-a',raw),/bound/);
 assert.throws(()=>freezeRawAffineChallenge(training(),plan,false),/declare/);
});
test('outcomes are independently calibrated and explicit correspondence does not require equal mark names',()=>{
 const raw=observation('x',annotation(110,80,30,30));raw.annotation.landmarks[0].id='separate-mark';raw.landmarkId='separate-mark';
 const a=receiveRawAffineResult(frozen(),'challenge-a',raw),r=analyzeRawAffineChallenge(a);
 assert.equal(a.results[0].landmarkId,'separate-mark');assert.equal(r.challenge.results[0].sourceReference.landmark.id,'mark');assert.ok(Math.abs(r.challenge.results[0].xMm-30)<1e-12);
});
test('photo-backed annotation admission retains identity and rejects coordinates outside image',()=>{
 const raw=observation('x',annotation(110));raw.annotation.source.image={name:'source.png',sha256:'a'.repeat(64),mimeType:'image/png',widthPx:110,heightPx:80,pixelCoordinates:'browser-oriented'};
 const a=receiveRawAffineResult(frozen(),'challenge-a',raw);assert.equal(a.results[0].annotation.source.image.sha256,'a'.repeat(64));
 raw.annotation.source.image.widthPx=100;assert.throws(()=>receiveRawAffineResult(frozen(),'challenge-a',raw),/inside the source image/);
});
test('replacement and removal are explicit current-evidence changes, never training mutation',()=>{
 let a=receiveRawAffineResult(frozen(),'challenge-a',observation('x',annotation(110,80,100,30)));const before=encodeRawAffineChallenge(a);
 assert.equal(analyzeRawAffineChallenge(a).analysis.status,'contradicted');const b=receiveRawAffineResult(a,'challenge-a',observation('x',annotation(110,80,30,30)));
 assert.equal(b.results.length,1);assert.equal(analyzeRawAffineChallenge(b).analysis.status,'compatible-incomplete');assert.equal(encodeRawAffineChallenge(a),before);
 assert.equal(analyzeRawAffineChallenge(removeRawAffineResult(b,'challenge-a')).analysis.status,'awaiting-results');assert.deepEqual(a.trainingAccount,b.trainingAccount);
});
test('complete raw custody and expanded numeric challenge both obey the compact cap',()=>{
 const a=frozen(),raw=observation('x',annotation(110));raw.annotation.extra='x'.repeat(2_000_000);assert.throws(()=>receiveRawAffineResult(a,'challenge-a',raw),/exceeds2MB/);
 const t=training();t.demonstrations=[];t.referenceStudy.source.provenance='p'.repeat(900000);
 t.referenceStudy.observations=[createResponseObservation(t.referenceStudy.source,'mark',{id:'numeric-training',label:'Authored',evidenceClass:'authored-example',widthMm:100,heightMm:80,xMm:20,yMm:30,xBoundMm:0,yBoundMm:0})];
 const large=freezeRawAffineChallenge(t,plan,true),before=encodeRawAffineChallenge(large);assert.ok(Buffer.byteLength(before)<2_000_000);
 assert.throws(()=>receiveRawAffineResult(large,'challenge-a',observation('x',annotation(110))),/exceeds2MB/);assert.equal(encodeRawAffineChallenge(large),before);
});
test('unknown or duplicate planned bindings refuse and missing evidence stays untested',()=>{
 const a=frozen();assert.throws(()=>receiveRawAffineResult(a,'unknown',observation('x',annotation(110))),/frozen/);
 const b=receiveRawAffineResult(a,'challenge-b',observation('x',annotation(120,80,100,30)));const r=analyzeRawAffineChallenge(b).analysis;
 assert.equal(r.rows[0].individuallyCompatible,null);assert.equal(r.status,'contradicted');
 const copy=structuredClone(b);copy.results.push(copy.results[0]);assert.throws(()=>validateRawAffineChallenge(copy),/distinct/);
});
test('exact whole-raw-account boundary emits compact bytes that reopen without annotation loss',()=>{
 const a=receiveRawAffineResult(frozen(),'challenge-a',observation('x',annotation(110)));a.results[0].annotation.provenance='';
 const size=v=>Buffer.byteLength(JSON.stringify(v));a.results[0].annotation.provenance='p'.repeat(2_000_000-size(a));
 const encoded=encodeRawAffineChallenge(a);assert.equal(Buffer.byteLength(encoded),2_000_000);assert.deepEqual(validateRawAffineChallenge(JSON.parse(encoded)),a);
 assert.ok(Buffer.byteLength(JSON.stringify(a,null,2))>2_000_000);a.results[0].annotation.provenance+='x';assert.throws(()=>encodeRawAffineChallenge(a),/exceeds2MB/);
});
