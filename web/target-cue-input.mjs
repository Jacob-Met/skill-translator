import {importTargetCueStudy} from '/src/target-cue-study.mjs';
import {validateSequence} from '/src/demonstration-sequence.mjs';
import {readComparison,makeComparison,release} from '/web/decision-comparison-input.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
import {budget} from '/web/order-evidence-input.mjs';
const FORMAT='skill-translator.target-cue-bundle/v1';
export async function readTargetCueInputs(referenceFile,targetFile,stepId,{signal}={}){
 if(!referenceFile||!targetFile||referenceFile.size+targetFile.size>MAX_BUNDLE_BYTES)throw Error('Choose reference and target files together up to 48 MB');
 const referenceRaw=JSON.parse(await referenceFile.text()),target=JSON.parse(await targetFile.text());
 if(signal?.aborted)throw Error('Source operation was replaced');
 if(referenceRaw.format!=='skill-translator.cue-bundle/v1')throw Error('Choose a saved complete cue study as reference');
 const raw={format:FORMAT,study:{format:'skill-translator.target-cue-study/v1',reference:referenceRaw.study,target:{source:target.sequence,stepId},readings:[]},reference:referenceRaw.comparison,target};
 const file=new File([JSON.stringify(raw)],'target-study.json');
 return readTargetCueBundle(file,{signal});
}
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function releaseTargetCueBundle(loaded){if(!loaded)return;release(loaded.referenceSources??[]);if(loaded.targetSource)releaseSequenceAssets(loaded.targetSource.assets);}
function preflight(bundles){
 let pixels=0,bytes=0;
 for(const raw of bundles){
  for(const m of validateSequence(raw?.sequence).moments)pixels+=m.image.widthPx*m.image.heightPx;
  if(!Array.isArray(raw.frames))throw Error('Retain every original PNG frame');
  for(const frame of raw.frames){if(typeof frame?.pngBase64!=='string'||!frame.pngBase64.length||frame.pngBase64.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(frame.pngBase64))throw Error('Retain valid original PNG base64 bytes');bytes+=Math.floor(frame.pngBase64.length*3/4)-(frame.pngBase64.endsWith('==')?2:frame.pngBase64.endsWith('=')?1:0);}
 }
 if(pixels>32000000||bytes>32*1024*1024)throw Error('Reference and target together exceed the shared 32 megapixel / 32 MB frame budget');
}
export async function readTargetCueBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Choose a complete target cue study up to 48 MB');
 const raw=JSON.parse(await file.text());if(signal?.aborted)throw Error('Source operation was replaced');
 if(raw.format!==FORMAT)throw Error('Unsupported target cue bundle');
 const study=importTargetCueStudy(raw.study);
 if(!same(raw.reference?.study,study.reference.comparison)||!same(raw.target?.sequence,study.target.source))throw Error('Original source bundles differ from the declared study');
 if(!Array.isArray(raw.reference.sources))throw Error('Retain reference source bundles');
 preflight([...raw.reference.sources,raw.target]);
 const loaded={study,referenceSources:[],targetSource:null};
 try{
  const reference=await readComparison(new File([JSON.stringify(raw.reference)],'reference.json'),{signal});loaded.referenceSources=reference.sources;
  loaded.targetSource=await readSequenceBundle(new File([JSON.stringify(raw.target)],'target.json'),{signal});
  budget(new Map([...loaded.referenceSources,loaded.targetSource].map((s,i)=>[i,s])));
  if(signal?.aborted)throw Error('Source operation was replaced');return loaded;
 }catch(e){releaseTargetCueBundle(loaded);throw e;}
}
export async function makeTargetCueBundle(study,referenceSources,targetSource,{signal}={}){
 const accepted=importTargetCueStudy(study);
 if(!same(accepted.target.source,targetSource?.sequence))throw Error('Target frames differ from target study');
 budget(new Map([...referenceSources,targetSource].map((s,i)=>[i,s])));
 const reference=JSON.parse(await(await makeComparison(accepted.reference.comparison,referenceSources,{signal})).text());
 const target=JSON.parse(await(await makeSequenceBundle(targetSource.sequence,targetSource.assets,{signal})).text());
 if(signal?.aborted)throw Error('Source operation was replaced');
 const blob=new Blob([JSON.stringify({format:FORMAT,study:accepted,reference,target})],{type:'application/json'});
 if(blob.size>MAX_BUNDLE_BYTES)throw Error('Complete target and reference study exceeds 48 MB');return blob;
}
