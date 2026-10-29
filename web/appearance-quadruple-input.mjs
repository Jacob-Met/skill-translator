import {FORMAT,admitAppearanceQuadruple} from '/src/appearance-quadruple.mjs';
import {readAppearanceCompositionInput} from '/web/appearance-triplet-input.mjs';
import {readAppearanceInput,releaseAppearanceInput,sampleAppearanceFrames} from '/web/appearance-pair-input.mjs';
import {makeSequenceBundle,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
const check=signal=>{if(signal?.aborted)throw Error('Four-original appearance operation replaced');};
export async function readAppearanceFourInput(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Complete appearance source exceeds maintained bundle budget');
 const raw=JSON.parse(await file.text());check(signal);
 if(raw.format!==FORMAT)return readAppearanceCompositionInput(file,{signal});
 let loaded;
 try{
  loaded=await readAppearanceInput(new File([JSON.stringify(raw.original)],'original.json',{type:'application/json'}),{signal});check(signal);
  if(loaded.request)throw Error('Retain the complete original sequence as four-frame source');
  const request=admitAppearanceQuadruple(raw,loaded.sequence),result={...loaded,request};loaded=null;return result;
 }finally{if(loaded)releaseAppearanceInput(loaded);}
}
export async function makeAppearanceFourSamples(loaded,raw,{signal}={}){
 check(signal);const source=admitAppearanceQuadruple(raw,loaded.sequence);
 const samples=await sampleAppearanceFrames(loaded,source.request,{signal});check(signal);return {source,samples};
}
export async function makeAppearanceFourBundle(loaded,raw,{signal}={}){
 check(signal);const source=admitAppearanceQuadruple(raw,loaded.sequence);
 const original=JSON.parse(await(await makeSequenceBundle(loaded.sequence,loaded.assets,{signal})).text());check(signal);
 const blob=new Blob([JSON.stringify({...source,original})],{type:'application/json'});
 if(blob.size>MAX_BUNDLE_BYTES)throw Error('Complete saved appearance source exceeds maintained bundle budget');return blob;
}
