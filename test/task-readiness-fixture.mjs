import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
export function readinessSequenceFixture(){
  const clip={name:'authored-readiness.webm',mimeType:'video/webm',sizeBytes:1234,sha256:'a'.repeat(64),durationSeconds:10};
  let sequence=createSequence(clip,{title:'Authored support, alignment and joining control'});
  for(let i=0;i<5;i++){
    const image={name:`frame-${i}.png`,mimeType:'image/png',sha256:String(i).repeat(64),widthPx:320,heightPx:180,pixelCoordinates:'browser-oriented'};
    sequence=appendMoment(sequence,{id:`moment-${i}`,label:`Authored state ${i}`,visibleState:'Explicit authored example',image,origin:frameOrigin(clip,i,{mediaTime:i,width:320,height:180},image)});
  }
  for(const [i,id] of ['prepare','align','finish','inspect'].entries())sequence=upsertStep(sequence,{id,beforeMomentId:`moment-${i}`,afterMomentId:`moment-${i+1}`,title:id,intent:`Authored ${id} intention`,visibleChange:'Supplied account of the visible state',sensoryCue:'Not measured',recoveryCue:'Reassess prerequisites'});
  return sequence;
}
