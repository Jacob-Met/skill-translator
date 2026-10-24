import {GeometryError} from './geometry.mjs';
import {importPractice,evaluatePractice} from './practice.mjs';
import {reopenFeatureClearance} from './feature-clearance.mjs';
export const FEATURE_PRACTICE_SCHEMA='skill-translator-feature-practice/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createFeaturePractice(comparison,session,selectedRound=session?.round){
 const {bundle}=reopenFeatureClearance(comparison);
 const target=session?.reference?.target;
 fail(target&&bundle.workpieces.some(s=>s.widthMm===target.widthMm&&s.heightMm===target.heightMm),
  'Practice dimensions must exactly match a declared workpiece size');
 const accepted=importPractice(bundle.source,target.widthMm,target.heightMm,session);
 fail(Number.isInteger(selectedRound)&&selectedRound>=1&&selectedRound<=accepted.round,'Select a retained practice round');
 return {schema:FEATURE_PRACTICE_SCHEMA,comparison:bundle,session:accepted,selectedRound};
}
export function importFeaturePractice(raw){
 fail(raw?.schema===FEATURE_PRACTICE_SCHEMA,'Unsupported feature-practice review schema');
 return createFeaturePractice(raw.comparison,raw.session,raw.selectedRound??NaN);
}
export function reviewFeaturePractice(raw){
 const accepted=importFeaturePractice(raw),{comparison,session,selectedRound}=accepted;
 const round=selectedRound===session.round?session:session.history[selectedRound-1];
 const {widthMm,heightMm}=session.reference.target;
 const practice=evaluatePractice(comparison.source,widthMm,heightMm,round.attempts);
 const declared=reopenFeatureClearance(comparison).reports.find(r=>r.widthMm===widthMm&&r.heightMm===heightMm);
 const placements=new Map(round.attempts.map(p=>[p.id,p]));
 const pairs=declared.pairs.map(pair=>{
  const a=placements.get(pair.from),b=placements.get(pair.to),missing=[pair.from,pair.to].filter(id=>!placements.has(id));
  const radiusSum=declared.marks.find(m=>m.id===pair.from).radiusMm+declared.marks.find(m=>m.id===pair.to).radiusMm;
  const observedGapMm=missing.length?null:Math.hypot(a.xMm-b.xMm,a.yMm-b.yMm)-radiusSum;
  const marginMm=observedGapMm===null?null:observedGapMm-comparison.requiredGapMm;
  return {from:pair.from,to:pair.to,targetGapMm:pair.nominalGapMm,minimumToleranceGapMm:pair.minimumToleranceGapMm,
   requiredGapMm:comparison.requiredGapMm,observedGapMm,marginMm,missing,
   status:marginMm===null?'incomplete':marginMm>=-1e-9?'meets':'fails'};
 });
 return {widthMm,heightMm,selectedRound,currentRound:session.round,practice,pairs,
  complete:pairs.every(p=>p.status!=='incomplete'),meetsAll:pairs.every(p=>p.status==='meets'),
  photoObservation:round.photoObservation??null,detachedPhotoMarks:round.detachedPhotoMarks??[]};
}
