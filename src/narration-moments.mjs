// Candidate navigation only. The studio retains original presented frames.
import {createSequence,assertSequenceClip} from './demonstration-sequence.mjs';
import {createNarration,importNarration,parseNarration} from './timed-narration.mjs';
import {requestedFrameTime} from './frame-origin.mjs';
export const NARRATION_PAGE_SIZE=50;
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function createNarrationNavigation(clip,details){
 // Reuse the source-declaration and transcript contract before any frame exists.
 return createNarration(createSequence(clip),details);
}
export function narrationMomentCandidates(navigation,clip,{query='',page=0}={}){
 const accepted=importNarration(navigation?.source,navigation);assertSequenceClip(accepted.source,clip);
 check(typeof query==='string'&&query.length<=200,'Search with at most 200 characters.');
 check(Number.isInteger(page)&&page>=0,'Choose a nonnegative result page.');
 const needle=query.trim().toLowerCase(),all=parseNarration(accepted.transcript);
 const matching=all.filter(c=>c.text.toLowerCase().includes(needle));
 const pages=Math.max(1,Math.ceil(matching.length/NARRATION_PAGE_SIZE));check(page<pages,'That result page is unavailable.');
 function option(kind,seconds){
  try{requestedFrameTime(seconds,clip.durationSeconds);return {kind,seconds,available:true,reason:null};}
  catch(error){return {kind,seconds,available:false,reason:error.message};}
 }
 const cues=matching.slice(page*NARRATION_PAGE_SIZE,(page+1)*NARRATION_PAGE_SIZE).map(c=>{
  const start=c.startSeconds+accepted.offsetSeconds,end=c.endSeconds+accepted.offsetSeconds;
  return {...c,alignedStartSeconds:start,alignedEndSeconds:end,
   options:[option('start',start),option('midpoint',start+(end-start)/2),option('end',end)]};
 });
 return {query,totalCues:all.length,matches:matching.length,page,pages,cues};
}
export function requestedNarrationMoment(navigation,clip,cueIndex,kind){
 check(Number.isInteger(cueIndex)&&cueIndex>=0,'Choose a retained transcript cue.');
 check(['start','midpoint','end'].includes(kind),'Choose start, midpoint or end.');
 const accepted=importNarration(navigation?.source,navigation);assertSequenceClip(accepted.source,clip);
 const cue=parseNarration(accepted.transcript)[cueIndex];check(cue,'That transcript cue is unavailable.');
 const start=cue.startSeconds+accepted.offsetSeconds,end=cue.endSeconds+accepted.offsetSeconds;
 const seconds=kind==='start'?start:kind==='end'?end:start+(end-start)/2;
 requestedFrameTime(seconds,clip.durationSeconds);
 return {cueIndex,kind,requestedSeconds:seconds,transcriptStartSeconds:cue.startSeconds,transcriptEndSeconds:cue.endSeconds};
}
