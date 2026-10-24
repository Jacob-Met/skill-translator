// Conditional comparison of the same retained photo marks, never a learning claim.
import {importReview,reviewPractice} from './practice-review.mjs';
import {inspectAnnotationBound} from './annotation-bound.mjs';
import {polygonPairDistance} from './polygon-pair-distance.mjs';
import {rational as q,add,sub,mul,cmp,serial} from '../vendor/chronos/exact-halfplanes.mjs';
export const PHOTO_ROUND_SCHEMA='skill-translator-photo-round-feedback/v1';
const fail=(ok,message)=>{if(!ok)throw Error(message);};
const rational=x=>[BigInt(x.numerator),BigInt(x.denominator)];
const zero=q(0),abs=x=>cmp(x,zero)<0?sub(zero,x):x;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function declaration(raw){fail(raw&&typeof raw==='object','Declare pixel half widths for both rounds');const result={};for(const k of ['halfWidthPx','halfHeightPx']){fail(Number.isFinite(raw[k])&&raw[k]>=0&&raw[k]<=1000,'Pixel half widths must be finite within 0–1000');result[k]=raw[k];}return result;}
export function createPhotoRoundFeedback(review,declarations){
 const accepted=importReview(review),raw={schema:PHOTO_ROUND_SCHEMA,review:accepted,declarations:{before:declaration(declarations?.before),after:declaration(declarations?.after)}};
 raw.reference=structuredClone({practice:accepted.session.reference,baselineRound:accepted.baselineRound,comparisonRound:accepted.comparisonRound,rounds:roundsFor(accepted)});
 inspectPhotoRoundFeedback(raw);return raw;
}
function roundsFor(review){return [review.baselineRound,review.comparisonRound].map(n=>n===review.session.round?review.session:review.session.history.find(r=>r.round===n));}
export function importPhotoRoundFeedback(raw){fail(raw?.schema===PHOTO_ROUND_SCHEMA,'Unsupported photo-round feedback format');const accepted=createPhotoRoundFeedback(raw.review,raw.declarations);fail(same(raw.reference,accepted.reference),'Retained round source differs from the saved reference');return accepted;}
export function inspectPhotoRoundFeedback(raw){
 const review=importReview(raw.review),comparison=reviewPractice(review).comparison;
 fail(!comparison.sameRound,'Choose two different retained rounds');
 const ids=comparison.commonMarks;fail(ids.length>0&&ids.length<=64,'Compare one to 64 fixed common marks');
 const rounds=roundsFor(review),{widthMm,heightMm}=review.session.reference.target,setup={demo:review.demo,session:review.session,widthMm,heightMm};
 const results=rounds.map((round,index)=>{
  fail(round?.photoObservation,'Both selected rounds need retained photo observations');
  fail(!ids.some(id=>round.detachedPhotoMarks?.includes(id)),'A common mark was moved after its photo; its annotation is detached');
  fail(ids.every(id=>round.photoObservation.points.some(p=>p.id===id)),'Every common placement needs its own retained photo annotation');
  const input=declaration(raw.declarations?.[index?'after':'before']);let lower=zero,upper=zero;
  const marks=ids.map(id=>{
   const region=inspectAnnotationBound(setup,round.photoObservation,{id,...input}),exact=polygonPairDistance(region.polygon,[region.target]);
   const minimum=rational(exact.minimum.squared),maximum=rational(exact.maximum.squared),g=q(region.guardMm);
   // Manhattan distance bounds every nominal radius without taking a rounded root.
   let radius=zero;for(const p of region.polygon){const d=add(abs(sub(q(p.x),q(region.target.x))),abs(sub(q(p.y),q(region.target.y))));if(cmp(d,radius)>0)radius=d;}
   const allowance=add(mul(mul(q(2),radius),g),mul(g,g)),candidate=sub(minimum,allowance),lo=cmp(candidate,zero)>0?candidate:zero,hi=add(maximum,allowance);
   lower=add(lower,lo);upper=add(upper,hi);
   return {id,region,exactSquaredExtrema:exact,guardedSquared:{lower:serial(lo),upper:serial(hi)},squaredAllowance:serial(allowance)};
  });
  return {round:round.round,image:structuredClone(round.photoObservation.image),marks,lower,upper};
 });
 const [before,after]=results,status=cmp(after.upper,before.lower)<0?'conditional-decrease':cmp(after.lower,before.upper)>0?'conditional-increase':'unresolved';
 return {status,commonMarks:[...ids],excludedMissingMarks:comparison.missingFromEither,rounds:results.map(({lower,upper,...r})=>({...r,guardedSquaredErrorSum:{lower:serial(lower),upper:serial(upper)}})),semantics:'Conditional ordering of squared-error sums over the same fixed marks. Each complete declared pixel rectangle is mapped with fixed supplied calibration. Inherited mapping allowances widen squared bounds using exact rational arithmetic; they are engineering allowances, not calibrated uncertainty or a guarantee of physical accuracy. No probability, duration, causal explanation or learning effect is established.'};
}
