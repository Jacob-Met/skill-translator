import {createSequence,appendMoment,attachMomentCalibration} from '../../src/demonstration-sequence.mjs';
import {createCapture,appendCaptureMark} from '../../src/capture.mjs';
import {frameOrigin} from '../../src/frame-origin.mjs';
export const GROUP_POINTS=[[24,32],[57,32],[38,61],[172,43],[203,43],[184,72]];
export function turn(points,angle,dx,dy){
 const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=points.reduce((v,p)=>v+p[0],0)/points.length,cy=points.reduce((v,p)=>v+p[1],0)/points.length;
 return points.map(([x,y])=>[cx+c*(x-cx)-s*(y-cy)+dx,cy+s*(x-cx)+c*(y-cy)+dy]);
}
export function groupedFrames(){
 return [GROUP_POINTS, [...turn(GROUP_POINTS.slice(0,3),27,22,37),...turn(GROUP_POINTS.slice(3),-41,14,22)],
   [...turn(GROUP_POINTS.slice(0,3),-18,39,14),...turn(GROUP_POINTS.slice(3),58,-29,51)]];
}
export function annotation(points,{width=300,height=200}={}){
 return {title:'Authored point geometry',provenance:'Analytic control; no physical demonstration',source:{widthMm:width,heightMm:height,corners:[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}]},
 landmarks:points.map((p,i)=>({id:'p'+i,label:'Point '+(i+1),kind:'fraction',sourcePx:{x:p[0],y:p[1]},toleranceMm:1}))};
}
export function motionStudy(frames=groupedFrames(),deviationMm=.01){
 return {format:'skill-translator.relationship-discovery/v1',deviationMm,demonstrations:frames.map((points,i)=>({id:'source-'+i,annotation:annotation(points),evidenceClass:'authored-example',correspondenceConfirmed:true}))};
}
export function motionSequence({frames=groupedFrames(),images=null}={}){
 const clip={name:'authored-groups.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:Math.max(12,frames.length+1)};
 let sequence=createSequence(clip,{title:'Two independently moving patterns',context:'Authored sampled geometry and rendered PNGs; no physical motion or object identity claim'});
 for(let i=0;i<frames.length;i++){
  const id='moment-'+i,image=images?.[i]??{name:id+'.png',mimeType:'image/png',sha256:(i+1).toString(16).repeat(64),widthPx:600,heightPx:400,pixelCoordinates:'browser-oriented'};
  const origin=frameOrigin(clip,i+1,{mediaTime:i+1,width:600,height:400},image);
  sequence=appendMoment(sequence,{id,label:'Original view '+(i+1),visibleState:'Two authored patterns with supplied corresponding point annotations',image,origin});
  let task=createCapture(image,[{x:0,y:0},{x:600,y:0},{x:600,y:400},{x:0,y:400}],300,200);
  for(const [j,p] of frames[i].entries())task=appendCaptureMark(task,{label:'Point '+(j+1),sourcePx:{x:p[0]*2,y:p[1]*2},kind:'fraction',toleranceMm:1});
  sequence=attachMomentCalibration(sequence,id,task);
 }
 return sequence;
}
