import {executeFixedReadings} from './cue-fixed-execution.mjs';
import {executeAdaptiveCueReadings} from './cue-adaptive-repeat.mjs';
import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectReadingWithdrawals} from './cue-reading-withdrawals.mjs';
export const HISTORY_FORMAT='skill-translator.cue-execution-history/v1';
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(x){if(Array.isArray(x))return x.map(canonical);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));return x;}
function derive(original,origin){
 if(!origin||Object.keys(origin).sort().join(',')!=='answers,format,inputs,planning')throw Error('Retain the exact frozen run inputs, planning and answers');
 if(!['skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v2'].includes(original?.format))throw Error('Original v1/v2 cue source required; later metadata must remain in its own workflow');
 const study=importCueStudy(original.study);let run,current;
 if(origin.format==='skill-translator.cue-fixed-execution/v1'){run=executeFixedReadings(study,origin.inputs,origin.planning,origin.answers);current=run.currentInputs;}
 else if(origin.format==='skill-translator.cue-adaptive-repeat/v1'){run=executeAdaptiveCueReadings(study,origin.inputs,origin.planning,origin.answers);current={...structuredClone(origin.inputs),events:[...structuredClone(origin.inputs.events),...run.steps.map(s=>structuredClone(s.event))]};}
 else throw Error('A retained fixed or adaptive execution is required');
 return {study,run,current};
}
export function inspectExecutionHistory(raw){
 const own=raw?.format===HISTORY_FORMAT;
 const original=raw?.original;
 const origin=own?raw.origin:{format:raw?.format,inputs:raw?.inputs,planning:raw?.planning,answers:raw?.answers};
 const {study,run,current}=derive(original,origin),inputs=own?raw.inputs:current;
 if(!inputs||!Array.isArray(inputs.events)||!same(inputs.events.slice(0,current.events.length),current.events))throw Error('The original derived event prefix must remain unchanged; use explicit correction or withdrawal events');
 if(inputs.maxErrors!==current.maxErrors||inputs.basis!==current.basis)throw Error('Preserve the original total bound and assumption basis in this continuation');
 const account=inspectReadingWithdrawals(study,inputs);
 return {original:structuredClone(original),origin:structuredClone(origin),inputs:structuredClone(inputs),run,account,prefixLength:current.events.length,continuationEvents:inputs.events.length-current.events.length,
 boundary:'The frozen run retains its original horizon, total bound, inputs and supplied answers. Later events are an explicit history continuation, not changes to the original run, new policy answers or a refilled horizon. Corrections revise transcripts without adding inspections; withdrawals retain excluded entries. Original source inspection remains an observer report, not physical truth.'};
}
export function exportExecutionHistory(raw,events){
 const accepted=inspectExecutionHistory(raw);const value={format:HISTORY_FORMAT,original:accepted.original,origin:accepted.origin,inputs:{...accepted.inputs,events:structuredClone(events??accepted.inputs.events)}};
 inspectExecutionHistory(value);return value;
}
