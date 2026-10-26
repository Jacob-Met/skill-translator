// Descriptive relationships only: never replace actual placements or verdicts.
import {evaluatePractice} from './practice.mjs';
import {evaluateRelationships} from './task-relationships.mjs';
import {fitProperPointPattern} from './point-pattern-fit.mjs';

export function explainLayout(demo,widthMm,heightMm,attempts){
  const assessment=evaluatePractice(demo,widthMm,heightMm,attempts);
  const marks=assessment.results.filter(r=>r.placed),n=marks.length;
  const rules=[];
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    const a=marks[i],b=marks[j];
    // Reverse triangle inequality gives a necessary, not sufficient condition.
    rules.push({id:'pair-'+i+'-'+j,label:a.label+' / '+b.label,
      from:a.id,to:b.id,kind:'distance',toleranceMm:a.evaluation.toleranceMm+b.evaluation.toleranceMm});
  }
  const pairs=[];
  // Reuse maintained relationship measurement and its bounded admission.
  for(let i=0;i<rules.length;i+=60){
    const batch=rules.slice(i,i+60).map(r=>({...r,label:r.label.slice(0,160)}));
    for(const r of evaluateRelationships(demo,widthMm,heightMm,attempts,batch).results){
      pairs.push({ids:[r.from,r.to],labels:[marks.find(m=>m.id===r.from).label,marks.find(m=>m.id===r.to).label],
        intendedMm:r.expectedMm,observedMm:r.observedMm,differenceMm:r.differenceMm,
        allowanceMm:r.toleranceMm,incompatible:r.status==='outside'});
    }
  }
  const base={placed:n,total:assessment.total,partial:!assessment.complete,pairs,
    incompatiblePairs:pairs.filter(p=>p.incompatible).length,rigid:null,
    unavailable:n<2?'Place at least two distinct marks to inspect orientation.':null};
  if(n<2)return base;
  const {fit,unavailable}=fitProperPointPattern(marks);
  if(!fit)return {...base,unavailable};
  const residuals=fit.residuals.map(r=>{
    const mark=marks.find(m=>m.id===r.id);
    return {id:r.id,errorMm:r.errorMm,onSheet:r.xMm>=-1e-9&&r.xMm<=widthMm+1e-9&&r.yMm>=-1e-9&&r.yMm<=heightMm+1e-9,
      within:r.errorMm<=mark.evaluation.toleranceMm+1e-9};
  });
  return {...base,rigid:{angleDegrees:fit.angleDegrees,centroidDxMm:fit.centroidDxMm,centroidDyMm:fit.centroidDyMm,
    remainingRmsMm:fit.remainingRmsMm,wouldMeetAll:assessment.complete&&residuals.every(r=>r.within&&r.onSheet),residuals}};
}
