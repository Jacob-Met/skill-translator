import {revealedStepInterval} from '/src/revealed-step-playback.mjs';
import {assertSequenceClip} from '/src/demonstration-sequence.mjs';
import {loadLocalVideo,releaseVideo} from '/web/video-input.mjs';
import {playPresentedInterval} from '/web/interval-playback.mjs';
const node=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(parent)parent.append(e);return e;};
function seekBeforeShowing(video,time,signal){
 return new Promise((resolve,reject)=>{
  let done=false,timer;
  const clean=()=>{clearTimeout(timer);video.removeEventListener('seeked',ready);video.removeEventListener('loadeddata',ready);video.removeEventListener('error',failed);signal.removeEventListener('abort',cancelled);};
  const finish=error=>{if(done)return;done=true;clean();error?reject(error):resolve();};
  const ready=()=>{if(!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-time)<.001)finish();};
  const failed=()=>finish(Error('The original clip could not seek to the revealed interval.'));
  const cancelled=()=>finish(Error('Original media admission was replaced.'));
  video.pause();video.controls=false;video.muted=true;
  video.addEventListener('seeked',ready);video.addEventListener('loadeddata',ready);video.addEventListener('error',failed);signal.addEventListener('abort',cancelled,{once:true});
  timer=setTimeout(()=>finish(Error('The original clip did not finish its initial seek.')),8000);
  if(signal.aborted){cancelled();return;}
  try{video.currentTime=time;ready();}catch(error){finish(error);}
 });
}
export function mountRevealedStepPlayback(container){
 let source=null,session=null,range=null,busy=false,clip=null,version=0,loadToken=0,loading=false,admission=null,playing=null,disposed=false;
 node('h3','Watch and hear the revealed original step',container);
 node('p','Optional original context after full reveal. The interval comes from the retained before/after frame presentation times. Playback does not change your prediction, cue requests or recorded reveal order.',container);
 const label=node('label','Pair the exact original MP4 or WebM',container),file=node('input',undefined,label);file.id='revealed-video-file';file.type='file';file.accept='.mp4,.webm,video/mp4,video/webm';
 const host=node('div',undefined,container);host.className='revealed-original-video';
 const audioLabel=node('label',undefined,container),audio=node('input',undefined,audioLabel);audio.id='revealed-video-audio';audio.type='checkbox';audioLabel.append(document.createTextNode(' Enable original clip audio (may be silent)'));
 const play=node('button','Play the revealed step at1×',container),stop=node('button','Stop original step',container);play.type=stop.type='button';play.id='revealed-video-play';stop.id='revealed-video-stop';
 const status=node('p','Reveal the current step before pairing original media.',container);status.id='revealed-video-status';status.setAttribute('role','status');
 node('p','Native timeline controls are unavailable here so the interface does not expose later steps through arbitrary seeking. Original audio is supplied content, not an inferred sensory cue. Video presentation observations do not establish sample-exact audio boundaries or learning.',container);
 const message=text=>{status.textContent=text;};
 function cancel(){const old=playing;playing=null;old?.abort();clip?.video.pause();}
 function release(){releaseVideo(clip);clip=null;audio.checked=false;host.replaceChildren();}
 function controls(){const blocked=disposed||busy||!range;file.disabled=blocked;audio.disabled=blocked||loading||!clip;play.disabled=blocked||loading||!clip;stop.disabled=!playing;container.hidden=!range;if(clip){clip.video.controls=false;clip.video.hidden=blocked||loading;audio.checked=!clip.video.muted;}}
 function update(nextSource,nextSession,{busy:nextBusy=false}={}){
  if(disposed)return;if(nextSource===source&&nextSession===session&&nextBusy===busy){controls();return;}
  version++;loadToken++;admission?.abort();admission=null;loading=false;cancel();source=nextSource;session=nextSession;busy=nextBusy;range=null;
  try{if(source&&session)range=revealedStepInterval(source,session);if(clip){if(!range)release();else assertSequenceClip(source,clip.identity);}}
  catch(error){range=null;release();message('Original step unavailable: '+error.message);}
  if(range)message(busy?'Original playback retired while the practice source or session is being read.':'Revealed interval '+range.startSeconds.toFixed(3)+'–'+range.endSeconds.toFixed(3)+' s. Pair its original clip or play the accepted source.');
  else message('Reveal the current step before pairing original media.');controls();
 }
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];file.value='';if(!selected||disposed||busy||!range)return;
  cancel();const token=++loadToken,snapshot=version,boundSource=source,boundSession=session,boundRange=range;admission?.abort();const controller=new AbortController();admission=controller;loading=true;controls();message('Checking the exact original and seeking before showing its pixels.');let candidate=null;
  const current=()=>!disposed&&snapshot===version&&token===loadToken&&source===boundSource&&session===boundSession&&!busy&&range===boundRange&&!controller.signal.aborted;
  try{
   candidate=await loadLocalVideo(selected);if(!current()){releaseVideo(candidate);candidate=null;return;}
   assertSequenceClip(boundSource,candidate.identity);candidate.video.controls=false;candidate.video.disablePictureInPicture=true;candidate.video.addEventListener('contextmenu',event=>event.preventDefault());
   await seekBeforeShowing(candidate.video,boundRange.startSeconds,controller.signal);if(!current()){releaseVideo(candidate);candidate=null;return;}
   release();clip=candidate;candidate=null;audio.checked=false;host.replaceChildren(clip.video);
   const paired=clip;paired.video.addEventListener('play',()=>{if(paired===clip&&(!playing||busy||!range||disposed))paired.video.pause();});
   paired.video.addEventListener('volumechange',()=>{if(paired===clip)audio.checked=!paired.video.muted;});
   message('Exact original clip paired at the revealed interval. Audio starts muted; enable it explicitly if wanted.');
  }catch(error){if(candidate)releaseVideo(candidate);if(current())message('Original clip refused: '+error.message+' Previously accepted source preserved.');}
  finally{if(token===loadToken&&snapshot===version){loading=false;admission=null;controls();}}
 });
 audio.addEventListener('change',()=>{if(clip&&!busy&&range&&!loading&&!disposed)clip.video.muted=!audio.checked;});
 play.addEventListener('click',async()=>{
  if(play.disabled)return;cancel();const paired=clip,requested=range,snapshot=version,controller=new AbortController();playing=controller;controls();message('Playing requested revealed interval '+requested.startSeconds.toFixed(3)+'–'+requested.endSeconds.toFixed(3)+' s.');
  try{const result=await playPresentedInterval(paired,requested,{signal:controller.signal});if(playing!==controller||snapshot!==version||paired!==clip||disposed)return;playing=null;message('Stopped: '+result.reason+'. First presented '+(result.firstPresentedSeconds??'not reported')+' s; last '+(result.lastPresentedSeconds??'not reported')+' s. These observations do not alter the recorded practice.');controls();}
  catch(error){if(playing===controller&&snapshot===version&&!disposed){playing=null;message('Original step playback stopped: '+error.message);controls();}}
 });
 stop.addEventListener('click',()=>{cancel();message('Original step playback stopped. The practice history remains unchanged.');controls();});
 function dispose(){if(disposed)return;version++;loadToken++;admission?.abort();admission=null;cancel();release();disposed=true;controls();}
 addEventListener('pagehide',event=>{if(!event.persisted)dispose();});update(null,null);controls();return {update,dispose};
}
