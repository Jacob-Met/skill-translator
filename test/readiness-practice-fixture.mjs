import {readinessSequenceFixture} from './task-readiness-fixture.mjs';
import {createCapture} from '../src/capture.mjs';
import {attachMomentCalibration,momentTask} from '../src/demonstration-sequence.mjs';
import {createPrerequisiteRehearsal} from '../src/prerequisite-rehearsal.mjs';
import {createReadiness} from '../src/task-readiness.mjs';
import {createPractice} from '../src/practice.mjs';
export function practiceReadinessFixture(sequence=readinessSequenceFixture()){
  const moment=sequence.moments.find(m=>m.id===sequence.steps[0].afterMomentId),w=moment.image.widthPx,h=moment.image.heightPx;
  const task=createCapture(moment.image,[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],160,90);
  task.landmarks=[{id:'center',label:'Center registration',kind:'fraction',sourcePx:{x:w/2,y:h/2},toleranceMm:1,why:'Authored geometric criterion'},{id:'index',label:'Index registration',kind:'fraction',sourcePx:{x:w/4,y:h/4},toleranceMm:1,why:'Second authored criterion'}];
  sequence=attachMomentCalibration(sequence,moment.id,task);
  const prerequisites=createPrerequisiteRehearsal(sequence,[{before:sequence.steps[0].id,after:sequence.steps[1].id,reason:'Declared registration before the next step'}]);
  const definitions=sequence.steps.map((s,i)=>({stepId:s.id,checks:[{id:'completion',prompt:i===0?'All after-state placements meet declared tolerances':'Reported completion',basis:'Authored software control',...(i===0?{placement:{widthMm:160,heightMm:90}}:{})}]}));
  const demo=momentTask(sequence,moment.id),session=createPractice(demo,160,90);
  const passing={...session,attempts:[{id:'center',xMm:80,yMm:45},{id:'index',xMm:40,yMm:22.5}]};
  return {sequence,prerequisites,definitions,study:createReadiness(sequence,prerequisites,definitions),demo,session,passing};
}
