// Editable geometric proposals from the maintained five-rule evaluator.
// Original annotations and observations remain unchanged; no physical truth claim.
import {reviewRuleChoices} from './rule-adoption.mjs';
import {analyzeEvidence,validateObservations} from './evidence.mjs';

export function proposeSupportedRules(demo, observations) {
  const rows=validateObservations(demo,observations);
  const reviews=reviewRuleChoices(demo,rows);
  const marks=reviews.map(review=>{
    const observations=rows.filter(row=>row.landmarkId===review.landmarkId);
    // Renaming an identical supplied numeric reading must not create robustness.
    // This groups equality only; different records can still be correlated.
    const groups=new Map();
    for(const row of observations){
      const key=JSON.stringify([row.widthMm,row.heightMm,row.xMm,row.yMm,row.uncertaintyMm]);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(row.id);
    }
    const rule=review.status==='single-compatible'?review.compatibleRules[0]:null;
    const omissions=rule===null?[]:[...groups.values()].map(omittedIds=>{
      const remaining=rows.filter(row=>!omittedIds.includes(row.id));
      const result=analyzeEvidence(demo,review.landmarkId,remaining);
      return {omittedIds,remainingCount:result.observations.length,status:result.status,
        compatibleRules:result.compatibleRules,retainsUniqueProposal:result.status==='single-compatible'&&result.compatibleRules[0]===rule};
    });
    return {...review,proposal:rule===null?null:{landmarkId:review.landmarkId,rule},omissions,
      sensitivity:rule===null?'no-unique-proposal':omissions.every(o=>o.retainsUniqueProposal)?'retained-after-each-group-omission':'depends-on-retained-groups'};
  });
  return {marks,proposals:marks.flatMap(mark=>mark.proposal?[mark.proposal]:[]),
    boundary:'Proposals are unique survivors only within the five tested geometric rules, conditioned on the supplied reference calibration and observation bounds. Omission removes identical numeric readings together but does not establish source independence or prospective validation. Untested, contradictory and ambiguous marks receive no inferred choice. No physical necessity, expert intent or learning benefit is established.'};
}
