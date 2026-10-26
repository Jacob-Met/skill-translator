import {importReviewedForcedPointPaths,MAX_REVIEWED_FORCED_POINT_PATH_BYTES,REVIEWED_FORCED_POINT_PATHS_FORMAT} from '/src/reviewed-forced-point-paths.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
export const REVIEWED_FORCED_POINT_PATH_BUNDLE_FORMAT='skill-translator.reviewed-forced-point-paths-bundle/v1';
export const MAX_REVIEWED_FORCED_POINT_PATH_BUNDLE_BYTES=MAX_BUNDLE_BYTES+MAX_REVIEWED_FORCED_POINT_PATH_BYTES;
export async function readReviewedForcedPointPathsBundle(file){
 if(!file||file.size<1||file.size>MAX_REVIEWED_FORCED_POINT_PATH_BUNDLE_BYTES)throw Error('Open a retained forced-subset account within original-frame and 32 MiB review limits.');
 const raw=JSON.parse(await file.text());if(raw?.format!==REVIEWED_FORCED_POINT_PATH_BUNDLE_FORMAT)throw Error('Open a retained forced-subset bundle; a point basis or complete-map account is different.');
 const received=await readSequenceBundle(new Blob([JSON.stringify(raw.sourceBundle)],{type:'application/json'}));
 try{const study=importReviewedForcedPointPaths({format:REVIEWED_FORCED_POINT_PATHS_FORMAT,seed:{...raw.seedPath,sequence:received.sequence},anchorMomentId:raw.anchorMomentId,deviationMm:raw.deviationMm,maxStates:raw.maxStates,reviews:raw.reviews});return {...received,study};}
 catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function makeReviewedForcedPointPathsBundle(raw,assets){
 const study=importReviewedForcedPointPaths(raw),blob=await makeSequenceBundle(study.seed.sequence,assets),sourceBundle=JSON.parse(await blob.text()),{sequence,...seedPath}=study.seed;
 const result=new Blob([JSON.stringify({format:REVIEWED_FORCED_POINT_PATH_BUNDLE_FORMAT,sourceBundle,seedPath,anchorMomentId:study.anchorMomentId,deviationMm:study.deviationMm,maxStates:study.maxStates,reviews:study.reviews})],{type:'application/json'});
 if(result.size>MAX_REVIEWED_FORCED_POINT_PATH_BUNDLE_BYTES)throw Error('Retained forced-subset bundle exceeds its bounded size; no original evidence was dropped.');return result;
}
