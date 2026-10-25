import {createPathComparison,importPathComparison} from '/src/path-comparison.mjs';
import {readSampledPathBundle,makeSampledPathBundle,MAX_PATH_BUNDLE_BYTES} from '/web/sampled-path-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
export const COMPARISON_BUNDLE_FORMAT='skill-translator.path-comparison-bundle/v1';
export const MAX_COMPARISON_BUNDLE_BYTES=2*MAX_PATH_BUNDLE_BYTES+8192;
const current=signal=>{if(signal?.aborted)throw Error('This comparison operation was replaced.');};
export async function readPathComparisonBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_COMPARISON_BUNDLE_BYTES)throw Error('Choose a complete comparison within its two-source size budget.');
 const raw=JSON.parse(await file.text());current(signal);
 if(raw?.format!==COMPARISON_BUNDLE_FORMAT||!Array.isArray(raw.paths)||raw.paths.length!==2)throw Error('Open a saved complete path comparison.');
 const received=[];
 try{
  for(const path of raw.paths){const r=await readSampledPathBundle(new Blob([JSON.stringify(path)],{type:'application/json'}),{signal});received.push(r);current(signal);if(!r.study)throw Error('Each source must be a declared sampled path.');}
  return {study:createPathComparison(received[0].study,received[1].study,raw.declaration),sources:received};
 }catch(error){for(const r of received)releaseSequenceAssets(r.assets);throw error;}
}
export async function makePathComparisonBundle(raw,sources,{signal}={}){
 const study=importPathComparison(raw,sources.map(s=>s.study)),paths=[];
 for(let i=0;i<2;i++){const b=await makeSampledPathBundle(study.paths[i],sources[i].assets,{signal});current(signal);paths.push(JSON.parse(await b.text()));current(signal);}
 const blob=new Blob([JSON.stringify({format:COMPARISON_BUNDLE_FORMAT,paths,declaration:study.declaration})],{type:'application/json'});
 if(blob.size>MAX_COMPARISON_BUNDLE_BYTES)throw Error('The complete comparison exceeds its size budget; no source was dropped.');
 return blob;
}
