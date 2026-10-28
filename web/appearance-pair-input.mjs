import {FORMAT,admitAppearanceRequest} from '/src/appearance-pair.mjs';
import {BUNDLE_FORMAT,readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
const check=signal=>{if(signal?.aborted)throw Error('Appearance pair operation replaced');};
export function releaseAppearanceInput(loaded){if(loaded?.assets)releaseSequenceAssets(loaded.assets);}
export async function readAppearanceInput(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Complete appearance source exceeds maintained bundle budget');
 const raw=JSON.parse(await file.text());check(signal);let loaded;
 try{
  if(raw.format!==FORMAT&&raw.format!==BUNDLE_FORMAT)throw Error('Choose an original sequence or saved appearance pair');
  const original=raw.format===FORMAT?raw.original:raw;
  loaded=await readSequenceBundle(new File([JSON.stringify(original)],'original.json',{type:'application/json'}),{signal});check(signal);
  const request=raw.format===FORMAT?admitAppearanceRequest(raw,loaded.sequence):null;
  const result={sequence:loaded.sequence,assets:loaded.assets,request};loaded=null;return result;
 }finally{if(loaded)releaseAppearanceInput(loaded);}
}
export async function makeAppearanceSamples(loaded,raw,{signal}={}){
 check(signal);const source=admitAppearanceRequest(raw,loaded.sequence);
 const samples=await sampleAppearanceFrames(loaded,source.request,{signal});
 return {source,before:samples[0],after:samples[1]};
}
/** Call only with a canonically admitted pair or triplet request. */
export async function sampleAppearanceFrames(loaded,q,{signal}={}){
 check(signal);const samples=[];
 for(const frame of q.frames){
  const asset=loaded.assets.get(frame.momentId);if(!asset)throw Error('Original admitted image unavailable');
  const image=new Image();image.src=asset.media.url;await image.decode();check(signal);
  const canvas=document.createElement('canvas');canvas.width=q.widthPx;canvas.height=q.heightPx;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image sampling context unavailable');
  ctx.drawImage(image,0,0,q.widthPx,q.heightPx);samples.push({widthPx:q.widthPx,heightPx:q.heightPx,rgba:ctx.getImageData(0,0,q.widthPx,q.heightPx).data});
 }
 check(signal);return samples;
}
export async function makeAppearanceBundle(loaded,raw,{signal}={}){
 check(signal);const source=admitAppearanceRequest(raw,loaded.sequence);
 const original=JSON.parse(await(await makeSequenceBundle(loaded.sequence,loaded.assets,{signal})).text());check(signal);
 const blob=new Blob([JSON.stringify({...source,original})],{type:'application/json'});
 if(blob.size>MAX_BUNDLE_BYTES)throw Error('Complete saved appearance source exceeds maintained bundle budget');return blob;
}
