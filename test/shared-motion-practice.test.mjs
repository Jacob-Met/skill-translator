import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedMotionPractice,importSharedMotionPractice,assessSharedMotionPractice} from '../src/shared-motion-practice.mjs';
import {createPractice,placePractice,retryPractice,evaluatePractice,observePractice} from '../src/practice.mjs';
import {motionStudy,groupedFrames} from './helpers/shared-motion-fixture.mjs';
const WIDTH_MM=600,HEIGHT_MM=400;
const PARAMETERS={fitToleranceMm:.01,basis:'Compare retained actual physical point configurations with every original rigid group.'};
const demoOf=study=>study.demonstrations[0].annotation;
const newSession=study=>createPractice(demoOf(study),WIDTH_MM,HEIGHT_MM);
function placePoints(study,session,points){
 let next=session;
 for(const [index,[xMm,yMm]] of points.entries())next=placePractice(demoOf(study),WIDTH_MM,HEIGHT_MM,next,'p'+index,{xMm,yMm});
 return next;
}
const translatedPoints=frames=>frames[0].map(([x,y])=>[x+25,y+20]);
test('assesses every maximal group against every original demonstration',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),session=placePoints(study,newSession(study),translatedPoints(frames));
 const result=assessSharedMotionPractice(createSharedMotionPractice(study,session,PARAMETERS));
 assert.equal(result.inference.groups.length,2);assert.equal(result.rounds.length,1);assert.equal(result.status,'supported');assert.equal(result.passed,true);
 const comparisons=result.rounds[0].comparisons;assert.equal(comparisons.length,6);
 for(const group of result.inference.groups)assert.deepEqual(comparisons.filter(c=>c.groupIds.join(',')===group.ids.join(',')).map(c=>c.sourceId),result.sourceIds);
 for(const c of comparisons){
  assert.equal(c.status,'supported');assert.equal(c.pairs.length,c.groupIds.length);assert.equal(c.fit.residuals.length,c.groupIds.length);
  assert.equal(c.witness.errorMm,c.maxResidualMm);assert.ok(c.maxResidualMm<=PARAMETERS.fitToleranceMm+result.numericalSlackMm);
  assert.deepEqual(c.witness.alignedAttempt,(({xMm,yMm})=>({xMm,yMm}))(c.fit.residuals.find(r=>r.id===c.witness.id)));
 }
});
test('fixed-shape support preserves the distinct failing positional score',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),session=placePoints(study,newSession(study),translatedPoints(frames));
 const result=assessSharedMotionPractice(createSharedMotionPractice(study,session,PARAMETERS));
 const positional=evaluatePractice(demoOf(study),WIDTH_MM,HEIGHT_MM,session.attempts);
 assert.equal(result.passed,true);assert.equal(positional.passed,false);assert.deepEqual(result.rounds[0].positional,positional);
});
test('changed actual geometry fails while a collapsed attempt stays unresolved',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),changed=translatedPoints(frames);changed[0]=[changed[0][0]+20,changed[0][1]];
 const result=assessSharedMotionPractice(createSharedMotionPractice(study,placePoints(study,newSession(study),changed),PARAMETERS));
 assert.equal(result.passed,false);assert.equal(result.status,'outside-fit-threshold');assert.ok(result.counts.outsideFitThreshold>0);
 for(const c of result.rounds[0].comparisons.filter(c=>c.status==='outside-fit-threshold')){
  assert.ok(c.maxResidualMm>PARAMETERS.fitToleranceMm+result.numericalSlackMm);assert.equal(c.fit.residuals.length,c.groupIds.length);assert.equal(c.witness.errorMm,c.maxResidualMm);
 }
 const collapsed=assessSharedMotionPractice(createSharedMotionPractice(study,placePoints(study,newSession(study),frames[0].map(()=>[100,100])),PARAMETERS));
 assert.equal(collapsed.passed,false);assert.equal(collapsed.status,'unresolved');assert.equal(collapsed.counts.unresolved,collapsed.counts.total);
 for(const c of collapsed.rounds[0].comparisons){assert.equal(c.fit,null);assert.ok(c.unavailable);}
});
test('retains incomplete earlier rounds and every current comparison',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),points=translatedPoints(frames);
 let session=placePractice(demoOf(study),WIDTH_MM,HEIGHT_MM,newSession(study),'p0',{xMm:points[0][0],yMm:points[0][1]});
 session=retryPractice(demoOf(study),WIDTH_MM,HEIGHT_MM,session);session=placePoints(study,session,points);
 const record=createSharedMotionPractice(study,session,PARAMETERS),result=assessSharedMotionPractice(record);
 assert.deepEqual(result.rounds.map(r=>r.round),[1,2]);assert.equal(result.rounds[0].status,'incomplete');assert.equal(result.rounds[0].passed,false);
 assert.equal(result.rounds[1].status,'supported');assert.equal(result.rounds[1].passed,true);assert.equal(result.passed,false);
 assert.deepEqual(result.rounds[0].actual,record.session.history[0]);assert.deepEqual(result.rounds[1].actual.attempts,record.session.attempts);
 for(const round of result.rounds){assert.equal(round.comparisons.length,6);assert.deepEqual(round.positional,evaluatePractice(demoOf(study),WIDTH_MM,HEIGHT_MM,round.actual.attempts));}
 for(const c of result.rounds[0].comparisons){assert.equal(c.status,'incomplete');assert.ok(c.missingAttemptIds.length);assert.equal(c.fit,null);}
});
test('rejects foreign source references and invalid tolerance or basis',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),session=newSession(study),foreign=structuredClone(frames);foreign[0][0][0]+=1;
 assert.throws(()=>createSharedMotionPractice(motionStudy(foreign),session,PARAMETERS));
 for(const fitToleranceMm of [-1,1000.01,NaN,Infinity,'0.01',undefined])assert.throws(()=>createSharedMotionPractice(study,session,{...PARAMETERS,fitToleranceMm}));
 for(const basis of ['', '   ','x'.repeat(2001),null,undefined])assert.throws(()=>createSharedMotionPractice(study,session,{...PARAMETERS,basis}));
 for(const fitToleranceMm of [0,1000])assert.equal(createSharedMotionPractice(study,session,{...PARAMETERS,fitToleranceMm}).fitToleranceMm,fitToleranceMm);
});
test('raw input roundtrip discards forged verdicts without mutation',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),session=placePoints(study,newSession(study),translatedPoints(frames));
 const studyBefore=structuredClone(study),sessionBefore=structuredClone(session),record=createSharedMotionPractice(study,session,PARAMETERS),before=structuredClone(record);
 const expected=assessSharedMotionPractice(record),forged=structuredClone(record);forged.status='outside-fit-threshold';forged.passed=false;
 forged.assessment={status:'outside-fit-threshold',passed:false};forged.session.verdict={passed:false};
 assert.deepEqual(importSharedMotionPractice(forged),record);assert.deepEqual(assessSharedMotionPractice(forged),expected);
 assert.deepEqual(importSharedMotionPractice(JSON.stringify(record)),record);assert.deepEqual(study,studyBefore);assert.deepEqual(session,sessionBefore);assert.deepEqual(record,before);
});
test('empty grouping never produces vacuous practice success',()=>{
 const study=motionStudy([[[30,30],[30,30],[30,30]],[[80,80],[80,80],[80,80]]],10);
 const result=assessSharedMotionPractice(createSharedMotionPractice(study,newSession(study),PARAMETERS));
 assert.equal(result.inference.groups.length,0);assert.equal(result.status,'no-assessable-groups');assert.equal(result.passed,false);assert.equal(result.counts.total,0);
 assert.equal(result.rounds.length,1);assert.equal(result.rounds[0].passed,false);assert.equal(result.rounds[0].comparisons.length,0);assert.ok(result.rounds[0].positional);
});
test('capacity refusal stays explicit alongside original positional evaluation',()=>{
 const points=Array.from({length:13},(_,i)=>[10+i*10,20+(i%3)*15]),study=motionStudy([points,points.map(([x,y])=>[x+4,y+7])]);
 const result=assessSharedMotionPractice(createSharedMotionPractice(study,newSession(study),PARAMETERS));
 assert.equal(result.status,'no-assessable-groups');assert.equal(result.passed,false);assert.equal(result.counts.total,0);assert.equal(result.inference.groups.length,0);
 assert.equal(result.inference.status,'capacity');assert.ok(result.rounds[0].positional);
});

test('doubled adapted placements pass positional scoring and fail all original group fits',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),demo=demoOf(study);
 assert.equal(demo.source.widthMm,300);assert.equal(demo.source.heightMm,200);
 const session=placePoints(study,newSession(study),frames[0].map(([x,y])=>[2*x,2*y]));
 const positional=evaluatePractice(demo,WIDTH_MM,HEIGHT_MM,session.attempts);
 assert.equal(positional.complete,true);assert.equal(positional.passed,true);
 const result=assessSharedMotionPractice(createSharedMotionPractice(study,session,PARAMETERS));
 assert.deepEqual(result.rounds[0].positional,positional);assert.equal(result.counts.total,6);assert.equal(result.counts.outsideFitThreshold,6);assert.equal(result.counts.supported,0);assert.equal(result.passed,false);
 for(const c of result.rounds[0].comparisons){assert.equal(c.status,'outside-fit-threshold');assert.ok(c.maxResidualMm>PARAMETERS.fitToleranceMm+result.numericalSlackMm);}
});
test('normalized photo annotations and detached manual edits survive all retained rounds',()=>{
 const frames=groupedFrames(),study=motionStudy(frames),demo=demoOf(study);
 const observation={schema:'skill-translator-learner-observation/v1',image:{name:'authored.png',mimeType:'image/png',sha256:'a'.repeat(64),widthPx:600,heightPx:400,pixelCoordinates:'browser-oriented'},
 calibration:{widthMm:600,heightMm:400,corners:[{x:0,y:0},{x:600,y:0},{x:600,y:400},{x:0,y:400}]},
 evidenceClass:'authored-image-control',note:'Authored input; no real photo claim',
 points:frames[0].map((_,i)=>({id:'p'+i,pixel:{x:100+i*20,y:100+(i%3)*15}}))};
 let session=observePractice(demo,WIDTH_MM,HEIGHT_MM,newSession(study),observation);
 session=placePractice(demo,WIDTH_MM,HEIGHT_MM,session,'p0',{xMm:111,yMm:112});
 assert.deepEqual(session.detachedPhotoMarks,['p0']);const first=structuredClone(session);
 session=retryPractice(demo,WIDTH_MM,HEIGHT_MM,session);session=observePractice(demo,WIDTH_MM,HEIGHT_MM,session,observation);
 session=placePractice(demo,WIDTH_MM,HEIGHT_MM,session,'p1',{xMm:133,yMm:127});
 const before=structuredClone(session),record=createSharedMotionPractice(study,session,PARAMETERS),reopened=importSharedMotionPractice(JSON.stringify(record));
 assert.equal(reopened.session.schema,'skill-translator-practice/v2');assert.deepEqual(reopened,record);assert.deepEqual(session,before);
 assert.deepEqual(reopened.session.history[0],{round:1,attempts:first.attempts,photoObservation:first.photoObservation,detachedPhotoMarks:first.detachedPhotoMarks});
 assert.deepEqual(reopened.session.photoObservation,before.photoObservation);assert.deepEqual(reopened.session.detachedPhotoMarks,['p1']);
 const result=assessSharedMotionPractice(reopened);assert.deepEqual(result.rounds.map(r=>r.round),[1,2]);assert.deepEqual(result.rounds[0].actual,reopened.session.history[0]);
 assert.deepEqual(result.rounds[1].actual,{round:2,attempts:reopened.session.attempts,photoObservation:reopened.session.photoObservation,detachedPhotoMarks:['p1']});
 for(const round of result.rounds){assert.equal(round.comparisons.length,6);assert.deepEqual(round.positional,evaluatePractice(demo,WIDTH_MM,HEIGHT_MM,round.actual.attempts));}
 // Existing Practice exports retain normalized annotation metadata, not learner-image pixels.
});

test('overlapping reflected pairs retain all sources without substituting missing attempts',()=>{
 const triangle=[[20,20],[70,25],[35,80]],study=motionStudy([triangle,triangle.map(([x,y])=>[160-x,y])],.001);
 const session=placePoints(study,newSession(study),triangle.slice(0,2)),record=createSharedMotionPractice(study,session,PARAMETERS),result=assessSharedMotionPractice(record);
 assert.deepEqual(result.inference.groups.map(g=>g.ids.join(',')).sort(),['p0,p1','p0,p2','p1,p2']);assert.equal(result.counts.total,6);assert.equal(result.counts.supported,2);assert.equal(result.counts.incomplete,4);assert.equal(result.passed,false);
 for(const sourceId of result.sourceIds){
  const comparisons=result.rounds[0].comparisons.filter(c=>c.sourceId===sourceId);assert.equal(comparisons.length,3);
  for(const c of comparisons){assert.deepEqual(c.missingSourceIds,[]);
   if(c.groupIds.join(',')==='p0,p1'){assert.equal(c.status,'supported');assert.equal(c.fit.residuals.length,2);}
   else{assert.equal(c.status,'incomplete');assert.deepEqual(c.missingAttemptIds,['p2']);assert.equal(c.fit,null);}
   for(const pair of c.pairs){assert.notEqual(pair.id,'p2');const a=session.attempts.find(a=>a.id===pair.id);assert.deepEqual(pair.attempt,{xMm:a.xMm,yMm:a.yMm});}
  }
 }
});
test('later-source geometry changes reinfer groups and preserve actual session and scores',()=>{
 const triangle=[[20,20],[70,25],[35,80]],study=motionStudy([triangle,triangle.map(([x,y])=>[160-x,y])],.001);
 const session=placePoints(study,newSession(study),triangle),record=createSharedMotionPractice(study,session,PARAMETERS),before=assessSharedMotionPractice(record),snapshot=structuredClone(record);
 assert.equal(before.inference.groups.length,3);assert.equal(before.counts.supported,6);assert.equal(before.passed,true);
 const changed=structuredClone(record);changed.study=motionStudy([triangle,triangle.map(([x,y])=>[x+20,y+10])],.001);
 const reopened=importSharedMotionPractice(changed),after=assessSharedMotionPractice(reopened);
 assert.deepEqual(reopened.session,record.session);assert.equal(reopened.fitToleranceMm,record.fitToleranceMm);assert.equal(reopened.basis,record.basis);
 assert.deepEqual(after.inference.groups.map(g=>g.ids),[['p0','p1','p2']]);assert.equal(after.counts.total,2);assert.equal(after.counts.supported,2);assert.equal(after.passed,true);
 assert.deepEqual(after.rounds[0].actual,before.rounds[0].actual);assert.deepEqual(after.rounds[0].positional,before.rounds[0].positional);assert.deepEqual(record,snapshot);
});
