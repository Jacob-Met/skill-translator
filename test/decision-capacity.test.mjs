import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityFixture,sizedSession,bytes,oversizedSource} from './decision-capacity-fixture.mjs';
import {exportDecisionPractice,importDecisionPractice,createDecisionPractice,MAX_DECISION_PRACTICE_BYTES as limit} from '../src/decision-practice.mjs';
const {source,session}=capacityFixture();
test('supported Unicode account can exceed ordinary download budget without changing shared reducer contracts',()=>{
 assert.equal(session.events.length,95);assert.ok(bytes(session)>limit);
 assert.deepEqual(importDecisionPractice(source,session),session);
 const before=JSON.stringify(session);assert.throws(()=>exportDecisionPractice(source,session),/1 MiB/);assert.equal(JSON.stringify(session),before);
});
test('one byte boundary and formatting-only overflow retain exact original account',()=>{
 for(const size of [limit-1,limit]){const account=sizedSession(session,size),original=JSON.stringify(account);assert.equal(bytes(account),size);assert.ok(bytes(JSON.stringify(account,null,2))>limit);
 const saved=exportDecisionPractice(source,account);assert.equal(saved,original);assert.deepEqual(importDecisionPractice(source,JSON.parse(saved)),account);assert.equal(exportDecisionPractice(source,account,{pretty:false}),original);}
 const tooLarge=sizedSession(session,limit+1);assert.throws(()=>exportDecisionPractice(source,tooLarge),/1 MiB/);
});
test('ordinary small accounts stay readable and preserve source plus history',()=>{const account={...session,events:[]};const text=exportDecisionPractice(source,account);assert.equal(text,JSON.stringify(account,null,2));assert.deepEqual(JSON.parse(text),account);});

test('initial calibrated source can exceed ordinary account budget and is refused without changing it',()=>{const large=oversizedSource(source),before=JSON.stringify(large),account=createDecisionPractice(large);assert.ok(bytes(account)>limit);assert.throws(()=>exportDecisionPractice(large,account),/1 MiB/);assert.equal(JSON.stringify(large),before);});
