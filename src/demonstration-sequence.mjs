// An authored account of changes between retained source frames. Timestamps and
// images are observations; intent, sensory cues and recovery notes are supplied.
import {clipIdentity,validateFrameOrigin} from './frame-origin.mjs';
import {imageMetadata} from './capture.mjs';
import {GeometryError} from './geometry.mjs';
import {bindMomentCapture} from './sequence-capture.mjs';
import {exportCapture} from './capture-editing.mjs';

export const SEQUENCE_FORMAT='skill-translator.demonstration-sequence/v1';
export const CALIBRATED_SEQUENCE_FORMAT='skill-translator.demonstration-sequence/v2';
export const MAX_MOMENTS=12;
export const MAX_STEPS=24;
export const MAX_SEQUENCE_PIXELS=32_000_000;
const fail=message=>{throw new GeometryError(message);};
function record(value,label){if(!value||typeof value!=='object'||Array.isArray(value))fail(`${label} is missing.`);return value;}
function text(value,label,limit,required=false){
  if(typeof value!=='string'||value.length>limit||(required&&!value.trim()))fail(`${label} must ${required?'contain text and ':''}fit within ${limit} characters.`);
  return value.trim();
}
function id(value,label){if(typeof value!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value))fail(`${label} needs a stable short identifier.`);return value;}
function sameClip(a,b){return ['sha256','mimeType','sizeBytes','durationSeconds'].every(key=>a[key]===b[key]);}
export function assertSequenceClip(sequence,supplied){
  const expected=clipIdentity(sequence.clip),actual=clipIdentity(supplied);
  if(!sameClip(expected,actual))fail('This clip does not match the original demonstration. Choose the original file or start a new sequence.');
  return true;
}
function moment(value,clip){
  record(value,'Moment');const image=imageMetadata(value.image);
  if(image.mimeType!=='image/png')fail('Retained demonstration frames must be original extracted PNG files.');
  const origin=validateFrameOrigin(value.origin,image);
  if(!sameClip(clip,origin.clip))fail('Every retained moment must come from the same source clip.');
  const accepted={id:id(value.id,'Moment'),label:text(value.label,'Moment label',120,true),
    visibleState:text(value.visibleState??'','Visible state',1600),image,origin};
  if(Object.hasOwn(value,'calibratedTask'))accepted.calibratedTask=bindMomentCapture(accepted,value.calibratedTask);
  return accepted;
}
function step(value,moments){
  record(value,'Step');const beforeMomentId=id(value.beforeMomentId,'Before moment'),afterMomentId=id(value.afterMomentId,'After moment');
  const before=moments.get(beforeMomentId),after=moments.get(afterMomentId);
  if(!before||!after)fail('Each step must reference two retained source moments.');
  if(after.origin.mediaTimeSeconds<=before.origin.mediaTimeSeconds)fail('A step must end after its before frame was actually presented.');
  return {id:id(value.id,'Step'),beforeMomentId,afterMomentId,title:text(value.title,'Step title',160,true),
    intent:text(value.intent,'Intended result',1800,true),visibleChange:text(value.visibleChange??'','Visible change',1800),
    sensoryCue:text(value.sensoryCue??'','Supplied sensory cue',1800),recoveryCue:text(value.recoveryCue??'','Recovery cue',1800)};
}
export function validateSequence(value){
  record(value,'Demonstration sequence');if(![SEQUENCE_FORMAT,CALIBRATED_SEQUENCE_FORMAT].includes(value.format))fail('Unsupported demonstration sequence format.');
  const clip=clipIdentity(value.clip);
  if(!Array.isArray(value.moments)||value.moments.length>MAX_MOMENTS)fail(`Keep at most ${MAX_MOMENTS} source moments.`);
  if(!Array.isArray(value.steps)||value.steps.length>MAX_STEPS)fail(`Keep at most ${MAX_STEPS} authored steps.`);
  const moments=value.moments.map(v=>moment(v,clip));const byId=new Map();let previous=-1,pixels=0;
  if(value.format===SEQUENCE_FORMAT&&moments.some(m=>m.calibratedTask))fail('Calibrated moments require the v2 sequence format so older readers cannot silently discard their tasks.');
  for(const m of moments){
    if(byId.has(m.id))fail('Moment identifiers must be unique.');
    if(m.origin.mediaTimeSeconds<=previous)fail('Retained moments must have distinct, increasing presented times.');
    previous=m.origin.mediaTimeSeconds;byId.set(m.id,m);pixels+=m.image.widthPx*m.image.heightPx;
  }
  if(pixels>MAX_SEQUENCE_PIXELS)fail('Retained frames exceed the 32 megapixel sequence budget.');
  const steps=value.steps.map(v=>step(v,byId));const stepIds=new Set();let previousStart=-1;
  for(const s of steps){
    if(stepIds.has(s.id))fail('Step identifiers must be unique.');stepIds.add(s.id);
    const start=byId.get(s.beforeMomentId).origin.mediaTimeSeconds;
    if(start<previousStart)fail('Authored steps must be ordered by their before-frame times.');previousStart=start;
  }
  return {format:value.format,title:text(value.title,'Demonstration title',160,true),
    context:text(value.context??'','Expert context',2400),clip,moments,steps};
}
export function createSequence(clip,details={}){
  return validateSequence({format:SEQUENCE_FORMAT,title:details.title||'A task explained through its changes',context:details.context||'',clip,moments:[],steps:[]});
}
export function appendMoment(sequence,input){
  const next=validateSequence(sequence);const added=moment(input,next.clip);
  next.moments.push(added);next.moments.sort((a,b)=>a.origin.mediaTimeSeconds-b.origin.mediaTimeSeconds);
  return validateSequence(next);
}
export function editMoment(sequence,momentId,patch){
  const next=validateSequence(sequence),target=next.moments.find(m=>m.id===momentId);
  if(!target)fail('That retained moment is unavailable.');
  for(const key of ['label','visibleState'])if(Object.hasOwn(patch,key))target[key]=patch[key];
  return validateSequence(next);
}
export function attachMomentCalibration(sequence,momentId,input){
  const next=validateSequence(sequence),target=next.moments.find(m=>m.id===momentId);
  if(!target)fail('That retained moment is unavailable.');
  target.calibratedTask=bindMomentCapture(target,input);next.format=CALIBRATED_SEQUENCE_FORMAT;
  return validateSequence(next);
}
export function removeMomentCalibration(sequence,momentId){
  const next=validateSequence(sequence),target=next.moments.find(m=>m.id===momentId);
  if(!target?.calibratedTask)fail('Choose a moment with attached calibrated annotations.');
  delete target.calibratedTask;return validateSequence(next);
}
export function momentTask(sequence,momentId){
  const accepted=validateSequence(sequence),target=accepted.moments.find(m=>m.id===momentId);
  if(!target?.calibratedTask)fail('Attach calibrated annotations for this moment first.');
  const task=structuredClone(target.calibratedTask);
  task.sequenceContext={format:'skill-translator.moment-task-context/v1',title:accepted.title,context:accepted.context,
    moment:{id:target.id,label:target.label,visibleState:target.visibleState,origin:target.origin},
    steps:accepted.steps.filter(s=>s.beforeMomentId===target.id||s.afterMomentId===target.id).map(s=>({...s,
      role:s.beforeMomentId===target.id?'before':'after',
      beforePresentedSeconds:accepted.moments.find(m=>m.id===s.beforeMomentId).origin.mediaTimeSeconds,
      afterPresentedSeconds:accepted.moments.find(m=>m.id===s.afterMomentId).origin.mediaTimeSeconds})),
    boundary:'This task practices the supplied geometric relationships of one retained state. It does not assess the full action, force, sensory judgment, recovery or mastery of the demonstration.'};
  // Context is retained completely or refused, never truncated to fit a handoff.
  exportCapture(task);return task;
}
export function removeMoment(sequence,momentId){
  const next=validateSequence(sequence);
  if(next.steps.some(s=>s.beforeMomentId===momentId||s.afterMomentId===momentId))fail('Remove or revise the steps using this moment before deleting it.');
  if(!next.moments.some(m=>m.id===momentId))fail('That retained moment is unavailable.');
  next.moments=next.moments.filter(m=>m.id!==momentId);return validateSequence(next);
}
export function upsertStep(sequence,input){
  const next=validateSequence(sequence),byId=new Map(next.moments.map(m=>[m.id,m]));const added=step(input,byId);
  const index=next.steps.findIndex(s=>s.id===added.id);if(index<0)next.steps.push(added);else next.steps[index]=added;
  next.steps.sort((a,b)=>byId.get(a.beforeMomentId).origin.mediaTimeSeconds-byId.get(b.beforeMomentId).origin.mediaTimeSeconds);
  return validateSequence(next);
}
export function removeStep(sequence,stepId){
  const next=validateSequence(sequence);if(!next.steps.some(s=>s.id===stepId))fail('That authored step is unavailable.');
  next.steps=next.steps.filter(s=>s.id!==stepId);return next;
}
export function sequenceFindings(sequence){
  const accepted=validateSequence(sequence),byId=new Map(accepted.moments.map(m=>[m.id,m])),used=new Set();
  const steps=accepted.steps.map(s=>{
    const before=byId.get(s.beforeMomentId),after=byId.get(s.afterMomentId);used.add(before.id);used.add(after.id);
    return {id:s.id,startSeconds:before.origin.mediaTimeSeconds,endSeconds:after.origin.mediaTimeSeconds,
      elapsedSeconds:after.origin.mediaTimeSeconds-before.origin.mediaTimeSeconds,
      missingAccount:['visibleChange','sensoryCue','recoveryCue'].filter(key=>!s[key])};
  });
  const overlappingSteps=[];
  for(let i=0;i<steps.length;i++)for(let j=i+1;j<steps.length;j++)if(Math.max(steps[i].startSeconds,steps[j].startSeconds)<Math.min(steps[i].endSeconds,steps[j].endSeconds))overlappingSteps.push([steps[i].id,steps[j].id]);
  return {steps,unassignedMoments:accepted.moments.filter(m=>!used.has(m.id)).map(m=>m.id),overlappingSteps,
    timing:accepted.moments.map(m=>({id:m.id,requestedSeconds:m.origin.requestedTimeSeconds,presentedSeconds:m.origin.mediaTimeSeconds,offsetSeconds:m.origin.mediaTimeSeconds-m.origin.requestedTimeSeconds})),
    boundary:'Frame timing and visible pixels do not establish intended contact, force, causal necessity, physical success or learner mastery. Notes are supplied by the author.'};
}
