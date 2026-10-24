// Whole-set planar placement practice. Shared displacement is a descriptive
// diagnostic; hypothetical corrections never replace the user's actual result.
import {derive,adapt,evaluate,GeometryError} from "./geometry.mjs";
import {normalizeLearnerObservation} from "./learner-observation.mjs";
export const PRACTICE_SCHEMA="skill-translator-practice/v1";
export const OBSERVED_PRACTICE_SCHEMA="skill-translator-practice/v2";
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function context(demo,widthMm,heightMm){
  const derived=derive(demo),target=adapt(derived,widthMm,heightMm);
  const image=derived.source.image;
  if(image)fail(typeof image.sha256==="string"&&/^[0-9a-f]{64}$/i.test(image.sha256)&&
    Number.isSafeInteger(image.widthPx)&&image.widthPx>0&&Number.isSafeInteger(image.heightPx)&&image.heightPx>0,
    "Source image identity or pixel dimensions are invalid");
  const reference={provenance:derived.provenance,
    source:{widthMm:derived.source.widthMm,heightMm:derived.source.heightMm,
      corners:derived.source.corners.map(p=>({x:p.x,y:p.y})),
      ...(image?{image:{sha256:image.sha256.toLowerCase(),widthPx:image.widthPx,heightPx:image.heightPx}}:{})},
    landmarks:derived.landmarks.map(m=>({id:m.id,sourcePx:{x:m.sourcePx.x,y:m.sourcePx.y},
      kind:m.kind,edge:m.edge,toleranceMm:m.toleranceMm})).sort((a,b)=>a.id.localeCompare(b.id)),
    target:{widthMm:target.widthMm,heightMm:target.heightMm}};
  return {target,reference};
}
function attemptsFor(target,attempts){
  fail(Array.isArray(attempts)&&attempts.length<=target.landmarks.length,"Too many or invalid placements");
  const ids=new Set();
  return attempts.map(a=>{
    fail(a&&target.landmarks.some(m=>m.id===a.id),"Placement has an unknown source mark");
    fail(!ids.has(a.id),"Each source mark may have one placement per round");ids.add(a.id);
    fail(finite(a.xMm)&&finite(a.yMm)&&a.xMm>=0&&a.xMm<=target.widthMm&&a.yMm>=0&&a.yMm<=target.heightMm,
      "Placement must be a finite point inside the physical sheet");
    return {id:a.id,xMm:a.xMm,yMm:a.yMm};
  });
}
export function evaluatePractice(demo,widthMm,heightMm,attempts){
  const {target}=context(demo,widthMm,heightMm),placed=attemptsFor(target,attempts);
  const results=target.landmarks.map(mark=>{
    const attempt=placed.find(a=>a.id===mark.id);
    return {id:mark.id,label:mark.label,placed:!!attempt,
      target:{xMm:mark.xMm,yMm:mark.yMm},attempt:attempt||null,
      evaluation:attempt?evaluate(mark,attempt):null};
  });
  const observed=results.filter(r=>r.placed),complete=observed.length===results.length;
  const rms=values=>Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);
  let translation=null;
  if(observed.length>=2){
    const dxMm=observed.reduce((s,r)=>s+r.evaluation.dxMm,0)/observed.length;
    const dyMm=observed.reduce((s,r)=>s+r.evaluation.dyMm,0)/observed.length;
    const hypothetical=observed.map(r=>{
      const mark=target.landmarks.find(m=>m.id===r.id);
      const point={xMm:r.attempt.xMm-dxMm,yMm:r.attempt.yMm-dyMm};
      const onSheet=point.xMm>=0&&point.xMm<=widthMm&&point.yMm>=0&&point.yMm<=heightMm;
      return {id:r.id,point,onSheet,evaluation:evaluate(mark,point)};
    });
    translation={dxMm,dyMm,remainingRmsMm:rms(hypothetical.map(h=>h.evaluation.errorMm)),
      wouldMeetAll:complete&&hypothetical.every(h=>h.onSheet&&h.evaluation.within),
      hypothetical,partial:!complete};
  }
  return {total:results.length,placed:observed.length,complete,
    passed:complete&&observed.every(r=>r.evaluation.within),
    missing:results.filter(r=>!r.placed).map(r=>r.id),results,translation,
    rmsErrorMm:observed.length?rms(observed.map(r=>r.evaluation.errorMm)):null};
}
export function createPractice(demo,widthMm,heightMm){
  return {schema:PRACTICE_SCHEMA,reference:context(demo,widthMm,heightMm).reference,
    round:1,history:[],attempts:[]};
}
function roundState(target,raw,photoAllowed){
  let attempts=attemptsFor(target,raw.attempts);
  if(raw.photoObservation===undefined){
    fail(raw.detachedPhotoMarks===undefined,"Detached photo marks require an observation record");
    return {attempts};
  }
  fail(photoAllowed,"Photo observations require the v2 practice format");
  const received=normalizeLearnerObservation(target,raw.photoObservation),detached=raw.detachedPhotoMarks??[];
  fail(Array.isArray(detached)&&new Set(detached).size===detached.length&&
    detached.every(id=>received.attempts.some(a=>a.id===id)&&attempts.some(a=>a.id===id)),
    "Detached photo marks must name distinct observed marks with manual placements");
  for(const measured of received.attempts){
    if(detached.includes(measured.id))continue;
    const retained=attempts.find(a=>a.id===measured.id);
    fail(retained&&Math.abs(retained.xMm-measured.xMm)<=1e-7&&Math.abs(retained.yMm-measured.yMm)<=1e-7,
      "A retained placement differs from its photo annotation; detach that annotation before editing");
  }
  attempts=attempts.map(a=>detached.includes(a.id)?a:received.attempts.find(m=>m.id===a.id)??a);
  return {attempts,photoObservation:received.record,...(detached.length?{detachedPhotoMarks:[...detached]}:{})};
}
export function importPractice(demo,widthMm,heightMm,bundle){
  fail(bundle&&[PRACTICE_SCHEMA,OBSERVED_PRACTICE_SCHEMA].includes(bundle.schema),"Unsupported practice session schema");
  const {reference,target}=context(demo,widthMm,heightMm);
  fail(JSON.stringify(canonical(bundle.reference))===JSON.stringify(canonical(reference)),
    "Practice source, rules, tolerances or target dimensions differ; load the matching setup");
  fail(Number.isInteger(bundle.round)&&bundle.round>=1&&bundle.round<=21&&
    Array.isArray(bundle.history)&&bundle.history.length===bundle.round-1,"Invalid practice round history");
  return {schema:bundle.schema,reference,round:bundle.round,
    history:bundle.history.map((round,i)=>{
      fail(round&&round.round===i+1,"Practice rounds must retain their original order");
      return {round:i+1,...roundState(target,round,bundle.schema===OBSERVED_PRACTICE_SCHEMA)};
    }),...roundState(target,bundle,bundle.schema===OBSERVED_PRACTICE_SCHEMA)};
}
export function placePractice(demo,widthMm,heightMm,session,id,point){
  const next=importPractice(demo,widthMm,heightMm,session);
  const attempts=next.attempts.filter(a=>a.id!==id);
  attempts.push({id,xMm:point?.xMm,yMm:point?.yMm});
  next.attempts=attemptsFor(context(demo,widthMm,heightMm).target,attempts);
  if(next.photoObservation?.points.some(p=>p.id===id))
    next.detachedPhotoMarks=[...new Set([...(next.detachedPhotoMarks??[]),id])];
  return next;
}
export function retryPractice(demo,widthMm,heightMm,session){
  const current=importPractice(demo,widthMm,heightMm,session);
  fail(current.round<21,"Export this 21-round session before starting a new session");
  fail(current.attempts.length>0,"Place at least one mark before beginning another round");
  const {photoObservation,detachedPhotoMarks,...base}=current;
  return {...base,round:current.round+1,
    history:[...current.history,{round:current.round,attempts:current.attempts,
      ...(photoObservation?{photoObservation}:{}),...(detachedPhotoMarks?{detachedPhotoMarks}:{})}],attempts:[]};
}

export function observePractice(demo,widthMm,heightMm,session,observation){
  let current=importPractice(demo,widthMm,heightMm,session);
  const received=normalizeLearnerObservation(context(demo,widthMm,heightMm).target,observation);
  if(current.attempts.length)current=retryPractice(demo,widthMm,heightMm,current);
  return {...current,schema:OBSERVED_PRACTICE_SCHEMA,attempts:received.attempts,photoObservation:received.record};
}
