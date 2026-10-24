import {GeometryError} from './geometry.mjs';
import {importPractice,evaluatePractice} from './practice.mjs';
export const RELATIONSHIP_SCHEMA='skill-translator-relationships/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function validateRelationships(demo,rules){
 fail(Array.isArray(rules)&&rules.length<=60,'Supply at most 60 relationships');
 const ids=new Set(),pairs=new Set(),marks=new Set(demo.landmarks.map(m=>m.id));
 return rules.map(r=>{
  fail(r&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=80&&!ids.has(r.id),'Relationship IDs must be unique nonempty strings');ids.add(r.id);
  fail(typeof r.label==='string'&&r.label.trim().length>0&&r.label.length<=160,'Name the intended relationship (up to 160 characters)');
  fail(marks.has(r.from)&&marks.has(r.to)&&r.from!==r.to,'Choose two distinct source marks');
  fail(['distance','horizontal','vertical'].includes(r.kind),'Unknown relationship kind');
  const key=JSON.stringify([r.kind,r.from,r.to]);fail(!pairs.has(key),'This directed relationship is already present');pairs.add(key);
  fail(typeof r.toleranceMm==='number'&&Number.isFinite(r.toleranceMm)&&r.toleranceMm>=0&&r.toleranceMm<=1000,'Relationship tolerance must be within 0..1000 mm');
  return {id:r.id,label:r.label,from:r.from,to:r.to,kind:r.kind,toleranceMm:r.toleranceMm};
 });
}
const measure=(a,b,kind)=>kind==='distance'?Math.hypot(b.xMm-a.xMm,b.yMm-a.yMm):kind==='horizontal'?b.xMm-a.xMm:b.yMm-a.yMm;
export function evaluateRelationships(demo,widthMm,heightMm,attempts,rules){
 const practice=evaluatePractice(demo,widthMm,heightMm,attempts),checked=validateRelationships(demo,rules);
 const byId=new Map(practice.results.map(r=>[r.id,r]));
 const results=checked.map(rule=>{
  const a=byId.get(rule.from),b=byId.get(rule.to),expectedMm=measure(a.target,b.target,rule.kind);
  const missing=[a,b].filter(p=>!p.placed).map(p=>p.id);
  const observedMm=missing.length?null:measure(a.attempt,b.attempt,rule.kind);
  const differenceMm=observedMm===null?null:observedMm-expectedMm;
  return {...rule,expectedMm,observedMm,differenceMm,missing,status:missing.length?'incomplete':Math.abs(differenceMm)<=rule.toleranceMm+1e-9?'within':'outside'};
 });
 return {practice,results,complete:results.length>0&&results.every(r=>r.status!=='incomplete'),passed:results.length>0&&results.every(r=>r.status==='within')};
}
export function createRelationshipReview(demo,session,rules=[]){
 fail(session?.reference?.target,'A retained practice session is required');
 const {widthMm,heightMm}=session.reference.target,accepted=importPractice(demo,widthMm,heightMm,session);
 fail(demo.unknowns===undefined||(Array.isArray(demo.unknowns)&&demo.unknowns.every(x=>typeof x==='string')),'Source unknowns must be an array of text');
 return {schema:RELATIONSHIP_SCHEMA,source:JSON.parse(JSON.stringify(demo)),session:accepted,rules:validateRelationships(demo,rules)};
}
export function importRelationshipReview(bundle){
 fail(bundle?.schema===RELATIONSHIP_SCHEMA,'Unsupported relationship review');
 return createRelationshipReview(bundle.source,bundle.session,bundle.rules);
}
export function reviewRounds(bundle){
 const accepted=importRelationshipReview(bundle),{widthMm,heightMm}=accepted.session.reference.target;
 return [...accepted.session.history,{round:accepted.session.round,attempts:accepted.session.attempts}].map(r=>({round:r.round,...evaluateRelationships(accepted.source,widthMm,heightMm,r.attempts,accepted.rules)}));
}
