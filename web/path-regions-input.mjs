import {importPathRegions} from '/src/path-regions.mjs';
import {PATH_BUNDLE_FORMAT,MAX_PATH_BUNDLE_BYTES,readSampledPathBundle,makeSampledPathBundle} from '/web/sampled-path-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
export const REGIONS_BUNDLE_FORMAT='skill-translator.sampled-regions-bundle/v1';
export const MAX_REGIONS_BUNDLE_BYTES=MAX_PATH_BUNDLE_BYTES+32768;
const current=signal=>{if(signal?.aborted)throw Error('The regions operation was replaced.');};
export async function readPathRegionsBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_REGIONS_BUNDLE_BYTES)throw Error('Choose a complete sampled path or sampled regions bundle within its saved size limit.');
 const raw=JSON.parse(await file.text());current(signal);
 const saved=raw?.format===REGIONS_BUNDLE_FORMAT;
 if(!saved&&raw?.format!==PATH_BUNDLE_FORMAT)throw Error('First save a declared sampled path with original frames, then open it here.');
 const received=await readSampledPathBundle(new Blob([JSON.stringify(saved?raw.sampledPath:raw)],{type:'application/json'}),{signal});
 try{current(signal);if(!received.study)throw Error('A declared sampled path is required.');const regions=saved?importPathRegions({...raw.regions,path:received.study}):null;return {...received,regions};}
 catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function makePathRegionsBundle(raw,assets,{signal}={}){
 const account=importPathRegions(raw),blob=await makeSampledPathBundle(account.path,assets,{signal});current(signal);
 const sampledPath=JSON.parse(await blob.text());current(signal);const {path,...regions}=account;
 const result=new Blob([JSON.stringify({format:REGIONS_BUNDLE_FORMAT,sampledPath,regions})],{type:'application/json'});
 if(result.size>MAX_REGIONS_BUNDLE_BYTES)throw Error('The complete sampled regions bundle exceeds its retained size limit.');return result;
}
