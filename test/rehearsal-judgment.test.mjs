import test from 'node:test';
import assert from 'node:assert/strict';
import {createRehearsal,placeRehearsal,submitRehearsal,advanceRehearsal,revealRehearsal,inspectRehearsal} from '../src/transfer-rehearsal.mjs';
import {createJudgmentStudy,importJudgmentStudy,recordPlacementJudgment,replaceJudgmentRehearsal,inspectPlacementJudgments} from '../src/rehearsal-judgment.mjs';
const source={title:'Authored control',provenance:'Synthetic axes',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'ratio',label:'Quarter width',kind:'fraction',sourcePx:{x:25,y:20},toleranceMm:1}]};
const fresh=()=>createRehearsal(source,[{widthMm:200,heightMm:160},{widthMm:80,heightMm:120}]);
const placed=(x=50)=>placeRehearsal(fresh(),'ratio',{xMm:x,yMm:40});
const commit=s=>replaceJudgmentRehearsal(s,submitRehearsal(s.rehearsal));
test('correct and mistaken judgments compare only after commitment against original scores',()=>{
 for(const [x,prediction,agreement] of [[50,'adequate',true],[55,'adequate',false],[55,'inadequate',true],[50,'inadequate',false]]){
  const raw=placed(x),s=recordPlacementJudgment(createJudgmentStudy(raw),prediction,'supplied reasoning');
  assert.equal(inspectPlacementJudgments(s)[0].actualAdequate,null);assert.equal(inspectPlacementJudgments(s)[0].agreement,null);
  const done=commit(s);assert.equal(inspectPlacementJudgments(done)[0].agreement,agreement);
  assert.deepEqual(inspectRehearsal(done.rehearsal),inspectRehearsal(submitRehearsal(raw)));
  assert.deepEqual(importJudgmentStudy(JSON.parse(JSON.stringify(done))),done);
 }
});
test('uncertainty, no prediction and incomplete placements remain distinct',()=>{
 assert.deepEqual(inspectPlacementJudgments(createJudgmentStudy(submitRehearsal(fresh()))),[]);
 assert.throws(()=>recordPlacementJudgment(createJudgmentStudy(fresh()),'adequate'),/every task mark/);
 const s=commit(recordPlacementJudgment(createJudgmentStudy(placed()),'uncertain'));
 assert.equal(inspectPlacementJudgments(s)[0].actualAdequate,true);assert.equal(inspectPlacementJudgments(s)[0].agreement,null);
 assert.throws(()=>recordPlacementJudgment(s,'adequate'),/before committing/);
});
test('first judgment freezes exact placements and cannot be rewritten',()=>{
 const s=recordPlacementJudgment(createJudgmentStudy(placed()),'adequate');const original=JSON.stringify(s);
 assert.throws(()=>recordPlacementJudgment(s,'inadequate'),/boundaries/);
 assert.throws(()=>replaceJudgmentRehearsal(s,placeRehearsal(s.rehearsal,'ratio',{xMm:60,yMm:40})),/freeze/);
 const mutated=structuredClone(s.rehearsal);mutated.events[0].xMm=60;
 assert.throws(()=>replaceJudgmentRehearsal(s,mutated),/unchanged/);
 const sourceChanged=structuredClone(s.rehearsal);sourceChanged.source.title='Changed';
 assert.throws(()=>replaceJudgmentRehearsal(s,sourceChanged),/unchanged/);
 assert.equal(JSON.stringify(s),original);
});
test('help before and after judgment is separated and retained without changing judgment',()=>{
 let s=recordPlacementJudgment(createJudgmentStudy(revealRehearsal(placed())),'adequate');
 s=replaceJudgmentRehearsal(s,revealRehearsal(s.rehearsal));s=commit(s);
 assert.equal(inspectPlacementJudgments(s)[0].targetsRequestedBeforeJudgment,1);
 assert.equal(inspectRehearsal(s.rehearsal).trials[0].reveals.length,2);
});
test('later sheets accept distinct judgments and retain original first attempt',()=>{
 let s=commit(recordPlacementJudgment(createJudgmentStudy(placed(55)),'adequate'));
 s=replaceJudgmentRehearsal(s,advanceRehearsal(s.rehearsal));
 s=replaceJudgmentRehearsal(s,placeRehearsal(s.rehearsal,'ratio',{xMm:20,yMm:30}));
 s=commit(recordPlacementJudgment(s,'adequate'));
 assert.deepEqual(inspectPlacementJudgments(s).map(j=>[j.trialIndex,j.agreement]),[[0,false],[1,true]]);
 assert.equal(s.rehearsal.events[0].xMm,55);
});
test('forged saved verdicts ignored; malformed and out-of-order boundaries refused',()=>{
 const s=commit(recordPlacementJudgment(createJudgmentStudy(placed(55)),'adequate'));
 s.judgments[0].agreement=true;s.judgments[0].actualAdequate=true;
 assert.equal(inspectPlacementJudgments(s)[0].agreement,false);
 for(const atEvent of [-1,0,1.5,999])assert.throws(()=>importJudgmentStudy({...s,judgments:[{...s.judgments[0],atEvent}]}));
 assert.throws(()=>importJudgmentStudy({...s,judgments:[{...s.judgments[0],prediction:'probably'}]}));
});
test('boundary metadata matches maintained prefix replay across all eight workpieces',()=>{
 const rehearsal=createRehearsal(source,Array.from({length:8},(_,i)=>({widthMm:100+i,heightMm:80}))),judgments=[];
 for(let i=0;i<8;i++){
  rehearsal.events.push({type:'place',id:'ratio',xMm:25,yMm:20});
  if(i%2)rehearsal.events.push({type:'reveal'});
  judgments.push({atEvent:rehearsal.events.length,prediction:i%3?'adequate':'uncertain',reason:''});
  if(i%2===0)rehearsal.events.push({type:'reveal'});
  rehearsal.events.push({type:'submit'});if(i<7)rehearsal.events.push({type:'advance'});
 }
 const s={...createJudgmentStudy(rehearsal),judgments},findings=inspectPlacementJudgments(s);
 for(const [i,j] of judgments.entries()){
  const prefix=inspectRehearsal({...rehearsal,events:rehearsal.events.slice(0,j.atEvent)});
  assert.equal(findings[i].trialIndex,prefix.index);
  assert.equal(findings[i].assistanceAtJudgment,prefix.trials[i].assistance);
  assert.equal(findings[i].targetsRequestedBeforeJudgment,prefix.trials[i].reveals.length);
 }
});
