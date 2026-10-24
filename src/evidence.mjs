// Challenge reference-conditioned geometric rules with additional observations.
// Compatibility is a bounded residual check, not a probability or expert verdict.
import {derive, GeometryError} from "./geometry.mjs";
import {predictInterpretation} from "./hypotheses.mjs";

export const RULES=Object.freeze(["fraction","left","right","top","bottom"]);
export const EVIDENCE_SCHEMA="skill-translator-observations/v1";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
function requireThat(ok,message){if(!ok)throw new GeometryError(message);}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function bounded(x,min,max,label){
  requireThat(finite(x)&&x>=min&&x<=max,`${label} must be ${min}–${max}`);
  return x;
}
function reference(demo,landmarkId){
  const derived=derive(demo),mark=derived.landmarks.find(m=>m.id===landmarkId);
  requireThat(mark,"Observation refers to an unknown source landmark");
  const image=derived.source.image;
  if(image){
    requireThat(typeof image.sha256==="string"&&/^[a-f0-9]{64}$/i.test(image.sha256),
      "Source image needs its SHA-256 identity");
    requireThat(Number.isSafeInteger(image.widthPx)&&image.widthPx>0&&
      Number.isSafeInteger(image.heightPx)&&image.heightPx>0,"Source image needs positive pixel dimensions");
  }
  return {derived,mark,anchor:{
    provenance:derived.provenance,
    source:{widthMm:derived.source.widthMm,heightMm:derived.source.heightMm,
      corners:derived.source.corners.map(p=>({x:p.x,y:p.y})),
      ...(image?{image:{sha256:image.sha256.toLowerCase(),widthPx:image.widthPx,heightPx:image.heightPx}}:{})},
    landmark:{id:mark.id,sourcePx:{x:mark.sourcePx.x,y:mark.sourcePx.y}}
  }};
}
function normalize(demo,input){
  requireThat(input&&typeof input==="object","Supply an observation");
  requireThat(typeof input.id==="string"&&/^[a-z0-9-]{1,40}$/.test(input.id),
    "Observation needs a stable id of 1–40 lowercase letters, digits or hyphens");
  const {anchor}=reference(demo,input.landmarkId);
  requireThat(typeof input.label==="string"&&input.label.trim().length>0&&input.label.trim().length<=160,
    "Name the observation source in 1–160 characters");
  requireThat(["authored-example","reported-measurement"].includes(input.evidenceClass),
    "Label the observation as an authored example or reported measurement");
  const widthMm=bounded(input.widthMm,1,10000,"Observed sheet width (mm)");
  const heightMm=bounded(input.heightMm,1,10000,"Observed sheet height (mm)");
  return {id:input.id,landmarkId:input.landmarkId,label:input.label.trim(),
    evidenceClass:input.evidenceClass,widthMm,heightMm,
    xMm:bounded(input.xMm,0,widthMm,"Observed x (mm)"),
    yMm:bounded(input.yMm,0,heightMm,"Observed y (mm)"),
    uncertaintyMm:bounded(input.uncertaintyMm,0,1000,"Measurement uncertainty radius (mm)"),
    sourceReference:anchor};
}
export function createObservation(demo,input){return normalize(demo,input);}

// Shared identity and scoring for explicit alternative-reference investigations.
// Callers keep original evidence anchors; a hypothetical reading never rewrites them.
export function observationReference(demo,landmarkId){return reference(demo,landmarkId).anchor;}
export function scoreInterpretation(mark,source,row,rule){
  let predicted;
  try{predicted=predictInterpretation(mark,source,row.widthMm,row.heightMm,rule);}
  catch(e){
    if(!(e instanceof GeometryError))throw e;
    return {observationId:row.id,predicted:null,errorMm:null,excessMm:null,
      compatible:false,reason:e.message};
  }
  const errorMm=Math.hypot(predicted.xMm-row.xMm,predicted.yMm-row.yMm);
  return {observationId:row.id,predicted,errorMm,
    excessMm:Math.max(0,errorMm-row.uncertaintyMm),
    compatible:errorMm<=row.uncertaintyMm+1e-9,reason:null};
}

// Check the saved anchor before normalizing; never silently rebind old evidence.
export function validateObservations(demo,observations){
  requireThat(Array.isArray(observations)&&observations.length<=60,
    "Supply at most 60 observations");
  const ids=new Set();
  return observations.map(input=>{
    const row=normalize(demo,input);
    requireThat(!ids.has(row.id),"Every observation needs a distinct id");ids.add(row.id);
    requireThat(JSON.stringify(canonical(input.sourceReference))===JSON.stringify(canonical(row.sourceReference)),
      "Observation source reference differs from the current annotation; reobserve or restore that source");
    return row;
  });
}
export function exportEvidence(demo,observations){
  return {schema:EVIDENCE_SCHEMA,observations:validateObservations(demo,observations)};
}
export function importEvidence(demo,bundle){
  requireThat(bundle&&bundle.schema===EVIDENCE_SCHEMA,"Unsupported observation file schema");
  return validateObservations(demo,bundle.observations);
}

export function analyzeEvidence(demo,landmarkId,observations){
  const {derived,mark}=reference(demo,landmarkId);
  const rows=validateObservations(demo,observations).filter(o=>o.landmarkId===landmarkId);
  const candidates=RULES.map(rule=>{
    const residuals=rows.map(row=>scoreInterpretation(mark,derived.source,row,rule));
    return {rule,status:!rows.length?"untested":residuals.every(r=>r.compatible)?"compatible":"contradicted",
      residuals,contradictions:residuals.filter(r=>!r.compatible).map(r=>r.observationId),
      maxErrorMm:residuals.length&&residuals.every(r=>r.errorMm!==null)
        ?Math.max(...residuals.map(r=>r.errorMm)):null};
  });
  const compatibleRules=candidates.filter(c=>c.status!=="contradicted").map(c=>c.rule);
  const status=!rows.length?"no-evidence":!compatibleRules.length?"none-compatible":
    compatibleRules.length===1?"single-compatible":"unresolved";
  return {landmarkId,status,observations:rows,candidates,compatibleRules,
    authoredCount:rows.filter(r=>r.evidenceClass==="authored-example").length,
    reportedCount:rows.filter(r=>r.evidenceClass==="reported-measurement").length};
}

// Finite transparent search: maximize distinguishable pairs of surviving rules.
// Every survivor must fit; source calibration remains conditioned-on, not inferred.
export function proposeEvidenceVariation(demo,landmarkId,observations,uncertaintyMm){
  bounded(uncertaintyMm,0,1000,"Proposed measurement uncertainty (mm)");
  const {derived,mark}=reference(demo,landmarkId);
  const rules=analyzeEvidence(demo,landmarkId,observations).compatibleRules;
  if(rules.length<2)return null;
  let best=null;
  for(const wf of [0.7,1,1.3,1.7])for(const hf of [0.7,1,1.3,1.7]){
    const widthMm=derived.source.widthMm*wf,heightMm=derived.source.heightMm*hf;
    let predictions;
    try{predictions=rules.map(rule=>({rule,...predictInterpretation(mark,derived.source,widthMm,heightMm,rule)}));}
    catch(e){if(e instanceof GeometryError)continue;throw e;}
    const pairs=[];
    for(let i=0;i<predictions.length;i++)for(let j=i+1;j<predictions.length;j++){
      const a=predictions[i],b=predictions[j];
      const separationMm=Math.hypot(a.xMm-b.xMm,a.yMm-b.yMm);
      pairs.push({rules:[a.rule,b.rule],separationMm,
        distinguishable:separationMm>2*uncertaintyMm+1e-9});
    }
    const candidate={widthMm,heightMm,uncertaintyMm,predictions,pairs,
      separablePairs:pairs.filter(p=>p.distinguishable).length,totalPairs:pairs.length,
      minSeparationMm:Math.min(...pairs.map(p=>p.separationMm)),
      sumSeparationMm:pairs.reduce((s,p)=>s+p.separationMm,0)};
    if(!best||candidate.separablePairs>best.separablePairs||
      (candidate.separablePairs===best.separablePairs&&candidate.minSeparationMm>best.minSeparationMm+1e-9)||
      (candidate.separablePairs===best.separablePairs&&Math.abs(candidate.minSeparationMm-best.minSeparationMm)<=1e-9&&candidate.sumSeparationMm>best.sumSeparationMm+1e-9))best=candidate;
  }
  return best;
}
