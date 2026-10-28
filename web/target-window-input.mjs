import {importTargetWindowCues,TARGET_WINDOW_FORMAT} from '/src/target-window-cues.mjs';
import {TARGET_CUE_FORMAT} from '/src/target-cue-study.mjs';
import {readTargetCueBundle,makeTargetCueBundle,releaseTargetCueBundle} from '/web/target-cue-input.mjs';
const FORMAT='skill-translator.target-window-cue-bundle/v1',MAX=48*1024*1024;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const carrier=study=>({format:TARGET_CUE_FORMAT,reference:study.reference,target:study.target,readings:[]});
export async function readWindowOrTargetBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX)throw Error('Choose a complete investigation up to 48 MB');
 const raw=JSON.parse(await file.text());if(signal?.aborted)throw Error('Source operation replaced');
 if(raw.format!==FORMAT)return readTargetCueBundle(file,{signal});
 const study=importTargetWindowCues(raw.study);
 if(JSON.stringify(canonical(carrier(study)))!==JSON.stringify(canonical(raw.original?.study)))throw Error('Original target source differs from the window study');
 let loaded;try{loaded=await readTargetCueBundle(new File([JSON.stringify(raw.original)],'original.json'),{signal});if(signal?.aborted)throw Error('Source operation replaced');return {...loaded,study};}catch(e){releaseTargetCueBundle(loaded);throw e;}
}
export async function makeWindowOrTargetBundle(study,referenceSources,targetSource,{signal}={}){
 if(study.format!==TARGET_WINDOW_FORMAT)return makeTargetCueBundle(study,referenceSources,targetSource,{signal});
 const accepted=importTargetWindowCues(study),original=JSON.parse(await(await makeTargetCueBundle(carrier(accepted),referenceSources,targetSource,{signal})).text());
 if(signal?.aborted)throw Error('Source operation replaced');
 const blob=new Blob([JSON.stringify({format:FORMAT,study:accepted,original})],{type:'application/json'});if(blob.size>MAX)throw Error('Complete window study exceeds48 MB');return blob;
}
