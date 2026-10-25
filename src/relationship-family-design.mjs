/** Prospective sizes for the maintained finite family hypotheses; no outcomes invented. */
import {inspectRelationshipFamilies,predictRelationshipFamilies} from './relationship-families.mjs';
export const DESIGN_FACTORS=Object.freeze([0.5,1,1.5,2]);
export function suggestRelationshipFamilySizes(raw,pairId){
 const inference=inspectRelationshipFamilies(raw),pair=inference.pairs.find(p=>p.id===pairId);
 if(!pair)throw Error('Choose an automatically enumerated source pair and relation');
 const reference=inference.study.demonstrations[0].annotation.source,atCapacity=inference.study.demonstrations.length>=12;
 const hypotheses=pair.hypotheses.filter(h=>h.status==='compatible'),candidates=[];
 for(const widthFactor of DESIGN_FACTORS)for(const heightFactor of DESIGN_FACTORS){
  const widthMm=reference.widthMm*widthFactor,heightMm=reference.heightMm*heightFactor;
  if(widthFactor===1&&heightFactor===1||widthMm<1||widthMm>10000||heightMm<1||heightMm>10000)continue;
  const predicted=predictRelationshipFamilies(inference.study,{widthMm,heightMm}).pairs.find(p=>p.id===pairId);
  const extent=pair.kind==='horizontal'?widthMm:pair.kind==='vertical'?heightMm:Math.hypot(widthMm,heightMm);
  const intervals=hypotheses.map(h=>{
   const scale=predicted.predictions.find(p=>p.family===h.family).scale,threshold=inference.study.deviationMm+1e-9;
   // A new normalized reading z preserves the full range iff max-t <= z <= min+t.
   const lowMm=Math.max(pair.kind==='distance'?0:-extent,(h.maxReferenceEquivalentMm-threshold)*scale);
   const highMm=Math.min(extent,(h.minReferenceEquivalentMm+threshold)*scale);
   return {family:h.family,lowMm,highMm,nominallyPossible:lowMm<=highMm};
  });
  const comparisons=[];
  for(let a=0;a<intervals.length;a++)for(let b=a+1;b<intervals.length;b++){
   const left=intervals[a],right=intervals[b],gapMm=Math.max(left.lowMm-right.highMm,right.lowMm-left.highMm,0);
   comparisons.push({families:[left.family,right.family],gapMm,separated:gapMm>1e-9});
  }
  const eligible=intervals.length>1&&intervals.every(i=>i.nominallyPossible),separatedPairs=eligible?comparisons.filter(c=>c.separated).length:0;
  candidates.push({widthMm,heightMm,widthFactor,heightFactor,intervals,comparisons,eligible,separatedPairs,totalPairs:comparisons.length,
   minimumGapMm:comparisons.length?Math.min(...comparisons.map(c=>c.gapMm)):0});
 }
 candidates.sort((a,b)=>b.separatedPairs-a.separatedPairs||b.minimumGapMm-a.minimumGapMm||a.widthMm*a.heightMm-b.widthMm*b.heightMm||a.widthMm-b.widthMm);
 return {pairId,pairStatus:pair.status,atCapacity,families:hypotheses.map(h=>h.family),factors:[...DESIGN_FACTORS],candidates,
  recommendation:atCapacity?null:candidates.find(c=>c.eligible&&c.separatedPairs>0)??null,
  limitation:'Sizes come from a finite catalogue of 0.5, 1, 1.5 and 2 times each original dimension, within 1–10000 mm. Intervals describe future pair readings that would retain each current hypothesis under the existing exploratory range threshold, including its numerical slack. A separated pair cannot both survive one exact supplied reading. Nominal sheet extent alone does not establish a realizable layout, acquisition accuracy, physical success or optimality over all sizes. No demonstration has been acquired and no tolerance or actual practice score is changed.'};
}
