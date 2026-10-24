import {derive,GeometryError} from './geometry.mjs';
import {importRehearsal,inspectRehearsal} from './transfer-rehearsal.mjs';
import {RULES,scoreInterpretation} from './evidence.mjs';
export const INTERPRETATION_SCHEMA='skill-translator-rehearsal-interpretation/v1';
export const INTERPRETATION_LIMIT=2*1024*1024;
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createRehearsalInterpretation(rehearsal,landmarkId,radiusMm,basis){
 return importRehearsalInterpretation({schema:INTERPRETATION_SCHEMA,rehearsal,landmarkId,radiusMm,basis,events:[]});
}
export function importRehearsalInterpretation(raw){
 fail(raw?.schema===INTERPRETATION_SCHEMA,'Unsupported rehearsal interpretation schema');
 const rehearsal=importRehearsal(raw.rehearsal);
 fail(rehearsal.source.landmarks.some(m=>m.id===raw.landmarkId),'Explicitly select a retained source mark');
 fail(typeof raw.radiusMm==='number'&&Number.isFinite(raw.radiusMm)&&raw.radiusMm>=0&&raw.radiusMm<=1000,'Declare a comparison radius from 0 to 1,000 mm');
 fail(typeof raw.basis==='string'&&raw.basis.trim().length>0&&raw.basis.length<=2000,'Declare a basis for the comparison radius');
 fail(Array.isArray(raw.events)&&raw.events.length<=2,'Retain at most one intention and one reveal');
 let intention=null,revealed=false;const events=[];
 for(const e of raw.events){
  fail(e&&typeof e==='object'&&!revealed,'A revealed interpretation cannot revise its first intention');
  if(e.type==='intend'){fail(intention===null&&(['uncertain',...RULES].includes(e.value)),'Declare one supported intended rule or uncertainty before reveal');intention=e.value;events.push({type:'intend',value:e.value});}
  else if(e.type==='reveal'){revealed=true;events.push({type:'reveal'});}
  else fail(false,'Unsupported interpretation action');
 }
 const bundle={schema:INTERPRETATION_SCHEMA,rehearsal,landmarkId:raw.landmarkId,radiusMm:raw.radiusMm,basis:raw.basis.trim(),events};
 fail(new TextEncoder().encode(JSON.stringify(bundle)).byteLength<=INTERPRETATION_LIMIT,'Complete interpretation inputs exceed 2 MiB');return bundle;
}
export function intendRehearsalInterpretation(raw,value){const b=importRehearsalInterpretation(raw);return importRehearsalInterpretation({...b,events:[...b.events,{type:'intend',value}]});}
export function revealRehearsalInterpretation(raw){const b=importRehearsalInterpretation(raw);return importRehearsalInterpretation({...b,events:[...b.events,{type:'reveal'}]});}
export function inspectRehearsalInterpretation(raw){
 const b=importRehearsalInterpretation(raw),state=inspectRehearsal(b.rehearsal),d=derive(b.rehearsal.source),mark=d.landmarks.find(m=>m.id===b.landmarkId),revealed=b.events.some(e=>e.type==='reveal'),intention=b.events.find(e=>e.type==='intend')?.value??null;
 const trials=state.trials.map((trial,index)=>({index:index+1,widthMm:trial.widthMm,heightMm:trial.heightMm,submitted:trial.submitted,started:trial.started,assistance:trial.assistance,reveals:structuredClone(trial.reveals),
  attempt:trial.submitted?structuredClone(trial.attempts.find(p=>p.id===b.landmarkId)??null):null,
  original:trial.submitted?trial.result.results.find(r=>r.id===b.landmarkId):null}));
 let candidates=null;
 if(revealed)candidates=RULES.map(rule=>{
  const rows=trials.map(t=>{if(!t.submitted)return {trial:t.index,status:'unsubmitted',assessment:null};if(!t.attempt)return {trial:t.index,status:'missing',assessment:null};
   // The maintained scorer's radius field is an argument adapter only. These
   // learner placements are never created/exported as expert observations.
   const assessment=scoreInterpretation(mark,d.source,{id:'trial-'+t.index,widthMm:t.widthMm,heightMm:t.heightMm,xMm:t.attempt.xMm,yMm:t.attempt.yMm,uncertaintyMm:b.radiusMm},rule);
   return {trial:t.index,status:assessment.reason?'unavailable':assessment.compatible?'consistent':'outside-radius',assessment};
  });
  const tested=rows.filter(r=>r.assessment),status=!tested.length?'untested':tested.some(r=>r.assessment.reason)?'unavailable':tested.some(r=>!r.assessment.compatible)?'outside-radius':'consistent';
  return {rule,status,comparedTrials:tested.length,rows};
 });
 return {landmarkId:b.landmarkId,label:mark.label,sourceRule:mark.kind==='fraction'?'fraction':mark.edge,radiusMm:b.radiusMm,basis:b.basis,intention,revealed,revealedWithoutIntention:revealed&&intention===null,trials,candidates,
  limitations:['Geometric consistency does not identify learner intention, a misconception, a physical cause or skill acquisition.','The comparison radius is declared for this investigation, not inferred measurement uncertainty or a replacement source tolerance.','Missing and unsubmitted trials contribute no support. The five-rule family is incomplete.','Source rules, actual placements, original scores and recorded assistance are unchanged; local event order is not authenticated.']};
}
export const exportRehearsalInterpretation=raw=>JSON.stringify(importRehearsalInterpretation(raw));
