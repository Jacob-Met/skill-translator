import {validateSequence} from './demonstration-sequence.mjs';
import {GeometryError} from './geometry.mjs';

export const PREREQUISITE_FORMAT='skill-translator.prerequisite-rehearsal/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function order(value,source){
  const ids=new Set(source.steps.map(step=>step.id));
  check(Array.isArray(value)&&value.length<=ids.size&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&ids.has(id)),'Choose each retained step at most once.');
  return [...value];
}
export function createPrerequisiteRehearsal(sequence,edges=[]){
  const source=validateSequence(sequence),ids=new Set(source.steps.map(step=>step.id));
  check(ids.size>0,'Retain at least one authored step before rehearsing.');
  check(Array.isArray(edges)&&edges.length<=276,'Supply at most 276 declared prerequisites.');
  const pairs=new Set();
  const dependencies=edges.map(edge=>{
    check(edge&&typeof edge==='object'&&!Array.isArray(edge)&&ids.has(edge.before)&&ids.has(edge.after)&&edge.before!==edge.after,'Each prerequisite must connect two different retained steps.');
    check(typeof edge.reason==='string'&&edge.reason.trim().length>0&&edge.reason.length<=1200,'Explain each prerequisite in 1–1200 characters.');
    const pair=JSON.stringify([edge.before,edge.after]);check(!pairs.has(pair),'A prerequisite pair may be declared only once.');pairs.add(pair);
    return {before:edge.before,after:edge.after,reason:edge.reason.trim()};
  });
  const remaining=new Set(ids),done=new Set();
  while(remaining.size){
    const ready=[...remaining].filter(id=>dependencies.filter(edge=>edge.after===id).every(edge=>done.has(edge.before)));
    check(ready.length>0,'Declared prerequisites contain a cycle.');
    for(const id of ready){remaining.delete(id);done.add(id);}
  }
  return {format:PREREQUISITE_FORMAT,source,dependencies,attempt:null};
}
export function importPrerequisiteRehearsal(sequence,bundle){
  check(bundle&&bundle.format===PREREQUISITE_FORMAT,'Open a prerequisite rehearsal record.');
  check(Array.isArray(bundle.dependencies),'Saved prerequisites must be explicitly retained, including an empty list.');
  const base=createPrerequisiteRehearsal(sequence,bundle.dependencies);
  check(same(base.source,validateSequence(bundle.source)),'The source frames or authored account changed; use the matching demonstration.');
  return {...base,attempt:bundle.attempt===null?null:order(bundle.attempt,base.source)};
}
export function submitPrerequisiteAttempt(sequence,bundle,attempt){
  const base=importPrerequisiteRehearsal(sequence,bundle);
  check(base.attempt===null,'The first submitted attempt is retained. Start another rehearsal to try again.');
  return {...base,attempt:order(attempt,base.source)};
}
export function prerequisiteFindings(sequence,bundle){
  const base=importPrerequisiteRehearsal(sequence,bundle),attempt=base.attempt??[],positions=new Map(attempt.map((id,index)=>[id,index]));
  const violations=base.dependencies.filter(edge=>positions.has(edge.after)&&(!positions.has(edge.before)||positions.get(edge.before)>positions.get(edge.after))).map(edge=>({
    ...edge,kind:positions.has(edge.before)?'reversed':'missing-prerequisite',
    beforePosition:positions.get(edge.before)??null,afterPosition:positions.get(edge.after)
  }));
  const missing=base.source.steps.map(step=>step.id).filter(id=>!positions.has(id));
  const availableNext=violations.length?[]:missing.filter(id=>base.dependencies.filter(edge=>edge.after===id).every(edge=>positions.has(edge.before)));
  return {submitted:base.attempt!==null,attempt:[...attempt],violations,missing,availableNext,
    complete:base.attempt!==null&&missing.length===0,consistent:base.attempt!==null&&violations.length===0,
    readyToContinue:violations.length===0,
    boundary:'These results compare a proposed order with supplied prerequisites. Frame chronology does not prove necessity, and agreement does not establish physical skill or safety.'};
}
