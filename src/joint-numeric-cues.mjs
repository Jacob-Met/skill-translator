import {importNumericCueStudy,inspectNumericCueStudy} from './numeric-cue-thresholds.mjs';
export const JOINT_NUMERIC_FORMAT='skill-translator.joint-numeric-cues/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const canon=v=>JSON.stringify(v);
export function importJointNumericStudy(raw){
 check(raw?.format===JOINT_NUMERIC_FORMAT,'Open a joint numeric cue study');
 check(Array.isArray(raw.cues)&&raw.cues.length===2,'Supply exactly two numeric cue studies');
 const cues=raw.cues.map(importNumericCueStudy);
 check(canon(cues[0].comparison)===canon(cues[1].comparison),'Both quantities must retain the identical ordered source comparison');
 check(cues[0].rows.every((r,i)=>r.decision===cues[1].rows[i].decision),'Both quantities must retain identical declared decisions');
 check(!!cues[0].target===!!cues[1].target,'Retain the target in both quantities or neither');
 if(cues[0].target)check(canon({source:cues[0].target.source,stepId:cues[0].target.stepId})===canon({source:cues[1].target.source,stepId:cues[1].target.stepId}),'Pair quantities from the identical target source step');
 check(Array.isArray(raw.directions)&&raw.directions.length===2&&raw.directions.every(d=>d==='below'||d==='above'),'Explicitly declare below or above orientation for both quantities');
 check(typeof raw.basis==='string'&&raw.basis.trim()&&raw.basis.length<=2000,'Explain the paired quantities and conjunctive model');
 return {format:JOINT_NUMERIC_FORMAT,cues,directions:[...raw.directions],basis:raw.basis.trim()};
}
const orient=(r,d)=>d==='below'?[...r]:[-r[1],-r[0]];
// Every model is (oriented x < tx AND oriented y < ty). Cells are
// (lower, upper], partitioned at every source interval endpoint.
export function fitJointRanges(rows,directions){
 const missing=rows.flatMap((r,i)=>r.label===null||r.ranges.some(v=>!v)?[i]:[]);
 const known=rows.filter((_,i)=>!missing.includes(i));
 const labels=[...new Set(known.map(r=>r.label))].sort();
 if(labels.length!==2)return {status:labels.length>2?'more-than-two-labels':'insufficient-two-label-contrast',families:[],missing};
 const normalized=known.map(r=>({...r,ranges:r.ranges.map((v,i)=>orient(v,directions[i]))}));
 const cells=d=>{const ends=[...new Set(normalized.flatMap(r=>r.ranges[d]))].sort((a,b)=>a-b);return [-Infinity,...ends].map((lower,i)=>({lower,upper:ends[i]??Infinity}));};
 const families=[];
 for(const inside of labels)for(const x of cells(0))for(const y of cells(1)){
  const cells=[x,y];
  if(!normalized.every(r=>r.label===inside?r.ranges.every((v,d)=>v[1]<=cells[d].lower):r.ranges.some((v,d)=>v[0]>=cells[d].upper)))continue;
  families.push({insideLabel:inside,outsideLabel:labels.find(l=>l!==inside),thresholds:cells.map(c=>({lower:Number.isFinite(c.lower)?c.lower:null,upper:Number.isFinite(c.upper)?c.upper:null,lowerOpen:true,upperOpen:false}))});
 }
 return {status:families.length?(known.length===rows.length?'compatible':'compatible-known-subset'):'no-compatible-conjunction',families,missing};
}
export function compareJointRanges(families,ranges,directions){
 if(ranges.some(r=>!r))return {status:'missing-reading',label:null};
 if(!families.length)return {status:'no-supported-family',label:null};
 const rr=ranges.map((r,i)=>orient(r,directions[i]));
 const labels=families.map(f=>rr.every((r,d)=>r[1]<=(f.thresholds[d].lower??-Infinity))?f.insideLabel:rr.some((r,d)=>r[0]>=(f.thresholds[d].upper??Infinity))?f.outsideLabel:null);
 const label=labels[0]!==null&&labels.every(l=>l===labels[0])?labels[0]:null;
 return {status:label===null?'unresolved':'unanimous-conditional-label',label};
}
export function inspectJointNumericStudy(raw){
 const study=importJointNumericStudy(raw),rows=study.cues[0].rows.map((r,i)=>({label:r.decision,ranges:study.cues.map(c=>c.rows[i].reading?.range??null)}));
 const findings=fitJointRanges(rows,study.directions);
 const omissions=rows.map((r,index)=>{const digest=study.cues[0].comparison.examples[index].source.clip.sha256;const omittedIndexes=rows.map((_,i)=>i).filter(i=>study.cues[0].comparison.examples[i].source.clip.sha256===digest);const fit=fitJointRanges(rows.filter((_,i)=>!omittedIndexes.includes(i)),study.directions);return {index,omittedIndexes,findings:fit,comparison:compareJointRanges(fit.families,r.ranges,study.directions),declaredLabel:r.label};});
 return {study,findings,singleCueFindings:study.cues.map(c=>inspectNumericCueStudy(c).findings),omissions,target:study.cues[0].target?compareJointRanges(findings.families,study.cues.map(c=>c.target.reading?.range??null),study.directions):null,boundary:'Conditional declared two-quantity conjunction only. Ranges are independent Cartesian boxes. Every retained model must agree at every point in each known box. Missing rows remain unvalidated. Thresholds use oriented quantities (above negates the original quantity); null lower/upper bounds denote negative/positive infinity. No threshold is chosen. Source declarations and clip withholding do not establish physical correctness, causal explanation, independent prediction or skill.'};
}
