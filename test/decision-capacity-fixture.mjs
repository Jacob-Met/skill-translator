import {attachMomentCalibration} from '../src/demonstration-sequence.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {bundle} from '../web/examples/decision-registration.mjs';
import {createDecisionPractice,recordDecisionAction} from '../src/decision-practice.mjs';
export const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value));
export function capacityFixture(){
 const source=structuredClone(bundle.sequence),prototype=source.steps[0];
 source.steps=Array.from({length:24},(_,n)=>({...prototype,id:`step-${n}`,title:`Step ${n}`,intent:'界'.repeat(1800),visibleChange:'界'.repeat(1800),sensoryCue:'界'.repeat(1800),recoveryCue:'界'.repeat(1800)}));
 let session=createDecisionPractice(source);
 for(let n=0;n<24;n++){
  const stepId=`step-${n}`;
  for(const action of [{type:'answer',stepId,response:{expectedChange:'界'.repeat(1200),cue:'界'.repeat(1200),recovery:'界'.repeat(1200),uncertain:false}},{type:'reveal',stepId},{type:'reflect',stepId,comparison:'unsure',note:'界'.repeat(1600),reconsideration:{anchors:['after'],judgment:'界'.repeat(1600),question:'界'.repeat(1600)}},...(n<23?[{type:'advance',stepId}]:[])])session=recordDecisionAction(source,session,action);
 }
 return {source,session,sourceBundle:{...structuredClone(bundle),sequence:source}};
}
export function sizedSession(session,target){
 const value=structuredClone(session);
 for(const event of value.events)if(event.type==='answer')for(const field of ['expectedChange','cue']){
  const excess=bytes(value)-target;if(excess<=0)return value;
  const current=event.response[field],remove=Math.min(excess,bytes(current)),remaining=bytes(current)-remove;
  event.response[field]='界'.repeat(Math.floor(remaining/3))+'x'.repeat(remaining%3);
 }
 if(bytes(value)!==target)throw Error('Fixture cannot attain requested size');return value;
}

export function oversizedSource(source){
 let next=structuredClone(source);
 for(const moment of next.moments){const {widthPx:w,heightPx:h}=moment.image;
 let task=createCapture(moment.image,[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],100,80);
 task=appendCaptureMark(task,{label:'Authored capacity mark',kind:'fraction',sourcePx:{x:w/2,y:h/2},toleranceMm:2});
 // Explicitly authored capacity text in a retained, admitted source field.
 task.unknowns=['界'.repeat(70000)];next=attachMomentCalibration(next,moment.id,task);
 }return next;
}
