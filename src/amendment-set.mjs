import {importReplyComparison,inspectReplyComparison} from './reply-comparison.mjs';
import {importDecisionComparison} from './decision-comparison.mjs';
import {GeometryError} from './geometry.mjs';
export const AMENDMENT_SET_FORMAT='skill-translator.amendment-set/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createAmendmentSet(comparison,replies,selectedIndices){
 const source=importReplyComparison(comparison,replies);
 check(Array.isArray(selectedIndices)&&selectedIndices.length>=2&&selectedIndices.length<=6&&Array.from({length:selectedIndices.length},(_,i)=>Object.hasOwn(selectedIndices,i)).every(Boolean),'Explicitly select two to six complete reply indices');
 const selected=[...selectedIndices],seen=new Set();
 check(selected.every(i=>Number.isInteger(i)&&i>=0&&i<source.replies.length)&&new Set(selected).size===selected.length,'Select distinct existing replies');
 for(const index of selected){const row=source.replies[index];check(row.kind!=='explanation','An explanation alone does not authorize a source amendment');check(!seen.has(row.exampleIndex),'Choose at most one proposed account for each original example');seen.add(row.exampleIndex);}
 const result={format:AMENDMENT_SET_FORMAT,replies:source,selectedIndices:selected};
 check(new TextEncoder().encode(JSON.stringify(result)).length<=1024*1024,'Selected amendment account exceeds the 1 MiB reopen limit');return result;
}
export function importAmendmentSet(comparison,value){
 check(value?.format===AMENDMENT_SET_FORMAT,'Unsupported selected amendment account');
 return createAmendmentSet(comparison,value.replies,value.selectedIndices);
}
export function inspectAmendmentSet(comparison,value){
 const source=importAmendmentSet(comparison,value),original=importDecisionComparison(comparison),findings=inspectReplyComparison(original,source.replies);
 const selected=source.selectedIndices.map(i=>findings.alternatives[i]),byExample=new Map(selected.map(f=>[f.reply.exampleIndex,f.amendedSource]));
 const amendedComparison=importDecisionComparison({...original,examples:original.examples.map((row,i)=>({...row,source:byExample.get(i)??row.source})),relationship:'unresolved',explanation:''});
 return {source,selected,amendedComparison,originalComparison:original,authorIdentityAuthenticated:false,combinedTruthEstablished:false};
}
