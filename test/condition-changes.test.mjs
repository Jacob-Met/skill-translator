import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,placePractice,retryPractice} from '../src/practice.mjs';
import {createConditionSet} from '../src/condition-set.mjs';
import {inspectConditionChanges} from '../src/condition-changes.mjs';
const source={source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[[20,50],[50,50],[50,80]].map(([x,y],i)=>({id:'m'+i,label:'M'+i,kind:'fraction',toleranceMm:2,sourcePx:{x,y}}))};
const conditions=[{id:'length',kind:'pair',rule:{label:'Arm length',basis:'Authored control',from:'m0',to:'m1',kind:'distance',toleranceMm:1}},{id:'guide',kind:'guide',rule:{label:'Third offset',basis:'Authored control',from:'m0',to:'m1',point:'m2',toleranceMm:1}},{id:'angle',kind:'corner',rule:{from:'m0',vertex:'m1',to:'m2',label:'Corner',basis:'Authored control',toleranceDegrees:1}}];
function study(rounds,declared=conditions){let s=createPractice(source,100,100);rounds.forEach((points,r)=>{if(r)s=retryPractice(source,100,100,s);points.forEach(([xMm,yMm],i)=>s=placePractice(source,100,100,s,'m'+i,{xMm,yMm}));});return createConditionSet(source,s,declared);}
test('equal passing totals expose a recovered length and newly failed offset',()=>{
 const raw=study([[[29,50],[50,50],[50,80]],[[20,50],[50,50],[50,71]]]),copy=JSON.stringify(raw),f=inspectConditionChanges(raw,1,2);
 assert.equal(f.before.counts.within,2);assert.equal(f.after.counts.within,2);
 assert.deepEqual(f.conditions.map(c=>c.transition),['entered-tolerance','left-tolerance','unchanged']);
 assert.equal(f.conditions[0].before.observedMm,21);assert.equal(f.conditions[0].after.observedMm,30);
 assert.equal(f.before.practice.passed,false);assert.equal(f.after.practice.passed,false);
 assert.equal(f.learningEstablished,false);assert.equal(JSON.stringify(raw),copy);
 assert.deepEqual(inspectConditionChanges(JSON.parse(copy),1),f);
});
test('missing observations never appear as tolerance improvement',()=>{
 const f=inspectConditionChanges(study([[[20,50],[50,50],[50,80]],[[20,50],[50,50]]]),1);
 assert.deepEqual(f.conditions.map(c=>c.transition),['unchanged','became-unavailable','became-unavailable']);
 assert.equal(f.counts['entered-tolerance'],0);assert.equal(f.after.practice.complete,false);
 const reverse=inspectConditionChanges(study([[[20,50],[50,50]],[[20,50],[50,50],[50,71]]]),1);
 assert.equal(reverse.conditions[1].transition,'became-evaluable');assert.equal(reverse.conditions[1].after.status,'outside');
});
test('collapsed arms, missing arms and reverse comparison retain actual statuses',()=>{
 const raw=study([[[50,50],[50,50],[50,80]],[[50,50],[50,50]]]),f=inspectConditionChanges(raw,1);
 assert.equal(f.conditions[2].before.status,'unresolved');assert.equal(f.conditions[2].after.status,'incomplete');assert.equal(f.conditions[2].transition,'availability-changed');
 const reverse=inspectConditionChanges(raw,2,1);assert.deepEqual(reverse.before,f.after);assert.deepEqual(reverse.after,f.before);
});
test('invalid or same rounds and changed source refuse; imported claims do not control results',()=>{
 const raw=study([[[20,50]],[[21,50]]]);for(const pair of [[0,2],[1,3],[1,1],[1.5,2],[NaN,2]])assert.throws(()=>inspectConditionChanges(raw,...pair));
 const forged=structuredClone(raw);forged.counts={unchanged:100};forged.learningEstablished=true;
 assert.deepEqual(inspectConditionChanges(forged,1),inspectConditionChanges(raw,1));
 forged.source.landmarks[0].toleranceMm=3;assert.throws(()=>inspectConditionChanges(forged,1),/differ/);
});
test('all 21 rounds and 12 conditions remain inspectable; empty criteria remain undeclared',()=>{
 const declared=Array.from({length:12},(_,i)=>({...conditions[i%3],id:'c'+i}));
 const raw=study(Array.from({length:21},(_,i)=>[[20+i/10,50],[50,50],[50,80]]),declared);
 for(let r=1;r<21;r++){const f=inspectConditionChanges(raw,r,21);assert.equal(f.conditions.length,12);assert.equal(Object.values(f.counts).reduce((a,b)=>a+b),12);}
 const empty=inspectConditionChanges(study([[[20,50]],[[21,50]]],[]),1);assert.equal(empty.before.status,'undeclared');assert.equal(empty.after.status,'undeclared');assert.deepEqual(empty.conditions,[]);
});

test('unchanged status retains changed values instead of claiming unchanged performance',()=>{
 const f=inspectConditionChanges(study([[[25,50],[50,50],[50,80]],[[29,50],[50,50],[50,80]]]),1);
 assert.equal(f.conditions[0].transition,'unchanged');assert.equal(f.conditions[0].before.status,'outside');assert.equal(f.conditions[0].after.status,'outside');
 assert.equal(f.conditions[0].before.observedMm,25);assert.equal(f.conditions[0].after.observedMm,21);
 assert.notEqual(f.before.practice.rmsErrorMm,f.after.practice.rmsErrorMm);
});
