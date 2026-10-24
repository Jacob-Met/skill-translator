import {createSequence,appendMoment,upsertStep,attachMomentCalibration,momentTask} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createCapture} from '../src/capture.mjs';
import {calibrate,toImage} from '../src/geometry.mjs';
import {createStateChange,declareStateReference,upsertCorrespondence} from '../src/sequence-change.mjs';
import {createPractice} from '../src/practice.mjs';
import {createTransitionPractice,receiveTransitionPractice,declareLearnerReference,predictTransition,revealTransition} from '../src/transition-practice.mjs';
export function transitionFixture(){
 const clip={name:'authored-transition.webm',mimeType:'video/webm',sizeBytes:1234,sha256:'a'.repeat(64),durationSeconds:10};let source=createSequence(clip,{title:'Authored move and hold control'});
 for(let i=0;i<2;i++){
  const image={name:`frame-${i}.png`,mimeType:'image/png',sha256:String(i).repeat(64),widthPx:320,heightPx:180,pixelCoordinates:'browser-oriented'};
  source=appendMoment(source,{id:`moment-${i}`,label:`State ${i}`,visibleState:'Authored control',image,origin:frameOrigin(clip,i,{mediaTime:i,width:320,height:180},image)});
  const corners=i?[{x:20,y:10},{x:300,y:20},{x:280,y:170},{x:10,y:160}]:[{x:0,y:0},{x:320,y:0},{x:320,y:180},{x:0,y:180}],h=calibrate(corners);
  const task=createCapture(image,corners,160,90);
  task.landmarks=[{id:`move-${i}`,label:'Registration',kind:'fraction',sourcePx:toImage(h,(i?40:20)/160,30/90),toleranceMm:1,why:'Authored moving point'},{id:`hold-${i}`,label:'Registration',kind:'fraction',sourcePx:toImage(h,80/160,60/90),toleranceMm:1,why:'Authored stationary reference'}];
  if(i)task.landmarks.push({id:'unpaired',label:'Unpaired source mark',kind:'fraction',sourcePx:toImage(h,.8,.8),toleranceMm:1,why:'Retained but not paired'});
  source=attachMomentCalibration(source,`moment-${i}`,task);
 }
 source=upsertStep(source,{id:'move',beforeMomentId:'moment-0',afterMomentId:'moment-1',title:'Move and hold',intent:'Supplied geometric change, not physical qualification'});
 let comparison=declareStateReference(createStateChange(source,'move'),{label:'Common plane',basis:'Matching corner meanings supplied',samePlaneAndCorners:true});
 for(const id of ['move','hold'])comparison=upsertCorrespondence(comparison,{id,label:id,beforeMarkId:id+'-0',afterMarkId:id+'-1'});
 const criteria=comparison.pairs.map(p=>({pairId:p.id,toleranceMm:1,basis:'Independent authored change tolerance'}));
 const tasks=[0,1].map(i=>momentTask(source,`moment-${i}`)),sessions=tasks.map(t=>createPractice(t,160,90));
 return {source,comparison,criteria,tasks,sessions,account:createTransitionPractice(comparison,criteria)};
}
export function populated(f,beforeX=20,afterX=40){
 let account=f.account;
 for(const [i,stage] of ['before','after'].entries())account=receiveTransitionPractice(account,stage,{...f.sessions[i],attempts:[{id:`move-${i}`,xMm:i?afterX:beforeX,yMm:30},{id:`hold-${i}`,xMm:80,yMm:60}]});
 return declareLearnerReference(account,{samePlaneAndCorners:true,basis:'Same authored learner reference plane and corner meanings'});
}
export function revealed(account){return revealTransition(predictTransition(account,{endpoint:'satisfied',change:'satisfied',reason:'Authored prediction control'}));}
