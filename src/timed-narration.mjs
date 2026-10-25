import {parseSubtitles} from '../vendor/captionverse/subtitles.mjs';
// Timed narration is supplied testimony, not a measured sensory signal.
import {validateSequence,upsertStep} from './demonstration-sequence.mjs';
import {GeometryError} from './geometry.mjs';
export const NARRATION_FORMAT='skill-translator.timed-narration/v1';
export const MAX_TRANSCRIPT_BYTES=256*1024;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
// CAPTIONVERSE owns subtitle syntax, timing and declared producer provenance.
// The local adapter retains literal payloads rather than its display flattening.
function readNarration(raw){
 check(typeof raw==='string'&&new TextEncoder().encode(raw).length<=MAX_TRANSCRIPT_BYTES,'Choose WebVTT text up to 256 KiB.');
 const admitted=parseSubtitles(raw);
 check(admitted.format==='vtt','The transcript needs a WEBVTT header and blank line.');
 const normalized=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 const blocks=normalized.split(/\n[ \t]*\n+/);blocks.shift();
 const cues=[];let previous=-1;
 for(const block of blocks){
  const lines=block.split('\n');
  if(/^NOTE(?:[ \t]|$)/.test(lines[0]))continue;
  check(!/^(STYLE|REGION)[ \t]*$/.test(lines[0]),'WebVTT styling and regions are unsupported; provide plain cue text.');
  let id=null;const first=lines.shift();
  if(!first.includes('-->')){id=first;lines.shift();check(id.length<=160,'Cue identifiers must fit 160 characters.');}
  const accepted=admitted.cues[cues.length];check(accepted,'Every narration cue needs a valid timing line.');
  const start=accepted.start,end=accepted.end,text=lines.join('\n');
  check(start>=previous,'Narration cue starts must be in time order.');previous=start;
  check(end<=21600,'Narration timestamps exceed six hours.');
  check(text.trim()&&text.length<=2000,'Each literal narration cue needs text up to 2000 characters.');
  cues.push({index:cues.length,id,startSeconds:start,endSeconds:end,text});
  check(cues.length<=1000,'Keep at most 1000 narration cues.');
 }
 check(cues.length===admitted.cues.length,'Literal cue custody does not match admitted subtitles.');
 return {cues,provenance:admitted.provenance};
}
export function parseNarration(raw){return readNarration(raw).cues;}
export function createNarration(sequence,{text,attribution,offsetSeconds=0}){
 const source=validateSequence(sequence);
 check(typeof attribution==='string'&&attribution.trim()&&attribution.length<=1200,'Describe who supplied the transcript and its basis, up to 1200 characters.');
 check(typeof offsetSeconds==='number'&&Number.isFinite(offsetSeconds)&&Math.abs(offsetSeconds)<=10800,'Declare a finite timing offset within three hours.');
 const parsed=readNarration(text);
 if(parsed.provenance)check(parsed.provenance.sourceSha256===source.clip.sha256,'The CAPTIONVERSE declared source digest does not match this demonstration clip.');
 return {format:NARRATION_FORMAT,source,transcript:text,attribution:attribution.trim(),offsetSeconds,selections:[]};
}
export function importNarration(sequence,value){
 check(value?.format===NARRATION_FORMAT,'Unsupported timed-narration record.');
 const accepted=createNarration(sequence,{text:value.transcript,attribution:value.attribution,offsetSeconds:value.offsetSeconds});
 check(same(accepted.source,validateSequence(value.source)),'The source demonstration changed; pair the matching original sequence.');
 check(Array.isArray(value.selections)&&value.selections.length<=48,'Keep at most 48 narration selections.');
 for(const selection of value.selections){
  check(selection&&['sensoryCue','recoveryCue','visibleChange','intent'].includes(selection.field),'Choose an authored account field.');
  check(!accepted.selections.some(s=>s.stepId===selection.stepId&&s.field===selection.field),'Keep one selection per step and field.');
  const found=narrationForStep(accepted,selection.stepId);
  check(Array.isArray(selection.cueIndices)&&selection.cueIndices.length>0&&selection.cueIndices.length<=20&&new Set(selection.cueIndices).size===selection.cueIndices.length,'Choose 1–20 distinct narration cues.');
  check(selection.cueIndices.every(i=>Number.isInteger(i)&&found.cues.some(c=>c.index===i)),'Selected narration must overlap this step on the declared timeline.');
  accepted.selections.push({stepId:selection.stepId,field:selection.field,cueIndices:[...selection.cueIndices].sort((a,b)=>a-b)});
 }
 buildNarratedSequence(accepted);return accepted;
}
export function narrationForStep(study,stepId){
 const step=study.source.steps.find(s=>s.id===stepId);check(step,'Choose an authored demonstration step.');
 const start=study.source.moments.find(m=>m.id===step.beforeMomentId).origin.mediaTimeSeconds;
 const end=study.source.moments.find(m=>m.id===step.afterMomentId).origin.mediaTimeSeconds;
 const all=parseNarration(study.transcript).map(c=>({...c,alignedStartSeconds:c.startSeconds+study.offsetSeconds,alignedEndSeconds:c.endSeconds+study.offsetSeconds}));
 return {step,startSeconds:start,endSeconds:end,cues:all.filter(c=>c.alignedStartSeconds<end&&c.alignedEndSeconds>start),
  outsideClip:all.filter(c=>c.alignedStartSeconds<0||c.alignedEndSeconds>study.source.clip.durationSeconds).map(c=>c.index)};
}
export function selectNarration(sequence,study,{stepId,field,cueIndices}){
 const accepted=importNarration(sequence,study);
 check(['sensoryCue','recoveryCue','visibleChange','intent'].includes(field),'Choose an authored account field.');
 narrationForStep(accepted,stepId);
 check(Array.isArray(cueIndices),'Choose an array of narration cues.');
 accepted.selections=accepted.selections.filter(s=>s.stepId!==stepId||s.field!==field);
 if(cueIndices.length)accepted.selections.push({stepId,field,cueIndices});
 return importNarration(sequence,accepted);
}
export function deriveNarratedSequence(study){return buildNarratedSequence(importNarration(study?.source,study));}
function buildNarratedSequence(study){
 let source=validateSequence(study.source);const cues=parseNarration(study.transcript);
 for(const selection of study.selections){
  const step=source.steps.find(s=>s.id===selection.stepId);
  check(step,'Choose an authored demonstration step.');
  const quotes=selection.cueIndices.map(i=>{const c=cues[i];check(c,'Selected cue is unavailable.');return '['+c.startSeconds+'–'+c.endSeconds+' s transcript] '+c.text;}).join('\n');
  source=upsertStep(source,{...step,[selection.field]:[step[selection.field],'Supplied narration ('+study.attribution+'; offset '+study.offsetSeconds+' s):\n'+quotes].filter(Boolean).join('\n\n')});
 }
 return source;
}
