import {validateSequence} from '/src/demonstration-sequence.mjs';
import {importOrderStudy,sameOrderSource,declareOrderPrerequisites} from '/src/order-evidence.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
export const ORDER_BUNDLE='skill-translator.order-evidence-bundle/v1';
export const TOTAL_FRAME_BYTES=32*1024*1024,TOTAL_PIXELS=32_000_000;
const check=(ok,s)=>{if(!ok)throw Error(s);};
export function budget(sources){
 let bytes=0,pixels=0;
 for(const source of sources.values()){
  for(const a of source.assets.values())bytes+=a.file.size;
  for(const m of source.sequence.moments)pixels+=m.image.widthPx*m.image.heightPx;
 }
 check(bytes<=TOTAL_FRAME_BYTES&&pixels<=TOTAL_PIXELS,'All retained examples together must fit 32 MB of PNG data and 32 megapixels.');
 return {bytes,pixels};
}
export function releaseOrderSources(sources){for(const source of sources.values())releaseSequenceAssets(source.assets);}
export async function readOrderBundle(file,{signal}={}){
 check(file&&file.size>0&&file.size<=MAX_BUNDLE_BYTES,'Choose an order study up to 48 MB.');
 const value=JSON.parse(await file.text());if(signal?.aborted)throw Error('Study import replaced.');
 check(value?.format===ORDER_BUNDLE,'Choose a saved order-evidence study.');
 const study=importOrderStudy(value.study);
 check(Array.isArray(value.declarations),'Saved declarations must be an explicit list.');
 const declarations=value.declarations.length?declareOrderPrerequisites(study,value.declarations).dependencies:[];
 const expected=[{id:'reference',sequence:study.reference},...study.comparisons];
 check(Array.isArray(value.sources)&&value.sources.length===expected.length,'Retain exactly one source bundle for each example.');
 const encoded=new Map();let pixels=0,bytes=0;
 for(const item of value.sources){
  check(item&&typeof item.id==='string'&&!encoded.has(item.id),'Source bundle identifiers must be unique.');encoded.set(item.id,item.bundle);
  const s=validateSequence(item.bundle?.sequence);for(const m of s.moments)pixels+=m.image.widthPx*m.image.heightPx;
  check(Array.isArray(item.bundle.frames),'Retained frames are required.');
  for(const frame of item.bundle.frames){
   check(typeof frame?.pngBase64==='string','Retained PNG data is required.');
   bytes+=Math.floor(frame.pngBase64.length*3/4)-(frame.pngBase64.endsWith('==')?2:frame.pngBase64.endsWith('=')?1:0);
  }
 }
 check(pixels<=TOTAL_PIXELS&&bytes<=TOTAL_FRAME_BYTES,'All examples exceed the shared 32 MB / 32 megapixel budget.');
 const sources=new Map();
 try{
  for(const item of expected){
   const raw=encoded.get(item.id);check(raw&&sameOrderSource(raw.sequence,item.sequence),'The study source and retained frame bundle differ.');
   const admitted=await readSequenceBundle(new File([JSON.stringify(raw)],'source.json',{type:'application/json'}),{signal});sources.set(item.id,admitted);
  }
  budget(sources);return {study,sources,declarations};
 }catch(e){releaseOrderSources(sources);throw e;}
}
export async function makeOrderBundle(study,sources,declarations,{signal}={}){
 const normalized=importOrderStudy(study);check(Array.isArray(declarations),'Supply explicit declarations.');
 const retainedDeclarations=declarations.length?declareOrderPrerequisites(normalized,declarations).dependencies:[];
 budget(sources);
 const items=[];
 for(const item of [{id:'reference',sequence:normalized.reference},...normalized.comparisons]){
  const supplied=sources.get(item.id);check(supplied&&sameOrderSource(supplied.sequence,item.sequence),'The retained source changed.');
  items.push({id:item.id,bundle:JSON.parse(await(await makeSequenceBundle(item.sequence,supplied.assets,{signal})).text())});
 }
 const blob=new Blob([JSON.stringify({format:ORDER_BUNDLE,study:normalized,sources:items,declarations:retainedDeclarations},null,2)],{type:'application/json'});
 check(blob.size<=MAX_BUNDLE_BYTES,'Saved order study exceeds 48 MB.');return blob;
}
