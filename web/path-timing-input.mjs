import {createPathTiming,importPathTiming} from '/src/path-timing.mjs';
import {readSampledPathBundle,makeSampledPathBundle,MAX_PATH_BUNDLE_BYTES} from '/web/sampled-path-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
export const PATH_TIMING_BUNDLE_FORMAT='skill-translator.path-timing-bundle/v1';
export const MAX_PATH_TIMING_BUNDLE_BYTES=2*MAX_PATH_BUNDLE_BYTES+128*1024;
const current=signal=>{if(signal?.aborted)throw Error('The timing operation was replaced.');};
export async function readTimingPath(file,{signal}={}){
 const received=await readSampledPathBundle(file,{signal});
 try{current(signal);if(!received.study)throw Error('Choose a sampled-path export with explicit correspondences, not an unmatched sequence.');return received;}catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function readPathTimingBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_PATH_TIMING_BUNDLE_BYTES)throw Error('Choose a complete timing bundle within its two-source size limit.');
 const value=JSON.parse(await file.text());current(signal);
 if(value?.format!==PATH_TIMING_BUNDLE_FORMAT)throw Error('Choose a complete timing comparison with both original frame bundles.');
 let left=null,right=null;
 try{
  left=await readTimingPath(new Blob([JSON.stringify(value.leftBundle)],{type:'application/json'}),{signal});current(signal);
  right=await readTimingPath(new Blob([JSON.stringify(value.rightBundle)],{type:'application/json'}),{signal});current(signal);
  const study=createPathTiming(left.study,right.study,value.correspondences);
  return {study,leftAssets:left.assets,rightAssets:right.assets};
 }catch(error){if(left)releaseSequenceAssets(left.assets);if(right)releaseSequenceAssets(right.assets);throw error;}
}
export async function makePathTimingBundle(raw,leftAssets,rightAssets,{signal}={}){
 const study=importPathTiming(raw);
 const left=await makeSampledPathBundle(study.paths.left,leftAssets,{signal});current(signal);
 const right=await makeSampledPathBundle(study.paths.right,rightAssets,{signal});current(signal);
 const leftBundle=JSON.parse(await left.text()),rightBundle=JSON.parse(await right.text());current(signal);
 const blob=new Blob([JSON.stringify({format:PATH_TIMING_BUNDLE_FORMAT,leftBundle,rightBundle,correspondences:study.correspondences})],{type:'application/json'});
 if(blob.size>MAX_PATH_TIMING_BUNDLE_BYTES)throw Error('Complete timing comparison exceeds the two-source size limit; no evidence was dropped.');
 return blob;
}
