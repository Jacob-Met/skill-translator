// Deliberate, recoverable interpretation changes; not automatic rule learning.
import {derive,adapt,GeometryError} from "./geometry.mjs";
import {validateCapturedDemo} from "./capture.mjs";
import {RULES,validateObservations,analyzeEvidence,exportEvidence,importEvidence} from "./evidence.mjs";
export const RULE_ADOPTION_SCHEMA="skill-translator-rule-adoption/v1";
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const ruleOf=mark=>mark.kind==="fraction"?"fraction":mark.edge;
function validateSource(demo){if(demo?.source?.image)validateCapturedDemo(demo);return derive(demo);}

export function reviewRuleChoices(demo,observations){
  const derived=validateSource(demo),rows=validateObservations(demo,observations);
  return derived.landmarks.map(mark=>{
    const evidence=analyzeEvidence(demo,mark.id,rows);
    return {landmarkId:mark.id,label:mark.label,originalRule:ruleOf(mark),status:evidence.status,
      observedCount:evidence.observations.length,reportedCount:evidence.reportedCount,
      authoredCount:evidence.authoredCount,compatibleRules:evidence.compatibleRules,
      candidates:evidence.candidates.map(c=>({rule:c.rule,status:c.status,contradictions:c.contradictions}))};
  });
}
export function createRuleAdoption(demo,observations,selections){
  const derived=validateSource(demo),rows=validateObservations(demo,observations);
  fail(Array.isArray(selections)&&selections.length>0&&selections.length<=derived.landmarks.length,
    "Explicitly choose at least one source landmark rule");
  const reviews=reviewRuleChoices(demo,rows),seen=new Set();
  const decisions=selections.map(choice=>{
    fail(choice&&typeof choice.landmarkId==="string"&&!seen.has(choice.landmarkId),
      "Each selected source landmark must occur once");seen.add(choice.landmarkId);
    const review=reviews.find(r=>r.landmarkId===choice.landmarkId);
    fail(review,"The decision refers to an unknown source landmark");
    fail(RULES.includes(choice.rule),"Choose a supported geometric rule");
    fail(review.observedCount>0,"This landmark has no observations; an untested rule cannot be adopted from evidence");
    fail(review.candidates.find(c=>c.rule===choice.rule)?.status==="compatible",
      "The chosen rule is contradicted by the retained observations");
    return {landmarkId:choice.landmarkId,label:review.label,originalRule:review.originalRule,
      chosenRule:choice.rule,changed:review.originalRule!==choice.rule,
      decisionClass:review.compatibleRules.length===1?"only-compatible-in-tested-rule-family":"user-choice-among-compatible-rules",
      compatibleRules:[...review.compatibleRules],reportedCount:review.reportedCount,authoredCount:review.authoredCount,
      originalMark:structuredClone(demo.landmarks.find(m=>m.id===choice.landmarkId))};
  });
  const adoptedDemo=structuredClone(demo);
  for(const decision of decisions){
    const mark=adoptedDemo.landmarks.find(m=>m.id===decision.landmarkId);
    mark.kind=decision.chosenRule==="fraction"?"fraction":"edge_offset_mm";
    if(decision.chosenRule==="fraction")delete mark.edge;else mark.edge=decision.chosenRule;
    mark.why=`Explicit ${decision.chosenRule} interpretation, chosen from ${decision.compatibleRules.length} compatible rule(s) under the supplied source and observations. Original authored rule: ${decision.originalRule}.`;
  }
  adoptedDemo.provenance=String(derived.provenance)+" | Explicit evidence-conditioned rule choice; not verified physical skill.";
  adoptedDemo.interpretationDecision={schema:RULE_ADOPTION_SCHEMA,originalProvenance:derived.provenance,
    decisions:structuredClone(decisions),observationEvidence:exportEvidence(demo,rows)};
  validateSource(adoptedDemo);
  return {originalDemo:structuredClone(demo),observations:rows,decisions,adoptedDemo,
    limitation:"Rule compatibility is conditioned on the original calibration and supplied observations. An explicit choice among survivors does not resolve their ambiguity."};
}
export function compareAdoptionTargets(adoption,widthMm,heightMm){
  const verified=createRuleAdoption(adoption.originalDemo,adoption.observations,
    adoption.decisions.map(d=>({landmarkId:d.landmarkId,rule:d.chosenRule})));
  const adopted=adapt(derive(verified.adoptedDemo),widthMm,heightMm);
  let original=null,originalError=null;
  try{original=adapt(derive(verified.originalDemo),widthMm,heightMm);}catch(error){if(!(error instanceof GeometryError))throw error;originalError=error.message;}
  return {widthMm:adopted.widthMm,heightMm:adopted.heightMm,original,originalError,adopted,
    marks:adopted.landmarks.map(mark=>{
      const before=original?.landmarks.find(m=>m.id===mark.id);
      return {id:mark.id,label:mark.label,before:before?{xMm:before.xMm,yMm:before.yMm}:null,after:{xMm:mark.xMm,yMm:mark.yMm},
        movementMm:before?Math.hypot(mark.xMm-before.xMm,mark.yMm-before.yMm):null,
        decision:verified.decisions.find(d=>d.landmarkId===mark.id)||null};
    })};
}
export function exportRuleAdoption(adoption){
  const verified=createRuleAdoption(adoption.originalDemo,adoption.observations,
    adoption.decisions.map(d=>({landmarkId:d.landmarkId,rule:d.chosenRule})));
  return {schema:RULE_ADOPTION_SCHEMA,originalDemo:verified.originalDemo,
    observationEvidence:exportEvidence(verified.originalDemo,verified.observations),
    selections:verified.decisions.map(d=>({landmarkId:d.landmarkId,rule:d.chosenRule})),adoptedDemo:verified.adoptedDemo};
}
export function importRuleAdoption(bundle){
  fail(bundle?.schema===RULE_ADOPTION_SCHEMA,"Unsupported rule-decision bundle");
  return createRuleAdoption(bundle.originalDemo,importEvidence(bundle.originalDemo,bundle.observationEvidence),bundle.selections);
}
