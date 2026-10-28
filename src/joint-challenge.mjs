// Prospective, source-bound joint challenges. Reconstructed 2026-10-27.
import {derive,GeometryError} from './geometry.mjs';
import {predictInterpretation} from './hypotheses.mjs';
import {createObservation,validateObservations} from './evidence.mjs';
import {importJointCalibration,analyzeJointCalibration} from './joint-calibration.mjs';
export const JOINT_CHALLENGE_PLAN_SCHEMA='skill-translator-joint-challenge-plan/v1';
export const JOINT_CHALLENGE_STUDY_SCHEMA='skill-translator-joint-challenge-study/v1';
export const MAX_JOINT_CHALLENGE_TRIALS=6;
export const MAX_JOINT_CHALLENGE_RESULTS=72;
export const MAX_JOINT_CHALLENGE_BYTES=4000000;
const requireThat=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const copy=x=>JSON.parse(JSON.stringify(x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function identity(x,label){requireThat(typeof x==='string'&&/^[a-z0-9-]{1,40}$/.test(x),label+' needs 1–40 lowercase letters, digits or hyphens');return x;}
function label(x){requireThat(typeof x==='string'&&x.trim().length>0&&x.trim().length<=160,'Supply a label in 1–160 characters');return x.trim();}
function rawPlan(plan){return {schema:JOINT_CHALLENGE_PLAN_SCHEMA,id:plan.id,label:plan.label,prospectiveDeclaration:true,investigation:plan.investigation,trials:plan.trials};}
function envelope(plan,results){return {schema:JOINT_CHALLENGE_STUDY_SCHEMA,plan:rawPlan(plan),results};}
function size(bundle){requireThat(new TextEncoder().encode(JSON.stringify(bundle)).length<=MAX_JOINT_CHALLENGE_BYTES,'Complete joint challenge study exceeds 4,000,000 UTF-8 bytes');}
function build(investigation,input){
 const study=importJointCalibration(investigation);
 requireThat(input&&(!input.schema||input.schema===JOINT_CHALLENGE_PLAN_SCHEMA),'Unsupported joint challenge plan schema');
 requireThat(input.prospectiveDeclaration===true,'Declare that proposed outcomes have not been seen');
 const id=identity(input.id,'Plan'),name=label(input.label);
 requireThat(Array.isArray(input.trials)&&input.trials.length>=1&&input.trials.length<=6,'Plan 1–6 future workpieces');
 const training=analyzeJointCalibration(study.source,study.landmarkIds,study.observations,study.hypotheses);
 requireThat(!training.missingMarkIds.length&&training.viableReadingIds.length>0,'Every selected mark needs training and one shared viable source reading');
 const ids=new Set(),dimensions=new Set(study.observations.map(r=>JSON.stringify([r.widthMm,r.heightMm])));
 const trials=input.trials.map(t=>{
  requireThat(t&&typeof t==='object','Supply a future trial');const id=identity(t.id,'Trial');requireThat(!ids.has(id),'Trial ids must be distinct');ids.add(id);
  for(const key of ['widthMm','heightMm'])requireThat(finite(t[key])&&t[key]>=1&&t[key]<=10000,'Future dimensions must be 1–10000 mm');
  requireThat(finite(t.uncertaintyMm)&&t.uncertaintyMm>=0&&t.uncertaintyMm<=1000,'Planned uncertainty must be 0–1000 mm');
  const pair=JSON.stringify([t.widthMm,t.heightMm]);requireThat(!dimensions.has(pair),'Future workpiece dimensions must be distinct and absent from all training observations');dimensions.add(pair);
  return {id,label:label(t.label),widthMm:t.widthMm,heightMm:t.heightMm,uncertaintyMm:t.uncertaintyMm};
 });
 const readings=training.hypotheses.filter(h=>h.viable).map(h=>{
  const d=derive({...study.source,source:{...study.source.source,widthMm:h.reading.widthMm,heightMm:h.reading.heightMm,corners:h.reading.corners},landmarks:study.source.landmarks.map(m=>({...m,sourcePx:h.reading.points.find(p=>p.landmarkId===m.id).sourcePx}))});
  const marks=h.marks.map(m=>({landmarkId:m.landmarkId,candidates:m.survivingRules.map(rule=>({rule,predictions:trials.map(t=>{
   // Any impossible supported prediction refuses the entire plan; never trim survivors.
   const predicted=predictInterpretation(d.landmarks.find(x=>x.id===m.landmarkId),d.source,t.widthMm,t.heightMm,rule);
   requireThat(finite(predicted.xMm)&&finite(predicted.yMm)&&predicted.xMm>=0&&predicted.xMm<=t.widthMm&&predicted.yMm>=0&&predicted.yMm<=t.heightMm,'A training-supported prediction falls outside a proposed sheet');
   return {trialId:t.id,...predicted};
  })}))}));
  return {id:h.id,label:h.label,marks,combinationCount:h.combinationCount};
 });
 const plan={schema:JOINT_CHALLENGE_PLAN_SCHEMA,id,label:name,prospectiveDeclaration:true,investigation:study,trials,readings};
 size(envelope(plan,[]));return freeze(plan);
}
export function freezeJointChallengePlan(investigation,input){return build(investigation,input);}
export function importJointChallengePlan(plan){requireThat(plan?.schema===JOINT_CHALLENGE_PLAN_SCHEMA,'Unsupported joint challenge plan schema');return build(plan.investigation,plan);}
function normalizedResults(plan,raw){
 requireThat(Array.isArray(raw)&&raw.length<=MAX_JOINT_CHALLENGE_RESULTS,'Results must be an explicit array of at most72 observations');
 const ids=new Set(plan.investigation.observations.map(r=>r.id)),pairs=new Set();
 return raw.map(r=>{
  requireThat(r?.collectionDeclaration==='reported-after-plan','Results require the reported-after-plan collection declaration');
  const trial=plan.trials.find(t=>t.id===r.trialId);requireThat(trial,'Result trial is not in the frozen plan');
  const row=validateObservations(plan.investigation.source,[r.observation])[0];
  requireThat(plan.investigation.landmarkIds.includes(row.landmarkId),'Result mark is not selected in the frozen plan');
  requireThat(row.widthMm===trial.widthMm&&row.heightMm===trial.heightMm,'Result dimensions differ from the frozen workpiece');
  requireThat(!ids.has(row.id),'Result observation ids must be globally distinct and not reuse training ids');ids.add(row.id);
  const pair=JSON.stringify([trial.id,row.landmarkId]);requireThat(!pairs.has(pair),'Only one outcome is allowed per trial and mark');pairs.add(pair);
  return {trialId:trial.id,collectionDeclaration:'reported-after-plan',observation:row};
 });
}
export function createJointChallengeResult(rawPlan,input){
 const plan=importJointChallengePlan(rawPlan);requireThat(input?.collectedAfterPlan===true,'Declare outcome collection after the frozen plan');
 const raw=input.observation??input;
 // Creator may construct a fresh anchor; supplied anchors must never be silently replaced.
 const observation=Object.hasOwn(raw,'sourceReference')?validateObservations(plan.investigation.source,[raw])[0]:createObservation(plan.investigation.source,raw);
 const result=normalizedResults(plan,[{trialId:input.trialId,collectionDeclaration:'reported-after-plan',observation}])[0];
 size(envelope(plan,[result]));return freeze(result);
}
export function analyzeJointChallenge(rawPlan,rawResults){
 const plan=importJointChallengePlan(rawPlan),results=normalizedResults(plan,rawResults);size(envelope(plan,results));
 const slots=plan.trials.flatMap(t=>plan.investigation.landmarkIds.map(landmarkId=>{
  const r=results.find(r=>r.trialId===t.id&&r.observation.landmarkId===landmarkId);
  return {trialId:t.id,landmarkId,status:!r?'missing':r.observation.uncertaintyMm>t.uncertaintyMm?'insufficient-precision':'qualified',observation:r?.observation??null};
 }));
 const readings=plan.readings.map(h=>{
  const marks=h.marks.map(m=>{
   const candidates=m.candidates.map(c=>{
    const residuals=slots.filter(s=>s.landmarkId===m.landmarkId).map(s=>{
     const predicted=c.predictions.find(p=>p.trialId===s.trialId),errorMm=s.observation?Math.hypot(predicted.xMm-s.observation.xMm,predicted.yMm-s.observation.yMm):null;
     return {trialId:s.trialId,observationId:s.observation?.id??null,predicted,errorMm,status:s.status,compatible:s.status==='qualified'?errorMm<=s.observation.uncertaintyMm+1e-9:null};
    });
    return {rule:c.rule,status:residuals.some(r=>r.compatible===false)?'contradicted':'compatible',residuals};
   });
   return {landmarkId:m.landmarkId,candidates,survivingRules:candidates.filter(c=>c.status==='compatible').map(c=>c.rule)};
  });
  const combinationCount=marks.reduce((n,m)=>n*m.survivingRules.length,1);
  return {id:h.id,label:h.label,marks,viable:combinationCount>0,combinationCount};
 });
 const viable=readings.filter(h=>h.viable),combinationCount=viable.reduce((n,h)=>n+h.combinationCount,0),missingCount=slots.filter(s=>s.status==='missing').length,impreciseCount=slots.filter(s=>s.status==='insufficient-precision').length,qualifiedCount=slots.length-missingCount-impreciseCount;
 const status=!viable.length?'none-compatible':!results.length?'awaiting-results':missingCount?'incomplete':impreciseCount?'insufficient-precision':combinationCount===1?'one-joint-explanation':'unresolved';
 const requiresSourceSwitching=!viable.length&&plan.investigation.landmarkIds.every(id=>readings.some(h=>h.marks.find(m=>m.landmarkId===id).survivingRules.length));
 return {status,readings,trials:plan.trials.map(t=>({...t,slots:slots.filter(s=>s.trialId===t.id)})),qualifiedCount,missingCount,impreciseCount,totalCount:slots.length,viableReadingIds:viable.map(h=>h.id),combinationCount,requiresSourceSwitching,limitations:['One global source reading and one fixed rule per mark across every future sheet.','Only qualified reported outcomes eliminate explanations. Counts are finite declared combinations, not probabilities.','Prospective timing and measured provenance are declarations, not authenticated acquisition.']};
}
export function exportJointChallengeStudy(rawPlan,rawResults){const plan=importJointChallengePlan(rawPlan),results=normalizedResults(plan,rawResults),bundle=envelope(plan,results);size(bundle);return copy(bundle);}
export function importJointChallengeStudy(raw){
 if(typeof raw==='string'){requireThat(new TextEncoder().encode(raw).length<=MAX_JOINT_CHALLENGE_BYTES,'Study exceeds4,000,000 UTF-8 bytes');try{raw=JSON.parse(raw);}catch{throw new GeometryError('Invalid joint challenge JSON');}}
 requireThat(raw?.schema===JOINT_CHALLENGE_STUDY_SCHEMA,'Unsupported joint challenge study schema');size(raw);const plan=importJointChallengePlan(raw.plan),results=normalizedResults(plan,raw.results);size(envelope(plan,results));return {plan,results:freeze(results)};
}
