// Retained diagram edits are not measured physical movements.
import {importRehearsal,inspectRehearsal} from './transfer-rehearsal.mjs';
import {evaluatePractice} from './practice.mjs';
import {GeometryError} from './geometry.mjs';

export function inspectAssistanceTrace(raw,trialIndex,markId){
 const source=importRehearsal(raw),state=inspectRehearsal(source);
 if(!Number.isInteger(trialIndex)||trialIndex<0||trialIndex>=source.plan.length)throw new GeometryError('Choose a retained workpiece trial');
 const mark=source.source.landmarks.find(m=>m.id===markId);
 if(!mark)throw new GeometryError('Choose a retained task mark');
 const trial=state.trials[trialIndex];
 const base={trialIndex,markId,label:mark.label,widthMm:trial.widthMm,heightMm:trial.heightMm,submitted:trial.submitted};
 if(!trial.submitted)return {...base,entries:[],target:null,final:null};
 const final=trial.result.results.find(m=>m.id===markId),entries=[];
 let currentTrial=0,point=null,requests=0,previousPlacement=null;
 for(const [actionIndex,event]of source.events.entries()){
  if(event.type==='advance'){currentTrial++;continue;}
  if(currentTrial!==trialIndex)continue;
  if(event.type==='place'&&event.id!==markId)continue;
  const requestsBefore=requests;
  let movementMm=null;
  if(event.type==='place'){
   point={id:markId,xMm:event.xMm,yMm:event.yMm};
   movementMm=previousPlacement?Math.hypot(point.xMm-previousPlacement.xMm,point.yMm-previousPlacement.yMm):null;
  }
  if(event.type==='reveal')requests++;
  const evaluation=point?evaluatePractice(source.source,trial.widthMm,trial.heightMm,[point]).results.find(m=>m.id===markId).evaluation:null;
  entries.push({actionIndex,type:event.type,point:point?{...point}:null,requestsBefore,requestsAfter:requests,movementMm,evaluation});
  if(event.type==='place')previousPlacement={...point};
 }
 return {...base,entries,target:final.target,final,
  limitations:['This is a selected-mark record of diagram edits, not a physical motion path.',
   'Other marks may have been edited between these retained action indices.',
   'Before recorded target help does not establish absence of source explanations or outside help.',
   'Changes and event order do not establish what caused a correction or a learning effect.']};
}
