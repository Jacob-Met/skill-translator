import {admitAppearanceRequest,inspectAppearanceSamples} from './appearance-pair.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
export const FORMAT='skill-translator.appearance-values-prototype/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const text=(v,name)=>{check(typeof v==='string'&&v.trim()&&v.length<=1000,`Attribute ${name}`);return v.trim();};
const definition=q=>({widthPx:q.widthPx,heightPx:q.heightPx,radius:q.radius,support:q.support,sampler:q.sampler,brightnessConvention:q.brightnessConvention});
const identity=q=>JSON.stringify([q.clipSha256,q.frames.map(f=>[f.sha256,f.presentedSeconds])]);
export function admitAppearanceValues(raw){
 check(raw?.format===FORMAT,'Retain a supported appearance value source');
 check(Array.isArray(raw.references)&&raw.references.length>=2&&raw.references.length<=6,'Retain two to six complete original reference pairs');
 function pair(row,isTarget=false){
  const source=validateSequence(row?.source),request=admitAppearanceRequest(row?.request,source);
  const basis=text(row.basis,'pair comparison basis');
  if(isTarget)return {source,request,basis};
  check(row.decision===null||(typeof row.decision==='string'&&row.decision.trim()&&row.decision.length<=160),'Declare a decision label or unknown');
  return {source,request,basis,decision:row.decision===null?null:row.decision.trim(),decisionBasis:text(row.decisionBasis,'decision basis')};
 }
 const references=raw.references.map(r=>pair(r)),target=raw.target==null?null:pair(raw.target,true);
 const common=definition(references[0].request.request),all=[...references,...(target?[target]:[])];
 for(const r of all)check(JSON.stringify(definition(r.request.request))===JSON.stringify(common),'Every pair must use the identical declared sampled quantity definition');
 if(target)check(!references.some(r=>identity(r.request.request)===identity(target.request.request)),'Target original frame evidence overlaps a reference pair');
 const comparisons=all.length*(2*common.radius+1)**2*common.support.width*common.support.height*3;
 check(comparisons<=200_000_000,'Complete appearance study exceeds 200 million channel comparisons');
 return {format:FORMAT,basis:text(raw.basis,'common inquiry basis'),references,target};
}
export function inspectAppearanceValues(raw,samples){
 const study=admitAppearanceValues(raw),all=[...study.references,...(study.target?[study.target]:[])];
 check(Array.isArray(samples)&&samples.length===all.length,'Supply complete admitted sampled pairs');
 const values=all.map((row,i)=>{const s=samples[i],result=inspectAppearanceSamples(row.request,row.source,s.before,s.after);check(Number.isFinite(result.comparison.meanAdjustedChange),'Complete finite shared-support result required');return {value:result.comparison.meanAdjustedChange,comparison:result.comparison,source:result.source};});
 return {study,values,definition:'minimum brightness-adjusted RGB-L1 residual divided by complete shared channel support and 255',unit:'dimensionless',inference:null,boundary:'Sampled image appearance only. Every original pair and finite minimizing shift is retained; no endpoint or instrument reading is manufactured. No decision fit is performed by this prototype.'};
}
