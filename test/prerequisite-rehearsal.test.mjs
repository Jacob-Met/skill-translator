import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createPrerequisiteRehearsal as create,importPrerequisiteRehearsal as reopen,submitPrerequisiteAttempt as submit,prerequisiteFindings as findings} from '../src/prerequisite-rehearsal.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
function source(){
  let value=createSequence(clip,{title:'Branching procedure'});
  for(const n of [1,2,3,4,5]){
    const image={name:`frame-${n}.png`,mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};
    value=appendMoment(value,{id:`m${n}`,label:`Moment ${n}`,visibleState:'Authored state',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});
  }
  for(const n of [1,2,3,4])value=upsertStep(value,{id:`s${n}`,beforeMomentId:`m${n}`,afterMomentId:`m${n+1}`,title:`Step ${n}`,intent:'Authored intent',visibleChange:'Authored change',sensoryCue:'',recoveryCue:''});
  return value;
}
const edges=[{before:'s1',after:'s3',reason:'First datum needed'},{before:'s2',after:'s3',reason:'Second datum needed'},{before:'s3',after:'s4',reason:'Assembly before review'}];
test('independent prerequisites allow alternate valid orders without assuming frame chronology',()=>{
  const s=source();
  for(const attempt of [['s1','s2','s3','s4'],['s2','s1','s3','s4']]){
    const result=findings(s,submit(s,create(s,edges),attempt));assert.equal(result.complete,true);assert.equal(result.consistent,true);assert.deepEqual(result.violations,[]);
  }
  assert.equal(findings(s,submit(s,create(s),['s4','s3','s2','s1'])).consistent,true);
});
test('consistent partial prefixes retain missing steps and expose only currently available continuations',()=>{
  const s=source(),base=create(s,edges);
  assert.deepEqual(findings(s,base).availableNext,['s1','s2']);
  const result=findings(s,submit(s,base,['s1']));
  assert.equal(result.complete,false);assert.equal(result.consistent,true);
  assert.deepEqual(result.missing,['s2','s3','s4']);assert.deepEqual(result.availableNext,['s2']);
});
test('reversed and missing prerequisites retain exact reasons and do not offer continuation of an invalid prefix',()=>{
  const s=source(),result=findings(s,submit(s,create(s,edges),['s3','s1']));
  assert.deepEqual(result.violations,[
    {...edges[0],kind:'reversed',beforePosition:1,afterPosition:0},
    {...edges[1],kind:'missing-prerequisite',beforePosition:null,afterPosition:0}
  ]);
  assert.equal(result.consistent,false);assert.equal(result.readyToContinue,false);assert.deepEqual(result.availableNext,[]);
});
test('cycles, duplicate pairs, self-dependency, unknown steps and empty reasons refuse without mutating the source',()=>{
  const s=source(),before=JSON.stringify(s);
  for(const value of [[...edges,{before:'s4',after:'s1',reason:'Cycle'}],[...edges,edges[0]],[{before:'s1',after:'s1',reason:'Self'}],[{before:'missing',after:'s2',reason:'Unknown'}],[{before:'s1',after:'s2',reason:'  '}]])assert.throws(()=>create(s,value));
  assert.equal(JSON.stringify(s),before);
});
test('first attempt stays fixed, reopening recomputes claims, and changed source refuses',()=>{
  const s=source(),base=create(s,edges),record=submit(s,base,['s2','s1','s3','s4']);
  assert.throws(()=>submit(s,record,['s1']));
  assert.deepEqual(reopen(s,JSON.parse(JSON.stringify(record))),record);
  assert.equal(findings(s,{...record,consistent:false}).consistent,true);
  const changed=structuredClone(s);changed.steps[0].intent='Changed account';
  assert.throws(()=>reopen(changed,record));assert.equal(base.attempt,null);
});
test('invalid attempts refuse atomically and an empty submitted prefix remains incomplete',()=>{
  const s=source(),base=create(s,edges),before=JSON.stringify(base);
  for(const value of [['s1','s1'],['unknown'],null,'s1'])assert.throws(()=>submit(s,base,value));
  assert.equal(JSON.stringify(base),before);
  const result=findings(s,submit(s,base,[]));
  assert.equal(result.submitted,true);assert.equal(result.complete,false);assert.deepEqual(result.missing,['s1','s2','s3','s4']);
});

test('reopening requires an explicit prerequisite list and cannot silently erase constraints',()=>{
  const s=source(),record=submit(s,create(s,edges),['s3','s1']);
  const broken=structuredClone(record);delete broken.dependencies;
  assert.throws(()=>reopen(s,broken),/explicitly retained/);
  assert.equal(findings(s,{...record,dependencies:[]}).consistent,true);
});
