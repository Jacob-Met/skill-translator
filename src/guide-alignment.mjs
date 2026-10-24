// A declared three-mark planar relationship, independent of point-position scores.
import {GeometryError} from './geometry.mjs';
import {importPractice,evaluatePractice} from './practice.mjs';
export const GUIDE_ALIGNMENT_SCHEMA='skill-translator-guide-alignment/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const clone=value=>JSON.parse(JSON.stringify(value));
export function validateGuideRule(source,rule){
 const ids=new Set(source.landmarks.map(m=>m.id));
 fail(rule&&[rule.from,rule.to,rule.point].every(id=>ids.has(id))&&new Set([rule.from,rule.to,rule.point]).size===3,'Choose three distinct retained task marks');
 fail(typeof rule.label==='string'&&rule.label.trim().length>0&&rule.label.length<=160,'Name the intended guide relationship');
 fail(typeof rule.basis==='string'&&rule.basis.trim().length>0&&rule.basis.length<=1600,'Supply the basis for this declared relationship');
 fail(typeof rule.toleranceMm==='number'&&Number.isFinite(rule.toleranceMm)&&rule.toleranceMm>=0&&rule.toleranceMm<=1000,'Guide-offset tolerance must be within0–1000mm');
 return {from:rule.from,to:rule.to,point:rule.point,label:rule.label.trim(),basis:rule.basis.trim(),toleranceMm:rule.toleranceMm};
}
function measure(from,to,point,guardMm){
 const dx=to.xMm-from.xMm,dy=to.yMm-from.yMm,lengthMm=Math.hypot(dx,dy);
 if(lengthMm<=guardMm)return {resolved:false,lengthMm,reason:'Guide anchors coincide or are below the numerical length guard'};
 const ux=dx/lengthMm,uy=dy/lengthMm,px=point.xMm-from.xMm,py=point.yMm-from.yMm;
 const alongMm=px*ux+py*uy,offsetMm=ux*py-uy*px;
 return {resolved:true,lengthMm,offsetMm,projectionFraction:alongMm/lengthMm,
  projection:{xMm:from.xMm+alongMm*ux,yMm:from.yMm+alongMm*uy},
  projectedBetween:alongMm>=-guardMm&&alongMm<=lengthMm+guardMm};
}
export function evaluateGuideAlignment(source,widthMm,heightMm,attempts,rawRule){
 const practice=evaluatePractice(source,widthMm,heightMm,attempts),rule=validateGuideRule(source,rawRule);
 const byId=new Map(practice.results.map(r=>[r.id,r])),selected=[rule.from,rule.to,rule.point].map(id=>byId.get(id));
 const guardMm=Math.max(1,widthMm,heightMm)*1e-9;
 const reference=measure(...selected.map(r=>r.target),guardMm),missing=selected.filter(r=>!r.placed).map(r=>r.id);
 const observed=missing.length?null:measure(...selected.map(r=>r.attempt),guardMm);
 const differenceMm=reference.resolved&&observed?.resolved?observed.offsetMm-reference.offsetMm:null;
 const status=missing.length?'incomplete':differenceMm===null?'unresolved':Math.abs(differenceMm)<=rule.toleranceMm+guardMm?'within':'outside';
 return {rule,practice,reference,observed,missing,guardMm,differenceMm,status,
  guide: selected.map(r=>({id:r.id,label:r.label,target:r.target,attempt:r.attempt})),
  boundary:'Signed perpendicular offset to an unbounded directed line; projection beyond either anchor remains explicit. This is not contact, a correction instruction, physical accuracy or skill assessment.'};
}
export function createGuideAlignment(source,session,rule,selectedRound=session?.round){
 fail(session?.reference?.target,'Open a retained practice session');
 const {widthMm,heightMm}=session.reference.target,accepted=importPractice(source,widthMm,heightMm,session);
 const normalized=validateGuideRule(source,rule);
 fail(Number.isInteger(selectedRound)&&selectedRound>=1&&selectedRound<=accepted.round,'Choose a retained practice round');
 const bundle={schema:GUIDE_ALIGNMENT_SCHEMA,source:clone(source),session:accepted,rule:normalized,selectedRound};
 fail(new TextEncoder().encode(JSON.stringify(bundle)).length<=2*1024*1024,'Guide review exceeds2MiB');
 return bundle;
}
export function importGuideAlignment(raw){
 fail(raw?.schema===GUIDE_ALIGNMENT_SCHEMA,'Unsupported guide-alignment review');
 return createGuideAlignment(raw.source,raw.session,raw.rule,raw.selectedRound);
}
export function reviewGuideRounds(raw){
 const accepted=importGuideAlignment(raw),{widthMm,heightMm}=accepted.session.reference.target;
 return [...accepted.session.history,{round:accepted.session.round,attempts:accepted.session.attempts}].map(round=>({round:round.round,...evaluateGuideAlignment(accepted.source,widthMm,heightMm,round.attempts,accepted.rule)}));
}
