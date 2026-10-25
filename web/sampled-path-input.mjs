import {importSequencePath} from '/src/sequence-path.mjs';
import {BUNDLE_FORMAT,MAX_BUNDLE_BYTES,readSequenceBundle,makeSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
export const PATH_BUNDLE_FORMAT='skill-translator.sampled-path-bundle/v1';
export const MAX_PATH_BUNDLE_BYTES=MAX_BUNDLE_BYTES+64*1024;
const current=signal=>{if(signal?.aborted)throw Error('The sampled-path operation was replaced.');};
export async function readSampledPathBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_PATH_BUNDLE_BYTES)throw Error('Choose a complete sequence or sampled-path bundle within 48 MiB plus bounded declarations.');
 const value=JSON.parse(await file.text());current(signal);
 const saved=value?.format===PATH_BUNDLE_FORMAT;
 if(!saved&&value?.format!==BUNDLE_FORMAT)throw Error('Open the saved demonstration sequence with original frames, or a saved sampled-path bundle.');
 const received=await readSequenceBundle(new Blob([JSON.stringify(saved?value.sourceBundle:value)],{type:'application/json'}),{signal});
 try{current(signal);const study=saved?importSequencePath({...value.path,sequence:received.sequence}):null;return {...received,study};}
 catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function makeSampledPathBundle(raw,assets,{signal}={}){
 const study=importSequencePath(raw),source=await makeSequenceBundle(study.sequence,assets,{signal});current(signal);
 const sourceBundle=JSON.parse(await source.text());current(signal);
 const {sequence,...path}=study;
 const blob=new Blob([JSON.stringify({format:PATH_BUNDLE_FORMAT,sourceBundle,path})],{type:'application/json'});
 if(blob.size>MAX_PATH_BUNDLE_BYTES)throw Error('Complete sampled-path bundle exceeds its size limit; no evidence was dropped.');
 return blob;
}
