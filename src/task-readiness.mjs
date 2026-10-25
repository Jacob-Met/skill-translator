// Expert-declared dependencies and reported observations, not inferred causality.
import {readinessPracticeTask,inspectReadinessPractice} from './readiness-practice.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
import {importPrerequisiteRehearsal} from './prerequisite-rehearsal.mjs';
export const READINESS_FORMAT='skill-translator.task-readiness/v1';
export const PRACTICE_READINESS_FORMAT='skill-translator.task-readiness/v2';
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const text=(v,label,max=1600)=>{assert(typeof v==='string'&&v.trim()&&v.length<=max,`${label} must contain bounded text`);return v.trim();};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function createReadiness(sequence,prerequisiteRecord,definitions){
  const source=validateSequence(sequence),prerequisites=importPrerequisiteRehearsal(source,prerequisiteRecord);
  assert(source.steps.length>0,'Retain at least one demonstrated step');
  assert(Array.isArray(definitions)&&definitions.length===source.steps.length,'Declare checks for every demonstrated step');
  const ids=new Set(source.steps.map(s=>s.id)),seen=new Set();
  const steps=definitions.map(d=>{
    assert(d&&ids.has(d.stepId)&&!seen.has(d.stepId),'Each demonstrated step needs one definition');seen.add(d.stepId);
    assert(!Object.hasOwn(d,'requires'),'Use the maintained prerequisite declaration; completion checks cannot redefine dependencies');
    assert(Array.isArray(d.checks)&&d.checks.length>0&&d.checks.length<=8,'Declare 1–8 observable completion checks per step');
    const keys=new Set();const checks=d.checks.map(c=>{assert(c&&typeof c.id==='string'&&/^[a-zA-Z][\w-]{0,63}$/.test(c.id)&&!keys.has(c.id),'Check identifiers must be unique and short');keys.add(c.id);let placement; if(c.placement!==undefined){const context=readinessPracticeTask(source,d.stepId,c.placement);placement={widthMm:context.widthMm,heightMm:context.heightMm};} return {id:c.id,prompt:text(c.prompt,'Completion check'),basis:text(c.basis,'Expert basis'),...(placement?{placement}:{})};});
    return {stepId:d.stepId,checks};
  });
  return {format:steps.some(s=>s.checks.some(c=>c.placement))?PRACTICE_READINESS_FORMAT:READINESS_FORMAT,source,prerequisites,definitions:steps,events:[]};
}
function replay(sequence,input){
  assert([READINESS_FORMAT,PRACTICE_READINESS_FORMAT].includes(input?.format),'Unsupported readiness study');
  const base=createReadiness(sequence,input.prerequisites,input.definitions);
  assert(input.format===base.format,'Practice-backed checks require the v2 readiness format');
  assert(same(base.source,validateSequence(input.source)),'The demonstration frames or authored account changed');
  assert(Array.isArray(input.events)&&input.events.length<=500,'Keep at most 500 journal events');
  const byId=new Map(base.definitions.map(s=>[s.stepId,s]));
  const observations=new Map(base.definitions.map(s=>[s.stepId,new Map()]));
  // Compile only this admitted journal's graph. Preserve declaration order so
  // blocked-by and transitive invalidation witnesses remain byte-compatible.
  const parents=new Map(base.definitions.map(s=>[s.stepId,[]]));
  const children=new Map(base.definitions.map(s=>[s.stepId,[]]));
  for(const edge of base.prerequisites.dependencies){parents.get(edge.after).push(edge.before);children.get(edge.before).push(edge.after);}
  const downstream=new Map();
  for(const id of byId.keys()){
    const out=new Set();
    function scan(parent){for(const child of children.get(parent))if(!out.has(child)){out.add(child);scan(child);}}
    scan(id);downstream.set(id,[...out]);
  }
  const statusMemo=new Map();
  const choices=[],events=[];let practiceBytes=0;
  function status(id,memo=statusMemo){
    if(memo.has(id))return memo.get(id);
    const definition=byId.get(id),blockedBy=parents.get(id).filter(dep=>!status(dep,memo).complete);
    const checks=definition.checks.map(c=>({...c,observation:observations.get(id).get(c.id)||null}));
    const complete=blockedBy.length===0&&checks.every(c=>c.observation?.value==='pass');
    const result={stepId:id,ready:blockedBy.length===0,complete,blockedBy,checks};memo.set(id,result);return result;
  }
  for(const e of input.events){
    assert(e&&byId.has(e.stepId),'Journal action refers to an unavailable step');
    if(e.type==='observe'||e.type==='practice'){
      const check=byId.get(e.stepId).checks.find(c=>c.id===e.checkId);
      assert(check,'Choose a declared completion check');
      let received=null,value=e.value,evidenceClass=e.evidenceClass;
      if(e.type==='practice'){
        assert(check.placement,'This check has no declared geometric practice binding');
        practiceBytes+=new TextEncoder().encode(JSON.stringify(e.session)).length;
        assert(practiceBytes<=4_000_000,'Keep retained practice evidence below 4 MB per study');
        received=inspectReadinessPractice(base.source,e.stepId,check.placement,e.session);
        value=received.value;evidenceClass='computed-placement';
      }else assert(!check.placement,'Import matching raw practice evidence for this geometric check');
      assert(byId.get(e.stepId).checks.some(c=>c.id===e.checkId),'Choose a declared completion check');
      assert(['pass','fail','unknown'].includes(value),'Report pass, fail or unknown');
      assert(received||['authored-example','reported-observation'].includes(evidenceClass),'Declare the evidence class');
      const note=text(e.note,'Observation note');
      // Observing a blocked step is retained, but cannot earn completion credit.
      // Every revision invalidates downstream observations, even pass→pass:
      // a newly observed predecessor is not evidence of an unchanged successor.
      const invalidated=downstream.get(e.stepId).filter(id=>observations.get(id).size);
      for(const id of downstream.get(e.stepId))observations.get(id).clear();
      observations.get(e.stepId).set(e.checkId,{value,note,evidenceClass,eventIndex:events.length,...(received?{practice:received}:{})});
      statusMemo.clear();
      events.push(received?{type:'practice',stepId:e.stepId,checkId:e.checkId,note,session:received.session}:{type:'observe',stepId:e.stepId,checkId:e.checkId,value,note,evidenceClass});
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

