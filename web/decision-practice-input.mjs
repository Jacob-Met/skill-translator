import {importDecisionPractice} from '/src/decision-practice.mjs';
import {makeSequenceBundle,readSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';

export const PRACTICE_BUNDLE_FORMAT='skill-translator.decision-practice-bundle/v1';
export const MAX_PRACTICE_BYTES=1024*1024;
export const MAX_PRACTICE_BUNDLE_BYTES=MAX_BUNDLE_BYTES+MAX_PRACTICE_BYTES;
const checked=signal=>{if(signal?.aborted)throw Error('The practice operation was replaced.');};

export async function makeDecisionPracticeBundle(source,assets,session,{signal}={}){
  const practice=importDecisionPractice(source,session),practiceText=JSON.stringify(practice);
  if(new Blob([practiceText]).size>MAX_PRACTICE_BYTES)throw Error('Practice exceeds the 1 MiB export limit.');
  const original=await makeSequenceBundle(source,assets,{signal});checked(signal);
  // Keep the maintained source bundle intact, including every original PNG.
  const blob=new Blob(['{"format":',JSON.stringify(PRACTICE_BUNDLE_FORMAT),',"source":',original,',"practice":',practiceText,'}'],{type:'application/json'});
  if(blob.size>MAX_PRACTICE_BUNDLE_BYTES)throw Error('The complete practice exceeds its source and action budgets.');
  return blob;
}

export async function readDecisionPracticeBundle(file,{signal}={}){
  if(!file||file.size<1||file.size>MAX_PRACTICE_BUNDLE_BYTES)throw Error('Choose a complete practice within the 49 MiB source and action budgets.');
  const value=JSON.parse(await file.text());checked(signal);
  if(value?.format!==PRACTICE_BUNDLE_FORMAT)throw Error('Choose a complete decision practice with its original frames.');
  if(new Blob([JSON.stringify(value.practice)]).size>MAX_PRACTICE_BYTES)throw Error('Practice exceeds the 1 MiB action budget.');
  const sourceFile=new Blob([JSON.stringify(value.source)],{type:'application/json'});
  const loaded=await readSequenceBundle(sourceFile,{signal});
  try{checked(signal);return {...loaded,session:importDecisionPractice(loaded.sequence,value.practice)};}
  catch(error){releaseSequenceAssets(loaded.assets);throw error;}
}
