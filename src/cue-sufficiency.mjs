import {importDecisionComparison} from './decision-comparison.mjs';
import {GeometryError} from './geometry.mjs';

export const CUE_FORMAT='skill-translator.cue-sufficiency/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function text(value,label,max=160){
  check(typeof value==='string'&&value.trim().length>0&&value.length<=max,`${label} needs nonempty text of at most ${max} characters`);
  return value.trim();
}
export function importCueStudy(value){
  check(value?.format===CUE_FORMAT,'Unsupported cue study');
  const comparison=importDecisionComparison(value.comparison);
  check(Array.isArray(value.cues)&&value.cues.length>0&&value.cues.length<=8,'Declare 1–8 cues');
  const ids=new Set();
  const cues=value.cues.map(c=>{
    check(c&&typeof c.id==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(c.id)&&!ids.has(c.id),'Cue identifiers must be distinct short identifiers');
    ids.add(c.id);return {id:c.id,label:text(c.label,'Cue label'),basis:text(c.basis,'Cue basis',1000)};
  });
  check(Array.isArray(value.rows)&&value.rows.length===comparison.examples.length,'Declare one row for every retained example in its original order');
  const rows=value.rows.map(row=>{
    check(row&&Array.isArray(row.values)&&row.values.length===cues.length,'Every row needs one value or null for each cue');
    return {decision:row.decision===null?null:text(row.decision,'Decision label'),basis:text(row.basis,'Decision basis',1000),
      values:row.values.map(v=>v===null?null:text(v,'Cue category'))};
  });
  return {format:CUE_FORMAT,comparison,cues,rows};
}

/** Exact finite-example discrimination. Unknown values never prove a difference. */
export function inspectCueStudy(value){
  const study=importCueStudy(value),pairs=[],unknownDecisions=[];
  for(let a=0;a<study.rows.length;a++)for(let b=a+1;b<study.rows.length;b++){
    const first=study.rows[a],second=study.rows[b];
    if(first.decision===null||second.decision===null){unknownDecisions.push({a,b});continue;}
    if(first.decision===second.decision)continue;
    let differenceMask=0;const unknownCueIds=[];
    study.cues.forEach((cue,i)=>{
      if(first.values[i]===null||second.values[i]===null)unknownCueIds.push(cue.id);
      else if(first.values[i]!==second.values[i])differenceMask|=1<<i;
    });
    pairs.push({a,b,differenceMask,distinguishingCueIds:study.cues.filter((_,i)=>differenceMask&(1<<i)).map(c=>c.id),
      unknownCueIds,status:differenceMask?'distinguished':unknownCueIds.length?'unresolved':'conflicting'});
  }
  const minimalMasks=[];
  // Increasing numeric masks ensure every proper subset has already been seen.
  if(pairs.length&&unknownDecisions.length===0)for(let mask=1;mask<(1<<study.cues.length);mask++){
    if(minimalMasks.some(previous=>(mask&previous)===previous))continue;
    if(pairs.every(pair=>(pair.differenceMask&mask)!==0))minimalMasks.push(mask);
  }
  const minimalCueSets=minimalMasks.map(mask=>study.cues.filter((_,i)=>mask&(1<<i)).map(c=>c.id));
  const necessityWitnesses=minimalMasks.map((mask,index)=>({cueIds:minimalCueSets[index],witnesses:study.cues.flatMap((cue,i)=>{
    if(!(mask&(1<<i)))return [];
    const without=mask&~(1<<i),pair=pairs.find(p=>(p.differenceMask&without)===0);
    return [{cueId:cue.id,a:pair.a,b:pair.b}];
  })}));
  return {pairs,unknownDecisions,minimalCueSets,necessityWitnesses,
    status:unknownDecisions.length?'unknown-decisions':!pairs.length?'no-decision-contrast':minimalMasks.length?'distinguished':'not-distinguished',
    boundary:'Exact categories and decisions are user declarations about these retained examples. Distinguishing them establishes neither causal necessity nor a rule for an unseen situation. Unknown is not a category. No automatic decision or physical instruction follows.'};
}
