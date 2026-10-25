import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeSupportedRules} from '../src/rule-proposals.mjs';
import {createObservation} from '../src/evidence.mjs';
import {createRuleAdoption,compareAdoptionTargets,exportRuleAdoption,importRuleAdoption} from '../src/rule-adoption.mjs';

const source=()=>({title:'Independent dimension course',provenance:'Authored numerical controls, not physical demonstrations',
 source:{widthMm:137,heightMm:89,corners:[{x:0,y:0},{x:137,y:0},{x:137,y:89},{x:0,y:89}]},
 landmarks:[{id:'guide',label:'Guide',kind:'fraction',sourcePx:{x:23,y:31},toleranceMm:2},
 {id:'second',label:'Second',kind:'fraction',sourcePx:{x:91,y:62},toleranceMm:2}]});
function reading(d,id,w,h,x=23,y=31*h/89,landmarkId='guide'){
 return createObservation(d,{id,landmarkId,label:'Separately authored course '+id,evidenceClass:'authored-example',widthMm:w,heightMm:h,xMm:x,yMm:y,uncertaintyMm:.0001});
}
test('unique proposal changes the maintained adaptation at an unfamiliar held-back size',()=>{
 const d=source(),rows=[reading(d,'one',251,113),reading(d,'two',181,157)],before=JSON.stringify({d,rows});
 const result=proposeSupportedRules(d,rows);assert.deepEqual(result.proposals,[{landmarkId:'guide',rule:'left'}]);
 assert.equal(result.marks[0].sensitivity,'retained-after-each-group-omission');
 const adoption=createRuleAdoption(d,rows,result.proposals),target=compareAdoptionTargets(adoption,307,193);
 assert.equal(target.marks[0].after.xMm,23);assert.ok(Math.abs(target.marks[0].after.yMm-31*193/89)<1e-10);
 assert.ok(Math.abs(target.marks[0].before.xMm-23*307/137)<1e-10);assert.equal(target.marks[1].movementMm,0);
 assert.equal(JSON.stringify({d,rows}),before);
 const restored=importRuleAdoption(JSON.parse(JSON.stringify(exportRuleAdoption(adoption))));
 assert.deepEqual(compareAdoptionTargets(restored,307,193),target);
});
test('changed observations change the proposal rather than retaining a hardcoded left rule',()=>{
 const d=source();
 for(const [rule,x,y] of [['fraction',23*251/137,31*113/89],['right',251-(137-23),31*113/89],['top',23*251/137,31],['bottom',23*251/137,113-(89-31)]]){
  const result=proposeSupportedRules(d,[reading(d,'one',251,113,x,y)]);
  assert.deepEqual(result.proposals,[{landmarkId:'guide',rule}]);
 }
});
test('same-size ambiguity, contradiction and untested marks cannot become inferred choices',()=>{
 const d=source();assert.deepEqual(proposeSupportedRules(d,[]).proposals,[]);
 const ambiguous=proposeSupportedRules(d,[reading(d,'one',137,89)]);assert.deepEqual(ambiguous.proposals,[]);assert.equal(ambiguous.marks[0].status,'unresolved');
 const bad=proposeSupportedRules(d,[reading(d,'one',251,113),reading(d,'opposing',251,113,23*251/137)]);
 assert.deepEqual(bad.proposals,[]);assert.equal(bad.marks[0].status,'none-compatible');
});
test('renamed exact numeric copies are withheld together and cannot manufacture omission stability',()=>{
 const d=source(),rows=[reading(d,'one',251,113),reading(d,'copy',251,113)];
 const result=proposeSupportedRules(d,rows).marks[0];
 assert.equal(result.omissions.length,1);assert.deepEqual(result.omissions[0].omittedIds,['one','copy']);
 assert.equal(result.omissions[0].status,'no-evidence');assert.equal(result.sensitivity,'depends-on-retained-groups');
});
test('multi-mark proposals and omission records retain source identity and reject stale anchors',()=>{
 const d=source(),rows=[reading(d,'one',251,113),reading(d,'second',251,113,91*251/137,62,'second')];
 const result=proposeSupportedRules(d,rows);assert.deepEqual(result.proposals,[{landmarkId:'guide',rule:'left'},{landmarkId:'second',rule:'top'}]);
 assert.equal(result.marks[0].omissions[0].remainingCount,0);
 d.landmarks[0].sourcePx.x++;assert.throws(()=>proposeSupportedRules(d,rows),/reference differs/);
});
