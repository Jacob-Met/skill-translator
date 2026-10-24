// A declared directed corner criterion; original point assessment remains separate.
import {evaluatePractice,importPractice} from './practice.mjs';
import {GeometryError} from './geometry.mjs';
const requireValue=(valid,message)=>{if(!valid)throw new GeometryError(message);};
const degrees=r=>r*180/Math.PI;
export function signedAngleDifference(observed,reference){const difference=observed-reference;return ((difference+180)%360+360)%360-180;}
export function inspectCornerAngle(source,widthMm,heightMm,attempts,rule){
 const practice=evaluatePractice(source,widthMm,heightMm,attempts),ids=new Set(source.landmarks.map(m=>m.id));
 requireValue(rule&&[rule.from,rule.vertex,rule.to].every(id=>ids.has(id))&&new Set([rule.from,rule.vertex,rule.to]).size===3,'Choose three distinct retained marks');
 requireValue(typeof rule.toleranceDegrees==='number'&&Number.isFinite(rule.toleranceDegrees)&&rule.toleranceDegrees>=0&&rule.toleranceDegrees<=180,'Angular tolerance must be within 0–180 degrees');
 const selected=[rule.from,rule.vertex,rule.to].map(id=>practice.results.find(m=>m.id===id));
 const lengthGuard=Math.max(1,widthMm,heightMm)*1e-9;
 function measure(a,v,b){
  if(!a||!v||!b)return null;
  const x=a.xMm-v.xMm,y=a.yMm-v.yMm,u=b.xMm-v.xMm,w=b.yMm-v.yMm,firstLength=Math.hypot(x,y),secondLength=Math.hypot(u,w);
  if(firstLength<=lengthGuard||secondLength<=lengthGuard)return {resolved:false,firstLength,secondLength};
  // Normalize arms before cross/dot products to avoid scale-dependent products.
  const ax=x/firstLength,ay=y/firstLength,bx=u/secondLength,by=w/secondLength;
  return {resolved:true,degrees:degrees(Math.atan2(ax*by-ay*bx,ax*bx+ay*by)),firstLength,secondLength};
 }
 const reference=measure(...selected.map(m=>m.target)),observed=measure(...selected.map(m=>m.attempt)),missing=selected.filter(m=>!m.placed).map(m=>m.id);
 const differenceDegrees=reference?.resolved&&observed?.resolved?signedAngleDifference(observed.degrees,reference.degrees):null;
 return {practice,reference,observed,differenceDegrees,missing,lengthGuard,angleGuardDegrees:1e-9,corner:selected.map(m=>({id:m.id,label:m.label,target:m.target,attempt:m.attempt})),status:missing.length?'incomplete':differenceDegrees===null?'unresolved':Math.abs(differenceDegrees)<=rule.toleranceDegrees+1e-9?'within':'outside'};
}

export const CORNER_ANGLE_SCHEMA='skill-translator-corner-angle/v1';
export function createCornerAngle(source,session,rule,selectedRound=session?.round){
 requireValue(session?.reference?.target,'Open a retained practice session');
 const {widthMm,heightMm}=session.reference.target,accepted=importPractice(source,widthMm,heightMm,session);
 requireValue(typeof rule?.label==='string'&&rule.label.trim().length>0&&rule.label.length<=160,'Name the intended corner relationship');
 requireValue(typeof rule?.basis==='string'&&rule.basis.trim().length>0&&rule.basis.length<=1600,'Supply the basis for this declared angular criterion');
 const normalized={from:rule.from,vertex:rule.vertex,to:rule.to,label:rule.label.trim(),basis:rule.basis.trim(),toleranceDegrees:rule.toleranceDegrees};
 inspectCornerAngle(source,widthMm,heightMm,accepted.attempts,normalized);
 requireValue(Number.isInteger(selectedRound)&&selectedRound>=1&&selectedRound<=accepted.round,'Choose a retained practice round');
 const bundle={schema:CORNER_ANGLE_SCHEMA,source:JSON.parse(JSON.stringify(source)),session:accepted,rule:normalized,selectedRound};
 requireValue(new TextEncoder().encode(JSON.stringify(bundle)).length<=2*1024*1024,'Corner review exceeds 2 MiB');
 return bundle;
}
export function importCornerAngle(raw){
 requireValue(raw?.schema===CORNER_ANGLE_SCHEMA,'Unsupported corner-angle review');
 return createCornerAngle(raw.source,raw.session,raw.rule,raw.selectedRound);
}
export function reviewCornerRounds(raw){
 const accepted=importCornerAngle(raw),{widthMm,heightMm}=accepted.session.reference.target;
 return [...accepted.session.history,{round:accepted.session.round,attempts:accepted.session.attempts}].map(round=>({round:round.round,...inspectCornerAngle(accepted.source,widthMm,heightMm,round.attempts,accepted.rule)}));
}
