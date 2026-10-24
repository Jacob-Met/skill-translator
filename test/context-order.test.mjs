import test from 'node:test';import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createPrerequisiteRehearsal,submitPrerequisiteAttempt} from '../src/prerequisite-rehearsal.mjs';
import {createContextOrder as create,importContextOrder as reopen,planContextOrder as plan,MAX_CONTEXT_STEPS} from '../src/context-order.mjs';
function source(count){
 const clip={name:'authored-order-control.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};let s=createSequence(clip,{title:'Authored context control'});
 for(let i=1;i<=7;i++){const image={name:`frame-${i}.png`,mimeType:'image/png',sha256:String(i).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};s=appendMoment(s,{id:`m${i}`,label:`Authored frame ${i}`,image,origin:frameOrigin(clip,i,{mediaTime:i,width:100,height:80},image)});}
 let k=0;for(let a=1;a<=7&&k<count;a++)for(let b=a+1;b<=7&&k<count;b++){s=upsertStep(s,{id:`step-${k}`,title:`Authored step ${k+1}`,beforeMomentId:`m${a}`,afterMomentId:`m${b}`,intent:'Retain a supplied step account'});k++;}return s;
}
function prepared(labels,edges=[]){const s=source(labels.length),ids=s.steps.map(x=>x.id),dependencies=edges.map(([a,b])=>({before:ids[a],after:ids[b],reason:'Authored prerequisite'})),lesson=createPrerequisiteRehearsal(s,dependencies),definitions=ids.map((stepId,i)=>({stepId,context:labels[i],basis:'Authored context-grouping assumption'}));return {s,ids,lesson,definitions,study:create(s,lesson,definitions)};}
function verifyOrder(result,ids,edges,contexts){assert.deepEqual([...result.order].sort(),[...ids].sort());for(const e of edges)assert.ok(result.order.indexOf(e.before)<result.order.indexOf(e.after));let changes=0;for(let i=1;i<result.order.length;i++)changes+=contexts.get(result.order[i-1])!==contexts.get(result.order[i]);assert.equal(changes,result.minimumChanges);assert.equal(result.groups.length-1,result.minimumChanges);assert.deepEqual(result.groups.flatMap(g=>g.stepIds),result.order);}
// Independent exhaustive oracle: no bit masks, DP tables or production helpers.
function oracle(ids,edges,contexts){let minimum=Infinity,count=0;
 function visit(order,used){if(order.length===ids.length){let c=0;for(let i=1;i<order.length;i++)if(contexts.get(order[i-1])!==contexts.get(order[i]))c++;if(c<minimum){minimum=c;count=1;}else if(c===minimum)count++;return;}
  for(const id of ids)if(!used.has(id)&&edges.every(e=>e.after!==id||used.has(e.before)))visit([...order,id],new Set([...used,id]));
 }
 visit([],new Set());return {minimum,count};
}
test('context grouping improves a permitted order; extra prerequisites can remove the improvement',()=>{
 const p=prepared(['X','Y','X','Y'],[[0,2],[1,3]]),r=plan(p.s,p.study);assert.equal(r.minimumChanges,1);assert.equal(r.optimalOrderCount,2);assert.equal(r.sourceList.contextChanges,3);assert.equal(r.fewerChangesThanSourceList,2);verifyOrder(r,p.ids,p.lesson.dependencies,new Map(p.definitions.map(d=>[d.stepId,d.context])));
 const forced=prepared(['X','Y','X','Y'],[[0,1],[1,2],[2,3]]),f=plan(forced.s,forced.study);assert.equal(f.minimumChanges,3);assert.equal(f.optimalOrderCount,1);assert.equal(f.fewerChangesThanSourceList,0);
});
test('single context and single step count no initial setup; exact alternative counts remain visible',()=>{
 const p=prepared(['X','X','X','X'],[[0,2],[1,3]]),r=plan(p.s,p.study);assert.equal(r.minimumChanges,0);assert.equal(r.optimalOrderCount,6);const one=prepared(['X']),o=plan(one.s,one.study);assert.equal(o.minimumChanges,0);assert.equal(o.optimalOrderCount,1);assert.deepEqual(o.order,one.ids);
});
test('a source-listed order violating declared prerequisites is not presented as a valid savings baseline',()=>{
 const p=prepared(['X','Y','X'],[[2,0]]),r=plan(p.s,p.study);assert.equal(r.sourceList.satisfiesDeclarations,false);assert.equal(r.fewerChangesThanSourceList,null);assert.deepEqual(r.sourceList.violations,p.lesson.dependencies);assert.ok(r.order.indexOf(p.ids[2])<r.order.indexOf(p.ids[0]));
});
test('existing first learner attempt is preserved even when it differs from the planned order',()=>{
 const p=prepared(['X','Y'],[[0,1]]),attempt=submitPrerequisiteAttempt(p.s,p.lesson,[p.ids[1],p.ids[0]]),study=create(p.s,attempt,p.definitions),before=JSON.stringify({source:p.s,attempt,study});const r=plan(p.s,study);assert.deepEqual(r.order,p.ids);assert.deepEqual(study.prerequisites.attempt,[p.ids[1],p.ids[0]]);assert.equal(JSON.stringify({source:p.s,attempt,study}),before);assert.deepEqual(reopen(p.s,JSON.parse(JSON.stringify(study))),study);
});
test('context labels are explicit, canonical and case-sensitive; definitions cannot add prerequisites',()=>{
 const p=prepared([' X ','X']);assert.equal(plan(p.s,p.study).minimumChanges,0);assert.deepEqual(create(p.s,p.lesson,[...p.definitions].reverse()),p.study);const different=prepared(['X','x']);assert.equal(plan(different.s,different.study).minimumChanges,1);
 for(const definitions of [[],[p.definitions[0],p.definitions[0]],[{...p.definitions[0],stepId:'unknown'},p.definitions[1]],[{...p.definitions[0],context:''},p.definitions[1]],[{...p.definitions[0],basis:''},p.definitions[1]],[{...p.definitions[0],requires:[]},p.definitions[1]],[{...p.definitions[0],context:'x'.repeat(81)},p.definitions[1]]])assert.throws(()=>create(p.s,p.lesson,definitions));
});
test('source changes, omitted contexts and forged outputs do not replace retained inputs',()=>{
 const p=prepared(['X','Y']),before=JSON.stringify(p.study),forged={...p.study,result:{minimumChanges:0,order:[]}};assert.deepEqual(reopen(p.s,forged),p.study);assert.equal(plan(p.s,forged).minimumChanges,1);
 const missing=structuredClone(p.study);delete missing.contexts;assert.throws(()=>reopen(p.s,missing));const changed=structuredClone(p.study);changed.source.steps[0].intent='Another account';assert.throws(()=>reopen(p.s,changed));const changedPrerequisites=structuredClone(p.study);changedPrerequisites.prerequisites.source.title='Another source';assert.throws(()=>reopen(p.s,changedPrerequisites));assert.equal(JSON.stringify(p.study),before);
});
test('120 permuted-identity DAGs agree with independent complete-permutation optimum and count',()=>{
 let seed=827443;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let trial=0;trial<120;trial++){
  const n=2+Math.floor(random()*6),s=source(n),ids=s.steps.map(x=>x.id),topology=[...ids];for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[topology[i],topology[j]]=[topology[j],topology[i]];}
  const edges=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(random()<.3)edges.push({before:topology[i],after:topology[j],reason:'Authored oracle constraint'});
  const definitions=ids.map(stepId=>({stepId,context:['A','B','C'][Math.floor(random()*3)],basis:'Authored oracle context'})),contexts=new Map(definitions.map(d=>[d.stepId,d.context])),lesson=createPrerequisiteRehearsal(s,edges),actual=plan(s,create(s,lesson,definitions)),expected=oracle(ids,edges,contexts);
  assert.equal(actual.minimumChanges,expected.minimum,`cost case ${trial}`);assert.equal(actual.optimalOrderCount,expected.count,`count case ${trial}`);verifyOrder(actual,ids,edges,contexts);
 }
});
test('sixteen-step exhaustive state bound counts 16! exactly and refuses larger source without dropping steps',()=>{
 assert.equal(MAX_CONTEXT_STEPS,16);const p=prepared(Array.from({length:16},(_,i)=>`Context ${i}`)),r=plan(p.s,p.study);let factorial=1;for(let i=2;i<=16;i++)factorial*=i;assert.equal(r.minimumChanges,15);assert.equal(r.optimalOrderCount,factorial);assert.equal(r.search.statesVisited,524288);assert.equal(r.search.typedArrayBytes,10485760);
 const large=source(17),lesson=createPrerequisiteRehearsal(large),definitions=large.steps.map(s=>({stepId:s.id,context:'X',basis:'Authored bound control'})),before=JSON.stringify({large,lesson});assert.throws(()=>create(large,lesson,definitions),/at most16|at most 16/);assert.equal(JSON.stringify({large,lesson}),before);
});
