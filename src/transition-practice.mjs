// A declared endpoint-change criterion, separate from endpoint placement.
// Source correspondence, calibration and learner common frame remain supplied.
import {validateStateChange,stateChangeEvidence} from './sequence-change.mjs';
import {momentTask} from './demonstration-sequence.mjs';
import {createPractice,importPractice,evaluatePractice} from './practice.mjs';
import {evaluate} from './geometry.mjs';
export const TRANSITION_FORMAT='skill-translator.transition-practice/v1';
export const MAX_TRANSITION_BYTES=4_000_000;
const bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
const require=(ok,message)=>{if(!ok)throw Error(message);};
const text=(x,label,max=1600)=>{require(typeof x==='string'&&x.trim()&&x.length<=max,`${label} requires bounded text`);return x.trim();};
export function transitionTask(comparison,stage){
  const source=validateStateChange(comparison),evidence=stateChangeEvidence(source);
  require(stage==='before'||stage==='after','Choose before or after practice');
  const momentId=stage==='before'?evidence.beforeMomentId:evidence.afterMomentId;
  const demo=momentTask(source.sequence,momentId);
  const widthMm=evidence.widthMm,heightMm=evidence.heightMm;
  createPractice(demo,widthMm,heightMm);
  return {demo,widthMm,heightMm,momentId};
}
function criterionList(source,input){
  require(source.pairs.length>0,'Retain at least one explicit source correspondence first');
  require(Array.isArray(input)&&input.length===source.pairs.length,'Declare a change tolerance for every retained correspondence');
  const ids=new Set();
  return input.map(c=>{require(c&&source.pairs.some(p=>p.id===c.pairId)&&!ids.has(c.pairId),'Each criterion must name one distinct source correspondence');ids.add(c.pairId);
    require(typeof c.toleranceMm==='number'&&Number.isFinite(c.toleranceMm)&&c.toleranceMm>0&&c.toleranceMm<=50,'Change tolerance must be positive and at most 50 mm');
    return {pairId:c.pairId,toleranceMm:c.toleranceMm,basis:text(c.basis,'Change-tolerance basis')};});
}
function sessionFor(source,stage,session){
  if(session===null)return null;
  require(bytes(session)<=256*1024,'Each raw practice session must fit the maintained 256 KiB file limit');
  const {demo,widthMm,heightMm}=transitionTask(source,stage);
  return importPractice(demo,widthMm,heightMm,session);
}
export function createTransitionPractice(comparison,criteria){
  return importTransitionPractice({format:TRANSITION_FORMAT,comparison,criteria,before:null,after:null,learnerReference:null,prediction:null,revealed:false});
}
export function importTransitionPractice(raw){
  require(raw?.format===TRANSITION_FORMAT,'Unsupported transition practice account');
  require(bytes(raw)<=MAX_TRANSITION_BYTES,'Complete transition account exceeds 4 MB');
  const comparison=validateStateChange(raw.comparison);stateChangeEvidence(comparison);
  const criteria=criterionList(comparison,raw.criteria);
  const before=sessionFor(comparison,'before',raw.before),after=sessionFor(comparison,'after',raw.after);
  let learnerReference=null,prediction=null;
  if(raw.learnerReference!==null){
    require(before&&after&&raw.learnerReference?.samePlaneAndCorners===true,'Both learner states require an explicit common plane and matching corner meanings');
    learnerReference={samePlaneAndCorners:true,basis:text(raw.learnerReference.basis,'Learner reference basis')};
  }
  if(raw.prediction!==null){
    require(learnerReference,'Declare the common learner reference before predicting');
    require(['satisfied','unsatisfied','unknown'].includes(raw.prediction?.endpoint)&&['satisfied','unsatisfied','unknown'].includes(raw.prediction?.change),'Predict endpoint and endpoint-change criteria separately');
    prediction={endpoint:raw.prediction.endpoint,change:raw.prediction.change,reason:text(raw.prediction.reason,'Learner reasoning')};
  }
  require(typeof raw.revealed==='boolean'&&(!raw.revealed||prediction),'Commit a prediction before revealing findings');
  const result={format:TRANSITION_FORMAT,comparison,criteria,before,after,learnerReference,prediction,revealed:raw.revealed};
  require(bytes(result)<=MAX_TRANSITION_BYTES,'Normalized transition account exceeds 4 MB');return result;
}
export function receiveTransitionPractice(raw,stage,session){
  const current=importTransitionPractice(raw);require(stage==='before'||stage==='after','Choose before or after practice');
  require(session!==null,'Choose a raw practice session');
  return importTransitionPractice({...current,[stage]:session,learnerReference:null,prediction:null,revealed:false});
}
export function declareLearnerReference(raw,reference){
  const current=importTransitionPractice(raw);
  return importTransitionPractice({...current,learnerReference:reference,prediction:null,revealed:false});
}
export function predictTransition(raw,prediction){
  const current=importTransitionPractice(raw);require(current.prediction===null,'This prediction is retained; receive changed evidence to begin another comparison');
  return importTransitionPractice({...current,prediction});
}
export function revealTransition(raw){
  const current=importTransitionPractice(raw);return importTransitionPractice({...current,revealed:true});
}
const outcome=results=>results.some(r=>r?.within===false)?'unsatisfied':results.some(r=>!r)?'unknown':'satisfied';
function provenance(session,id){
  if(!session.attempts.some(a=>a.id===id))return {kind:'missing'};
  const photo=session.photoObservation;
  if(photo?.points.some(p=>p.id===id)&&!session.detachedPhotoMarks?.includes(id))return {kind:'retained photo annotation',evidenceClass:photo.evidenceClass,image:photo.image,note:photo.note};
  return {kind:'manual placement'};
}
export function inspectTransitionPractice(raw){
  const account=importTransitionPractice(raw),source=stateChangeEvidence(account.comparison);
  const result={source,criteria:account.criteria,prediction:account.prediction,revealed:account.revealed,findings:null,
    limits:'Endpoint differences do not establish the intervening path, action timing, contact, force, cause or physical skill. All calibration, correspondence and reference claims are supplied. Predictions and local file order are not authenticated.'};
  if(!account.revealed)return result;
  const evaluated={};
  for(const stage of ['before','after']){const c=transitionTask(account.comparison,stage);evaluated[stage]=evaluatePractice(c.demo,c.widthMm,c.heightMm,account[stage].attempts);}
  const pairs=source.pairs.map(p=>{
    const before=evaluated.before.results.find(r=>r.id===p.beforeMarkId),after=evaluated.after.results.find(r=>r.id===p.afterMarkId);
    const criterion=account.criteria.find(c=>c.pairId===p.id);
    const observedChange=before.placed&&after.placed?{dxMm:after.attempt.xMm-before.attempt.xMm,dyMm:after.attempt.yMm-before.attempt.yMm}:null;
    const change=observedChange?evaluate({xMm:p.dxMm,yMm:p.dyMm,toleranceMm:criterion.toleranceMm},{xMm:observedChange.dxMm,yMm:observedChange.dyMm}):null;
    return {pair:p,criterion,before:{...before,provenance:provenance(account.before,p.beforeMarkId)},after:{...after,provenance:provenance(account.after,p.afterMarkId)},observedChange,change};
  });
  const endpoint=outcome(pairs.map(p=>p.after.evaluation)),change=outcome(pairs.map(p=>p.change));
  result.findings={pairs,endpoint,change,endpointPredictionMatches:account.prediction.endpoint===endpoint,changePredictionMatches:account.prediction.change===change,
    rounds:{before:account.before.round,after:account.after.round},unpaired:source.unpaired};
  return result;
}
