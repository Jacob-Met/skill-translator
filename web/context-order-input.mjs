import {importPrerequisiteRehearsal} from '/src/prerequisite-rehearsal.mjs';
import {MAX_CONTEXT_STEPS} from '/src/context-order.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
export const CONTEXT_BUNDLE='skill-translator.context-order-bundle/v1';
const PREREQUISITE_BUNDLE='skill-translator.prerequisite-bundle/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function normalizeContextDrafts(source,values){
 check(Array.isArray(values)&&values.length===source.steps.length,'Saved context drafts must explicitly cover every retained step.');
 const ids=new Set(source.steps.map(s=>s.id)),byId=new Map();
 for(const value of values){check(value&&ids.has(value.stepId)&&!byId.has(value.stepId),'Context drafts must name each retained step exactly once.');check(!Object.hasOwn(value,'requires'),'Context drafts cannot redefine the imported prerequisites.');check(typeof value.context==='string'&&value.context.length<=80&&typeof value.basis==='string'&&value.basis.length<=1200,'Keep context labels within 80 and authored bases within 1200 characters.');byId.set(value.stepId,{stepId:value.stepId,context:value.context,basis:value.basis});}
 return source.steps.map(s=>byId.get(s.id));
}
export async function readContextBundle(file,{signal}={}){
 check(file&&file.size>0&&file.size<=MAX_BUNDLE_BYTES,'Choose a saved prerequisite rehearsal or context study up to 48 MB.');
 const value=JSON.parse(await file.text());if(signal?.aborted)throw Error('Context source admission replaced.');
 check([CONTEXT_BUNDLE,PREREQUISITE_BUNDLE].includes(value?.format),'Open a saved prerequisite rehearsal or context study with retained source frames.');
 const raw=value.sourceBundle,record=value.format===CONTEXT_BUNDLE?value.prerequisites:value.rehearsal;
 const prerequisites=importPrerequisiteRehearsal(raw?.sequence,record),source=prerequisites.source;
 check(source.steps.length<=MAX_CONTEXT_STEPS,`This exact comparison supports at most ${MAX_CONTEXT_STEPS} authored steps; no steps were dropped.`);
 const drafts=normalizeContextDrafts(source,value.format===CONTEXT_BUNDLE?value.contexts:source.steps.map(s=>({stepId:s.id,context:'',basis:''})));
 let media=null;
 try{media=await readSequenceBundle(new File([JSON.stringify(raw)],'source.json',{type:'application/json'}),{signal});if(signal?.aborted)throw Error('Context source admission replaced.');return {media,prerequisites,drafts};}catch(e){if(media)releaseSequenceAssets(media.assets);throw e;}
}
export async function makeContextBundle(state,{originalOnly=false,signal}={}){
 const prerequisites=importPrerequisiteRehearsal(state.media.sequence,state.prerequisites);
 check(prerequisites.source.steps.length<=MAX_CONTEXT_STEPS,`This exact comparison supports at most ${MAX_CONTEXT_STEPS} authored steps; no steps were dropped.`);
 const contexts=normalizeContextDrafts(prerequisites.source,state.drafts);
 const sourceBundle=JSON.parse(await(await makeSequenceBundle(prerequisites.source,state.media.assets,{signal})).text());
 const value=originalOnly?{format:PREREQUISITE_BUNDLE,sourceBundle,rehearsal:prerequisites}:{format:CONTEXT_BUNDLE,sourceBundle,prerequisites,contexts};
 const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});check(blob.size<=MAX_BUNDLE_BYTES,'The saved source and declarations exceed 48 MB.');return blob;
}
