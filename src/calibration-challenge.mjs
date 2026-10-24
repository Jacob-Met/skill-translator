// Prospective software workflow, not an attestation of when data was collected.
// Training fixes the complete explanations. New results may only challenge them.
import {GeometryError} from "./geometry.mjs";
import {RULES,createObservation,validateObservations} from "./evidence.mjs";
import {importCalibrationInvestigation,analyzeCalibrationEvidence,
  predictCalibrationExplanations} from "./calibration-evidence.mjs";

export const CHALLENGE_PLAN_SCHEMA="skill-translator-calibration-challenge-plan/v1";
export const CHALLENGE_STUDY_SCHEMA="skill-translator-calibration-challenge-study/v1";
export const MAX_CHALLENGE_TRIALS=6;
const requireThat=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const clone=value=>JSON.parse(JSON.stringify(value));
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function immutable(value){
  if(value&&typeof value==="object"){Object.values(value).forEach(immutable);Object.freeze(value);}
  return value;
}
function bounded(value,min,max,label){
  requireThat(finite(value)&&value>=min&&value<=max,`${label} must be ${min}–${max}`);return value;
}
function identity(id,label){
  requireThat(typeof id==="string"&&/^[a-z0-9-]{1,40}$/.test(id),`${label} needs a stable lowercase id`);return id;
}
function named(value,label){
  requireThat(typeof value==="string"&&value.trim().length>0&&value.trim().length<=160,`${label} needs 1–160 characters`);return value.trim();
}
function buildPlan(investigation,input){
  const study=importCalibrationInvestigation(investigation);
  const analysis=analyzeCalibrationEvidence(study.source,study.landmarkId,study.observations,study.hypotheses);
  requireThat(analysis.observations.length>0,"Add training observations before planning a separate challenge");
  requireThat(analysis.survivingRules.length>0,"No training explanation survives; review the conflicting evidence first");
  requireThat(input?.prospectiveDeclaration===true,"Declare that challenge results have not yet been entered or used to choose this plan");
  requireThat(Array.isArray(input.trials)&&input.trials.length>0&&input.trials.length<=MAX_CHALLENGE_TRIALS,
    `Plan 1–${MAX_CHALLENGE_TRIALS} new-workpiece challenges`);
  const ids=new Set(),dimensions=new Set();
  const trials=input.trials.map(t=>{
    const id=identity(t?.id,"Challenge"),label=named(t.label,"Challenge label");
    requireThat(!ids.has(id),"Every planned challenge needs a distinct id");ids.add(id);
    const widthMm=bounded(t.widthMm,1,10000,"Planned width (mm)"),heightMm=bounded(t.heightMm,1,10000,"Planned height (mm)");
    const uncertaintyMm=bounded(t.uncertaintyMm,0,1000,"Planned measurement radius (mm)");
    requireThat(!analysis.observations.some(o=>o.widthMm===widthMm&&o.heightMm===heightMm),
      "Choose dimensions absent from the training observations; this workflow tests transfer to a new workpiece");
    const key=JSON.stringify([widthMm,heightMm]);
    requireThat(!dimensions.has(key),"Use distinct planned workpiece dimensions; repeated trials are not independent votes");dimensions.add(key);
    return {id,label,widthMm,heightMm,uncertaintyMm};
  });
  let explanations;
  for(const trial of trials){
    // Any surviving explanation that cannot fit a proposed sheet prevents the
    // plan; changing the physical setup must not silently filter the predictors.
    const predictions=predictCalibrationExplanations(study.source,study.landmarkId,study.observations,study.hypotheses,trial.widthMm,trial.heightMm);
    if(!explanations)explanations=predictions.map(({id,rule,hypothesisId})=>({id,rule,hypothesisId,predictions:[]}));
    predictions.forEach((p,i)=>explanations[i].predictions.push({trialId:trial.id,xMm:p.xMm,yMm:p.yMm}));
  }
  return {schema:CHALLENGE_PLAN_SCHEMA,id:identity(input.id,"Plan"),label:named(input.label,"Plan label"),
    prospectiveDeclaration:true,investigation:study,trials,explanations};
}
export function freezeChallengePlan(investigation,input){return immutable(buildPlan(investigation,input));}
export function importChallengePlan(input){
  requireThat(input?.schema===CHALLENGE_PLAN_SCHEMA,"Unsupported challenge-plan schema");
  const plan=buildPlan(input.investigation,input);
  requireThat(same(input.explanations,plan.explanations),
    "Frozen predictions differ from the retained training study; reopen the original plan or make an explicitly new plan");
  return immutable(plan);
}
export function createChallengeResult(inputPlan,input){
  const plan=importChallengePlan(inputPlan),trial=plan.trials.find(t=>t.id===input?.trialId);
  requireThat(trial,"Choose a challenge from the frozen plan");
  requireThat(input.collectedAfterPlan===true,"Declare that this result was obtained separately after the plan was fixed");
  const observation=createObservation(plan.investigation.source,{id:input.id,label:input.label,evidenceClass:input.evidenceClass,
    landmarkId:plan.investigation.landmarkId,widthMm:trial.widthMm,heightMm:trial.heightMm,
    xMm:input.xMm,yMm:input.yMm,uncertaintyMm:input.uncertaintyMm});
  const result={trialId:trial.id,collectionDeclaration:"reported-after-plan",observation};
  return validateResults(plan,[result])[0];
}
function validateResults(plan,results){
  requireThat(Array.isArray(results)&&results.length<=plan.trials.length,"Supply at most one result per planned challenge");
  const ids=new Set(),trials=new Set(),trainingIds=new Set(plan.investigation.observations.map(o=>o.id));
  return results.map(entry=>{
    const trial=plan.trials.find(t=>t.id===entry?.trialId);
    requireThat(trial,"Result does not belong to a frozen challenge");
    requireThat(!trials.has(trial.id),"A frozen challenge already has a result");trials.add(trial.id);
    requireThat(entry.collectionDeclaration==="reported-after-plan","Retain the declared collection order for every challenge result");
    const observation=validateObservations(plan.investigation.source,[entry.observation])[0];
    requireThat(observation.landmarkId===plan.investigation.landmarkId&&observation.widthMm===trial.widthMm&&observation.heightMm===trial.heightMm,
      "Challenge dimensions and source mark must match the frozen plan");
    requireThat(!trainingIds.has(observation.id),"A training observation cannot be reused as a separate challenge result");
    requireThat(!ids.has(observation.id),"Every challenge result needs a distinct observation id");ids.add(observation.id);
    return {trialId:trial.id,collectionDeclaration:"reported-after-plan",observation};
  });
}
export function analyzeCalibrationChallenge(inputPlan,inputResults){
  const plan=importChallengePlan(inputPlan),results=validateResults(plan,inputResults);
  const trials=plan.trials.map(t=>{
    const observation=results.find(r=>r.trialId===t.id)?.observation||null;
    return {...t,observation,status:!observation?"awaiting-result":observation.uncertaintyMm>t.uncertaintyMm?
      "insufficient-precision":"qualified"};
  });
  const qualified=trials.filter(t=>t.status==="qualified");
  const explanations=plan.explanations.map(e=>{
    const residuals=trials.map(t=>{
      const predicted=e.predictions.find(p=>p.trialId===t.id);
      if(t.status!=="qualified")return {trialId:t.id,status:t.status,predicted,errorMm:null,compatible:null};
      const errorMm=Math.hypot(predicted.xMm-t.observation.xMm,predicted.yMm-t.observation.yMm);
      return {trialId:t.id,status:"evaluated",predicted,errorMm,compatible:errorMm<=t.observation.uncertaintyMm+1e-9};
    });
    const contradicted=residuals.some(r=>r.compatible===false);
    return {...e,residuals,status:contradicted?"contradicted":qualified.length===trials.length?"compatible":"incomplete"};
  });
  const rules=RULES.map(rule=>{
    const members=explanations.filter(e=>e.rule===rule),survivors=members.filter(e=>e.status!=="contradicted");
    const requiresSwitching=members.length>0&&!survivors.length&&qualified.length>0&&qualified.every(t=>
      members.some(e=>e.residuals.find(r=>r.trialId===t.id).compatible));
    return {rule,status:!members.length?"rejected-in-training":!survivors.length?"contradicted":
      qualified.length===trials.length?"compatible":"incomplete",survivingExplanationIds:survivors.map(e=>e.id),requiresSwitching};
  });
  const survivingRules=rules.filter(r=>r.survivingExplanationIds.length>0).map(r=>r.rule);
  return {planId:plan.id,trials,explanations,rules,survivingRules,qualifiedCount:qualified.length,
    missingCount:trials.filter(t=>t.status==="awaiting-result").length,
    insufficientPrecisionCount:trials.filter(t=>t.status==="insufficient-precision").length,
    status:!results.length?"awaiting-results":!survivingRules.length?"none-compatible":
      qualified.length<trials.length?"incomplete":survivingRules.length===1?"single-compatible":"unresolved",
    collectionOrder:"User-declared only; no independent timing or collection attestation"};
}
export function exportChallengeStudy(inputPlan,inputResults){
  const plan=importChallengePlan(inputPlan),results=validateResults(plan,inputResults);
  return {schema:CHALLENGE_STUDY_SCHEMA,plan:clone(plan),results};
}
export function importChallengeStudy(input){
  requireThat(input?.schema===CHALLENGE_STUDY_SCHEMA,"Unsupported challenge-study schema");
  return exportChallengeStudy(input.plan,input.results);
}
