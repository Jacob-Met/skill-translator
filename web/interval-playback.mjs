// Native-rate interval viewing with actual presented timestamps, not synchronized replay.
export function playPresentedInterval(clip,range,{signal,onFrame=()=>{}}={}){
 const video=clip?.video,duration=clip?.identity?.durationSeconds,start=range?.startSeconds,end=range?.endSeconds;
 if(!video||!Number.isFinite(duration)||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>duration)return Promise.reject(Error('Choose a positive interval inside the paired original clip.'));
 if(typeof video.requestVideoFrameCallback!=='function')return Promise.reject(Error('This browser cannot report presented-frame timing for interval playback.'));
 if(signal?.aborted)return Promise.reject(Error('Interval playback was replaced.'));
 const original={controls:video.controls,rate:video.playbackRate};
 video.pause();video.controls=false;video.playbackRate=1;
 return new Promise((resolve,reject)=>{
  let finished=false,callback=null,timer=null,first=null,last=null,count=0;
  const started=performance.now();
  const receipt=reason=>({reason,requestedStartSeconds:start,requestedEndSeconds:end,firstPresentedSeconds:first,lastPresentedSeconds:last,firstOffsetSeconds:first===null?null:first-start,lastOffsetSeconds:last===null?null:last-end,presentedCallbacks:count,wallElapsedMilliseconds:performance.now()-started,playbackRate:1});
  function finish(error,reason){
   if(finished)return;finished=true;clearTimeout(timer);if(callback!==null)video.cancelVideoFrameCallback(callback);
   signal?.removeEventListener('abort',cancelled);video.removeEventListener('error',failed);video.removeEventListener('ended',ended);video.pause();video.controls=original.controls;video.playbackRate=original.rate;
   error?reject(error):resolve(receipt(reason));
  }
  const cancelled=()=>finish(Error('Interval playback was replaced.'));
  const failed=()=>finish(Error('The paired clip could not continue playback.'));
  const ended=()=>finish(null,'source-ended');
  function frame(_,metadata){
   callback=null;if(finished)return;
   if(video.seeking){callback=video.requestVideoFrameCallback(frame);return;}
   const time=metadata.mediaTime;
   if(!Number.isFinite(time)||time<0||time>duration){finish(Error('The decoder did not supply a usable presentation timestamp.'));return;}
   if(last!==null&&time<last){finish(Error('Playback presentation time moved backwards; choose the interval again.'));return;}
   first??=time;last=time;count++;
   try{onFrame(receipt('playing'));}catch(error){finish(error);return;}
   if(finished)return;
   if(time>=end){finish(null,'interval-end-presented');return;}
   callback=video.requestVideoFrameCallback(frame);
  }
  signal?.addEventListener('abort',cancelled,{once:true});video.addEventListener('error',failed);video.addEventListener('ended',ended);
  if(signal?.aborted){cancelled();return;}
  timer=setTimeout(()=>finish(Error('Playback did not reach the interval end in the expected time; the source remains paired.')),(end-start)*1000+10000);
  try{video.currentTime=start;callback=video.requestVideoFrameCallback(frame);Promise.resolve(video.play()).catch(error=>finish(error));}catch(error){finish(error);}
 });
}
