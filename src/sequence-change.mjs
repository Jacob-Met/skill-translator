// Compare authored correspondences in two retained, calibrated source states.
// Calibration and identity remain declarations; endpoints do not reveal a path.
import {validateSequence} from './demonstration-sequence.mjs';
import {validateCapturedDemo} from './capture.mjs';
import {GeometryError} from './geometry.mjs';

export const STATE_CHANGE_FORMAT='skill-translator.state-change/v1';
export const MAX_CORRESPONDENCES=30;
const fail=message=>{throw new GeometryError(message);};
const clone=value=>structuredClone(value);
function text(value,label,max){
  if(typeof value!=='string'||!value.trim()||value.length>max)fail(`${label} needs text up to ${max} characters.`);
  return value.trim();
}
function identifier(value,label){
  if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value))fail(`${label} needs a stable identifier.`);
  return value;
}
function endpoints(sequence,stepId){
  const step=sequence.steps.find(s=>s.id===stepId);
  if(!step)fail('Choose an authored step from this demonstration.');
  return {step,before:sequence.moments.find(m=>m.id===step.beforeMomentId),after:sequence.moments.find(m=>m.id===step.afterMomentId)};
}
function calibratedEndpoints(sequence,stepId){
  const value=endpoints(sequence,stepId),{before,after}=value;
  if(!before.calibratedTask||!after.calibratedTask)fail('Attach calibrated annotations to both retained moments in the sequence editor first.');
  const a=validateCapturedDemo(before.calibratedTask),b=validateCapturedDemo(after.calibratedTask);
  if(a.source.widthMm!==b.source.widthMm||a.source.heightMm!==b.source.heightMm)
    fail('A shared reference requires identical supplied width and height in both frames. Correct the source calibrations before comparing.');
  return {...value,beforeDerived:a,afterDerived:b};
}
export function validateStateChange(input){
  if(!input||input.format!==STATE_CHANGE_FORMAT)fail('Unsupported calibrated-state comparison.');
  const sequence=validateSequence(input.sequence),stepId=identifier(input.stepId,'Step');
  endpoints(sequence,stepId);
  if(!Array.isArray(input.pairs)||input.pairs.length>MAX_CORRESPONDENCES)fail(`Keep at most ${MAX_CORRESPONDENCES} declared point correspondences.`);
  let reference=null,source=null;
  if(input.reference!==null){
    if(!input.reference||input.reference.samePlaneAndCorners!==true)fail('Explicitly confirm the same planar reference and matching corner meanings.');
    reference={label:text(input.reference.label,'Reference surface',160),basis:text(input.reference.basis,'Reference identification',1200),samePlaneAndCorners:true};
    source=calibratedEndpoints(sequence,stepId);
  }
  if(input.pairs.length&&!reference)fail('Declare the shared planar reference before pairing points.');
  const ids=new Set(),beforeIds=new Set(),afterIds=new Set();
  const pairs=input.pairs.map(p=>{
    if(!p||typeof p!=='object')fail('A correspondence is missing.');
    const id=identifier(p.id,'Correspondence');if(ids.has(id))fail('Correspondence identifiers must be unique.');ids.add(id);
    const beforeMarkId=p.beforeMarkId,afterMarkId=p.afterMarkId;
    if(typeof beforeMarkId!=='string'||typeof afterMarkId!=='string'||!source.beforeDerived.landmarks.some(m=>m.id===beforeMarkId)||!source.afterDerived.landmarks.some(m=>m.id===afterMarkId))
      fail('Each correspondence must use marks from the selected before and after moments.');
    if(beforeIds.has(beforeMarkId)||afterIds.has(afterMarkId))fail('A source mark can belong to only one declared correspondence.');
    beforeIds.add(beforeMarkId);afterIds.add(afterMarkId);
    return {id,label:text(p.label,'Paired point',160),beforeMarkId,afterMarkId};
  });
  return {format:STATE_CHANGE_FORMAT,sequence,stepId,reference,pairs};
}
export function createStateChange(sequence,stepId){
  return validateStateChange({format:STATE_CHANGE_FORMAT,sequence,stepId,reference:null,pairs:[]});
}
export function declareStateReference(input,reference){
  const state=validateStateChange(input);return validateStateChange({...state,reference:clone(reference)});
}
export function upsertCorrespondence(input,pair){
  const state=validateStateChange(input),index=state.pairs.findIndex(p=>p.id===pair?.id);
  if(index<0)state.pairs.push(clone(pair));else state.pairs[index]=clone(pair);
  return validateStateChange(state);
}
export function removeCorrespondence(input,id){
  const state=validateStateChange(input);
  if(!state.pairs.some(p=>p.id===id))fail('Choose an existing correspondence to remove.');
  state.pairs=state.pairs.filter(p=>p.id!==id);return state;
}
function position(mark,source){return {xMm:mark.uv.u*source.widthMm,yMm:mark.uv.v*source.heightMm};}
export function stateChangeEvidence(input){
  const state=validateStateChange(input);
  if(!state.reference)fail('Declare the shared planar reference before comparing states.');
  const {step,before,after,beforeDerived:a,afterDerived:b}=calibratedEndpoints(state.sequence,state.stepId);
  const pairs=state.pairs.map(pair=>{
    const am=a.landmarks.find(m=>m.id===pair.beforeMarkId),bm=b.landmarks.find(m=>m.id===pair.afterMarkId);
    const beforePosition=position(am,a.source),afterPosition=position(bm,b.source);
    const dxMm=afterPosition.xMm-beforePosition.xMm,dyMm=afterPosition.yMm-beforePosition.yMm;
    return {...pair,before:{...beforePosition,sourcePx:clone(am.sourcePx),markLabel:am.label},after:{...afterPosition,sourcePx:clone(bm.sourcePx),markLabel:bm.label},dxMm,dyMm,endpointDistanceMm:Math.hypot(dxMm,dyMm)};
  });
  return {step:clone(step),reference:clone(state.reference),widthMm:a.source.widthMm,heightMm:a.source.heightMm,
    beforeMomentId:before.id,afterMomentId:after.id,beforePresentedSeconds:before.origin.mediaTimeSeconds,afterPresentedSeconds:after.origin.mediaTimeSeconds,
    frameIntervalSeconds:after.origin.mediaTimeSeconds-before.origin.mediaTimeSeconds,pairs,
    unpaired:{before:a.landmarks.filter(m=>!state.pairs.some(p=>p.beforeMarkId===m.id)).map(m=>({id:m.id,label:m.label})),
      after:b.landmarks.filter(m=>!state.pairs.some(p=>p.afterMarkId===m.id)).map(m=>({id:m.id,label:m.label}))},
    boundary:'Positions depend on the supplied planar calibrations, common-reference declaration and explicit point identities. Connecting endpoints does not establish the intervening path, object tracking, instantaneous speed, contact, force or physical necessity.'};
}
export function separationChange(input,firstId,secondId){
  const evidence=stateChangeEvidence(input),first=evidence.pairs.find(p=>p.id===firstId),second=evidence.pairs.find(p=>p.id===secondId);
  if(!first||!second||first===second)fail('Choose two distinct declared correspondences.');
  const separation=(a,b)=>({horizontalMm:b.xMm-a.xMm,verticalMm:b.yMm-a.yMm,distanceMm:Math.hypot(b.xMm-a.xMm,b.yMm-a.yMm)});
  const before=separation(first.before,second.before),after=separation(first.after,second.after);
  return {firstId,secondId,before,after,change:Object.fromEntries(Object.keys(before).map(k=>[k,after[k]-before[k]]))};
}
export function stateChangeSettings(input){
  const {format,stepId,reference,pairs}=validateStateChange(input);return {format,stepId,reference,pairs};
}
