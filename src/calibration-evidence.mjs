// Finite, explicit alternative readings of the same source. No probabilities,
// continuous uncertainty bounds, or per-observation switching of calibration.
import {derive,GeometryError} from "./geometry.mjs";
import {predictInterpretation} from "./hypotheses.mjs";
import {RULES,observationReference,scoreInterpretation,validateObservations} from "./evidence.mjs";

export const CALIBRATION_SCHEMA="skill-translator-calibration-investigation/v1";
export const MAX_HYPOTHESES=24;
const requireThat=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const copy=value=>JSON.parse(JSON.stringify(value));
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function same(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
function selected(demo,landmarkId){
  const anchor=observationReference(demo,landmarkId);
  return {anchor,mark:demo.landmarks.find(m=>m.id===landmarkId)};
}
function readingOf(demo,mark){
  return {widthMm:demo.source.widthMm,heightMm:demo.source.heightMm,
    corners:demo.source.corners.map(p=>({x:p.x,y:p.y})),
    sourcePx:{x:mark.sourcePx.x,y:mark.sourcePx.y}};
}
function conditioned(demo,mark,reading){
  requireThat(reading&&Array.isArray(reading.corners)&&reading.sourcePx,
    "Supply source dimensions, four corners and the selected source point");
  // Keep image identity and all semantic annotations. Only the declared geometric
  // reading changes; unrelated marks need not lie within this alternative page.
  const result=derive({...demo,
    source:{...demo.source,widthMm:reading.widthMm,heightMm:reading.heightMm,corners:reading.corners},
    landmarks:[{...mark,sourcePx:reading.sourcePx}]});
  if(demo.source.image){
    const {widthPx,heightPx}=demo.source.image;
    for(const p of [...reading.corners,reading.sourcePx])requireThat(
      p.x>=0&&p.y>=0&&p.x<=widthPx&&p.y<=heightPx,
      "A source reading must stay inside the original image coordinate frame");
  }
  return result;
}
export function createCalibrationHypothesis(demo,landmarkId,input){
  const {anchor,mark}=selected(demo,landmarkId);
  requireThat(input&&typeof input.id==="string"&&/^[a-z0-9-]{1,40}$/.test(input.id)&&input.id!=="nominal",
    "Hypothesis needs a distinct id other than nominal");
  requireThat(typeof input.label==="string"&&input.label.trim().length>0&&input.label.trim().length<=160,
    "Name the source reading in 1–160 characters");
  requireThat(["proposed-reading","repeat-annotation"].includes(input.basis),
    "Declare a proposed reading or a repeated annotation; neither is verified automatically");
  const derived=conditioned(demo,mark,input.reading);
  return {id:input.id,label:input.label.trim(),basis:input.basis,landmarkId,
    reading:readingOf({source:derived.source},derived.landmarks[0]),sourceReference:anchor};
}
export function validateCalibrationHypotheses(demo,landmarkId,hypotheses){
  requireThat(Array.isArray(hypotheses)&&hypotheses.length<=MAX_HYPOTHESES,
    `Supply at most ${MAX_HYPOTHESES} alternative source readings`);
  const ids=new Set();
  return hypotheses.map(input=>{
    const row=createCalibrationHypothesis(demo,landmarkId,input);
    requireThat(input.landmarkId===landmarkId&&same(input.sourceReference,row.sourceReference),
      "Hypothesis source reference differs from the original annotation");
    requireThat(!ids.has(row.id),"Every source reading needs a distinct id");ids.add(row.id);
    return row;
  });
}
export function analyzeCalibrationEvidence(demo,landmarkId,observations,hypotheses=[]){
  const {anchor,mark}=selected(demo,landmarkId);
  const rows=validateObservations(demo,observations).filter(o=>o.landmarkId===landmarkId);
  const alternatives=validateCalibrationHypotheses(demo,landmarkId,hypotheses);
  const readings=[{id:"nominal",label:"Original calibration",basis:"original",landmarkId,
    reading:readingOf(demo,mark),sourceReference:anchor},...alternatives];
  const evaluated=readings.map(hypothesis=>{
    const derived=conditioned(demo,mark,hypothesis.reading);
    const candidates=RULES.map(rule=>{
      const residuals=rows.map(row=>scoreInterpretation(derived.landmarks[0],derived.source,row,rule));
      return {rule,status:!rows.length?"untested":residuals.every(r=>r.compatible)?"compatible":"contradicted",
        residuals,contradictions:residuals.filter(r=>!r.compatible).map(r=>r.observationId)};
    });
    return {...hypothesis,candidates};
  });
  const rules=RULES.map((rule,i)=>{
    const supporters=evaluated.filter(h=>h.candidates[i].status!=="contradicted");
    const status=!rows.length?"untested":!supporters.length?"contradicted":
      supporters.length===evaluated.length?"all-readings-compatible":"reading-sensitive";
    // Explicitly expose the tempting but invalid per-row choice of a different
    // reference. A single original source cannot acquire a new value per trial.
    const requiresSwitching=rows.length>0&&!supporters.length&&rows.every((_,j)=>
      evaluated.some(h=>h.candidates[i].residuals[j].compatible));
    return {rule,status,supportingHypothesisIds:supporters.map(h=>h.id),requiresSwitching};
  });
  const survivingRules=rules.filter(r=>r.status!=="contradicted").map(r=>r.rule);
  return {landmarkId,sourceReference:anchor,observations:rows,hypotheses:evaluated,rules,survivingRules,
    nominalRules:evaluated[0].candidates.filter(c=>c.status!=="contradicted").map(c=>c.rule),
    status:!rows.length?"no-evidence":!survivingRules.length?"none-compatible":
      survivingRules.length===1?"single-compatible":"unresolved",
    sensitive:rows.length>0&&rules.some(r=>r.status==="reading-sensitive")};
}

// The same complete explanations used by the investigation, projected onto one
// new sheet. Consumers can retain these predictions before entering new results.
export function predictCalibrationExplanations(demo,landmarkId,observations,hypotheses,widthMm,heightMm){
  const analysis=analyzeCalibrationEvidence(demo,landmarkId,observations,hypotheses);
  const {mark}=selected(demo,landmarkId),predictions=[];
  for(const h of analysis.hypotheses){
    const derived=conditioned(demo,mark,h.reading);
    for(const candidate of h.candidates)if(candidate.status!=="contradicted"){
      predictions.push({id:`${candidate.rule}:${h.id}`,rule:candidate.rule,hypothesisId:h.id,
        ...predictInterpretation(derived.landmarks[0],derived.source,widthMm,heightMm,candidate.rule)});
    }
  }
  return predictions;
}

// Compare complete surviving (rule, reference) explanations. The closest pair
// between two finite prediction sets determines whether either rule can mimic
// the other within two measurement radii. No averaging of source hypotheses.
export function proposeCalibrationVariation(demo,landmarkId,observations,hypotheses,uncertaintyMm){
  requireThat(finite(uncertaintyMm)&&uncertaintyMm>=0&&uncertaintyMm<=1000,
    "Proposed measurement radius must be 0–1,000 mm");
  const analysis=analyzeCalibrationEvidence(demo,landmarkId,observations,hypotheses);
  if(analysis.survivingRules.length<2)return null;
  const {mark}=selected(demo,landmarkId);
  const states=new Map(analysis.hypotheses.map(h=>[h.id,conditioned(demo,mark,h.reading)]));
  let best=null,admissibleDimensions=0;
  for(const wf of [0.7,1,1.3,1.7])for(const hf of [0.7,1,1.3,1.7]){
    const widthMm=demo.source.widthMm*wf,heightMm=demo.source.heightMm*hf;
    let predictions;
    try{
      predictions=analysis.rules.filter(r=>r.status!=="contradicted").map(r=>({rule:r.rule,
        points:r.supportingHypothesisIds.map(id=>{
          const d=states.get(id);
          return {hypothesisId:id,...predictInterpretation(d.landmarks[0],d.source,widthMm,heightMm,r.rule)};
        })}));
    }catch(e){if(e instanceof GeometryError)continue;throw e;}
    admissibleDimensions++;
    const pairs=[];
    for(let i=0;i<predictions.length;i++)for(let j=i+1;j<predictions.length;j++){
      const a=predictions[i],b=predictions[j];let separationMm=Infinity,witness=null;
      for(const p of a.points)for(const q of b.points){
        const distance=Math.hypot(p.xMm-q.xMm,p.yMm-q.yMm);
        if(distance<separationMm){separationMm=distance;witness=[p.hypothesisId,q.hypothesisId];}
      }
      pairs.push({rules:[a.rule,b.rule],separationMm,closestHypothesisIds:witness,
        // Both predictions receive the same numerical allowance in scoreInterpretation.
        distinguishable:separationMm>2*(uncertaintyMm+1e-9)});
    }
    const candidate={widthMm,heightMm,uncertaintyMm,predictions,pairs,
      separablePairs:pairs.filter(p=>p.distinguishable).length,totalPairs:pairs.length,
      minSeparationMm:Math.min(...pairs.map(p=>p.separationMm)),
      sumSeparationMm:pairs.reduce((s,p)=>s+p.separationMm,0)};
    if(!best||candidate.separablePairs>best.separablePairs||
      (candidate.separablePairs===best.separablePairs&&candidate.minSeparationMm>best.minSeparationMm+1e-9)||
      (candidate.separablePairs===best.separablePairs&&Math.abs(candidate.minSeparationMm-best.minSeparationMm)<=1e-9&&
        candidate.sumSeparationMm>best.sumSeparationMm+1e-9))best=candidate;
  }
  return best?{...best,admissibleDimensions,testedDimensions:16,
    status:best.separablePairs?"separating-dimensions":"no-separating-dimensions"}:null;
}
export function exportCalibrationInvestigation(demo,landmarkId,observations,hypotheses){
  const sourceReference=observationReference(demo,landmarkId);
  const rows=validateObservations(demo,observations);
  const alternatives=validateCalibrationHypotheses(demo,landmarkId,hypotheses);
  // Validate the nominal reading as well, even when there are no alternatives.
  analyzeCalibrationEvidence(demo,landmarkId,rows,alternatives);
  return {schema:CALIBRATION_SCHEMA,source:copy(demo),landmarkId,sourceReference,
    observations:rows,hypotheses:alternatives};
}
export function importCalibrationInvestigation(bundle,expectedSource=null){
  requireThat(bundle&&bundle.schema===CALIBRATION_SCHEMA,"Unsupported calibration investigation schema");
  const anchor=observationReference(bundle.source,bundle.landmarkId);
  requireThat(same(bundle.sourceReference,anchor),"Investigation source reference differs from its source");
  if(expectedSource)requireThat(same(observationReference(expectedSource,bundle.landmarkId),anchor),
    "Investigation belongs to a different source; open it separately to inspect it");
  // Recompute, don't accept a saved verdict or fabricated probability.
  return exportCalibrationInvestigation(bundle.source,bundle.landmarkId,bundle.observations,bundle.hypotheses);
}
