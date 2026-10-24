import {validateSequence} from '/src/demonstration-sequence.mjs';
import {importDecisionComparison} from '/src/decision-comparison.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
import {budget} from '/web/order-evidence-input.mjs';
const FORMAT='skill-translator.decision-comparison-bundle/v1';
export const release=sources=>sources.forEach(s=>releaseSequenceAssets(s.assets));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export async function readComparison(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Choose a comparison up to 48 MB');
 const value=JSON.parse(await file.text()),sources=[];
 if(value.format!==FORMAT)throw Error('Unsupported comparison bundle');
 const study=importDecisionComparison(value.study);
 if(!Array.isArray(value.sources)||value.sources.length!==study.examples.length)throw Error('Retain every original source bundle');
 // Reject shared capacity before decoding any image bytes.
 let pixels=0,bytes=0;
 for(const raw of value.sources){
  for(const m of validateSequence(raw?.sequence).moments)pixels+=m.image.widthPx*m.image.heightPx;
  if(!Array.isArray(raw.frames))throw Error('Retain original source frames');
  for(const frame of raw.frames){if(typeof frame?.pngBase64!=='string')throw Error('Retain PNG frame data');bytes+=Math.floor(frame.pngBase64.length*3/4)-(frame.pngBase64.endsWith('==')?2:frame.pngBase64.endsWith('=')?1:0);}
 }
 if(pixels>32_000_000||bytes>32*1024*1024)throw Error('All examples exceed the shared 32 MB / 32 megapixel budget');
 try{
  for(let i=0;i<value.sources.length;i++){
   if(!same(value.sources[i]?.sequence,study.examples[i].source))throw Error('Original source differs from comparison');
   sources.push(await readSequenceBundle(new File([JSON.stringify(value.sources[i])],'source.json'),{signal}));
   budget(new Map(sources.map((s,i)=>[i,s])));
  }
  return {study,sources};
 }catch(e){release(sources);throw e;}
}
export async function makeComparison(study,sources,{signal}={}){
 const accepted=importDecisionComparison(study);budget(new Map(sources.map((s,i)=>[i,s])));
 if(sources.length!==accepted.examples.length)throw Error('Retain every source');
 const bundles=[];
 for(let i=0;i<sources.length;i++){
  if(!same(sources[i].sequence,accepted.examples[i].source))throw Error('Original source differs from comparison');
  bundles.push(JSON.parse(await(await makeSequenceBundle(sources[i].sequence,sources[i].assets,{signal})).text()));
 }
 const blob=new Blob([JSON.stringify({format:FORMAT,study:accepted,sources:bundles})],{type:'application/json'});
 if(blob.size>MAX_BUNDLE_BYTES)throw Error('Comparison exceeds 48 MB');return blob;
}
