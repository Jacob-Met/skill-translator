import {evaluatePractice} from './practice.mjs';
import {inspectFeatureClearance} from './feature-clearance.mjs';
/** Shared assessment of actual admitted placements, independent of session format. */
export function inspectFeaturePlacements(source,widthMm,heightMm,features,requiredGapMm,attempts){
 const practice=evaluatePractice(source,widthMm,heightMm,attempts);
 const declared=inspectFeatureClearance(source,widthMm,heightMm,features,requiredGapMm);
 const placements=new Map(attempts.map(p=>[p.id,p]));
 const pairs=declared.pairs.map(pair=>{
  const a=placements.get(pair.from),b=placements.get(pair.to),missing=[pair.from,pair.to].filter(id=>!placements.has(id));
  const radiusSum=declared.marks.find(m=>m.id===pair.from).radiusMm+declared.marks.find(m=>m.id===pair.to).radiusMm;
  const observedGapMm=missing.length?null:Math.hypot(a.xMm-b.xMm,a.yMm-b.yMm)-radiusSum;
  const marginMm=observedGapMm===null?null:observedGapMm-requiredGapMm;
  return {from:pair.from,to:pair.to,targetGapMm:pair.nominalGapMm,minimumToleranceGapMm:pair.minimumToleranceGapMm,
   requiredGapMm:requiredGapMm,observedGapMm,marginMm,missing,
   status:marginMm===null?'incomplete':marginMm>=-1e-9?'meets':'fails'};
 });
 return {practice,pairs,complete:pairs.every(p=>p.status!=='incomplete'),meetsAll:pairs.every(p=>p.status==='meets')};
}
