// Candidate navigation only. The studio retains original presented frames.
import {createSequence,assertSequenceClip} from './demonstration-sequence.mjs';
import {createNarration,importNarration,parseNarration} from './timed-narration.mjs';
import {requestedFrameTime} from './frame-origin.mjs';
import {inspectNarrationClock,mapNarrationTime} from './narration-clock.mjs';
export const NARRATION_PAGE_SIZE=50;
export const CLOCK_NAVIGATION_FORMAT='skill-translator.narration-clock-navigation/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function createNarrationNavigation(clip,details){
 const narration=createNarration(createSequence(clip),details);
 if(details.clock===undefined||details.clock===null)return narration;
 check(narration.offsetSeconds===0,'Use zero offset with a declared clock mapping.');
 return {format:CLOCK_NAVIGATION_FORMAT,narration,clock:inspectNarrationClock(details.clock,clip.durationSeconds).clock};
}
export function importNarrationNavigation(value,clip){
 if(value?.format!==CLOCK_NAVIGATION_FORMAT){const accepted=importNarration(value?.source,value);assertSequenceClip(accepted.source,clip);return accepted;}
 const narration=importNarration(value.narration?.source,value.narration);assertSequenceClip(narration.source,clip);
 check(narration.offsetSeconds===0,'Use zero offset with a declared clock mapping.');
 return {format:CLOCK_NAVIGATION_FORMAT,narration,clock:inspectNarrationClock(value.clock,clip.durationSeconds).clock};
}
export function narrationNavigationSource(value){return value?.format===CLOCK_NAVIGATION_FORMAT?value.narration:value;}
function aligned(value,clip,seconds){return value.format===CLOCK_NAVIGATION_FORMAT?mapNarrationTime(value.clock,clip.durationSeconds,seconds):{seconds:seconds+value.offsetSeconds,extrapolated:false};}
export function narrationMomentCandidates(navigation,clip,{query='',page=0}={}){
 const value=importNarrationNavigation(navigation,clip),accepted=narrationNavigationSource(value);
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
  const first=aligned(value,clip,c.startSeconds),last=aligned(value,clip,c.endSeconds),start=first.seconds,end=last.seconds;
  return {...c,alignedStartSeconds:start,alignedEndSeconds:end,
   ...(value.format===CLOCK_NAVIGATION_FORMAT?{extrapolated:first.extrapolated||last.extrapolated}:{}),
   options:[option('start',start),option('midpoint',start+(end-start)/2),option('end',end)]};
 });
 return {query,totalCues:all.length,matches:matching.length,page,pages,cues};
}
export function requestedNarrationMoment(navigation,clip,cueIndex,kind){
 check(Number.isInteger(cueIndex)&&cueIndex>=0,'Choose a retained transcript cue.');
 check(['start','midpoint','end'].includes(kind),'Choose start, midpoint or end.');
 const value=importNarrationNavigation(navigation,clip),accepted=narrationNavigationSource(value);
 const cue=parseNarration(accepted.transcript)[cueIndex];check(cue,'That transcript cue is unavailable.');
 const first=aligned(value,clip,cue.startSeconds),last=aligned(value,clip,cue.endSeconds),start=first.seconds,end=last.seconds;
 const seconds=kind==='start'?start:kind==='end'?end:start+(end-start)/2;
 const selectedTranscript=kind==='start'?cue.startSeconds:kind==='end'?cue.endSeconds:cue.startSeconds+(cue.endSeconds-cue.startSeconds)/2;
 requestedFrameTime(seconds,clip.durationSeconds);
 return {cueIndex,kind,requestedSeconds:seconds,transcriptStartSeconds:cue.startSeconds,transcriptEndSeconds:cue.endSeconds,
  ...(value.format===CLOCK_NAVIGATION_FORMAT?{extrapolated:aligned(value,clip,selectedTranscript).extrapolated}:{})};
}
