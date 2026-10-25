// Explicit sampled correspondences; this is not automatic or continuous tracking.
import {validateSequence,MAX_MOMENTS} from './demonstration-sequence.mjs';
import {validateCapturedDemo} from './capture.mjs';
import {GeometryError} from './geometry.mjs';

export const SEQUENCE_PATH_FORMAT='skill-translator.sequence-path/v1';
export const MAX_PATH_SAMPLES=MAX_MOMENTS;
export const MAX_PATH_BYTES=4_000_000;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const text=(v,label,max)=>{check(typeof v==='string'&&v.trim()&&v.length<=max,`${label} requires text within ${max} characters.`);return v.trim();};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

/** Admission retains the entire original sequence and explicit missing samples. */
export function createSequencePath(sequence,{label,reference,samples}){
 const source=validateSequence(sequence);
 check(reference?.samePlaneAndCorners===true,'Declare a common fixed planar reference and matching corner meanings.');
 const acceptedReference={samePlaneAndCorners:true,label:text(reference.label,'Reference surface',160),basis:text(reference.basis,'Reference basis',1200)};
 check(Array.isArray(samples)&&samples.length>=2&&samples.length<=MAX_PATH_SAMPLES,`Select 2–${MAX_PATH_SAMPLES} retained moments.`);
 const moments=new Map(source.moments.map(m=>[m.id,m])),seen=new Set();
 let dimensions=null;
 const accepted=samples.map(s=>{
  check(s&&moments.has(s.momentId)&&!seen.has(s.momentId),'Select each available retained moment at most once.');seen.add(s.momentId);
  const moment=moments.get(s.momentId);
  check(s.markId===null||typeof s.markId==='string','Explicitly supply a mark identity or null for a missing observation.');
  const basis=text(s.basis,'Correspondence or missing-observation basis',1200);
  if(s.markId!==null){
   check(moment.calibratedTask,'A matched sample needs calibrated annotations at that moment.');
   const calibrated=validateCapturedDemo(moment.calibratedTask);
   check(calibrated.landmarks.some(m=>m.id===s.markId),'A matched mark must belong to its selected retained moment.');
   const size={widthMm:calibrated.source.widthMm,heightMm:calibrated.source.heightMm};
   check(!dimensions||same(dimensions,size),'All matched frames need identical declared planar dimensions; no implicit rescaling is applied.');dimensions=size;
  }
  return {momentId:s.momentId,markId:s.markId,basis};
 }).sort((a,b)=>moments.get(a.momentId).origin.mediaTimeSeconds-moments.get(b.momentId).origin.mediaTimeSeconds);
 for(let i=1;i<accepted.length;i++)check(moments.get(accepted[i].momentId).origin.mediaTimeSeconds>moments.get(accepted[i-1].momentId).origin.mediaTimeSeconds,'Selected retained moments must have distinct increasing presented times.');
 const result={format:SEQUENCE_PATH_FORMAT,sequence:source,label:text(label,'Point correspondence',160),reference:acceptedReference,samples:accepted};
 check(new TextEncoder().encode(JSON.stringify(result)).length<=MAX_PATH_BYTES,'Keep the complete sampled-path account within 4 MB.');
 return result;
}

export function importSequencePath(raw,expectedSequence){
 check(raw?.format===SEQUENCE_PATH_FORMAT,'Open a complete sampled-path account.');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_PATH_BYTES,'Keep the complete sampled-path account within 4 MB.');
 const accepted=createSequencePath(raw.sequence,raw);
 if(expectedSequence!==undefined)check(same(accepted.sequence,validateSequence(expectedSequence)),'The original demonstration changed; reopen with its matching source.');
 return accepted;
}

/** Only adjacent selected known samples contribute chords. Missing samples break continuity. */
export function inspectSequencePath(raw){
 const study=importSequencePath(raw),moments=new Map(study.sequence.moments.map(m=>[m.id,m]));
 const samples=study.samples.map(s=>{
  const moment=moments.get(s.momentId);let position=null,sourcePx=null,markLabel=null;
  if(s.markId!==null){const task=validateCapturedDemo(moment.calibratedTask),mark=task.landmarks.find(m=>m.id===s.markId);position={xMm:mark.uv.u*task.source.widthMm,yMm:mark.uv.v*task.source.heightMm};sourcePx=structuredClone(mark.sourcePx);markLabel=mark.label;}
  check(!position||Object.values(position).every(Number.isFinite),'A sampled position exceeds finite calculation capacity.');
  return {...s,momentLabel:moment.label,presentedSeconds:moment.origin.mediaTimeSeconds,image:structuredClone(moment.image),position,sourcePx,markLabel};
 });
 const segments=samples.slice(1).map((b,i)=>{
  const a=samples[i],elapsedSeconds=b.presentedSeconds-a.presentedSeconds;
  const delta=a.position&&b.position?{xMm:b.position.xMm-a.position.xMm,yMm:b.position.yMm-a.position.yMm}:null;
  const distanceMm=delta?Math.hypot(delta.xMm,delta.yMm):null;
  check(Number.isFinite(elapsedSeconds)&&(!delta||(Object.values(delta).every(Number.isFinite)&&Number.isFinite(distanceMm))),'A sampled segment exceeds finite calculation capacity.');
  return {fromMomentId:a.momentId,toMomentId:b.momentId,elapsedSeconds,delta,distanceMm,status:delta?'observed-chord':'missing-observation'};
 });
 // Homography arithmetic can leave a tiny nonzero chord for coincident authored
 // positions in different camera views. Do not normalize that residue into a
 // confident direction. This is a disclosed numerical-resolution convention,
 // not a physical tolerance or a certified calibration-error bound.
 const known=study.samples.find(s=>s.markId!==null),size=known?moments.get(known.momentId).calibratedTask.source:null;
 const scale=Math.max(1,size?.widthMm??0,size?.heightMm??0,...samples.flatMap(s=>s.position?[Math.abs(s.position.xMm),Math.abs(s.position.yMm)]:[]));
 const numericalLengthGuardMm=64*Number.EPSILON*scale;
 const turns=samples.slice(1,-1).map((sample,i)=>{
  const a=segments[i].delta,b=segments[i+1].delta;
  if(!a||!b)return {momentId:sample.momentId,status:'missing-observation',angleDegrees:null};
  if(Math.hypot(a.xMm,a.yMm)<=numericalLengthGuardMm||Math.hypot(b.xMm,b.yMm)<=numericalLengthGuardMm)return {momentId:sample.momentId,status:'unresolved-short-chord',angleDegrees:null};
  // Normalize before products to avoid overflow on otherwise finite geometry.
  const an=Math.hypot(a.xMm,a.yMm),bn=Math.hypot(b.xMm,b.yMm),ax=a.xMm/an,ay=a.yMm/an,bx=b.xMm/bn,by=b.yMm/bn;
  return {momentId:sample.momentId,status:'observed-turn',angleDegrees:Math.atan2(Math.abs(ax*by-ay*bx),ax*bx+ay*by)*180/Math.PI};
 });
 const complete=samples.every(s=>s.position!==null),coveredChordDistanceMm=segments.reduce((sum,s)=>sum+(s.distanceMm??0),0);
 const first=samples[0].position,last=samples.at(-1).position;
 const endpointDistanceMm=first&&last?Math.hypot(last.xMm-first.xMm,last.yMm-first.yMm):null;
 check(Number.isFinite(coveredChordDistanceMm)&&(endpointDistanceMm===null||Number.isFinite(endpointDistanceMm)),'The sampled-path summary exceeds finite calculation capacity.');
 const selected=new Set(samples.map(s=>s.momentId));
 const unselectedMoments=study.sequence.moments.filter(m=>!selected.has(m.id)).map(m=>({momentId:m.id,label:m.label,presentedSeconds:m.origin.mediaTimeSeconds}));
 return {label:study.label,reference:study.reference,samples,segments,turns,complete,unselectedMoments,numericalLengthGuardMm,
  observedSegmentCount:segments.filter(s=>s.delta!==null).length,coveredChordDistanceMm,sampledPathDistanceMm:complete?coveredChordDistanceMm:null,endpointDistanceMm,
  boundary:'These are chords between explicitly matched annotations in selected retained frames, conditional on the declared common fixed plane and calibrations. Missing samples break the path. Unselected frames and intervening motion remain unobserved. Chord sums and turns are sampled geometry, not measured physical travel, continuous tracking, instantaneous speed, contact, force, efficient technique or skill. Equal endpoints do not imply no intervening motion.'};
}
