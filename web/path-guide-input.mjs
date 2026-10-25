import {importPathGuide} from '/src/path-guide.mjs';
import {PATH_BUNDLE_FORMAT,MAX_PATH_BUNDLE_BYTES,readSampledPathBundle,makeSampledPathBundle} from '/web/sampled-path-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
export const GUIDE_BUNDLE_FORMAT='skill-translator.sampled-guide-bundle/v1';
export const MAX_GUIDE_BUNDLE_BYTES=MAX_PATH_BUNDLE_BYTES+4096;
const current=signal=>{if(signal?.aborted)throw Error('The guide operation was replaced.');};
export async function readPathGuideBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_GUIDE_BUNDLE_BYTES)throw Error('Choose a complete sampled path or sampled guide bundle within its saved size limit.');
 const raw=JSON.parse(await file.text());current(signal);
 const saved=raw?.format===GUIDE_BUNDLE_FORMAT;
 if(!saved&&raw?.format!==PATH_BUNDLE_FORMAT)throw Error('First save a declared sampled path with original frames, then open it here.');
 const received=await readSampledPathBundle(new Blob([JSON.stringify(saved?raw.sampledPath:raw)],{type:'application/json'}),{signal});
 try{current(signal);if(!received.study)throw Error('A declared sampled path is required.');const guide=saved?importPathGuide({...raw.guide,path:received.study}):null;return {...received,guide};}
 catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function makePathGuideBundle(raw,assets,{signal}={}){
 const account=importPathGuide(raw),blob=await makeSampledPathBundle(account.path,assets,{signal});current(signal);
 const sampledPath=JSON.parse(await blob.text());current(signal);const {path,...guide}=account;
 const result=new Blob([JSON.stringify({format:GUIDE_BUNDLE_FORMAT,sampledPath,guide})],{type:'application/json'});
 if(result.size>MAX_GUIDE_BUNDLE_BYTES)throw Error('The complete sampled guide bundle exceeds its retained size limit.');return result;
}
