// Descriptive review of retained placements; no learning or causality inference.
import {derive, GeometryError} from './geometry.mjs';
import {importPractice, evaluatePractice, createPractice} from './practice.mjs';
export const REVIEW_SCHEMA = 'skill-translator-practice-review/v1';
const requireValue = (ok, message) => { if (!ok) throw new GeometryError(message); };
const rms = values => values.length ? Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length) : null;

export function createReview(demo, session) {
  const widthMm=session?.reference?.target?.widthMm, heightMm=session?.reference?.target?.heightMm;
  const accepted=importPractice(demo,widthMm,heightMm,session);
  return {schema:REVIEW_SCHEMA,demo:structuredClone(demo),session:accepted,
    baselineRound:1,comparisonRound:accepted.round,selectedIds:[]};
}
export function importReview(bundle) {
  requireValue(bundle?.schema===REVIEW_SCHEMA,'Unsupported practice review format');
  const next=createReview(bundle.demo,bundle.session);
  requireValue(Number.isInteger(bundle.baselineRound)&&Number.isInteger(bundle.comparisonRound)&&
    bundle.baselineRound>=1&&bundle.comparisonRound>=bundle.baselineRound&&bundle.comparisonRound<=next.session.round,
    'Choose retained rounds in chronological order');
  requireValue(Array.isArray(bundle.selectedIds)&&bundle.selectedIds.length<=next.demo.landmarks.length&&
    new Set(bundle.selectedIds).size===bundle.selectedIds.length&&
    bundle.selectedIds.every(id=>next.demo.landmarks.some(m=>m.id===id)), 'Choose distinct source marks for the drill');
  return {...next,baselineRound:bundle.baselineRound,comparisonRound:bundle.comparisonRound,selectedIds:[...bundle.selectedIds]};
}
export function reviewPractice(bundle) {
  const accepted=importReview(bundle), {demo,session}=accepted;
  const {widthMm,heightMm}=session.reference.target;
  const rounds=[...session.history,{round:session.round,attempts:session.attempts}].map(r=>({
    round:r.round,active:r.round===session.round, ...evaluatePractice(demo,widthMm,heightMm,r.attempts)}));
  const before=rounds[accepted.baselineRound-1],after=rounds[accepted.comparisonRound-1];
  const marks=derive(demo).landmarks.map(mark=>{
    const observations=rounds.map(r=>({round:r.round,...r.results.find(x=>x.id===mark.id)}));
    const earlier=before.results.find(x=>x.id===mark.id),later=after.results.find(x=>x.id===mark.id);
    const paired=earlier.placed&&later.placed;
    return {id:mark.id,label:mark.label,toleranceMm:mark.toleranceMm,observations,
      observedRounds:observations.filter(o=>o.placed).length,
      outsideRounds:observations.filter(o=>o.placed&&!o.evaluation.within).length,
      paired,changeMm:paired?later.evaluation.errorMm-earlier.evaluation.errorMm:null};
  });
  const paired=marks.filter(m=>m.paired),first=paired.map(m=>before.results.find(r=>r.id===m.id).evaluation.errorMm),last=paired.map(m=>after.results.find(r=>r.id===m.id).evaluation.errorMm);
  return {rounds,marks,comparison:{baselineRound:before.round,comparisonRound:after.round,
    sameRound:before.round===after.round,commonMarks:paired.map(m=>m.id),
    missingFromEither:marks.filter(m=>!m.paired).map(m=>m.id),
    beforeRmsMm:rms(first),afterRmsMm:rms(last),
    changeRmsMm:paired.length?rms(last)-rms(first):null}};
}
export function focusedPractice(bundle) {
  const accepted=importReview(bundle);
  requireValue(accepted.selectedIds.length>0,'Select at least one mark for a fresh drill');
  const original=accepted.demo;
  const demo={...structuredClone(original),title:`Focused drill · ${original.title||'retained task'}`,
    landmarks:original.landmarks.filter(m=>accepted.selectedIds.includes(m.id)).map(m=>structuredClone(m)),
    practiceFocus:{schema:REVIEW_SCHEMA,originalReference:structuredClone(accepted.session.reference),
      selectedIds:[...accepted.selectedIds],reviewedRounds:[accepted.baselineRound,accepted.comparisonRound]}};
  const {widthMm,heightMm}=accepted.session.reference.target;
  const session=createPractice(demo,widthMm,heightMm);
  return {demo,widthMm,heightMm,showGoals:false,mirrored:false,session};
}
