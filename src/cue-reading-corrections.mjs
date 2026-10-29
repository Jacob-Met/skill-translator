import {inspectReadingProvenance} from './cue-reading-provenance.mjs';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const text=v=>typeof v==='string'&&v.trim()&&v.length<=1000;
export function inspectReadingCorrections(study,inputs){
 if(!exact(inputs,['maxErrors','basis','events'])||!Array.isArray(inputs.events)||inputs.events.length>90)throw Error('An explicit bounded event history is required');
 const entries=new Map(),ids=new Set(),audit=[];
 const inspect=values=>inspectReadingProvenance(study,{maxErrors:inputs.maxErrors,basis:inputs.basis,entries:values});
 inspect([]);
 for(const event of inputs.events){
  if(!event||!text(event.id)||ids.has(event.id)||!text(event.readingId))throw Error('Distinct event and reading identities required');ids.add(event.id);
  if(event.kind==='record'){
   if(!exact(event,['id','kind','readingId','entry'])||entries.has(event.readingId)||entries.size>=30)throw Error('New reading requires an unused identity and at most30 readings');
   inspect([event.entry]);entries.set(event.readingId,{entry:structuredClone(event.entry),revision:event.id});
   audit.push({id:event.id,kind:'record',readingId:event.readingId,entry:structuredClone(event.entry)});
  }else if(event.kind==='correct'){
   const old=entries.get(event.readingId);
   if(!exact(event,['id','kind','readingId','replaces','value','reason'])||!old||event.replaces!==old.revision||!text(event.reason)||!text(event.value))throw Error('Correction requires the current prior revision, category and explicit reason');
   const next={...old.entry,value:event.value};inspect([next]);
   audit.push({id:event.id,kind:'correct',readingId:event.readingId,replaces:old.revision,before:old.entry.value,after:event.value,cue:old.entry.cue,reason:event.reason});
   entries.set(event.readingId,{entry:next,revision:event.id});
  }else throw Error('Unknown reading event');
 }
 const active=[...entries].map(([readingId,v])=>({readingId,...v}));
 return {...inspect(active.map(v=>v.entry)),active,audit,correctionBoundary:'Corrections replace the active transcript of one reading; they are not another inspection. Original events remain retained. The same declared total mismatch bound applies to active readings. Correction does not verify source truth.'};
}
