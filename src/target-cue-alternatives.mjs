import {importTargetCueStudy,inspectTargetCueStudy} from './target-cue-study.mjs';
export const TARGET_ALTERNATIVES_FORMAT='skill-translator.target-cue-alternatives/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
/** Enumerate explicitly allowed categorical interpretations, never pixel-derived uncertainty. */
export function importTargetCueAlternatives(value){
 check(value?.format===TARGET_ALTERNATIVES_FORMAT,'Open a target categorical-alternatives study');
 const target=importTargetCueStudy(value.target);
 check(value.combinationDeclaration==='all-combinations','Explicitly declare that every combination of supplied alternatives remains possible');
 check(Array.isArray(value.alternatives)&&value.alternatives.length>=1&&value.alternatives.length<=3,'Supply alternatives for one to three cues');
 const used=new Set(target.readings.map(r=>r.cueId));let count=1;
 const alternatives=value.alternatives.map(group=>{
  check(group&&typeof group.cueId==='string'&&!used.has(group.cueId),'Alternative cues must be distinct and must not also have a fixed reading');used.add(group.cueId);
  check(Array.isArray(group.readings)&&group.readings.length>=2&&group.readings.length<=4,'Retain two to four attributed readings for each alternative cue');
  const readings=group.readings.map(reading=>{
   check(reading?.cueId===group.cueId,'Each alternative must name its original cue');
   return importTargetCueStudy({...target,readings:[...target.readings,reading]}).readings.at(-1);
  });
  check(new Set(readings.map(r=>r.value)).size===readings.length,'Alternative categories must be distinct after normalization');
  count*=readings.length;return{cueId:group.cueId,readings};
 });
 check(count<=64,'At most 64 complete interpretations may be retained');
 return{format:TARGET_ALTERNATIVES_FORMAT,target,combinationDeclaration:'all-combinations',alternatives};
}
export function inspectTargetCueAlternatives(value){
 const study=importTargetCueAlternatives(value);let combinations=[[]];
 for(const group of study.alternatives)combinations=combinations.flatMap(prefix=>group.readings.map((reading,index)=>[...prefix,{reading,alternativeIndex:index}]));
 const interpretations=combinations.map((choice,index)=>{
  const source={...study.target,readings:[...study.target.readings,...choice.map(c=>c.reading)]};
  const {report}=inspectTargetCueStudy(source);
  return{index,choices:choice.map(c=>({cueId:c.reading.cueId,alternativeIndex:c.alternativeIndex,value:c.reading.value})),report};
 });
 const indexes=study.target.reference.rows.map((_,i)=>i);
 const possibleExampleIndexes=indexes.filter(i=>interpretations.some(x=>x.report.compatibleExampleIndexes.includes(i)));
 const alwaysCompatibleExampleIndexes=indexes.filter(i=>interpretations.every(x=>x.report.compatibleExampleIndexes.includes(i)));
 return{interpretations,possibleExampleIndexes,alwaysCompatibleExampleIndexes,
  excludedExampleIndexes:indexes.filter(i=>!possibleExampleIndexes.includes(i)),
  unsupportedInterpretationIndexes:interpretations.filter(x=>x.report.status==='outside-retained-evidence').map(x=>x.index),
  referenceWasRefitted:false,targetDecisionInferred:false,
  boundary:'These alternatives are attributed categorical interpretations of the retained target, not estimated image uncertainty. Every declared combination is enumerated, without probabilities. Compatible under every interpretation does not mean correct, likely or supported by a known cue: an unknown reference cue can remain compatible everywhere. Findings describe reference records, not an action recommendation, physical success or learned skill.'};
}
