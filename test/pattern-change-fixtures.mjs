// Three analytically collinear unchanged points, independently projected into
// two camera planes. Recovered binary64 calibrations can yield opposite signs.
import {createSequence,appendMoment,attachMomentCalibration,upsertStep} from '../src/demonstration-sequence.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createStateChange,declareStateReference,upsertCorrespondence} from '../src/sequence-change.mjs';
export function collinearGeometry(){
  return [0,1].map(i=>{
    const project=(u,v)=>({x:(50+2*(i+1)+460*u+31*v)/(1+(.026+.03*i)*u+.11*v),y:(40+2*(2-i)+13*u+310*v)/(1+(.026+.03*i)*u+.11*v)});
    return {corners:[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>project(u,v)),points:[.2,.5,.8].map(u=>project(u,.3))};
  });
}
export function collinearComparison(images){
  const geometry=collinearGeometry(),clip={name:'authored-collinear.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
  let sequence=createSequence(clip,{title:'Unchanged collinear source points, different cameras'});
  for(let i=0;i<2;i++){
    const id=i?'after':'before',image=images?.[i]??{name:id+'.png',mimeType:'image/png',sha256:String(i+1).repeat(64),widthPx:640,heightPx:480,pixelCoordinates:'browser-oriented'};
    sequence=appendMoment(sequence,{id,label:id,image,visibleState:'Three analytically unchanged collinear points',origin:frameOrigin(clip,i,{mediaTime:i,width:640,height:480},image)});
    let task=createCapture(image,geometry[i].corners,300,180);
    for(const [j,sourcePx]of geometry[i].points.entries())task=appendCaptureMark(task,{label:'Collinear point '+j,sourcePx,kind:'fraction',toleranceMm:2});
    sequence=attachMomentCalibration(sequence,id,task);
  }
  sequence=upsertStep(sequence,{id:'step',title:'Unchanged collinear points',intent:'Inspect nominal calculation sensitivity',beforeMomentId:'before',afterMomentId:'after'});
  let comparison=declareStateReference(createStateChange(sequence,'step'),{label:'Analytic plane',basis:'Identical collinear points under two camera projections',samePlaneAndCorners:true});
  for(let j=0;j<3;j++)comparison=upsertCorrespondence(comparison,{id:'pair-'+j,label:'Collinear point '+j,beforeMarkId:'authored-'+(j+1),afterMarkId:'authored-'+(j+1)});
  return comparison;
}
