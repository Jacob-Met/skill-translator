import {readSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
export async function openReadinessBundle(value){
  const accepted=await readSequenceBundle(new File([JSON.stringify(value)],'demonstration.json',{type:'application/json'}));
  // Keep normalized source plus exact admitted bytes; never export saved findings.
  const bundle={format:'skill-translator.sequence-bundle/v1',sequence:accepted.sequence,frames:structuredClone(value.frames)};
  return {sequence:accepted.sequence,urlFor:id=>accepted.assets.get(id)?.media.url,
    bundle,dispose:()=>releaseSequenceAssets(accepted.assets)};
}
export function saveReadinessBundle(evidence){return structuredClone(evidence.bundle);}
