/** A prospective affine challenge retaining raw training and outcome annotations. */
import {DEMONSTRATION_RESPONSE_SCHEMA,validateDemonstrationResponse,responseFromDemonstrations} from './response-demonstrations.mjs';
import {freezeAffineChallenge,receiveAffineResult,analyzeAffineChallenge,MAX_AFFINE_CHALLENGE_BYTES} from './affine-challenge.mjs';
export const RAW_AFFINE_CHALLENGE_SCHEMA='skill-translator-raw-affine-challenge/v1';
export const MAX_RAW_AFFINE_CHALLENGE_BYTES=MAX_AFFINE_CHALLENGE_BYTES;
const copy=v=>JSON.parse(JSON.stringify(v));
const fail=m=>{throw Error(m);};
function capacity(value){if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_RAW_AFFINE_CHALLENGE_BYTES)fail('Complete raw challenge exceeds2MB; no annotation is discarded');}
function receive(input){
 if(input?.schema!==RAW_AFFINE_CHALLENGE_SCHEMA)fail('Unsupported raw affine challenge');capacity(input);
 const trainingAccount=validateDemonstrationResponse(input.trainingAccount),training=responseFromDemonstrations(trainingAccount);
 let numeric=freezeAffineChallenge(training,input.plan,input.outcomesNotUsed);
 if(!Array.isArray(input.results)||input.results.length>numeric.plan.length)fail('Retain at most one raw outcome per planned workpiece');
 const ids=new Set(),results=[];
 for(const raw of input.results){
  const planned=numeric.plan.find(p=>p.id===raw?.id);if(!planned||ids.has(raw.id))fail('Each raw outcome must bind one distinct frozen workpiece');ids.add(raw.id);
  if(raw.annotation?.source?.widthMm!==planned.widthMm||raw.annotation?.source?.heightMm!==planned.heightMm)fail('Outcome annotation dimensions differ from the frozen planned workpiece');
  const sourceAccount=validateDemonstrationResponse({schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy:{...training,observations:[]},demonstrations:[raw]});
  const normalized=sourceAccount.demonstrations[0],row=responseFromDemonstrations(sourceAccount).observations[0];
  numeric=receiveAffineResult(numeric,planned.id,row);results.push(normalized);
 }
 const accepted={schema:RAW_AFFINE_CHALLENGE_SCHEMA,trainingAccount,plan:copy(numeric.plan),outcomesNotUsed:true,results};capacity(accepted);
 return {accepted,numeric};
}
export function freezeRawAffineChallenge(trainingAccount,plan,outcomesNotUsed){return receive({schema:RAW_AFFINE_CHALLENGE_SCHEMA,trainingAccount,plan,outcomesNotUsed,results:[]}).accepted;}
export function validateRawAffineChallenge(input){return receive(input).accepted;}
export function receiveRawAffineResult(input,challengeId,annotation){
 const accepted=validateRawAffineChallenge(input);if(!accepted.plan.some(p=>p.id===challengeId))fail('Choose a frozen planned workpiece');
 return validateRawAffineChallenge({...accepted,results:[...accepted.results.filter(r=>r.id!==challengeId),{...annotation,id:challengeId}]});
}
export function removeRawAffineResult(input,challengeId){
 const accepted=validateRawAffineChallenge(input);if(!accepted.plan.some(p=>p.id===challengeId))fail('Choose a frozen planned workpiece');
 return validateRawAffineChallenge({...accepted,results:accepted.results.filter(r=>r.id!==challengeId)});
}
export function analyzeRawAffineChallenge(input){const {accepted,numeric}=receive(input);return {account:accepted,challenge:numeric,analysis:analyzeAffineChallenge(numeric),limitations:[
 'The frozen training account retains its original numeric observations and every additional raw annotation; outcomes never become training observations.',
 'Each outcome retains its own calibration, explicit corresponding mark and coordinate bounds. Derived positions and source bindings are recomputed on reopen.',
 'Replacing or removing an outcome changes the supplied evidence and recomputes the verdict. Only current outcome readings are retained; save previous versions separately.',
 'The unseen-outcomes declaration is user-reported, not a trusted timestamp. Calibration, dimensions, correspondence and discrepancy bounds remain supplied assumptions.',
 'Image metadata alone does not verify attached pixels or measurement accuracy. Original images remain separate and must be reattached for inspection.'
]};}
export function exportRawAffineChallenge(input){return validateRawAffineChallenge(input);}
export function encodeRawAffineChallenge(input){return JSON.stringify(validateRawAffineChallenge(input));}
