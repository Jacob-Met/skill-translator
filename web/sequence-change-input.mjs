import {createStateChange,validateStateChange,stateChangeSettings} from '/src/sequence-change.mjs';
import {BUNDLE_FORMAT,MAX_BUNDLE_BYTES,makeSequenceBundle,readSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';

export const CHANGE_BUNDLE_FORMAT='skill-translator.state-change-bundle/v1';
// The complete maintained sequence is kept once, with a small declaration record.
export const MAX_CHANGE_BUNDLE_BYTES=MAX_BUNDLE_BYTES+64*1024;
const current=signal=>{if(signal?.aborted)throw Error('The source comparison operation was replaced.');};
export async function readStateChangeBundle(file,{signal}={}){
  if(!file||file.size<1||file.size>MAX_CHANGE_BUNDLE_BYTES)throw Error('Choose a saved sequence or comparison up to 48 MiB plus its bounded declarations.');
  const value=JSON.parse(await file.text());current(signal);
  const saved=value?.format===CHANGE_BUNDLE_FORMAT;
  if(!saved&&value?.format!==BUNDLE_FORMAT)throw Error('Choose a saved demonstration sequence or calibrated-state comparison.');
  const source=saved?value.sourceBundle:value;
  const blob=new Blob([JSON.stringify(source)],{type:'application/json'});
  const received=await readSequenceBundle(blob,{signal});
  try{
    current(signal);
    const state=saved?validateStateChange({...value.comparison,sequence:received.sequence}):createStateChange(received.sequence,received.sequence.steps[0]?.id);
    return {state,assets:received.assets};
  }catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function makeStateChangeBundle(input,assets,{signal}={}){
  const state=validateStateChange(input),source=await makeSequenceBundle(state.sequence,assets,{signal});current(signal);
  const sourceBundle=JSON.parse(await source.text());current(signal);
  const blob=new Blob([JSON.stringify({format:CHANGE_BUNDLE_FORMAT,sourceBundle,comparison:stateChangeSettings(state)},null,2)],{type:'application/json'});
  if(blob.size>MAX_CHANGE_BUNDLE_BYTES)throw Error('The complete source comparison exceeds its saved-file limit; no evidence was removed.');
  return blob;
}
