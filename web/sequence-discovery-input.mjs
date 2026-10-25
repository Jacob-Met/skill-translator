import {importSequenceDiscovery} from '/src/sequence-discovery.mjs';
import {BUNDLE_FORMAT,MAX_BUNDLE_BYTES,readSequenceBundle,makeSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
export const SEQUENCE_DISCOVERY_BUNDLE_FORMAT='skill-translator.sequence-discovery-bundle/v1';
export const MAX_DISCOVERY_BUNDLE_BYTES=MAX_BUNDLE_BYTES+4096;
const current=signal=>{if(signal?.aborted)throw Error('The demonstration relationship operation was replaced.');};
export async function readSequenceDiscoveryBundle(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_DISCOVERY_BUNDLE_BYTES)throw Error('Choose an original sequence or relationship bundle within 48 MiB plus declarations.');
 const raw=JSON.parse(await file.text());current(signal);
 const saved=raw?.format===SEQUENCE_DISCOVERY_BUNDLE_FORMAT;
 if(!saved&&raw?.format!==BUNDLE_FORMAT)throw Error('Choose a saved demonstration sequence with its original PNG frames.');
 const received=await readSequenceBundle(new Blob([JSON.stringify(saved?raw.sourceBundle:raw)]),{signal});
 try{current(signal);const account=saved?importSequenceDiscovery({format:'skill-translator.sequence-discovery/v1',sequence:received.sequence,declarations:raw.declarations}):null;return {...received,account};}
 catch(error){releaseSequenceAssets(received.assets);throw error;}
}
export async function makeSequenceDiscoveryBundle(raw,assets,{signal}={}){
 const account=importSequenceDiscovery(raw),source=await makeSequenceBundle(account.sequence,assets,{signal});current(signal);
 const sourceBundle=JSON.parse(await source.text());current(signal);
 const blob=new Blob([JSON.stringify({format:SEQUENCE_DISCOVERY_BUNDLE_FORMAT,sourceBundle,declarations:account.declarations})],{type:'application/json'});
 if(blob.size>MAX_DISCOVERY_BUNDLE_BYTES)throw Error('Complete original-frame account exceeds the bundle limit; no evidence was dropped.');
 return blob;
}
