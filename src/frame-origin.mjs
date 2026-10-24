// Source timeline metadata for a browser-decoded still. A requested seek is not
// a presented frame timestamp; both survive export without conflating them.
import {GeometryError} from "./geometry.mjs";
export const MAX_VIDEO_BYTES=128*1024*1024;
const fail=message=>{throw new GeometryError(message);};
const finite=x=>typeof x==="number"&&Number.isFinite(x);
function hash(value){if(typeof value!=="string"||!/^[0-9a-f]{64}$/.test(value))fail("Video source identity is incomplete.");return value;}
export function clipIdentity(value){
  if(!value||typeof value.name!=="string"||!value.name.trim()||value.name.length>180)fail("The clip needs a short source name.");
  if(!["video/mp4","video/webm"].includes(value.mimeType))fail("Choose an MP4 or WebM clip supported by this browser.");
  if(!Number.isInteger(value.sizeBytes)||value.sizeBytes<1||value.sizeBytes>MAX_VIDEO_BYTES)fail("Choose a local clip up to 128 MB.");
  if(!finite(value.durationSeconds)||value.durationSeconds<=0||value.durationSeconds>10800)fail("Use a finite clip up to three hours long.");
  return {name:value.name,mimeType:value.mimeType,sizeBytes:value.sizeBytes,
    sha256:hash(value.sha256),durationSeconds:value.durationSeconds};
}
export function requestedFrameTime(seconds,duration){
  if(!finite(seconds)||!finite(duration)||duration<=0||seconds<0||seconds>=duration)
    fail("Choose a time from zero up to, but not including, the end of the clip.");
  return seconds;
}
export function validateFrameOrigin(origin,image){
  if(!origin||origin.kind!=="local-video-frame"||origin.timing!=="requestVideoFrameCallback")
    fail("The extracted frame has no supported presentation-time record.");
  const clip=clipIdentity(origin.clip);
  const requestedTimeSeconds=requestedFrameTime(origin.requestedTimeSeconds,clip.durationSeconds);
  const mediaTimeSeconds=origin.mediaTimeSeconds;
  if(!finite(mediaTimeSeconds)||mediaTimeSeconds<0||mediaTimeSeconds>clip.durationSeconds)
    fail("The browser did not report a valid presented-frame time.");
  for(const key of ["widthPx","heightPx","decodedWidthPx","decodedHeightPx"])
    if(!Number.isInteger(origin[key])||origin[key]<1||origin[key]>8192)fail("The presented frame has unsupported dimensions.");
  if(origin.widthPx*origin.heightPx>24_000_000||origin.decodedWidthPx*origin.decodedHeightPx>24_000_000)
    fail("The presented frame is too large for source annotation.");
  if(!image||origin.widthPx!==image.widthPx||origin.heightPx!==image.heightPx||origin.frameSha256!==image.sha256)
    fail("The video frame record does not match the exported still image.");
  hash(origin.frameSha256);
  return {kind:"local-video-frame",timing:"requestVideoFrameCallback",clip,
    requestedTimeSeconds,mediaTimeSeconds,frameSha256:origin.frameSha256,
    widthPx:origin.widthPx,heightPx:origin.heightPx,
    decodedWidthPx:origin.decodedWidthPx,decodedHeightPx:origin.decodedHeightPx};
}
export function frameOrigin(clip,requestedTimeSeconds,metadata,image){
  return validateFrameOrigin({kind:"local-video-frame",timing:"requestVideoFrameCallback",clip,
    requestedTimeSeconds,mediaTimeSeconds:metadata.mediaTime,frameSha256:image.sha256,
    widthPx:image.widthPx,heightPx:image.heightPx,decodedWidthPx:metadata.width,decodedHeightPx:metadata.height},image);
}
