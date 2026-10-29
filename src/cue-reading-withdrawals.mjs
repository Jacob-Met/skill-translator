import {inspectReadingCorrections} from './cue-reading-corrections.mjs';
import {inspectReadingProvenance} from './cue-reading-provenance.mjs';
export function inspectReadingWithdrawals(study,inputs){
 if(!inputs||Object.keys(inputs).sort().join(',')!=='basis,events,maxErrors'||!Array.isArray(inputs.events)||inputs.events.length>90)throw Error('Explicit bounded event history required');
 const events=[],withdrawn=new Map(),ids=new Set(),audit=[];
 for(const event of inputs.events){
  if(!event||typeof event.id!=='string'||!event.id.trim()||event.id.length>1000||ids.has(event.id))throw Error('Distinct event identities required');ids.add(event.id);
  if(withdrawn.has(event.readingId))throw Error('Withdrawn reading cannot be corrected or withdrawn again');
  if(event.kind==='withdraw'){
   if(Object.keys(event).sort().join(',')!=='id,kind,readingId,reason,replaces'||typeof event.reason!=='string'||!event.reason.trim()||event.reason.length>1000)throw Error('Withdrawal requires an explicit reason');
   const prior=inspectReadingCorrections(study,{...inputs,events}).active.find(x=>x.readingId===event.readingId);
   if(!prior||prior.revision!==event.replaces)throw Error('Withdrawal requires the current revision of an existing reading');
   withdrawn.set(event.readingId,{...structuredClone(event),entry:structuredClone(prior.entry)});audit.push(structuredClone(event));
  }else{events.push(event);const result=inspectReadingCorrections(study,{...inputs,events});audit.push(result.audit.at(-1));}
 }
 const retained=inspectReadingCorrections(study,{...inputs,events});
 const active=retained.active.filter(x=>!withdrawn.has(x.readingId));
 return {...inspectReadingProvenance(study,{maxErrors:inputs.maxErrors,basis:inputs.basis,entries:active.map(x=>x.entry)}),active,audit,withdrawn:[...withdrawn.values()],withdrawalBoundary:'Withdrawn readings remain in original history but do not count toward the active total mismatch bound. Withdrawal is an explicit exclusion, not evidence that remaining readings are true. A new inspection requires a new reading identity.'};
}
