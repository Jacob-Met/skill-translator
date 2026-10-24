// Descriptive relationships only: never replace actual placements or verdicts.
import {evaluatePractice} from './practice.mjs';
import {evaluateRelationships} from './task-relationships.mjs';

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
  const mean=key=>({x:marks.reduce((s,r)=>s+r[key].xMm,0)/n,y:marks.reduce((s,r)=>s+r[key].yMm,0)/n});
  const intended=mean('target'),observed=mean('attempt');
  let dot=0,cross=0,targetSpread=0,observedSpread=0;
  for(const r of marks){
    const x=r.target.xMm-intended.x,y=r.target.yMm-intended.y;
    const u=r.attempt.xMm-observed.x,v=r.attempt.yMm-observed.y;
    dot+=x*u+y*v;cross+=x*v-y*u;targetSpread+=x*x+y*y;observedSpread+=u*u+v*v;
  }
  if(targetSpread<1e-12||observedSpread<1e-12||Math.hypot(dot,cross)<=1e-12*Math.sqrt(targetSpread*observedSpread))
    return {...base,unavailable:'The observed configuration does not determine a unique fitted orientation.'};
  // Proper rotation from intended to observed; reflection and scale are excluded.
  const angle=Math.atan2(cross,dot),c=Math.cos(angle),s=Math.sin(angle);
  const residuals=marks.map(r=>{
    const u=r.attempt.xMm-observed.x,v=r.attempt.yMm-observed.y;
    const xMm=intended.x+c*u+s*v,yMm=intended.y-s*u+c*v;
    const errorMm=Math.hypot(xMm-r.target.xMm,yMm-r.target.yMm);
    // Match the evaluator's numerical comparison epsilon at sheet boundaries.
    return {id:r.id,errorMm,onSheet:xMm>=-1e-9&&xMm<=widthMm+1e-9&&yMm>=-1e-9&&yMm<=heightMm+1e-9,
      within:errorMm<=r.evaluation.toleranceMm+1e-9};
  });
  return {...base,rigid:{angleDegrees:angle*180/Math.PI,
    centroidDxMm:observed.x-intended.x,centroidDyMm:observed.y-intended.y,
    remainingRmsMm:Math.sqrt(residuals.reduce((s,r)=>s+r.errorMm*r.errorMm,0)/n),
    wouldMeetAll:assessment.complete&&residuals.every(r=>r.within&&r.onSheet),residuals}};
}
