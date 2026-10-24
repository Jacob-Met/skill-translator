import test from 'node:test';
import assert from 'node:assert/strict';
import {RESPONSE_SCHEMA,createResponseObservation} from '../src/response-family.mjs';
import {MAX_AFFINE_CHALLENGE_BYTES,freezeAffineChallenge,receiveAffineResult,exportAffineChallenge,encodeAffineChallenge,validateAffineChallenge} from '../src/affine-challenge.mjs';
const plan=[{id:'challenge-a',label:'New size',widthMm:110,heightMm:80}];
const reading={label:'Authored result',evidenceClass:'authored-example',xMm:20,yMm:30,xBoundMm:0,yBoundMm:0};
function training(padding=0){
 const source={provenance:'p'.repeat(padding)||'Authored fixture',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'mark',label:'Mark',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:1}]};
 return {schema:RESPONSE_SCHEMA,source,landmarkId:'mark',coefficientLimit:2,target:{widthMm:100,heightMm:80},observations:[createResponseObservation(source,'mark',{...reading,id:'train',widthMm:100,heightMm:80})]};
}
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
test('expanded source binding refuses an oversized result before mutating accepted account',()=>{
 const frozen=freezeAffineChallenge(training(900000),plan,true),before=encodeAffineChallenge(frozen);
 assert.ok(bytes(frozen)<MAX_AFFINE_CHALLENGE_BYTES);
 assert.throws(()=>receiveAffineResult(frozen,'challenge-a',reading),/exceeds2MB/);
 assert.equal(encodeAffineChallenge(frozen),before);assert.equal(frozen.results.length,0);
 assert.deepEqual(validateAffineChallenge(JSON.parse(before)),frozen);
});
test('exact-boundary compact download reopens, pretty encoding would exceed capacity',()=>{
 const base=freezeAffineChallenge(training(1),plan,true),needed=MAX_AFFINE_CHALLENGE_BYTES-bytes(base);
 const exact=freezeAffineChallenge(training(1+Math.floor(needed/2)),plan,true);
 if(needed%2)exact.plan[0].label+='x';
 assert.equal(bytes(exact),MAX_AFFINE_CHALLENGE_BYTES);
 const emitted=encodeAffineChallenge(exact);assert.equal(new TextEncoder().encode(emitted).length,MAX_AFFINE_CHALLENGE_BYTES);
 assert.ok(new TextEncoder().encode(JSON.stringify(exact,null,2)).length>MAX_AFFINE_CHALLENGE_BYTES);
 assert.deepEqual(validateAffineChallenge(JSON.parse(emitted)),exact);
 const tooLarge=structuredClone(exact);tooLarge.plan[0].label+='x';assert.throws(()=>exportAffineChallenge(tooLarge),/exceeds2MB/);
});
test('normal results round-trip while oversized freeze and imported accounts refuse',()=>{
 const frozen=freezeAffineChallenge(training(),plan,true),received=receiveAffineResult(frozen,'challenge-a',reading);
 assert.equal(JSON.parse(encodeAffineChallenge(received)).results.length,1);assert.equal(frozen.results.length,0);
 assert.throws(()=>freezeAffineChallenge(training(1100000),plan,true),/exceeds2MB/);
 const enlarged=structuredClone(received);enlarged.extra='x'.repeat(MAX_AFFINE_CHALLENGE_BYTES);assert.throws(()=>validateAffineChallenge(enlarged),/exceeds2MB/);
});
