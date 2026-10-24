// Continue only in a distinctly hypothetical journal; readiness owns all semantics.
import {importReassessment,inspectReassessment} from './reassessment-rehearsal.mjs';
import {importReadiness,readinessFindings} from './task-readiness.mjs';
export const RECHECK_FORMAT='skill-translator.recheck-rehearsal/v1';
const require=(condition,message)=>{if(!condition)throw Error(message);};
function base(source,rehearsal){const accepted=importReassessment(source,rehearsal),finding=inspectReassessment(source,accepted);require(finding.revealed,'Reveal the revision consequences before practising reassessment');return {rehearsal:accepted,start:finding.consequences.hypothetical};}
export function createRecheck(source,rehearsal){const accepted=base(source,rehearsal);return {format:RECHECK_FORMAT,rehearsal:accepted.rehearsal,events:[]};}
function replay(source,input){require(input?.format===RECHECK_FORMAT,'Unsupported recheck rehearsal');const accepted=base(source,input.rehearsal);require(Array.isArray(input.events)&&input.events.length<=500,'Keep hypothetical observations within the maintained journal bound');require(input.events.every(e=>e&&['observe','practice'].includes(e.type)),'Retain hypothetical observations or matching raw practice only');const hypothetical=importReadiness(source,{...accepted.start,events:[...accepted.start.events,...input.events]});return {session:{format:RECHECK_FORMAT,rehearsal:accepted.rehearsal,events:hypothetical.events.slice(accepted.start.events.length)},hypothetical,startEventCount:accepted.start.events.length};}
export const importRecheck=(source,input)=>replay(source,input).session;
export function recordRecheck(source,input,event){const accepted=importRecheck(source,input);return importRecheck(source,{...accepted,events:[...accepted.events,event]});}
export function inspectRecheck(source,input){const accepted=replay(source,input),findings=readinessFindings(source,accepted.hypothetical);return {...accepted,findings,continuationJournal:findings.journal.filter(e=>e.eventIndex>=accepted.startEventCount),
 boundary:'All added observations belong to a hypothetical continuation after the revision consequences were disclosed. They do not report physical rechecks, authenticate results, or establish a shortest or safest physical recovery.'};}
