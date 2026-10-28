import {FORMAT,admitAppearanceTriplet} from '/src/appearance-triplet.mjs';
import {readAppearanceInput,releaseAppearanceInput,sampleAppearanceFrames} from '/web/appearance-pair-input.mjs';
import {makeSequenceBundle,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
const check=signal=>{if(signal?.aborted)throw Error('Appearance composition operation replaced');};
export async function readAppearanceCompositionInput(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Complete appearance source exceeds maintained bundle budget');
 const raw=JSON.parse(await file.text());check(signal);
 if(raw.format!==FORMAT)return readAppearanceInput(file,{signal});
 let loaded;
 try{
  loaded=await readAppearanceInput(new File([JSON.stringify(raw.original)],'original.json',{type:'application/json'}),{signal});check(signal);
  // A composition must carry the complete original sequence, not another derived wrapper.
  if(loaded.request)throw Error('Retain the complete original sequence as composition source');
  const request=admitAppearanceTriplet(raw,loaded.sequence),result={...loaded,request};loaded=null;return result;
 }finally{if(loaded)releaseAppearanceInput(loaded);}
}
export async function makeAppearanceTripletSamples(loaded,raw,{signal}={}){
 check(signal);const source=admitAppearanceTriplet(raw,loaded.sequence);
 const samples=await sampleAppearanceFrames(loaded,source.request,{signal});check(signal);return {source,samples};
}
export async function makeAppearanceTripletBundle(loaded,raw,{signal}={}){
 check(signal);const source=admitAppearanceTriplet(raw,loaded.sequence);
 const original=JSON.parse(await(await makeSequenceBundle(loaded.sequence,loaded.assets,{signal})).text());check(signal);
 const blob=new Blob([JSON.stringify({...source,original})],{type:'application/json'});
 if(blob.size>MAX_BUNDLE_BYTES)throw Error('Complete saved appearance source exceeds maintained bundle budget');return blob;
}
