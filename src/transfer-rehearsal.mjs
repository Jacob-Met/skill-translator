// Variable-workpiece diagram rehearsal. Assistance is retained, never inferred
// from accuracy; event order is a local record, not authenticated chronology.
import {derive,adapt,GeometryError} from './geometry.mjs';
import {evaluatePractice} from './practice.mjs';
export const REHEARSAL_SCHEMA='skill-translator-rehearsal/v1';
const insist=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const clone=value=>JSON.parse(JSON.stringify(value));
const MAX_EVENTS=2048;
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
function setup(source,plan){
 insist(bytes(source)<=256*1024,'Source annotations exceed 256 KiB.');
 const geometry=derive(source);
 insist(Array.isArray(plan)&&plan.length>=2&&plan.length<=8,'Declare 2–8 workpiece sizes.');
 const sizes=new Set();
 const normalized=Array.from(plan,row=>{
  insist(row&&typeof row.widthMm==='number'&&typeof row.heightMm==='number','Each workpiece needs numeric dimensions.');
  adapt(geometry,row.widthMm,row.heightMm);
  const key=`${row.widthMm}/${row.heightMm}`;
  insist(!sizes.has(key),'Each rehearsal workpiece must have different dimensions.');sizes.add(key);
  return {widthMm:row.widthMm,heightMm:row.heightMm};
 });
 // Reuse the practice source-identity contract before accepting an empty trial.
 evaluatePractice(source,normalized[0].widthMm,normalized[0].heightMm,[]);
 return normalized;
}
function replay(source,plan,events){
 insist(Array.isArray(events)&&events.length<=MAX_EVENTS,'Rehearsal history exceeds 2048 actions.');
 let index=0;
 const trials=plan.map(size=>({...size,attempts:[],reveals:[],submitted:false}));
 const canonical=[];
 for(const event of events){
  insist(event&&typeof event.type==='string','Invalid rehearsal action.');
  const trial=trials[index];
  if(event.type==='advance'){
   insist(trial.submitted&&index<plan.length-1,'Submit the current trial before advancing.');
   index++;canonical.push({type:'advance'});continue;
  }
  insist(!trial.submitted,'Submitted placements and assistance records cannot be revised.');
  if(event.type==='place'){
   const point={id:event.id,xMm:event.xMm,yMm:event.yMm};
   const next=[...trial.attempts.filter(p=>p.id!==point.id),point];
   evaluatePractice(source,trial.widthMm,trial.heightMm,next);
   trial.attempts=next;canonical.push({type:'place',...point});
  }else if(event.type==='reveal'){
   // Save what existed before help, including incomplete work.
   trial.reveals.push({actionIndex:canonical.length,priorAttempts:clone(trial.attempts)});
   canonical.push({type:'reveal'});
  }else if(event.type==='submit'){
   trial.submitted=true;canonical.push({type:'submit'});
  }else throw new GeometryError('Unsupported rehearsal action.');
 }
 return {index,trials,events:canonical};
}
export function createRehearsal(source,plan){
 return {schema:REHEARSAL_SCHEMA,source:clone(source),plan:setup(source,plan),events:[]};
}
export function importRehearsal(raw){
 insist(raw?.schema===REHEARSAL_SCHEMA,'Unsupported rehearsal schema.');
 insist(bytes(raw)<=1024*1024,'Rehearsal file exceeds 1 MiB.');
 const plan=setup(raw.source,raw.plan),{events}=replay(raw.source,plan,raw.events);
 return {schema:REHEARSAL_SCHEMA,source:clone(raw.source),plan,events};
}
function append(raw,event){
 const current=importRehearsal(raw);
 return importRehearsal({...current,events:[...current.events,event]});
}
export const placeRehearsal=(raw,id,point)=>append(raw,{type:'place',id,xMm:point?.xMm,yMm:point?.yMm});
export const revealRehearsal=raw=>append(raw,{type:'reveal'});
export const submitRehearsal=raw=>append(raw,{type:'submit'});
export const advanceRehearsal=raw=>append(raw,{type:'advance'});
export function inspectRehearsal(raw){
 const normalized=importRehearsal(raw),state=replay(normalized.source,normalized.plan,normalized.events);
 return {...state,trials:state.trials.map((trial,i)=>({...trial,started:i<=state.index,
  assistance:trial.reveals.length?'targets_requested':'no_targets_requested_in_this_record',
  // Do not expose review feedback before commitment, including through UI data.
  result:trial.submitted?evaluatePractice(normalized.source,trial.widthMm,trial.heightMm,trial.attempts):null})),
  complete:state.index===normalized.plan.length-1&&state.trials[state.index].submitted,
  limitations:['Diagram placements are not physical outcomes or evidence of skill acquisition.',
   'No target request in this record does not establish absence of outside help.',
   'Files are editable local records; action order and assistance history are not authenticated.',
   'Differences between workpieces may reflect difficulty, practice, or other causes; no learning effect is estimated.']};
}
