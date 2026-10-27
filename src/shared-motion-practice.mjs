import {GeometryError} from './geometry.mjs';
import {importRelationshipDiscovery} from './relationship-discovery.mjs';
import {sharedMotionInputs,inspectSharedMotionGroups,MOTION_FIT_SLACK_MM} from './shared-motion-groups.mjs';
import {fitProperPointPattern} from './point-pattern-fit.mjs';
import {importPractice,evaluatePractice} from './practice.mjs';

export const SHARED_MOTION_PRACTICE_SCHEMA='skill-translator-shared-motion-practice/v1';
function fittingParameters(options){
 const fitToleranceMm=options?.fitToleranceMm,basis=options?.basis;
 if(typeof fitToleranceMm!=='number'||!Number.isFinite(fitToleranceMm)||fitToleranceMm<0||fitToleranceMm>1000)
  throw new GeometryError('Supply a finite fit tolerance from 0 to 1000 mm.');
 if(typeof basis!=='string'||!basis.trim()||basis.length>2000)
  throw new GeometryError('Supply a nonempty fit basis of at most 2000 characters.');
 return {fitToleranceMm,basis};
}
export function createSharedMotionPractice(studyInput,sessionInput,options){
 const parameters=fittingParameters(options),study=importRelationshipDiscovery(studyInput);
 const demo=study.demonstrations[0].annotation,target=sessionInput?.reference?.target;
 if(!target||typeof target!=='object')throw new GeometryError('Supply an original practice session with target dimensions.');
 const session=importPractice(demo,target.widthMm,target.heightMm,sessionInput);
 return {schema:SHARED_MOTION_PRACTICE_SCHEMA,study,session,...parameters};
}
export function importSharedMotionPractice(raw){
 let value=raw;
 if(typeof raw==='string')try{value=JSON.parse(raw);}catch{throw new GeometryError('Supply valid shared-motion practice JSON.');}
 if(!value||typeof value!=='object'||Array.isArray(value)||value.schema!==SHARED_MOTION_PRACTICE_SCHEMA)
  throw new GeometryError('Supply a shared-motion practice v1 record.');
 // Only original inputs and explicit parameters survive import. Saved verdicts
 // are never accepted as evidence, including extra fields inside the session.
 return createSharedMotionPractice(value.study,value.session,{fitToleranceMm:value.fitToleranceMm,basis:value.basis});
}
function retainedRounds(session){
 const current={round:session.round,attempts:session.attempts};
 for(const key of ['photoObservation','detachedPhotoMarks'])if(Object.prototype.hasOwnProperty.call(session,key))current[key]=session[key];
 return [...session.history,current];
}
function summarize(comparisons){
 const counts={total:comparisons.length,supported:0,outsideFitThreshold:0,incomplete:0,unresolved:0};
 for(const comparison of comparisons){
  if(comparison.status==='supported')counts.supported++;
  else if(comparison.status==='outside-fit-threshold')counts.outsideFitThreshold++;
  else if(comparison.status==='incomplete')counts.incomplete++;
  else if(comparison.status==='unresolved')counts.unresolved++;
 }
 const status=!counts.total?'no-assessable-groups':counts.outsideFitThreshold?'outside-fit-threshold':counts.incomplete?'incomplete':counts.unresolved?'unresolved':'supported';
 return {status,passed:counts.total>0&&counts.supported===counts.total,counts};
}
function compareGroup(group,source,attempts,fitToleranceMm){
 const groupIds=[...group.ids],missingAttemptIds=groupIds.filter(id=>!attempts.has(id)),missingSourceIds=groupIds.filter(id=>!source.points.has(id));
 const pairs=groupIds.filter(id=>attempts.has(id)&&source.points.has(id)).map(id=>{
  const target=source.points.get(id),attempt=attempts.get(id);
  return {id,target:{xMm:target.xMm,yMm:target.yMm},attempt:{xMm:attempt.xMm,yMm:attempt.yMm}};
 });
 const common={sourceId:source.id,groupIds,missingAttemptIds,missingSourceIds,pairs};
 if(missingAttemptIds.length||missingSourceIds.length)return {...common,status:'incomplete',fit:null,maxResidualMm:null,witness:null};
 const {fit,unavailable}=fitProperPointPattern(pairs);
 if(!fit)return {...common,status:'unresolved',unavailable,fit:null,maxResidualMm:null,witness:null};
 const worst=fit.residuals.reduce((current,residual)=>!current||residual.errorMm>current.errorMm?residual:current,null);
 const originalPair=pairs.find(pair=>pair.id===worst.id),maxResidualMm=worst.errorMm;
 return {...common,status:maxResidualMm<=fitToleranceMm+MOTION_FIT_SLACK_MM?'supported':'outside-fit-threshold',fit,maxResidualMm,
  witness:{id:worst.id,target:{...originalPair.target},attempt:{...originalPair.attempt},alignedAttempt:{xMm:worst.xMm,yMm:worst.yMm},errorMm:worst.errorMm}};
}
export function assessSharedMotionPractice(raw){
 const record=importSharedMotionPractice(raw),{study,session,fitToleranceMm,basis}=record;
 const {rows}=sharedMotionInputs(study),inference=inspectSharedMotionGroups(study),groups=inference.groups??[];
 const demo=study.demonstrations[0].annotation,{widthMm,heightMm}=session.reference.target;
 const rounds=retainedRounds(session).map(actual=>{
  const attempts=new Map(actual.attempts.map(attempt=>[attempt.id,attempt])),comparisons=[];
  for(const group of groups)for(const source of rows)comparisons.push(compareGroup(group,source,attempts,fitToleranceMm));
  return {round:actual.round,actual,positional:evaluatePractice(demo,widthMm,heightMm,actual.attempts),...summarize(comparisons),comparisons};
 });
 return {...summarize(rounds.flatMap(round=>round.comparisons)),fitToleranceMm,numericalSlackMm:MOTION_FIT_SLACK_MM,basis,inference,sourceIds:rows.map(row=>row.id),rounds};
}
