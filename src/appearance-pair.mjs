import {validateSequence} from './demonstration-sequence.mjs';
import {compareTranslatedSamples} from './visual-translation.mjs';
export const FORMAT='skill-translator.appearance-pair/v1';
export const SAMPLER='canvas2d-drawImage-full-frame-default-smoothing';
export const CONVENTION='rgb-l1-lower-median-shared-channel-offset-div255';
export const BOUNDARY='Finite browser-resampled image appearance only; no physical correspondence, action, contact or numeric-cue inference. Browser resampling may vary; saved sources are recomputed.';
export function admitAppearanceRequest(raw,input){
 const sequence=validateSequence(input);
 if(raw?.format!==FORMAT)throw Error('Unsupported appearance pair format');
 const q=raw.request;if(!q||q.clipSha256!==sequence.clip.sha256)throw Error('Pair clip identity differs');
 if(!Array.isArray(q.frames)||q.frames.length!==2)throw Error('Retain exactly two original frame identities');
 const moments=q.frames.map(f=>{const m=sequence.moments.find(m=>m.id===f?.momentId);if(!m||f.sha256!==m.image.sha256||f.presentedSeconds!==m.origin.mediaTimeSeconds)throw Error('Pair frame identity or original time differs');return m;});
 const frames=moments.map(m=>({momentId:m.id,sha256:m.image.sha256,presentedSeconds:m.origin.mediaTimeSeconds}));
 if(frames[0].momentId===frames[1].momentId||frames[0].presentedSeconds>=frames[1].presentedSeconds)throw Error('Use two distinct chronologically ordered original frames');
 const {widthPx,heightPx,radius}=q;
 if(!Number.isInteger(widthPx)||!Number.isInteger(heightPx)||widthPx<3||heightPx<3||widthPx>160||heightPx>160||widthPx*heightPx>14400)throw Error('Sample raster exceeds bounded 160-pixel / 14400-pixel limit');
 if(!Number.isInteger(radius)||radius<1||radius>16||widthPx-2*radius<3||heightPx-2*radius<3)throw Error('Search radius leaves insufficient shared support');
 if(moments[0].image.widthPx!==moments[1].image.widthPx||moments[0].image.heightPx!==moments[1].image.heightPx)throw Error('Source dimensions differ');
 if(heightPx!==Math.max(1,Math.round(moments[0].image.heightPx*widthPx/moments[0].image.widthPx)))throw Error('Preserve whole-frame aspect ratio');
 if(q.sampler!==SAMPLER||q.brightnessConvention!==CONVENTION)throw Error('Unsupported sampler or brightness convention');
 const support={left:radius,top:radius,width:widthPx-2*radius,height:heightPx-2*radius};
 if(!q.support||Object.keys(support).some(k=>q.support[k]!==support[k]))throw Error('Declared support differs from complete shared search interior');
 return {format:FORMAT,request:{clipSha256:sequence.clip.sha256,frames,widthPx,heightPx,radius,support,sampler:SAMPLER,brightnessConvention:CONVENTION}};
}
export function defaultAppearanceRequest(input,beforeId,afterId,{widthPx=160,radius=16}={}){
 const sequence=validateSequence(input),moments=[beforeId,afterId].map(id=>sequence.moments.find(m=>m.id===id));if(moments.some(m=>!m))throw Error('Choose two original retained frames');
 const heightPx=Math.max(1,Math.round(moments[0].image.heightPx*widthPx/moments[0].image.widthPx));
 return admitAppearanceRequest({format:FORMAT,request:{clipSha256:sequence.clip.sha256,frames:moments.map(m=>({momentId:m.id,sha256:m.image.sha256,presentedSeconds:m.origin.mediaTimeSeconds})),widthPx,heightPx,radius,support:{left:radius,top:radius,width:widthPx-2*radius,height:heightPx-2*radius},sampler:SAMPLER,brightnessConvention:CONVENTION}},sequence);
}
export function inspectAppearanceSamples(raw,sequence,before,after){
 const source=admitAppearanceRequest(raw,sequence),q=source.request;
 for(const sample of [before,after])if(sample?.widthPx!==q.widthPx||sample?.heightPx!==q.heightPx)throw Error('Raster dimensions differ from retained request');
 return {source,comparison:compareTranslatedSamples(before,after,{radius:q.radius}),boundary:BOUNDARY};
}
