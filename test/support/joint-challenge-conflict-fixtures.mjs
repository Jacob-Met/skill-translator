import {createObservation} from '../../src/evidence.mjs';
import {jointSourceReading,createJointCalibrationHypothesis,exportJointCalibration} from '../../src/joint-calibration.mjs';
import {freezeJointChallengePlan,createJointChallengeResult} from '../../src/joint-challenge.mjs';

export const authoredJointSource = {
  provenance:'Authored rectangle controls for workpiece conflict diagnostics',
  source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
  landmarks:[['guide',20,30],['index',60,50]].map(([id,x,y])=>({
    id,label:id,kind:'edge_offset_mm',edge:'left',sourcePx:{x,y},toleranceMm:50
  }))
};

export function makeJointStudy(input=authoredJointSource, alternatives=true) {
  const source=structuredClone(input);
  const observations=source.landmarks.map((mark,index)=>createObservation(source,{
    id:'train-'+index,landmarkId:mark.id,label:'Authored training '+mark.id,
    evidenceClass:'authored-example',widthMm:100,heightMm:80,
    xMm:mark.sourcePx.x,yMm:mark.sourcePx.y,uncertaintyMm:50
  }));
  const hypotheses=alternatives?[createJointCalibrationHypothesis(source,{
    id:'wide',label:'Wide source reading',basis:'proposed-reading',
    reading:{...jointSourceReading(source),widthMm:150}
  })]:[];
  return exportJointCalibration(source,source.landmarks.map(mark=>mark.id),observations,hypotheses);
}

export function futureTrial(id='future',widthMm=200,heightMm=160,uncertaintyMm=.1) {
  return {id,label:id,widthMm,heightMm,uncertaintyMm};
}

export function makeChallenge(study=makeJointStudy(),trials=[futureTrial()]) {
  return freezeJointChallengePlan(study,{
    id:'conflict-control',label:'Authored workpiece conflict course',
    prospectiveDeclaration:true,trials
  });
}

export function outcomeAt(plan,mark,xMm,yMm,trialId='future',uncertaintyMm=.01,id=trialId+'-'+mark) {
  const trial=plan.trials.find(item=>item.id===trialId);
  return createJointChallengeResult(plan,{
    trialId,collectedAfterPlan:true,observation:{
      id,landmarkId:mark,label:'Authored '+id,evidenceClass:'authored-example',
      widthMm:trial.widthMm,heightMm:trial.heightMm,xMm,yMm,uncertaintyMm
    }
  });
}

export function alternativeGroupCourse() {
  const trials=[
    {...futureTrial('one'),label:'Narrow workpiece'},
    {...futureTrial('two',300,240),label:'Wide workpiece'},
    {...futureTrial('three',400,320),label:'Third workpiece'}
  ];
  const plan=makeChallenge(makeJointStudy(authoredJointSource,false),trials);
  const results=[
    outcomeAt(plan,'guide',20,60,'one'),outcomeAt(plan,'index',60,100,'one'),
    outcomeAt(plan,'guide',220,90,'two'),outcomeAt(plan,'index',60,150,'two'),
    outcomeAt(plan,'guide',399,319,'three')
  ];
  return {plan,results};
}
