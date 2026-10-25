/** Infer bounded five-rule proposals directly from retained raw demonstrations. */
import {validateDemonstrationResponse,responseFromDemonstrations} from './response-demonstrations.mjs';
import {derive,adapt,GeometryError} from './geometry.mjs';
import {predictInterpretation} from './hypotheses.mjs';
import {RULES} from './evidence.mjs';
import {rational,sub,cmp} from '../vendor/chronos/exact-halfplanes.mjs';
export const RAW_RULE_PROPOSAL_FORMAT='skill-translator.raw-rule-proposal/v1';
const within=(prediction,observed,bound)=>{
 const difference=sub(rational(prediction),rational(observed));
 return cmp(difference,rational(bound))<=0&&cmp(difference,rational(-bound))>=0;
};
export function inspectRawRuleProposals(input){
 const account=validateDemonstrationResponse(input),response=responseFromDemonstrations(account),task=derive(response.source);
 const mark=task.landmarks.find(m=>m.id===response.landmarkId);
 const candidates=RULES.map(rule=>{
  const readings=response.observations.map(observation=>{
   let predicted;
   try{predicted=predictInterpretation(mark,task.source,observation.widthMm,observation.heightMm,rule);}
   catch(error){if(!(error instanceof GeometryError))throw error;return {observationId:observation.id,predicted:null,compatible:false,reason:error.message};}
   const xWithin=within(predicted.xMm,observation.xMm,observation.xBoundMm),yWithin=within(predicted.yMm,observation.yMm,observation.yBoundMm);
   return {observationId:observation.id,predicted,xWithin,yWithin,compatible:xWithin&&yWithin,reason:null};
  });
  return {rule,readings,status:!readings.length?'untested':readings.every(r=>r.compatible)?'compatible':'contradicted'};
 });
 const compatibleRules=candidates.filter(c=>c.status==='compatible').map(c=>c.rule);
 return {account,response,candidates,compatibleRules,proposal:compatibleRules.length===1?compatibleRules[0]:null,
  status:!response.observations.length?'no-evidence':!compatibleRules.length?'none-compatible':compatibleRules.length===1?'single-compatible':'unresolved',
  boundary:'The original independent x/y bounds remain rectangular. Coordinates and nominal predictions are conditioned on supplied planar calibration and correspondences; exact decimal comparisons add no tolerance. A unique candidate is one of five geometric interpretations, not observed physical necessity or independent skill validation. The separate affine coefficient domain is not used by this five-rule comparison. The original reference and all raw annotations remain unchanged.'};
}
export function createRawRuleProposal(input){
 const findings=inspectRawRuleProposals(input);
 if(!findings.proposal)throw Error('No unique supported rule is available from these retained demonstrations.');
 const source=structuredClone(findings.response.source),mark=source.landmarks.find(m=>m.id===findings.response.landmarkId),rule=findings.proposal;
 const originalRule=mark.kind==='fraction'?'fraction':mark.edge;
 mark.kind=rule==='fraction'?'fraction':'edge_offset_mm';if(rule==='fraction')delete mark.edge;else mark.edge=rule;
 mark.why=`Inferred ${rule} proposal from five geometric rules under retained demonstration x/y bounds. Original rule: ${originalRule}.`;
 source.provenance=String(source.provenance||'')+' | Evidence-conditioned raw-demonstration rule proposal; not verified physical skill.';
 const target=adapt(derive(source),findings.response.target.widthMm,findings.response.target.heightMm);
 return {format:RAW_RULE_PROPOSAL_FORMAT,account:findings.account,rule,landmarkId:mark.id,originalRule,source,target,findings};
}
export function exportRawRuleProposal(input){const proposal=createRawRuleProposal(input);const raw={format:RAW_RULE_PROPOSAL_FORMAT,account:proposal.account,rule:proposal.rule};if(new TextEncoder().encode(JSON.stringify(raw)).length>2_000_000)throw Error('Complete proposal exceeds2MB; no source is discarded.');return raw;}
export function importRawRuleProposal(input){
 if(input?.format!==RAW_RULE_PROPOSAL_FORMAT)throw Error('Unsupported raw-rule proposal account.');
 const proposal=createRawRuleProposal(input.account);
 if(input.rule!==proposal.rule)throw Error('Saved rule does not match the unique proposal from the original raw sources.');
 return proposal;
}
