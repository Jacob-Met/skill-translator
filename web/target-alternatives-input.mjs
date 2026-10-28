import {importTargetCueAlternatives} from '/src/target-cue-alternatives.mjs';
import {readTargetCueBundle,makeTargetCueBundle,releaseTargetCueBundle} from '/web/target-cue-input.mjs';
const FORMAT='skill-translator.target-cue-alternatives-bundle/v1',MAX=48*1024*1024;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export async function readTargetAlternativesBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX)throw Error('Choose a complete alternatives bundle up to 48 MB');
 const raw=JSON.parse(await file.text());if(signal?.aborted)throw Error('Source operation replaced');
 if(raw.format!==FORMAT)throw Error('Unsupported alternatives bundle');
 const study=importTargetCueAlternatives(raw.study);
 if(JSON.stringify(canonical(raw.target?.study))!==JSON.stringify(canonical(study.target)))throw Error('Original target source differs from the alternatives study');
 let loaded;
 try{loaded=await readTargetCueBundle(new File([JSON.stringify(raw.target)],'target.json'),{signal});return{...loaded,alternativesStudy:study};}
 catch(e){releaseTargetCueBundle(loaded);throw e;}
}
export async function makeTargetAlternativesBundle(study,loaded,{signal}={}){
 const accepted=importTargetCueAlternatives(study);
 const target=JSON.parse(await(await makeTargetCueBundle(accepted.target,loaded.referenceSources,loaded.targetSource,{signal})).text());
 if(signal?.aborted)throw Error('Source operation replaced');
 const blob=new Blob([JSON.stringify({format:FORMAT,study:accepted,target})],{type:'application/json'});
 if(blob.size>MAX)throw Error('Complete alternatives bundle exceeds 48 MB');return blob;
}
