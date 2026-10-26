import {importReviewedPointPaths,MAX_REVIEWED_POINT_PATH_BYTES,REVIEWED_POINT_PATHS_FORMAT} from '/src/reviewed-point-paths.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
export const REVIEWED_POINT_PATH_BUNDLE_FORMAT='skill-translator.reviewed-point-paths-bundle/v1';
export const MAX_REVIEWED_POINT_PATH_BUNDLE_BYTES=MAX_BUNDLE_BYTES+MAX_REVIEWED_POINT_PATH_BYTES;
export async function readReviewedPointPathsBundle(file){
 if(!file||file.size<1||file.size>MAX_REVIEWED_POINT_PATH_BUNDLE_BYTES)throw Error('Open a complete reviewed-point account within the original-frame and 32 MiB mapping limits.');
 const raw=JSON.parse(await file.text());if(raw?.format!==REVIEWED_POINT_PATH_BUNDLE_FORMAT)throw Error('Open the complete reviewed-point paths bundle, not an ordinary path basis or a geometric proposal.');
 const received=await readSequenceBundle(new Blob([JSON.stringify(raw.sourceBundle)],{type:'application/json'}));
 try{const study=importReviewedPointPaths({format:REVIEWED_POINT_PATHS_FORMAT,seed:{...raw.seedPath,sequence:received.sequence},reviews:raw.reviews});return {...received,study};}
 catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function makeReviewedPointPathsBundle(raw,assets){
 const study=importReviewedPointPaths(raw),blob=await makeSequenceBundle(study.seed.sequence,assets),sourceBundle=JSON.parse(await blob.text()),{sequence,...seedPath}=study.seed;
 const result=new Blob([JSON.stringify({format:REVIEWED_POINT_PATH_BUNDLE_FORMAT,sourceBundle,seedPath,reviews:study.reviews})],{type:'application/json'});
 if(result.size>MAX_REVIEWED_POINT_PATH_BUNDLE_BYTES)throw Error('Complete retained mapping bundle exceeds its bounded size; no original evidence was dropped.');return result;
}
