// Producer-to-inference adapter; pair enumeration stays with relationship-discovery.
import {validateSequence} from './demonstration-sequence.mjs';
import {DISCOVERY_FORMAT,importRelationshipDiscovery} from './relationship-discovery.mjs';
import {GeometryError} from './geometry.mjs';
export const SEQUENCE_DISCOVERY_FORMAT='skill-translator.sequence-discovery/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createSequenceDiscovery(input,options){
 const sequence=validateSequence(input);
 check(options?.correspondenceConfirmed===true,'Confirm that matching mark IDs denote the same task points at every retained moment.');
 check(options?.commonFixedPlaneConfirmed===true,'Confirm the same fixed planar reference and corner meanings across these moments.');
 check(typeof options.basis==='string'&&options.basis.trim()&&options.basis.length<=1200,'Describe the basis for the common reference and point identities within 1200 characters.');
 const moments=sequence.moments.filter(m=>m.calibratedTask);
 check(moments.length>=2,'Attach calibrated annotations to at least two retained moments first.');
 const size=moments[0].calibratedTask.source;
 check(moments.every(m=>m.calibratedTask.source.widthMm===size.widthMm&&m.calibratedTask.source.heightMm===size.heightMm),'A demonstrated motion needs the same declared reference-plane dimensions in every calibrated moment.');
 const declarations={correspondenceConfirmed:true,commonFixedPlaneConfirmed:true,basis:options.basis.trim(),evidenceClass:options.evidenceClass,deviationMm:options.deviationMm};
 // Validate using the exact maintained consumer, including its input bounds.
 importRelationshipDiscovery({format:DISCOVERY_FORMAT,deviationMm:declarations.deviationMm,demonstrations:moments.map((m,i)=>({id:`moment-${i+1}`,annotation:m.calibratedTask,evidenceClass:declarations.evidenceClass,correspondenceConfirmed:true}))});
 return {format:SEQUENCE_DISCOVERY_FORMAT,sequence,declarations};
}
export function importSequenceDiscovery(raw){
 check(raw?.format===SEQUENCE_DISCOVERY_FORMAT,'Open a complete demonstrated-moment relationship account.');
 return createSequenceDiscovery(raw.sequence,raw.declarations);
}
export function sequenceDiscoveryInputs(raw){
 const account=importSequenceDiscovery(raw),moments=account.sequence.moments.filter(m=>m.calibratedTask);
 return {account,study:importRelationshipDiscovery({format:DISCOVERY_FORMAT,deviationMm:account.declarations.deviationMm,demonstrations:moments.map((m,i)=>({id:`moment-${i+1}`,annotation:m.calibratedTask,evidenceClass:account.declarations.evidenceClass,correspondenceConfirmed:true}))}),
  sources:moments.map((m,i)=>({demonstrationId:`moment-${i+1}`,momentId:m.id,label:m.label,presentedSeconds:m.origin.mediaTimeSeconds})),
  uncalibratedMoments:account.sequence.moments.filter(m=>!m.calibratedTask).map(m=>({momentId:m.id,label:m.label,presentedSeconds:m.origin.mediaTimeSeconds}))};
}
