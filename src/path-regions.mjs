// Conditional distance extrema on explicitly declared common-plane rectangles.
// These are supplied bounds, not inferred physical or calibration uncertainty.
import {importSequencePath,inspectSequencePath} from './sequence-path.mjs';
import {polygonPairDistance} from './polygon-pair-distance.mjs';
import {rational,mul,cmp} from '../vendor/chronos/exact-halfplanes.mjs';
export const PATH_REGIONS_FORMAT='skill-translator.path-regions/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
function rectangle(raw,position,width,height){
 check(raw&&typeof raw==='object','Declare a rectangle for every observed sample.');
 for(const k of ['xMin','xMax','yMin','yMax'])check(Number.isFinite(raw[k]),'Rectangle coordinates must be finite millimetres.');
 const {xMin,xMax,yMin,yMax}=raw;
 check(xMin>=0&&xMax<=width&&yMin>=0&&yMax<=height&&xMin<=xMax&&yMin<=yMax,'The full rectangle must remain inside the declared workpiece.');
 check(position.xMm>=xMin&&position.xMm<=xMax&&position.yMm>=yMin&&position.yMm<=yMax,'Each rectangle must contain its retained nominal annotation.');
 check(typeof raw.basis==='string'&&raw.basis.trim().length>0&&raw.basis.length<=2000,'State the basis for each supplied rectangle.');
 return {xMin,xMax,yMin,yMax,basis:raw.basis.trim()};
}
function vertices(r){if(r.xMin===r.xMax&&r.yMin===r.yMax)return[{x:r.xMin,y:r.yMin}];if(r.xMin===r.xMax)return[{x:r.xMin,y:r.yMin},{x:r.xMin,y:r.yMax}];if(r.yMin===r.yMax)return[{x:r.xMin,y:r.yMin},{x:r.xMax,y:r.yMin}];return[{x:r.xMin,y:r.yMin},{x:r.xMax,y:r.yMin},{x:r.xMax,y:r.yMax},{x:r.xMin,y:r.yMax}];}
export function createPathRegions(path,declarations,thresholdMm){
 const accepted=importSequencePath(path),findings=inspectSequencePath(accepted);
 check(Number.isFinite(thresholdMm)&&thresholdMm>=0&&thresholdMm<=20000,'Supply a displacement threshold from 0 to 20000 mm.');
 check(Array.isArray(declarations)&&declarations.length===accepted.samples.length,'Declare every selected sample, including explicit missing observations.');
 const normalized=findings.samples.map((s,i)=>{const d=declarations[i];check(d?.momentId===s.momentId,'Regions must follow the retained selected sample identities.');if(!s.position){check(d.rectangle===null,'Missing observations cannot acquire a region.');return {momentId:s.momentId,rectangle:null};}const task=accepted.sequence.moments.find(m=>m.id===s.momentId).calibratedTask;return {momentId:s.momentId,rectangle:rectangle(d.rectangle,s.position,task.source.widthMm,task.source.heightMm)};});
 return {format:PATH_REGIONS_FORMAT,path:accepted,thresholdMm,declarations:normalized};
}
export function importPathRegions(raw){check(raw?.format===PATH_REGIONS_FORMAT,'Open a complete sampled-path region account.');return createPathRegions(raw.path,raw.declarations,raw.thresholdMm);}
export function inspectPathRegions(raw){
 const account=importPathRegions(raw),path=inspectSequencePath(account.path),threshold=rational(account.thresholdMm),squaredThreshold=mul(threshold,threshold);
 const pair=(a,b)=>{const common={from:a.momentId,to:b.momentId};if(!a.rectangle||!b.rectangle)return {...common,status:'missing-observation',range:null};const range=polygonPairDistance(vertices(a.rectangle),vertices(b.rectangle)),decode=q=>[BigInt(q.numerator),BigInt(q.denominator)];return {...common,status:cmp(decode(range.minimum.squared),squaredThreshold)>0?'all-above':cmp(decode(range.maximum.squared),squaredThreshold)<=0?'all-at-or-below':'unresolved',range};};
 return {thresholdMm:account.thresholdMm,path,regions:account.declarations,adjacent:account.declarations.slice(1).map((d,i)=>pair(account.declarations[i],d)),endpoint:pair(account.declarations[0],account.declarations.at(-1)),boundary:'Exact distance extrema apply to the supplied independent common-plane rectangles and their binary64 coordinates. They do not establish that the physical point lies in those bounds, propagate calibration uncertainty, infer correspondence, or describe motion between retained frames. Adjacent extrema may require incompatible shared-sample positions; no total path interval is inferred.'};
}
