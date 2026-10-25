import {createSequence,appendMoment,attachMomentCalibration} from '../../src/demonstration-sequence.mjs';
import {createCapture,appendCaptureMark} from '../../src/capture.mjs';
import {frameOrigin} from '../../src/frame-origin.mjs';
import {calibrate,toImage} from '../../src/geometry.mjs';
import {createSequencePath} from '../../src/sequence-path.mjs';
export function pathFixture(points=[[20,20],[23,24],[20,20]],{times=points.map((_,i)=>i*i+.25),images=null,widths=points.map(()=>100)}={}){
 const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:200};
 let sequence=createSequence(clip,{title:'An authored intermediate excursion',context:'Analytic controls, not measured physical motion'});
 for(let i=0;i<points.length;i++){
  const id='moment-'+i,image=images?.[i]??{name:id+'.png',mimeType:'image/png',sha256:(i+1).toString(16).repeat(64),widthPx:640,heightPx:420,pixelCoordinates:'browser-oriented'};
  const origin=frameOrigin(clip,times[i],{mediaTime:times[i],width:640,height:420},image);
  sequence=appendMoment(sequence,{id,label:'Sample '+(i+1),visibleState:'Authored point annotation',image,origin});
  const quad=[{x:10+i,y:10},{x:610,y:15+i},{x:600-i,y:400},{x:20,y:390-i}],h=calibrate(quad);
  let task=createCapture(image,quad,widths[i],100);
  task=appendCaptureMark(task,{label:'Declared moving point',sourcePx:toImage(h,points[i][0]/widths[i],points[i][1]/100),kind:'fraction',toleranceMm:2});
  sequence=attachMomentCalibration(sequence,id,task);
 }
 return sequence;
}
export function pathAccount(sequence=pathFixture(),missing=[]){return createSequencePath(sequence,{label:'Matched point',reference:{label:'Fixed authored plane',basis:'Same supplied fixed plane and corners in every frame',samePlaneAndCorners:true},samples:sequence.moments.map((m,i)=>({momentId:m.id,markId:missing.includes(i)?null:'authored-1',basis:missing.includes(i)?'Point unavailable in this retained frame':'Explicit authored correspondence'}))});}
