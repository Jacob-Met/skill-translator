import test from 'node:test';
import assert from 'node:assert/strict';
import {createRehearsal,placeRehearsal,revealRehearsal,submitRehearsal,advanceRehearsal} from '../src/transfer-rehearsal.mjs';
import {createAssistanceReview,inspectAssistanceReview} from '../src/assistance-review.mjs';
const source={source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',sourcePx:{x:25,y:25},kind:'fraction',toleranceMm:1},{id:'b',label:'B',sourcePx:{x:75,y:75},kind:'fraction',toleranceMm:1}]};
const start=()=>createRehearsal(source,[{widthMm:100,heightMm:100},{widthMm:200,heightMm:100}]);
test('partial first snapshot compares same observed marks, without treating additions as improvement',()=>{
 let r=placeRehearsal(start(),'a',{xMm:35,yMm:25});r=revealRehearsal(r);
 r=placeRehearsal(r,'a',{xMm:25,yMm:25});r=placeRehearsal(r,'b',{xMm:75,yMm:75});r=submitRehearsal(r);
 const trial=inspectAssistanceReview(r).trials[0],c=trial.checkpoints[0];
 assert.equal(c.before.complete,false);assert.deepEqual(c.before.missing,['b']);assert.equal(trial.result.passed,true);
 assert.equal(c.comparison.pairedCount,1);assert.equal(c.comparison.beforePairedRmsMm,10);assert.equal(c.comparison.afterPairedRmsMm,0);
 assert.deepEqual(c.comparison.added,['b']);assert.equal(c.comparison.rows[1].errorChangeMm,null);
 assert.equal(c.comparison.rows[0].errorChangeMm,-10);assert.equal(c.actionIndex,1);
});
test('repeated requests preserve first answer and label later assisted checkpoints',()=>{
 let r=placeRehearsal(start(),'a',{xMm:35,yMm:25});r=revealRehearsal(r);r=placeRehearsal(r,'a',{xMm:30,yMm:25});r=revealRehearsal(r);r=submitRehearsal(r);
 const cs=inspectAssistanceReview(r).trials[0].checkpoints;
 assert.equal(cs.length,2);assert.deepEqual(cs.map(c=>c.firstRequest),[true,false]);
 assert.deepEqual(cs.map(c=>c.before.results[0].attempt.xMm),[35,30]);assert.equal(cs[1].comparison.rows[0].change,'unchanged');
 assert.deepEqual(cs[0].comparison.missing,['b']);
});
test('unsubmitted and unstarted trials expose no targets or target error',()=>{
 let r=revealRehearsal(placeRehearsal(start(),'a',{xMm:35,yMm:25}));
 const result=inspectAssistanceReview(r);assert.equal(result.trials[0].requestCount,1);
 for(const trial of result.trials){assert.equal(trial.result,null);assert.deepEqual(trial.checkpoints,[]);assert.equal(JSON.stringify(trial).includes('xMm'),false);}
});
test('empty pre-help snapshot is empty evidence, not a perfect score',()=>{
 let r=submitRehearsal(revealRehearsal(start()));const c=inspectAssistanceReview(r).trials[0].checkpoints[0];
 assert.equal(c.before.passed,false);assert.equal(c.comparison.pairedCount,0);assert.equal(c.comparison.beforePairedRmsMm,null);assert.equal(c.comparison.afterPairedRmsMm,null);
});
test('no request keeps final result but does not manufacture a before-help snapshot',()=>{
 let r=submitRehearsal(placeRehearsal(start(),'a',{xMm:25,yMm:25}));r=advanceRehearsal(r);r=placeRehearsal(r,'a',{xMm:50,yMm:25});r=submitRehearsal(r);
 const result=inspectAssistanceReview(r);assert.equal(result.complete,true);
 assert.equal(result.trials[1].result.results[0].evaluation.errorMm,0);
 assert.deepEqual(result.trials[0].checkpoints,[]);assert.equal(result.trials[0].assistance,'no_targets_requested_in_this_record');
});
test('review and export preserve source and raw history, recompute instead of trusting scores',()=>{
 const r=submitRehearsal(revealRehearsal(start())),snapshot=JSON.stringify(r);
 const parsed=JSON.parse(snapshot);parsed.trials=[{passed:true}];
 assert.deepEqual(createAssistanceReview(parsed),r);assert.equal(inspectAssistanceReview(parsed).trials[0].result.passed,false);
 assert.equal(JSON.stringify(r),snapshot);assert.deepEqual(inspectAssistanceReview(createAssistanceReview(r)),inspectAssistanceReview(r));
});
test('invalid actions and forged placements are refused by producer admission',()=>{
 const r=start();assert.throws(()=>inspectAssistanceReview({...r,events:[{type:'advance'}]}),/Submit/);
 assert.throws(()=>inspectAssistanceReview({...r,events:[{type:'place',id:'a',xMm:Infinity,yMm:0}]}),/finite/);
 assert.throws(()=>inspectAssistanceReview({...r,events:[{type:'submit'},{type:'reveal'}]}),/cannot be revised/);
});
test('worsening after help is retained, not described as improvement',()=>{
 let r=placeRehearsal(start(),'a',{xMm:25,yMm:25});r=revealRehearsal(r);r=placeRehearsal(r,'a',{xMm:40,yMm:25});r=submitRehearsal(r);
 const c=inspectAssistanceReview(r).trials[0].checkpoints[0];assert.equal(c.comparison.rows[0].errorChangeMm,15);assert.equal(c.comparison.afterPairedRmsMm,15);
});
