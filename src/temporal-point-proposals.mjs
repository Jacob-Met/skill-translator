import {validateSequence,attachMomentCalibration} from './demonstration-sequence.mjs';
import {appendCaptureMark} from './capture.mjs';
import {createSequencePath} from './sequence-path.mjs';
import {initialChoices as initial,correctChoice as correct,validateChoices} from './temporal-choice-state.mjs';
export const FORMAT='skill-translator.temporal-point-proposals/v1';
const check=(ok,m)=>{if(!ok)throw Error(m);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const point=(p,image)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<image.widthPx&&p.y<image.heightPx;
export function validateQuery(raw){
 check(raw?.sourceBundle?.format==='skill-translator.sequence-bundle/v1','Complete original sequence bundle required');
 const sequence=validateSequence(raw.sourceBundle.sequence),query=raw.query,ids=query?.momentIds;
 check(Array.isArray(ids)&&ids.length>=2&&ids.length<=12&&new Set(ids).size===ids.length,'Select2–12 unique original moments');
 const moments=ids.map(id=>sequence.moments.find(m=>m.id===id));check(moments.every(Boolean),'Original moment missing');
 check(moments.every((m,i)=>!i||m.origin.mediaTimeSeconds>moments[i-1].origin.mediaTimeSeconds),'Selected time order differs');
 const a=query.anchor;check(a?.momentId===ids[0]&&point(a.sourcePx,moments[0].image),'Supply continuous first-frame anchor');
 check(a.patchCenterIndex?.x===Math.floor(a.sourcePx.x)&&a.patchCenterIndex?.y===Math.floor(a.sourcePx.y),'Containing pixel differs from continuous anchor');
 return {sequence,query:structuredClone(query),moments};
}
function candidate(match){
 check(match?.status==='suggested'&&Array.isArray(match.candidates)&&match.candidates.length>=2,'Retain suggested candidates and alternatives');
 const c=match.candidates;
 check(c.every((v,i)=>Number.isInteger(v.dx)&&Number.isInteger(v.dy)&&Math.abs(v.dx)<=6&&Math.abs(v.dy)<=6&&Number.isFinite(v.score)&&(!i||c[i-1].score>=v.score)),'Candidate values or order differ');
 check(Math.max(Math.abs(c[0].dx),Math.abs(c[0].dy))<6&&c[0].score<=1&&c[0].score>=.8&&c[0].score-c[1].score>=.08&&match.margin===c[0].score-c[1].score,'Candidate score, margin or search boundary insufficient');return c[0];
}
export function receiveTemporalProposal(raw){
 check(raw?.format===FORMAT,'Open temporal proposal report');check(new TextEncoder().encode(JSON.stringify(raw)).length<=48*1024*1024,'Report exceeds48MiB');
 const admitted=validateQuery(raw),{moments,query}=admitted;
 check(raw.settings?.decodeProfile==='grayscale-probe'&&raw.settings.feature==='gradient'&&raw.settings.patchRadius===4&&raw.settings.searchRadius===6&&raw.settings.minScore===.8&&raw.settings.minMargin===.08&&raw.settings.cycleResidualPixels===0,'Unsupported supplied matching settings');
 check(Array.isArray(raw.rows)&&raw.rows.length===moments.length,'Every selected original needs a row');let previous=query.anchor.patchCenterIndex,stopped=false;
 for(let i=0;i<moments.length;i++){
  const m=moments[i],r=raw.rows[i];check(r?.momentId===m.id&&same(r.image,m.image)&&same(r.origin,m.origin)&&r.presentedSeconds===m.origin.mediaTimeSeconds,'Original row identity differs');
  if(!i){check(r.status==='authored-anchor'&&same(r.sourcePx,query.anchor.sourcePx)&&same(r.patchCenterIndex,previous),'Authored anchor differs');continue;}
  if(stopped){check(r.status==='unresolved-predecessor'&&r.sourcePx===null,'Unresolved predecessor must retire chain');continue;}
  if(r.status!=='suggested'){check(r.sourcePx===null,'Unresolved row cannot supply a point');stopped=true;continue;}
  const f=candidate(r.forward),b=candidate(r.reverse),q={x:previous.x+f.dx,y:previous.y+f.dy};
  check(q.x+b.dx===previous.x&&q.y+b.dy===previous.y&&r.cycleResidualPixels===0,'Reverse cycle differs');
  const p={x:query.anchor.sourcePx.x+(q.x-query.anchor.patchCenterIndex.x),y:query.anchor.sourcePx.y+(q.y-query.anchor.patchCenterIndex.y)};
  check(point(p,m.image)&&same(r.sourcePx,p)&&same(r.patchCenterIndex,q),'Continuous displacement differs');previous=q;
 }
 return {...admitted,report:structuredClone(raw)};
}
export function initialChoices(raw){return initial(receiveTemporalProposal(raw).report.rows);}
export function correctChoice(raw,choices,id,p,basis){const a=receiveTemporalProposal(raw),m=a.moments.find(m=>m.id===id);check(m&&(p===null||point(p,m.image)),'Correction lies outside original');return correct(a.report.rows,choices,id,p,basis);}
export function acceptTrace(raw,choices,{reviewedOriginalFrames,annotation,reference}){
 const a=receiveTemporalProposal(raw);check(reviewedOriginalFrames===true,'Review every original frame and semantic continuity');const selected=validateChoices(a.report.rows,choices);let sequence=a.sequence;const samples=[];
 for(let i=0;i<selected.length;i++){
  const c=selected[i],m=a.moments[i];let markId=null;
  if(c.sourcePx&&m.calibratedTask){check(point(c.sourcePx,m.image),'Point lies outside original');const result=appendCaptureMark(m.calibratedTask,{...annotation,sourcePx:c.sourcePx});const task=result.demo??result;markId=task.landmarks.at(-1).id;sequence=attachMomentCalibration(sequence,m.id,task);}
  samples.push({momentId:m.id,markId,basis:c.basis});
 }
 return createSequencePath(sequence,{label:annotation.label,reference,samples});
}
