import {readComparison,release} from '/web/decision-comparison-input.mjs';
import {readSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
export async function verifyJointProducerImages(raw){
 for(const value of raw.producer_exports??[]){
  if(!['skill-translator.numeric-cue-bundle/v1','skill-translator.numeric-cue-bundle/v2'].includes(value?.format))continue;
  let comparison=null,target=null;
  try{
   comparison=await readComparison(new File([JSON.stringify(value.comparison)],'comparison.json',{type:'application/json'}));
   if(value.target)target=await readSequenceBundle(new File([JSON.stringify(value.target)],'target.json',{type:'application/json'}));
  }finally{
   if(comparison)release(comparison.sources);
   if(target)releaseSequenceAssets(target.assets);
  }
 }
}
