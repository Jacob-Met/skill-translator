import {importDecisionTransfer} from '/src/decision-transfer.mjs';
import {readComparison,makeComparison,release} from '/web/decision-comparison-input.mjs';
import {MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
const FORMAT='skill-translator.decision-transfer-bundle/v1';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export async function readTransfer(file,{signal}={}){
 if(!file||file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Choose a transfer rehearsal up to 48 MB');
 const value=JSON.parse(await file.text());if(value.format!==FORMAT)throw Error('Unsupported transfer bundle');
 const session=importDecisionTransfer(value.session);
 if(!same(value.comparison?.study,session.comparison))throw Error('Retained comparison differs from rehearsal source');
 const loaded=await readComparison(new File([JSON.stringify(value.comparison)],'comparison.json'),{signal});
 return {session,sources:loaded.sources};
}
export async function makeTransfer(session,sources,{signal}={}){
 const accepted=importDecisionTransfer(session),comparison=JSON.parse(await(await makeComparison(accepted.comparison,sources,{signal})).text());
 const blob=new Blob([JSON.stringify({format:FORMAT,session:accepted,comparison})],{type:'application/json'});
 if(blob.size>MAX_BUNDLE_BYTES)throw Error('Transfer rehearsal exceeds 48 MB');return blob;
}
