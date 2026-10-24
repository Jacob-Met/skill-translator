import {validateSequence,sequenceFindings} from '/src/demonstration-sequence.mjs';
import {assertImageMatches,MAX_IMAGE_BYTES} from '/src/capture.mjs';
import {loadLocalImage,releaseImage} from '/web/image-input.mjs';

export const BUNDLE_FORMAT='skill-translator.sequence-bundle/v1';
export const MAX_FRAME_BYTES=32*1024*1024;
export const MAX_BUNDLE_BYTES=48*1024*1024;
const checkSignal=signal=>{if(signal?.aborted)throw Error('The sequence operation was replaced.');};
export function releaseSequenceAssets(assets){for(const asset of assets.values())releaseImage(asset.media);}
function base64(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(binary);
}
function decode(value){
  if(typeof value!=='string'||!value.length||value.length>Math.ceil(MAX_IMAGE_BYTES/3)*4||value.length%4||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('A retained frame has invalid or oversized PNG data.');
  const binary=atob(value);
  if(binary.length>MAX_IMAGE_BYTES)throw Error('A retained frame exceeds 12 MB.');
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function checkedMomentBytes(moment,asset,signal){
  checkSignal(signal);if(!asset?.file)throw Error('A retained source frame is unavailable.');
  assertImageMatches({source:{image:moment.image}},asset.media.image);
  const bytes=new Uint8Array(await asset.file.arrayBuffer());checkSignal(signal);
  if(bytes.length!==asset.file.size||bytes.length>MAX_IMAGE_BYTES)throw Error('A retained PNG has an inconsistent byte length.');
  const digest=await crypto.subtle.digest('SHA-256',bytes);checkSignal(signal);
  const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==moment.image.sha256)throw Error('Retained PNG bytes no longer match the source record.');
  return bytes;
}
export async function exportMomentFrame(moment,asset,{signal}={}){
  return new Blob([await checkedMomentBytes(moment,asset,signal)],{type:'image/png'});
}
export async function makeSequenceBundle(input,assets,{signal}={}){
  const sequence=validateSequence(input),frames=[];let total=0;
  for(const moment of sequence.moments){
    checkSignal(signal);const asset=assets.get(moment.id);
    if(!asset?.file)throw Error('A retained source frame is unavailable.');
    total+=asset.file.size;if(total>MAX_FRAME_BYTES)throw Error('Retained PNG files exceed the 32 MB sequence budget.');
    const bytes=await checkedMomentBytes(moment,asset,signal);
    frames.push({momentId:moment.id,pngBase64:base64(bytes)});
  }
  const blob=new Blob([JSON.stringify({format:BUNDLE_FORMAT,sequence,frames,findings:sequenceFindings(sequence)},null,2)],{type:'application/json'});
  if(blob.size>MAX_BUNDLE_BYTES)throw Error('The saved sequence exceeds 48 MB.');
  return blob;
}
export async function readSequenceBundle(file,{signal}={}){
  if(!file||file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Choose a saved sequence up to 48 MB.');
  const value=JSON.parse(await file.text());checkSignal(signal);
  if(value?.format!==BUNDLE_FORMAT)throw Error('Choose a saved demonstration sequence bundle.');
  const sequence=validateSequence(value.sequence);
  if(!Array.isArray(value.frames)||value.frames.length!==sequence.moments.length)throw Error('Every retained moment needs its original PNG bytes.');
  const encoded=new Map();
  for(const frame of value.frames){
    if(!frame||typeof frame.momentId!=='string'||encoded.has(frame.momentId))throw Error('Retained frame identities must be unique.');
    encoded.set(frame.momentId,frame.pngBase64);
  }
  const assets=new Map();let total=0;
  try{
    for(const moment of sequence.moments){
      checkSignal(signal);const bytes=decode(encoded.get(moment.id));total+=bytes.length;
      if(total>MAX_FRAME_BYTES)throw Error('Retained PNG files exceed the 32 MB sequence budget.');
      const imageFile=new File([bytes],moment.image.name,{type:'image/png'});
      const media=await loadLocalImage(imageFile);assets.set(moment.id,{file:imageFile,media});checkSignal(signal);
      assertImageMatches({source:{image:moment.image}},media.image);
    }
    // Saved findings are explanatory output, never trusted input.
    return {sequence,assets,findings:sequenceFindings(sequence)};
  }catch(error){releaseSequenceAssets(assets);throw error;}
}
