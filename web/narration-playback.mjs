import {loadLocalVideo,releaseVideo} from '/web/video-input.mjs';
import {assertSequenceClip} from '/src/demonstration-sequence.mjs';
import {narrationForStep} from '/src/timed-narration.mjs';
import {narrationPlaybackRange} from '/src/narration-playback.mjs';
import {playPresentedInterval} from '/web/interval-playback.mjs';
const node=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(parent)parent.append(e);return e;};
const seconds=n=>n===null?'not reported':n.toFixed(3)+' s';
export function mountNarrationPlayback(container){
 let study=null,stepId=null,clip=null,revision=0,loadToken=0,loading=false,blocked=true,playing=null,disposed=false;
 node('h3','Watch and hear the original utterance',container);
 node('p','Optionally pair the exact original clip. Playback requests the complete mapped utterance interval at 1× encoded timeline rate. Audio is original source content, not generated speech or proof that the supplied transcript is correct. Video-frame timestamps do not establish sample-exact audio boundaries.',container);
 const fileLabel=node('label','Pair original MP4 or WebM',container),file=node('input',undefined,fileLabel);file.type='file';file.accept='.mp4,.webm,video/mp4,video/webm';file.id='narration-playback-file';
 const host=node('div',undefined,container);host.className='narration-original-video';
 const choiceLabel=node('label','Overlapping supplied utterance',container),choice=node('select',undefined,choiceLabel);choice.id='narration-playback-cue';
 const words=node('p','',container);words.className='narration-cue-text';words.id='narration-playback-words';
 const audioLabel=node('label',undefined,container),audio=node('input',undefined,audioLabel);audio.type='checkbox';audio.id='narration-playback-audio';audioLabel.append(document.createTextNode(' Enable original clip audio (may be silent)'));
 const play=node('button','Play complete utterance at 1×',container),stop=node('button','Stop utterance',container),status=node('p','Pair a narration account first.',container);
 play.type=stop.type='button';play.id='narration-playback-play';stop.id='narration-playback-stop';status.id='narration-playback-status';status.setAttribute('role','status');
 function range(){return narrationPlaybackRange(study,stepId,Number(choice.value));}
 function cancel(){const old=playing;playing=null;old?.abort();clip?.video.pause();}
 function controls(){
  const unavailable=disposed||blocked||!study;
  file.disabled=unavailable;choice.disabled=unavailable||loading||!choice.options.length;
  audio.disabled=unavailable||loading||!clip;
  let valid=false;try{if(choice.options.length){range();valid=true;}}catch{}
  play.disabled=unavailable||loading||!clip||!valid;stop.disabled=!clip||!playing;
  if(clip&&!playing)clip.video.controls=!unavailable&&!loading;
 }
 function describe(){
  if(!study||!choice.options.length){words.textContent='No overlapping narration cue is available.';return;}
  const cue=narrationForStep(study,stepId).cues.find(c=>c.index===Number(choice.value));words.textContent=cue?.text||'';
  try{const r=range();status.textContent='Requested source interval '+seconds(r.startSeconds)+'–'+seconds(r.endSeconds)+(r.extrapolated?' (extrapolated beyond clock landmarks)':'')+'. Quotation selection remains a separate action.';}
  catch(error){status.textContent='Utterance unavailable: '+error.message;}
 }
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];file.value='';if(!selected||blocked||!study||disposed)return;
  cancel();const token=++loadToken,version=revision,source=study.source;loading=true;controls();status.textContent='Checking the full original clip; the accepted clip is preserved until admission.';let received=null;
  try{
   received=await loadLocalVideo(selected);
   if(token!==loadToken||version!==revision||disposed){releaseVideo(received);return;}
   assertSequenceClip(source,received.identity);releaseVideo(clip);clip=received;received=null;audio.checked=false;clip.video.muted=true;host.replaceChildren(clip.video);clip.video.style.maxWidth='100%';
   const paired=clip;paired.video.addEventListener('play',()=>{if(paired!==clip)return;if(blocked||loading||disposed){paired.video.pause();return;}if(!playing)status.textContent='Native controls are playing the original clip outside the managed utterance interval. Use Play complete utterance to restore its declared range.';});
   paired.video.addEventListener('volumechange',()=>{if(paired===clip)audio.checked=!paired.video.muted;});
   status.textContent='Exact original clip paired. Audio starts muted; enable it explicitly if wanted.';
  }catch(error){if(received)releaseVideo(received);if(token===loadToken&&version===revision&&!disposed)status.textContent='Clip refused: '+error.message+' Previous accepted clip remains paired.';}
  finally{if(token===loadToken&&version===revision&&!disposed){loading=false;controls();}}
 });
 choice.addEventListener('change',()=>{cancel();describe();controls();});
 audio.addEventListener('change',()=>{if(!clip||blocked||loading||disposed)return;clip.video.muted=!audio.checked;});
 play.addEventListener('click',async()=>{
  if(play.disabled||!clip||!study)return;cancel();const controller=new AbortController(),version=revision,paired=clip;playing=controller;controls();
  try{
   const requested=range();status.textContent='Requesting '+seconds(requested.startSeconds)+'–'+seconds(requested.endSeconds)+' at 1× encoded timeline.';
   const result=await playPresentedInterval(paired,requested,{signal:controller.signal,onFrame:record=>{if(playing===controller&&revision===version)status.textContent='Presented '+seconds(record.lastPresentedSeconds)+'; requested '+seconds(record.requestedStartSeconds)+'–'+seconds(record.requestedEndSeconds)+'.';}});
   if(playing!==controller||revision!==version||disposed)return;
   playing=null;status.textContent='Stopped: '+result.reason+'. First presented '+seconds(result.firstPresentedSeconds)+'; last '+seconds(result.lastPresentedSeconds)+'. Start offset '+seconds(result.firstOffsetSeconds)+'; end offset '+seconds(result.lastOffsetSeconds)+'. These are video presentation observations, not audio sample boundaries.';controls();
  }catch(error){if(playing===controller&&revision===version&&!disposed){playing=null;status.textContent='Playback stopped: '+error.message;controls();}}
 });
 stop.addEventListener('click',()=>{cancel();status.textContent='Utterance playback stopped. The original clip remains paired.';controls();});
 function update(next,nextStep,{suspended=false}={}){
  if(disposed)return;revision++;loadToken++;loading=false;cancel();study=next;stepId=nextStep;blocked=suspended||!study||!stepId;
  const previous=choice.value;choice.replaceChildren();
  if(study&&stepId){try{for(const cue of narrationForStep(study,stepId).cues){const option=node('option','Cue '+(cue.index+1)+' · transcript '+seconds(cue.startSeconds)+'–'+seconds(cue.endSeconds),choice);option.value=String(cue.index);}if([...choice.options].some(o=>o.value===previous))choice.value=previous;}catch(error){blocked=true;status.textContent='Narration unavailable: '+error.message;}}
  if(clip){try{if(!study)throw Error('No narration');assertSequenceClip(study.source,clip.identity);}catch{releaseVideo(clip);clip=null;audio.checked=false;host.replaceChildren();}}
  container.hidden=!study;
  if(blocked){words.textContent='Pair the current narration draft and choose an authored step before playback.';status.textContent='Playback unavailable while source or narration settings are pending.';}else describe();
  controls();
 }
 function suspend(){if(disposed)return;revision++;loadToken++;loading=false;cancel();blocked=true;status.textContent='Playback retired while source or narration settings change.';controls();}
 function dispose(){if(disposed)return;revision++;loadToken++;cancel();releaseVideo(clip);clip=null;disposed=true;controls();}
 addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
 update(null,null);return {update,suspend,dispose};
}
