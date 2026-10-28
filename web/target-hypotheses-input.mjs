import {importTargetCueHypotheses} from '/src/target-cue-hypotheses.mjs';
import {readTargetCueBundle,makeTargetCueBundle,releaseTargetCueBundle} from '/web/target-cue-input.mjs';
export const TARGET_HYPOTHESES_BUNDLE_FORMAT='skill-translator.target-cue-hypotheses-bundle/v1';
const MAX=48*1024*1024,canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export async function readTargetHypothesesBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX)throw Error('Choose a complete hypothesis bundle up to 48 MB');
 const raw=JSON.parse(await file.text());if(signal?.aborted)throw Error('Source operation replaced');
 if(raw.format!==TARGET_HYPOTHESES_BUNDLE_FORMAT)throw Error('Unsupported complete hypothesis bundle');
 const study=importTargetCueHypotheses(raw.study);
 if(JSON.stringify(canonical(study.target))!==JSON.stringify(canonical(raw.original?.study)))throw Error('Original target source differs from declared complete hypotheses');
 let loaded;try{loaded=await readTargetCueBundle(new File([JSON.stringify(raw.original)],'original-target.json'),{signal});if(signal?.aborted)throw Error('Source operation replaced');return {...loaded,hypothesesStudy:study};}catch(e){releaseTargetCueBundle(loaded);throw e;}
}
export async function makeTargetHypothesesBundle(study,loaded,{signal}={}){
 const accepted=importTargetCueHypotheses(study),original=JSON.parse(await(await makeTargetCueBundle(accepted.target,loaded.referenceSources,loaded.targetSource,{signal})).text());
 if(signal?.aborted)throw Error('Source operation replaced');
 const blob=new Blob([JSON.stringify({format:TARGET_HYPOTHESES_BUNDLE_FORMAT,study:accepted,original})],{type:'application/json'});if(blob.size>MAX)throw Error('Complete hypothesis bundle exceeds 48 MB');return blob;
}
