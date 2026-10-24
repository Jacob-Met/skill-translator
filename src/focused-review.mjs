// Receive separately scoped drill sessions without extending original rounds.
import {GeometryError} from './geometry.mjs';
import {createPractice,importPractice,evaluatePractice} from './practice.mjs';
import {REVIEW_SCHEMA,importReview,focusedPractice} from './practice-review.mjs';
export const FOCUSED_REVIEW_SCHEMA='skill-translator-focused-review/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const rms=values=>values.length?Math.sqrt(values.reduce((sum,n)=>sum+n*n,0)/values.length):null;
const rounds=session=>[...session.history,{round:session.round,attempts:session.attempts}];
function receive(review,entry){
  check(entry&&typeof entry.id==='string'&&/^drill-[1-9][0-9]{0,3}$/.test(entry.id),'Drill needs a retained stable identity');
  check(typeof entry.label==='string'&&entry.label.trim().length>0&&entry.label.length<=160,'Give the drill a short label');
  const focus=entry.demo?.practiceFocus;
  check(focus?.schema===REVIEW_SCHEMA&&equal(focus.originalReference,review.session.reference),
    'Focused source belongs to a different original task, interpretation or workpiece');
  check(Array.isArray(focus.reviewedRounds)&&focus.reviewedRounds.length===2&&
    focus.reviewedRounds.every(n=>Number.isInteger(n)&&n>=1&&n<=21)&&
    focus.reviewedRounds[0]<=focus.reviewedRounds[1],
    'Focused source must retain its declared review rounds');
  const expected=focusedPractice({...review,selectedIds:focus.selectedIds});
  const {widthMm,heightMm}=expected;
  // Validate both the supplied source and the expected unchanged original subset.
  const session=importPractice(expected.demo,widthMm,heightMm,entry.session);
  importPractice(entry.demo,widthMm,heightMm,entry.session);
  check(Number.isInteger(entry.originalRound)&&entry.originalRound>=1&&entry.originalRound<=review.session.round,
    'Choose a retained original round');
  check(Number.isInteger(entry.drillRound)&&entry.drillRound>=1&&entry.drillRound<=session.round,
    'Choose a retained drill round');
  return {id:entry.id,label:entry.label.trim(),demo:structuredClone(entry.demo),session,
    originalRound:entry.originalRound,drillRound:entry.drillRound};
}
export function createFocusedReview(review){return {schema:FOCUSED_REVIEW_SCHEMA,review:importReview(review),drills:[]};}
export function importFocusedReview(bundle){
  check(bundle?.schema===FOCUSED_REVIEW_SCHEMA,'Unsupported focused review format');
  const review=importReview(bundle.review);
  check(Array.isArray(bundle.drills)&&bundle.drills.length<=8,'A review can retain at most eight separate drills');
  const ids=new Set(),drills=bundle.drills.map(entry=>{const result=receive(review,entry);check(!ids.has(result.id),'Drill identities must be distinct');ids.add(result.id);return result;});
  return {schema:FOCUSED_REVIEW_SCHEMA,review,drills};
}
export function appendFocusedResult(bundle,demo,session,label){
  const next=importFocusedReview(bundle);check(next.drills.length<8,'Save this review before beginning another collection of drills');
  const number=1+Math.max(0,...next.drills.map(d=>Number(d.id.slice(6))));
  const entry=receive(next.review,{id:`drill-${number}`,label,demo,session,
    originalRound:next.review.comparisonRound,drillRound:session?.round});
  next.drills.push(entry);return next;
}
export function compareFocusedResult(bundle,id){
  const accepted=importFocusedReview(bundle),entry=accepted.drills.find(d=>d.id===id);
  check(entry,'Choose a retained focused drill');
  const {review}=accepted,{widthMm,heightMm}=review.session.reference.target;
  const original=evaluatePractice(review.demo,widthMm,heightMm,rounds(review.session)[entry.originalRound-1].attempts);
  const focused=evaluatePractice(entry.demo,widthMm,heightMm,rounds(entry.session)[entry.drillRound-1].attempts);
  const selected=new Set(entry.demo.landmarks.map(m=>m.id));
  const marks=original.results.map(before=>{
    const after=focused.results.find(r=>r.id===before.id)||null;
    return {id:before.id,label:before.label,inDrill:selected.has(before.id),original:before,drill:after,
      paired:before.placed&&!!after?.placed,
      changeMm:before.placed&&after?.placed?after.evaluation.errorMm-before.evaluation.errorMm:null};
  });
  const paired=marks.filter(m=>m.paired),before=paired.map(m=>m.original.evaluation.errorMm),after=paired.map(m=>m.drill.evaluation.errorMm);
  return {id:entry.id,label:entry.label,originalRound:entry.originalRound,drillRound:entry.drillRound,
    scope:focused.total===original.total?'all-original-marks':'selected-subset',
    original,focused,marks,unpracticedIds:marks.filter(m=>!m.inDrill).map(m=>m.id),
    commonMarks:paired.map(m=>m.id),beforeRmsMm:rms(before),afterRmsMm:rms(after),
    changeRmsMm:paired.length?rms(after)-rms(before):null,
    chronologyVerified:false,learningEstablished:false};
}
export function fullTaskRetest(bundle){
  const {review}=importFocusedReview(bundle),{widthMm,heightMm}=review.session.reference.target;
  const demo=structuredClone(review.demo);
  return {demo,widthMm,heightMm,showGoals:false,mirrored:false,session:createPractice(demo,widthMm,heightMm)};
}
