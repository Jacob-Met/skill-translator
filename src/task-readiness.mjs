// Expert-declared dependencies and reported observations, not inferred causality.
import {validateSequence} from './demonstration-sequence.mjs';
export const READINESS_FORMAT='skill-translator.task-readiness/v1';
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const text=(v,label,max=1600)=>{assert(typeof v==='string'&&v.trim()&&v.length<=max,`${label} must contain bounded text`);return v.trim();};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function createReadiness(sequence,definitions){
  const source=validateSequence(sequence);
  assert(source.steps.length>0,'Retain at least one demonstrated step');
  assert(Array.isArray(definitions)&&definitions.length===source.steps.length,'Declare checks for every demonstrated step');
  const ids=new Set(source.steps.map(s=>s.id)),seen=new Set();
  const steps=definitions.map(d=>{
    assert(d&&ids.has(d.stepId)&&!seen.has(d.stepId),'Each demonstrated step needs one definition');seen.add(d.stepId);
    assert(Array.isArray(d.requires)&&new Set(d.requires).size===d.requires.length&&d.requires.every(id=>ids.has(id)&&id!==d.stepId),'Prerequisites must be distinct other demonstrated steps');
    assert(Array.isArray(d.checks)&&d.checks.length>0&&d.checks.length<=8,'Declare 1–8 observable completion checks per step');
    const keys=new Set();const checks=d.checks.map(c=>{assert(c&&typeof c.id==='string'&&/^[a-zA-Z][\w-]{0,63}$/.test(c.id)&&!keys.has(c.id),'Check identifiers must be unique and short');keys.add(c.id);return {id:c.id,prompt:text(c.prompt,'Completion check'),basis:text(c.basis,'Expert basis')};});
    return {stepId:d.stepId,requires:[...d.requires],checks};
  });
  const visiting=new Set(),done=new Set(),byId=new Map(steps.map(s=>[s.stepId,s]));
  function visit(id){assert(!visiting.has(id),'Declared prerequisites contain a cycle');if(done.has(id))return;visiting.add(id);byId.get(id).requires.forEach(visit);visiting.delete(id);done.add(id);}
  steps.forEach(s=>visit(s.stepId));
  return {format:READINESS_FORMAT,source,definitions:steps,events:[]};
}
function replay(sequence,input){
  assert(input?.format===READINESS_FORMAT,'Unsupported readiness study');
  const base=createReadiness(sequence,input.definitions);
  assert(same(base.source,validateSequence(input.source)),'The demonstration frames or authored account changed');
  assert(Array.isArray(input.events)&&input.events.length<=500,'Keep at most 500 journal events');
  const byId=new Map(base.definitions.map(s=>[s.stepId,s]));
  const observations=new Map(base.definitions.map(s=>[s.stepId,new Map()]));
  const choices=[],events=[];
  function status(id,memo=new Map()){
    if(memo.has(id))return memo.get(id);
    const definition=byId.get(id),blockedBy=definition.requires.filter(dep=>!status(dep,memo).complete);
    const checks=definition.checks.map(c=>({...c,observation:observations.get(id).get(c.id)||null}));
    const complete=blockedBy.length===0&&checks.every(c=>c.observation?.value==='pass');
    const result={stepId:id,ready:blockedBy.length===0,complete,blockedBy,checks};memo.set(id,result);return result;
  }
  function descendants(id){const out=new Set();function scan(parent){for(const s of base.definitions)if(s.requires.includes(parent)&&!out.has(s.stepId)){out.add(s.stepId);scan(s.stepId);}}scan(id);return out;}
  for(const e of input.events){
    assert(e&&byId.has(e.stepId),'Journal action refers to an unavailable step');
    if(e.type==='observe'){
      assert(byId.get(e.stepId).checks.some(c=>c.id===e.checkId),'Choose a declared completion check');
      assert(['pass','fail','unknown'].includes(e.value),'Report pass, fail or unknown');
      assert(['authored-example','reported-observation'].includes(e.evidenceClass),'Declare the evidence class');
      const note=text(e.note,'Observation note');
      // Observing a blocked step is retained, but cannot earn completion credit.
      // Every revision invalidates downstream observations, even pass→pass:
      // a newly observed predecessor is not evidence of an unchanged successor.
      const invalidated=[...descendants(e.stepId)].filter(id=>observations.get(id).size);
      for(const id of descendants(e.stepId))observations.get(id).clear();
      observations.get(e.stepId).set(e.checkId,{value:e.value,note,evidenceClass:e.evidenceClass,eventIndex:events.length});
      events.push({type:'observe',stepId:e.stepId,checkId:e.checkId,value:e.value,note,evidenceClass:e.evidenceClass});
      // Derived invalidation is computed on replay, never accepted from saved input.
      if(invalidated.length)choices.push({type:'invalidation',eventIndex:events.length-1,stepIds:invalidated});
    }else if(e.type==='choose'){
      assert(['ready','blocked','uncertain'].includes(e.prediction),'Predict readiness or declare uncertainty');
      const reason=text(e.reason,'Learner reasoning'),finding=status(e.stepId);
      choices.push({type:'choice',eventIndex:events.length,stepId:e.stepId,prediction:e.prediction,reason,
        evidenceReady:finding.ready,blockedBy:[...finding.blockedBy],matchesDeclaredEvidence:e.prediction==='uncertain'?null:(e.prediction==='ready')===finding.ready});
      events.push({type:'choose',stepId:e.stepId,prediction:e.prediction,reason});
    }else assert(false,'Unsupported readiness journal action');
  }
  return {study:{...base,events},steps:base.definitions.map(s=>status(s.stepId)),journal:choices};
}
export function importReadiness(sequence,input){return replay(sequence,input).study;}
export function readinessFindings(sequence,input){const {study,...findings}=replay(sequence,input);return findings;}
export function recordReadiness(sequence,input,event){const accepted=importReadiness(sequence,input);return importReadiness(sequence,{...accepted,events:[...accepted.events,event]});}
