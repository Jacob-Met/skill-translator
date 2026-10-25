import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {DECISION_COMPARISON_FORMAT,importDecisionComparison,compareDecisionAccounts,rehearseDecisionExample} from '../src/decision-comparison.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
function source(){let s=createSequence(clip,{title:'Authored explanation'});for(const n of [1,2,3]){const image={name:`frame-${n}.png`,mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};s=appendMoment(s,{id:`moment-${n}`,label:`Moment ${n}`,visibleState:'Authored state',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});}for(const n of [1,2])s=upsertStep(s,{id:`step-${n}`,beforeMomentId:`moment-${n}`,afterMomentId:`moment-${n+1}`,title:`Step ${n}`,intent:'Align the edge',visibleChange:'A visible authored change',sensoryCue:'',recoveryCue:'Pause if the edge drifts'});return s;}

function study(){const a=source(),b=source(); b.clip.sha256='b'.repeat(64);for(const m of b.moments)m.origin.clip.sha256=b.clip.sha256;b.steps[0].sensoryCue='Resistance changes';return {format:DECISION_COMPARISON_FORMAT,examples:[{source:a,stepId:'step-1'},{source:b,stepId:'step-1'}],relationship:'unresolved',explanation:''};}

import {createAccountQuestion,importAccountQuestion,inspectAccountQuestion} from '../src/account-question.mjs';
const input={field:'sensoryCue',exampleIndices:[0,1],judgment:'unresolved',basis:'Only one account supplies a cue',question:'Was resistance also relevant in the first demonstration?'};

import {createAccountReply,inspectAccountReply,importAccountReply} from '../src/account-reply.mjs';
const answer={exampleIndex:0,kind:'explanation',answer:'The first clip omitted the tactile cue from its notes.',suppliedBy:'Declared demonstrator',basis:'Explicit authored test control'};

import {createReplyComparison,importReplyComparison,inspectReplyComparison,selectComparedReply} from '../src/reply-comparison.mjs';
function replies(c,q){return ['Feel resistance increase','Pause when resistance decreases'].map((replacement,i)=>createAccountReply(c,q,{...answer,kind:'proposed-amendment',replacement,authorConfirmed:true,suppliedBy:`Declared author ${i+1}`}));}

import {createAmendmentSet,importAmendmentSet,inspectAmendmentSet} from '../src/amendment-set.mjs';
function fixture(){const c=study();c.relationship='shared';c.explanation='Original declared agreement';const q=createAccountQuestion(c,input),raw=replies(c,q);raw.push(createAccountReply(c,q,{...answer,exampleIndex:1,kind:'withdrawal',authorConfirmed:true}));raw.push(createAccountReply(c,q,answer));return {c,r:createReplyComparison(c,q,raw)};}
test('explicit distinct-example selections produce one source with original frames and unselected alternatives intact',()=>{const {c,r}=fixture(),before=JSON.stringify({c,r}),s=createAmendmentSet(c,r,[0,2]),f=inspectAmendmentSet(c,s);assert.equal(f.amendedComparison.examples[0].source.steps[0].sensoryCue,r.replies[0].replacement);assert.equal(f.amendedComparison.examples[1].source.steps[0].sensoryCue,'');assert.deepEqual(f.amendedComparison.examples.map(e=>e.source.moments),c.examples.map(e=>e.source.moments));assert.equal(f.amendedComparison.relationship,'unresolved');assert.equal(f.source.replies.replies.length,4);assert.equal(JSON.stringify({c,r}),before);assert.deepEqual(importAmendmentSet(c,JSON.parse(JSON.stringify(s))),s);});
test('competing proposals for same example, explanations and malformed selections refuse',()=>{const {c,r}=fixture();for(const selected of [[0,1],[0,3],[0,0],[0],[0,9],Array(2)])assert.throws(()=>createAmendmentSet(c,r,selected));});
test('replay ignores forged output and refuses changed original account',()=>{const {c,r}=fixture(),s=createAmendmentSet(c,r,[2,0]);s.amendedComparison='forged';const f=inspectAmendmentSet(c,s);assert.equal(f.amendedComparison.examples[1].source.steps[0].sensoryCue,'');const changed=structuredClone(c);changed.examples[1].source.steps[0].recoveryCue='Changed';assert.throws(()=>importAmendmentSet(changed,s));});
