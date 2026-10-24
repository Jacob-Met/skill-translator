// Independent checks of an existing planar calibration. Never fits these points.
import {derive, fromImage, GeometryError} from "./geometry.mjs";
import {validateCapturedDemo} from "./capture.mjs";

export const CALIBRATION_CHECK_SCHEMA="skill-translator-calibration-checks/v1";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const requireThat=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function number(value,min,max,label){
  requireThat(finite(value)&&value>=min&&value<=max,`${label} must be ${min}–${max}`);
  return value;
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function anchor(demo){
  const {source}=derive(demo);
  // Reuse the maintained capture contract; names may change for identical bytes.
  let imageIdentity;
  if(source.image){
    validateCapturedDemo(demo);
    const {name,...identity}=source.image;imageIdentity=identity;
  }
  return structuredClone({widthMm:source.widthMm,heightMm:source.heightMm,
    corners:source.corners.map(({x,y})=>({x,y})),
    ...(imageIdentity?{image:imageIdentity}:{}),...(source.video?{video:source.video}:{})});
}
function normalize(demo,input){
  requireThat(input&&typeof input==="object","Supply a calibration check");
  requireThat(typeof input.id==="string"&&/^[a-z0-9-]{1,40}$/.test(input.id),"A check needs a stable lowercase id");
  requireThat(typeof input.label==="string"&&input.label.trim().length>0&&input.label.trim().length<=160,
    "Describe the independent measurement source in 1–160 characters");
  requireThat(["authored-example","reported-measurement"].includes(input.evidenceClass),
    "Label each check as an authored example or reported measurement");
  requireThat(input.independentMeasurement===true,
    "Check coordinates must come from an independent measurement, not the fitted calibration");
  const sourceReference=anchor(demo),image=sourceReference.image;
  const sourcePx={x:number(input.sourcePx?.x,image?0:-1e7,image?image.widthPx:1e7,"Source pixel x"),
    y:number(input.sourcePx?.y,image?0:-1e7,image?image.heightPx:1e7,"Source pixel y")};
  const width=sourceReference.widthMm,height=sourceReference.heightMm;
  return {id:input.id,label:input.label.trim(),evidenceClass:input.evidenceClass,
    independentMeasurement:true,sourcePx,
    xMm:number(input.xMm,0,width,"Measured physical x (mm)"),
    yMm:number(input.yMm,0,height,"Measured physical y (mm)"),
    uncertaintyMm:number(input.uncertaintyMm,0,1000,"Combined measurement bound (mm)"),sourceReference};
}
export function createCalibrationCheck(demo,input){return normalize(demo,input);}
export function validateCalibrationChecks(demo,checks){
  requireThat(Array.isArray(checks)&&checks.length<=100,"Supply at most 100 independent checks");
  const ids=new Set();
  return checks.map(input=>{
    const normalized=normalize(demo,input);
    requireThat(!ids.has(normalized.id),"Every calibration check needs a distinct id");ids.add(normalized.id);
    requireThat(JSON.stringify(canonical(input.sourceReference))===JSON.stringify(canonical(normalized.sourceReference)),
      "Calibration check source differs; restore its original source or take a new measurement");
    return normalized;
  });
}
const turn=(o,a,b)=>(a.xMm-o.xMm)*(b.yMm-o.yMm)-(a.yMm-o.yMm)*(b.xMm-o.xMm);
function hull(points){
  const sorted=points.map(({xMm,yMm})=>({xMm,yMm})).sort((a,b)=>a.xMm-b.xMm||a.yMm-b.yMm);
  const unique=sorted.filter((p,i)=>!i||p.xMm!==sorted[i-1].xMm||p.yMm!==sorted[i-1].yMm);
  if(unique.length<3)return unique;
  const half=seq=>{const result=[];for(const p of seq){while(result.length>=2&&turn(result.at(-2),result.at(-1),p)<=0)result.pop();result.push(p);}return result;};
  const lower=half(unique),upper=half([...unique].reverse());
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function inHull(p,polygon){
  if(polygon.length<3)return false;
  return polygon.every((a,i)=>turn(a,polygon[(i+1)%polygon.length],p)>=-1e-9);
}
export function analyzeCalibration(demo,checks){
  const derived=derive(demo),rows=validateCalibrationChecks(demo,checks);
  const {widthMm,heightMm,corners}=derived.source;
  const span=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x))+
    Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));
  const results=rows.map(row=>{
    const atFittedCorner=corners.some(p=>Math.hypot(p.x-row.sourcePx.x,p.y-row.sourcePx.y)<=span*1e-7);
    let projected;
    try{const uv=fromImage(derived.h,row.sourcePx);projected={xMm:uv.u*widthMm,yMm:uv.v*heightMm};}
    catch(error){if(!(error instanceof GeometryError))throw error;
      return {...row,status:"unmappable",atFittedCorner,projected:null,dxMm:null,dyMm:null,errorMm:null,reason:error.message};}
    const dxMm=projected.xMm-row.xMm,dyMm=projected.yMm-row.yMm,errorMm=Math.hypot(dxMm,dyMm);
    const outside=projected.xMm< -1e-7||projected.xMm>widthMm+1e-7||projected.yMm< -1e-7||projected.yMm>heightMm+1e-7;
    return {...row,projected,dxMm,dyMm,errorMm,atFittedCorner,
      status:atFittedCorner?"fitted-corner":outside?"outside-calibrated-page":
        errorMm<=row.uncertaintyMm+1e-9?"compatible":"incompatible",
      reason:atFittedCorner?"This pixel was used to fit the calibration; it is not an independent spatial check":
        outside?"This observed pixel maps outside the calibrated workpiece":null};
  });
  const independent=results.filter(r=>!r.atFittedCorner);
  const mapped=independent.filter(r=>r.projected);
  const region=hull(mapped);
  const area=region.length<3?0:Math.abs(region.reduce((sum,p,i)=>{
    const q=region[(i+1)%region.length];return sum+p.xMm*q.yMm-q.xMm*p.yMm;
  },0))/2;
  const landmarks=derived.landmarks.map(mark=>{
    const p={xMm:mark.uv.u*widthMm,yMm:mark.uv.v*heightMm};
    return {id:mark.id,label:mark.label,...p,withinCheckHull:inHull(p,region),
      nearestCheckMm:mapped.length?Math.min(...mapped.map(r=>Math.hypot(r.xMm-p.xMm,r.yMm-p.yMm))):null};
  });
  const rejected=independent.filter(r=>r.status!=="compatible");
  return {status:!independent.length?"no-independent-checks":rejected.length?"incompatible":"compatible-at-checks",
    results,independentCount:independent.length,fittedCornerCount:results.length-independent.length,
    authoredCount:independent.filter(r=>r.evidenceClass==="authored-example").length,
    reportedCount:independent.filter(r=>r.evidenceClass==="reported-measurement").length,
    incompatibleCount:rejected.length,maxErrorMm:mapped.length?Math.max(...mapped.map(r=>r.errorMm)):null,
    rmsErrorMm:mapped.length?Math.sqrt(mapped.reduce((s,r)=>s+r.errorMm**2,0)/mapped.length):null,
    coverage:{hull:region,areaFraction:area/(widthMm*heightMm),landmarks},
    interpretation:"Compatibility concerns these supplied checks only. The hull is their spatial extent, not a validated area or confidence region. No calibration or learner target was fitted or changed."};
}
export function exportCalibrationChecks(demo,checks){
  const clean=validateCalibrationChecks(demo,checks);
  return {schema:CALIBRATION_CHECK_SCHEMA,sourceReference:anchor(demo),checks:clean};
}
export function importCalibrationChecks(demo,bundle){
  requireThat(bundle?.schema===CALIBRATION_CHECK_SCHEMA,"Unsupported calibration-check file schema");
  requireThat(JSON.stringify(canonical(bundle.sourceReference))===JSON.stringify(canonical(anchor(demo))),
    "Calibration-check file belongs to a different source");
  return validateCalibrationChecks(demo,bundle.checks);
}
