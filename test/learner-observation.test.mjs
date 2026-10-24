import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLearnerObservation,LEARNER_OBSERVATION_SCHEMA} from '../src/learner-observation.mjs';
import {derive,adapt} from '../src/geometry.mjs';
import * as practice from '../src/practice.mjs';
import {createReview,importReview,reviewPractice,focusedPractice} from '../src/practice-review.mjs';
import {createFocusedReview,appendFocusedResult,importFocusedReview,compareFocusedResult,fullTaskRetest} from '../src/focused-review.mjs';

// Independent rational projective controls, generated outside the application.
// px=(600u+100v+80)/(1+u/4+3v/20), py=(50u+400v+50)/(1+u/4+3v/20).
const demo={provenance:'Authored image control; no physical acquisition',
 source:{widthMm:200,heightMm:100,corners:[{x:0,y:0},{x:400,y:0},{x:400,y:200},{x:0,y:200}]},
 landmarks:[{id:'guide',label:'Guide',kind:'fraction',sourcePx:{x:40,y:100},toleranceMm:2},
 {id:'center',label:'Center',kind:'fraction',sourcePx:{x:200,y:100},toleranceMm:2}]};
const target=adapt(derive(demo),300,200);
const clone=x=>structuredClone(x);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
function observation(which='A'){
 return {schema:LEARNER_OBSERVATION_SCHEMA,evidenceClass:'authored-image-control',note:'Exact authored perspective control',
 image:{sha256:which==='A'?'e74b296664380bb1e56dc81db0af1350f568e7da66476aa5e449ab6adfb0a1b7':'842c726701c3dcc1e98b195e31cb4a5ab881c2248e851fe44d291ca98c0744fd',
 widthPx:700,heightPx:500,mimeType:'image/png',pixelCoordinates:'browser-oriented',name:`observation-${which.toLowerCase()}.png`},
 calibration:{widthMm:300,heightMm:200,corners:[{x:80,y:50},{x:544,y:80},{x:3900/7,y:2500/7},{x:3600/23,y:9000/23}]},
 points:[{id:'guide',pixel:which==='A'?{x:100000/551,y:124000/551}:{x:1900/11,y:2550/11}},
 {id:'center',pixel:{x:1075/3,y:1375/6}}]};
}
const fresh=()=>practice.createPractice(demo,300,200);
const observed=(s=fresh(),raw=observation())=>practice.observePractice(demo,300,200,s,raw);
const reopen=s=>practice.importPractice(demo,300,200,JSON.parse(JSON.stringify(s)));

test('maintained round review retains photo lineage and manual overrides while focused drills start empty',()=>{
 const first=observed(),manual=practice.placePractice(demo,300,200,first,'guide',{xMm:30,yMm:100});
 const current=observed(manual,observation('B')),before=clone(current);
 const bundle=createReview(demo,current),restored=importReview(JSON.parse(JSON.stringify(bundle)));
 assert.deepEqual(restored.session,current);
 assert.deepEqual(restored.session.history[0].photoObservation,first.photoObservation);
 assert.deepEqual(restored.session.history[0].detachedPhotoMarks,['guide']);
 const comparison=reviewPractice(restored).comparison;
 assert.deepEqual(comparison.commonMarks,['guide','center']);near(comparison.beforeRmsMm,0);near(comparison.afterRmsMm,0);
 const drill=focusedPractice({...restored,selectedIds:['guide']});
 assert.deepEqual(drill.session.attempts,[]);assert.deepEqual(drill.session.history,[]);
 assert.equal(drill.session.photoObservation,undefined);assert.equal(drill.demo.landmarks.length,1);
 assert.throws(()=>practice.importPractice(drill.demo,drill.widthMm,drill.heightMm,current));
 const raw=observation();raw.points=raw.points.filter(p=>p.id==='guide');
 const attempted=practice.observePractice(drill.demo,drill.widthMm,drill.heightMm,drill.session,raw);
 const received=appendFocusedResult(createFocusedReview(restored),drill.demo,attempted,'Photo-backed guide drill');
 const reopened=importFocusedReview(JSON.parse(JSON.stringify(received)));
 assert.deepEqual(reopened.review.session,current);
 assert.deepEqual(reopened.drills[0].session.photoObservation,attempted.photoObservation);
 const focusedResult=compareFocusedResult(reopened,reopened.drills[0].id);
 assert.deepEqual(focusedResult.commonMarks,['guide']);assert.deepEqual(focusedResult.unpracticedIds,['center']);
 near(focusedResult.afterRmsMm,Math.sqrt(52));assert.equal(focusedResult.learningEstablished,false);
 const retest=fullTaskRetest(reopened);assert.deepEqual(retest.session.attempts,[]);assert.deepEqual(retest.session.history,[]);
 assert.deepEqual(current,before);
});

test('independent perspective coordinates recover millimetres and actual 6,-4 error without correcting it',()=>{
 const raw=observation(),snapshot=clone(raw),{record,attempts}=normalizeLearnerObservation(target,raw);
 near(attempts[0].xMm,36);near(attempts[0].yMm,96);near(attempts[1].xMm,150);near(attempts[1].yMm,100);
 const result=practice.evaluatePractice(demo,300,200,attempts);
 near(result.results[0].evaluation.dxMm,6);near(result.results[0].evaluation.dyMm,-4);
 near(result.results[0].evaluation.errorMm,Math.sqrt(52));near(result.rmsErrorMm,Math.sqrt(26));assert.equal(result.passed,false);
 assert.deepEqual(record.points,raw.points);assert.deepEqual(record.calibration,raw.calibration);assert.deepEqual(record.image,raw.image);
 assert.equal(record.evidenceClass,'authored-image-control');assert.deepEqual(raw,snapshot);
 record.points[0].pixel.x=0;assert.deepEqual(raw,snapshot);
 const correct=normalizeLearnerObservation(target,observation('B'));
 assert.equal(practice.evaluatePractice(demo,300,200,correct.attempts).passed,true);
});
test('missing annotations remain incomplete and reported provenance remains a declaration',()=>{
 const raw=observation();raw.points.pop();raw.evidenceClass='reported-photo-annotation';
 const r=normalizeLearnerObservation(target,raw);assert.equal(r.record.evidenceClass,'reported-photo-annotation');
 const score=practice.evaluatePractice(demo,300,200,r.attempts);assert.deepEqual(score.missing,['center']);assert.equal(score.complete,false);assert.equal(score.passed,false);
});
test('refuse malformed identity, wrong sheet, unsupported evidence, repeated or unknown marks and off-sheet points',()=>{
 for(const modify of [r=>r.image.sha256='bad',r=>r.calibration.widthMm=301,r=>r.evidenceClass='verified-skill',
  r=>r.points.push(clone(r.points[0])),r=>r.points[0].id='unknown',r=>r.points=[],
  r=>r.points[0].pixel.x=NaN,r=>r.points[0].pixel.x=701,r=>r.points[0].pixel={x:1,y:1},
  r=>r.calibration.corners[1]=clone(r.calibration.corners[0])]){
  const raw=observation();modify(raw);assert.throws(()=>normalizeLearnerObservation(target,raw));
 }
});
test('first observation uses current empty round; a new observation archives earlier raw manual or photo attempts',()=>{
 const first=observed();assert.equal(first.schema,practice.OBSERVED_PRACTICE_SCHEMA);assert.equal(first.round,1);assert.equal(first.history.length,0);
 assert.deepEqual(first.photoObservation.points,observation().points);assert.deepEqual(reopen(first),first);
 const second=observed(first,observation('B'));assert.equal(second.round,2);assert.deepEqual(second.history[0].attempts,first.attempts);
 assert.deepEqual(second.history[0].photoObservation,first.photoObservation);assert.equal(second.photoObservation.image.sha256,observation('B').image.sha256);
 assert.equal(practice.evaluatePractice(demo,300,200,second.attempts).passed,true);
 const manual=practice.placePractice(demo,300,200,fresh(),'guide',{xMm:41,yMm:88});
 const next=observed(manual);assert.equal(next.round,2);assert.deepEqual(next.history[0].attempts,manual.attempts);assert.equal(next.history[0].photoObservation,undefined);
});
test('manual edit detaches only that photo claim; retry and reopen retain original photo pixels and detach history',()=>{
 const first=observed(),original=clone(first);
 const edited=practice.placePractice(demo,300,200,first,'guide',{xMm:30,yMm:100});
 assert.deepEqual(first,original);assert.deepEqual(edited.detachedPhotoMarks,['guide']);assert.deepEqual(edited.photoObservation,first.photoObservation);
 near(edited.attempts.find(p=>p.id==='guide').xMm,30);assert.deepEqual(reopen(edited),edited);
 const twice=practice.placePractice(demo,300,200,edited,'guide',{xMm:31,yMm:100});assert.deepEqual(twice.detachedPhotoMarks,['guide']);
 const next=practice.retryPractice(demo,300,200,edited);assert.deepEqual(next.attempts,[]);assert.equal(next.photoObservation,undefined);
 assert.deepEqual(next.history[0].photoObservation,first.photoObservation);assert.deepEqual(next.history[0].detachedPhotoMarks,['guide']);assert.deepEqual(next.history[0].attempts,edited.attempts);assert.deepEqual(reopen(next),next);
});
test('stale active photo coordinates and malformed detach or placement identities refuse in current and historical rounds',()=>{
 const first=observed();
 for(const modify of [s=>s.attempts[0].xMm++,s=>s.attempts.pop(),s=>s.attempts[0].id='missing',
  s=>s.attempts=[s.attempts[0],clone(s.attempts[0])],s=>s.detachedPhotoMarks=['guide','guide'],
  s=>s.detachedPhotoMarks=['missing'],s=>{s.detachedPhotoMarks=['guide'];s.attempts.shift();},
  s=>s.photoObservation.points[0].pixel.x++]){
  const altered=clone(first);modify(altered);assert.throws(()=>reopen(altered));
 }
 const next=practice.retryPractice(demo,300,200,first);next.history[0].attempts[0].yMm++;assert.throws(()=>reopen(next));
 const clean=fresh();clean.detachedPhotoMarks=['guide'];assert.throws(()=>reopen(clean));
});
test('v1 remains reopenable but cannot silently carry photo evidence; v2 binds source and setup',()=>{
 const legacy=fresh();assert.equal(legacy.schema,practice.PRACTICE_SCHEMA);assert.deepEqual(reopen(legacy),legacy);
 const first=observed(),old=clone(first);old.schema=practice.PRACTICE_SCHEMA;assert.throws(()=>reopen(old));
 const history=practice.retryPractice(demo,300,200,first);history.schema=practice.PRACTICE_SCHEMA;assert.throws(()=>reopen(history));
 assert.throws(()=>practice.importPractice(demo,301,200,first));
 const altered=clone(demo);altered.landmarks[0].sourcePx.x++;assert.throws(()=>practice.importPractice(altered,300,200,first));
 const forged=clone(first);forged.passed=true;forged.results=['invented'];const clean=reopen(forged);assert.equal(clean.passed,undefined);assert.equal(practice.evaluatePractice(demo,300,200,clean.attempts).passed,false);
});
test('manual addition of an unobserved mark preserves partial photo evidence without inventing a detach',()=>{
 const raw=observation();raw.points.pop();const partial=observed(fresh(),raw);
 const completed=practice.placePractice(demo,300,200,partial,'center',{xMm:150,yMm:100});
 assert.equal(completed.detachedPhotoMarks,undefined);assert.deepEqual(completed.photoObservation.points,raw.points);
 assert.equal(completed.attempts.length,2);assert.deepEqual(reopen(completed),completed);
});
test('refused replacement observation preserves existing attempts and all image provenance',()=>{
 const first=observed();const original=clone(first);const bad=observation('B');bad.calibration.heightMm=201;
 assert.throws(()=>observed(first,bad));assert.deepEqual(first,original);
 let full=first;for(let i=1;i<21;i++)full=observed(full,i%2?observation('B'):observation());
 const snapshot=clone(full);assert.equal(full.round,21);assert.throws(()=>observed(full));assert.deepEqual(full,snapshot);
});
