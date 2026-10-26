import {MAX_VIDEO_BYTES,clipIdentity,requestedFrameTime} from "/src/frame-origin.mjs";
import {MAX_IMAGE_SIDE,MAX_IMAGE_PIXELS} from "/src/capture.mjs";
import {MAX_SAMPLE_SIDE} from "/src/visual-scan.mjs";
function boundedFrameSize(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>MAX_IMAGE_SIDE||height>MAX_IMAGE_SIDE||width*height>MAX_IMAGE_PIXELS)throw Error("Choose a video frame up to 8192 pixels per side and 24 megapixels.");
}

function videoType(file){
  if(["video/mp4","video/webm"].includes(file.type))return file.type;
  if(!file.type||file.type==="application/octet-stream"){
    if(/\.mp4$/i.test(file.name))return "video/mp4";
    if(/\.webm$/i.test(file.name))return "video/webm";
  }
  throw Error("Choose an MP4 or WebM clip supported by this browser.");
}
export async function loadLocalVideo(file){
  if(!file||file.size<1||file.size>MAX_VIDEO_BYTES)throw Error("Choose a local clip up to 128 MB.");
  const mimeType=videoType(file),video=document.createElement("video");
  video.controls=true;video.muted=true;video.playsInline=true;video.preload="auto";
  const url=URL.createObjectURL(new Blob([file],{type:mimeType}));
  try{
    // Browser metadata alone does not establish that an inspectable frame exists.
    const firstFrame=new Promise((resolve,reject)=>{
      let timer;
      const clear=()=>{clearTimeout(timer);video.removeEventListener("loadeddata",ready);video.removeEventListener("error",failed);};
      const ready=()=>{clear();resolve();};
      const failed=()=>{clear();reject(Error("This browser cannot decode the selected clip."));};
      video.addEventListener("loadeddata",ready);video.addEventListener("error",failed);
      timer=setTimeout(()=>{clear();reject(Error("The clip did not provide usable metadata in time."));},10000);
      video.src=url;video.load();
    });
    const digest=file.arrayBuffer().then(bytes=>crypto.subtle.digest("SHA-256",bytes));
    const [,bytes]=await Promise.all([firstFrame,digest]);
    if(video.error||video.readyState<2)throw Error("This browser cannot decode the selected clip.");
    boundedFrameSize(video.videoWidth,video.videoHeight);
    const sha256=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,"0")).join("");
    const identity=clipIdentity({name:String(file.name||"local-clip").slice(0,180),mimeType,
      sha256,sizeBytes:file.size,durationSeconds:video.duration});
    return {video,url,identity,file};
  }catch(error){video.pause();video.removeAttribute("src");video.load();URL.revokeObjectURL(url);throw error;}
}
export function releaseVideo(clip){
  if(!clip)return;clip.video.pause();clip.video.removeAttribute("src");clip.video.load();clip.video.remove();URL.revokeObjectURL(clip.url);
}

// Capture inside a presented-frame callback. The API's mediaTime is recorded,
// never inferred from the requested currentTime. One seek is admitted at a time.
// Reference: developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
// Prior estate receiving: replay-forge/app/world-source-sync.mjs (0612b54).
async function capturePresentedSnapshot(clip,seconds,{signal,sampleOnly=false}={}){
  const {video,identity}=clip;
  requestedFrameTime(seconds,identity.durationSeconds);
  if(typeof video.requestVideoFrameCallback!=="function")throw Error("This browser cannot report presented-frame timing. Use a source photo instead.");
  if(video.seeking)throw Error("Wait for the current video seek to finish before capturing.");
  if(signal?.aborted)throw Error("Frame selection was replaced.");
  video.pause();const controls=video.controls;video.controls=false;
  try{
    const snapshot=await new Promise((resolve,reject)=>{
      let callbackId=null,timer,presentationTimer,finished=false,copied=false;
      const clear=()=>{clearTimeout(timer);clearTimeout(presentationTimer);video.pause();if(callbackId!==null)video.cancelVideoFrameCallback(callbackId);video.removeEventListener("error",failed);signal?.removeEventListener("abort",cancelled);};
      const finish=(error,value)=>{if(finished)return;finished=true;clear();error?reject(error):resolve(value);};
      const failed=()=>finish(Error("The video decoder could not present this frame."));
      const cancelled=()=>finish(Error("Frame selection was replaced."));
      const onFrame=(_,metadata)=>{
        callbackId=null;if(finished)return;
        if(video.seeking||video.readyState<2){callbackId=video.requestVideoFrameCallback(onFrame);return;}
        try{
          if(!Number.isFinite(metadata.mediaTime)||metadata.mediaTime<0||metadata.mediaTime>identity.durationSeconds)
            throw Error("The browser did not report a usable frame time.");
          // A damaged later seek can silently reset the playback clock to the opening
          // frame while still producing a valid-looking frame callback and PNG.
          // Check the actual seek clock, not mediaTime: sparse/VFR sources may
          // legitimately present an earlier PTS at the requested playback position.
          if(!Number.isFinite(video.currentTime)||Math.abs(video.currentTime-seconds)>0.5)
            throw Error("The browser did not reach the requested video moment. Choose another moment or a source photo.");
          boundedFrameSize(video.videoWidth,video.videoHeight);
          boundedFrameSize(metadata.width,metadata.height);
          copied=true;clearTimeout(presentationTimer);video.pause();
          const canvas=document.createElement("canvas");
          const scale=sampleOnly?Math.min(1,MAX_SAMPLE_SIDE/Math.max(video.videoWidth,video.videoHeight)):1;
          canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
          const context=canvas.getContext("2d");if(!context)throw Error("The browser cannot copy video pixels.");
          context.drawImage(video,0,0,canvas.width,canvas.height);
          if(sampleOnly){
            finish(null,{rgba:context.getImageData(0,0,canvas.width,canvas.height).data,
              widthPx:canvas.width,heightPx:canvas.height,
              metadata:{mediaTime:metadata.mediaTime,width:metadata.width,height:metadata.height}});
            return;
          }
          // The copied canvas is stable even while PNG encoding completes.
          canvas.toBlob(blob=>blob?finish(null,{blob,metadata:{mediaTime:metadata.mediaTime,width:metadata.width,height:metadata.height}}):finish(Error("The frame could not be saved as PNG.")),"image/png");
        }catch(error){finish(error);}
      };
      video.addEventListener("error",failed);signal?.addEventListener("abort",cancelled,{once:true});
      timer=setTimeout(()=>finish(Error("No timed video frame arrived. Seek to another moment or use a source photo.")),8000);
      callbackId=video.requestVideoFrameCallback(onFrame);
      try{video.currentTime=seconds;}catch(error){finish(error);}
      // Some decoders do not present a new frame for an unchanged paused seek.
      // Brief muted playback asks for a real presentation; the callback pauses
      // it and records the actual time, never the requested time as a substitute.
      const requestPresentation=()=>{
        if(finished||copied)return;
        if(video.seeking||video.readyState<2){presentationTimer=setTimeout(requestPresentation,50);return;}
        video.play().catch(()=>finish(Error("The browser could not present another frame. Seek to another moment or choose a photo.")));
      };
      if(!finished)presentationTimer=setTimeout(requestPresentation,200);
    });
    if(signal?.aborted)throw Error("Frame selection was replaced.");
    if(sampleOnly)return {rgba:snapshot.rgba,widthPx:snapshot.widthPx,heightPx:snapshot.heightPx,
      presentedSeconds:snapshot.metadata.mediaTime,requestedSeconds:seconds};
    const stem=identity.name.replace(/\.[^.]+$/,"").replace(/[^a-zA-Z0-9_-]+/g,"-").slice(0,90)||"clip";
    return {file:new File([snapshot.blob],stem+"-frame-"+snapshot.metadata.mediaTime.toFixed(3)+"s.png",{type:"image/png"}),metadata:snapshot.metadata,requestedTimeSeconds:seconds};
  }finally{video.controls=controls;}
}

export function capturePresentedFrame(clip,seconds,{signal}={}){
  return capturePresentedSnapshot(clip,seconds,{signal});
}

// Small inspection samples never enter the original-frame retention/export path.
export function samplePresentedFrame(clip,seconds,{signal}={}){
  return capturePresentedSnapshot(clip,seconds,{signal,sampleOnly:true});
}
