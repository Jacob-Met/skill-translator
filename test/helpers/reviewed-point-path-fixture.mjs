import {readFileSync} from 'node:fs';
import {validateCapturedDemo} from '../../src/capture.mjs';
import {calibrate,toImage} from '../../src/geometry.mjs';
import {reviewSequencePointChoice} from '../../src/sequence-point-proposals.mjs';
import {createSequencePath} from '../../src/sequence-path.mjs';
export function reviewedPointSource(){
 const source=JSON.parse(readFileSync(new URL('../fixtures/point-choice-sequence.json',import.meta.url)));
 for(let i=1;i<source.moments.length;i++){
  const task=source.moments[i].calibratedTask,derived=validateCapturedDemo(task),h=calibrate(task.source.corners),angle=[0,.2,.5,.7][i],center=[[20,20],[31,21],[24,36],[40,44]][i];
  task.landmarks.forEach((mark,j)=>{const x=derived.landmarks[j].uv.u*100-center[0],y=derived.landmarks[j].uv.v*100-center[1];mark.sourcePx=toImage(h,(center[0]+Math.cos(angle)*x-Math.sin(angle)*y)/100,(center[1]+Math.sin(angle)*x+Math.cos(angle)*y)/100);});
 }
 source.title='Authored rotating constellation';return source;
}
export function reviewedPointFixture(options={}){
 const source=reviewedPointSource(),query={anchorMomentId:'moment-0',anchorMarkId:'local-0-0',momentIds:source.moments.map(m=>m.id),deviationMm:1e-6,...options};
 const reviews=query.momentIds.filter(id=>id!==query.anchorMomentId).map(id=>reviewSequencePointChoice(source,query,id,{semanticCorrespondenceConfirmed:true}));
 const seed=createSequencePath(source,{label:'Already accepted first point',reference:{samePlaneAndCorners:true,label:'Original fixed sheet',basis:'Independently accepted fixed plane and matching corner meanings'},samples:[reviews[0].anchor,...reviews.map(r=>r.sample)]});return {source,query,seed,reviews};
}
