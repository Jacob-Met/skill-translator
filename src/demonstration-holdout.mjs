/** Omission audit retaining all supplied demonstration annotations. */
import {validateDemonstrationResponse,responseFromDemonstrations} from './response-demonstrations.mjs';
import {analyzeResponseHoldouts} from './response-holdout.mjs';
export function analyzeDemonstrationHoldouts(input){
 const account=validateDemonstrationResponse(input);
 const audit=analyzeResponseHoldouts(responseFromDemonstrations(account));
 return {account,audit,rows:audit.rows.map(omission=>{
  const original=account.demonstrations.find(d=>d.id===omission.observation.id);
  return {omission,inspection:original?'extra:'+original.id:'reference',sourceKind:original?'retained-annotation':'supplied-numeric-observation'};
 })};
}
