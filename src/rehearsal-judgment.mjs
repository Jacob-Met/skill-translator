// Optional first judgments about retained diagram placements. Reuse the maintained
// rehearsal and scores; local event order is not authenticated chronology.
import {importRehearsal, inspectRehearsal} from './transfer-rehearsal.mjs';
import {GeometryError} from './geometry.mjs';
export const JUDGMENT_SCHEMA='skill-translator.rehearsal-judgment/v1';
const requireValue=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function receive(input,withFindings=false){
 requireValue(input?.schema===JUDGMENT_SCHEMA,'Unsupported placement-judgment study.');
 requireValue(new TextEncoder().encode(JSON.stringify(input)).length<=1200*1024,'Judgment study exceeds 1200 KiB.');
 const rehearsal=importRehearsal(input.rehearsal);
 requireValue(Array.isArray(input.judgments)&&input.judgments.length<=rehearsal.plan.length,'Keep at most one first judgment per workpiece.');
 let previous=-1;
 const judgments=input.judgments.map(raw=>{
  requireValue(raw&&Number.isInteger(raw.atEvent)&&raw.atEvent>=0&&raw.atEvent<=rehearsal.events.length&&raw.atEvent>previous,'Judgments need distinct increasing action boundaries.');
  previous=raw.atEvent;
  requireValue(['adequate','inadequate','uncertain'].includes(raw.prediction),'Predict adequate, inadequate or uncertain.');
  requireValue(typeof raw.reason==='string'&&raw.reason.length<=1200,'Judgment reasoning must be text within 1200 characters.');
  return {atEvent:raw.atEvent,prediction:raw.prediction,reason:raw.reason.trim()};
 });
 // importRehearsal owns all action/source/placement validation. This scan only
 // associates judgments with already-validated action boundaries; it does not
 // replay geometry or calculate a second score for every prefix.
 const boundaries=new Map(judgments.map(j=>[j.atEvent,j])),metadata=[],judged=new Set();
 let index=0,submitted=false,locked=false,reveals=0;const placed=new Set();
 for(let position=0;position<=rehearsal.events.length;position++){
  const judgment=boundaries.get(position);
  if(judgment){
   requireValue(!submitted&&!judged.has(index),'Record only the first judgment before committing this workpiece.');
   requireValue(placed.size===rehearsal.source.landmarks.length,'Place every task mark before judging the complete layout.');
   judged.add(index);locked=true;
   metadata.push({...judgment,trialIndex:index,targetsRequestedBeforeJudgment:reveals,
    assistanceAtJudgment:reveals?'targets_requested':'no_targets_requested_in_this_record'});
  }
  const event=rehearsal.events[position];if(!event)break;
  if(event.type==='place'){requireValue(!locked,'Placements freeze after a first judgment until commitment.');placed.add(event.id);}
  else if(event.type==='reveal')reveals++;
  else if(event.type==='submit'){submitted=true;locked=false;}
  else if(event.type==='advance'){index++;submitted=false;locked=false;reveals=0;placed.clear();}
 }
 const study={schema:JUDGMENT_SCHEMA,rehearsal,judgments};
 if(!withFindings)return {study};
 const state=inspectRehearsal(rehearsal);
 return {study,findings:metadata.map(j=>{const trial=state.trials[j.trialIndex];return {...j,
  submitted:trial.submitted,actualAdequate:trial.result?trial.result.passed:null,
  agreement:!trial.submitted||j.prediction==='uncertain'?null:(j.prediction==='adequate')===trial.result.passed};})};
}
export const importJudgmentStudy=input=>receive(input).study;
export const createJudgmentStudy=rehearsal=>importJudgmentStudy({schema:JUDGMENT_SCHEMA,rehearsal,judgments:[]});
export function replaceJudgmentRehearsal(study,rehearsal){
 const accepted=importJudgmentStudy(study),next=importRehearsal(rehearsal);
 // A receiving operation must extend this same complete source, plan and history.
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 requireValue(same(next.source,accepted.rehearsal.source)&&same(next.plan,accepted.rehearsal.plan)&&same(next.events.slice(0,accepted.rehearsal.events.length),accepted.rehearsal.events),'New actions must extend the retained rehearsal unchanged.');
 return importJudgmentStudy({...accepted,rehearsal:next});
}
export function recordPlacementJudgment(study,prediction,reason=''){
 const accepted=importJudgmentStudy(study);
 return importJudgmentStudy({...accepted,judgments:[...accepted.judgments,{atEvent:accepted.rehearsal.events.length,prediction,reason}]});
}
export const inspectPlacementJudgments=input=>receive(input,true).findings;
