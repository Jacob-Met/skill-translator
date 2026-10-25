// Complete uncontradicted requirement-family predictions on retained rounds.
import {inspectConditionOutcomes} from './condition-outcomes.mjs';
export function inspectUnjudgedFamily(raw){
 const finding=inspectConditionOutcomes(raw);
 const family=finding.hypotheses.filter(h=>h.status!=='contradicted');
 const rounds=finding.rows.filter(r=>r.outcome==='unknown').map(r=>{
  const partitions={holds:[],fails:[],unresolved:[]};
  for(const h of family){const prediction=(h.mask&r.outsideMask)?'fails':(h.mask&r.withinMask)===h.mask?'holds':'unresolved';partitions[prediction].push(h.mask);}
  return {round:r.round,partitions,status:!finding.contrast?'insufficient-contrast':!family.length?'no-compatible-conjunction':partitions.holds.length&&partitions.fails.length?'disagreement':partitions.unresolved.length?'unresolved':'agreement',
   hypotheticalRemaining:{acceptable:[...partitions.holds,...partitions.unresolved].sort((a,b)=>a-b),unacceptable:[...partitions.fails,...partitions.unresolved].sort((a,b)=>a-b)}};
 });
 return {criteria:finding.criteria,sourceRows:finding.rows,contrast:finding.contrast,family:family.map(h=>({mask:h.mask,trainingStatus:h.status,criterionIds:h.criterionIds})),rounds,
 boundary:'All uncontradicted conjunctions are retained, including unresolved training evidence. Counts are finite alternatives, not probabilities; a hypothetical supplied judgment is not observed evidence. No physical action or label is chosen.'};
}
