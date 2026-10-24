import {derive,adapt,GeometryError} from './geometry.mjs';
import {createPractice} from './practice.mjs';
export const FEATURE_SCHEMA='skill-translator-feature-clearance/v1';
export const FEATURE_ASSUMPTION='circular-features-with-independent-euclidean-placement-tolerances';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const finite=(x,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
export function inspectFeatureClearance(source,widthMm,heightMm,features,requiredGapMm){
 const target=adapt(derive(source),widthMm,heightMm);
 fail(target.landmarks.length>=2,'At least two source marks are required for feature separation');
 fail(finite(requiredGapMm,10000),'Required gap must be a finite number from 0 to 10,000 mm');
 fail(Array.isArray(features)&&features.length===target.landmarks.length,'Supply one explicit feature radius for every source mark');
 const ids=new Set();
 const radii=new Map(features.map(f=>{
  fail(f&&target.landmarks.some(m=>m.id===f.id)&&!ids.has(f.id),'Feature IDs must match every source mark exactly once');
  fail(finite(f.radiusMm,10000),'Every feature needs a finite radius from 0 to 10,000 mm');
  ids.add(f.id);return [f.id,f.radiusMm];
 }));
 const marks=target.landmarks.map(m=>({id:m.id,label:m.label,xMm:m.xMm,yMm:m.yMm,toleranceMm:m.toleranceMm,radiusMm:radii.get(m.id)}));
 const pairs=[];
 for(let i=0;i<marks.length;i++)for(let j=i+1;j<marks.length;j++){
  const a=marks[i],b=marks[j],distanceMm=Math.hypot(a.xMm-b.xMm,a.yMm-b.yMm);
  const radiusSum=a.radiusMm+b.radiusMm;
  const nominalGapMm=distanceMm-radiusSum;
  const minimumToleranceGapMm=Math.max(0,distanceMm-a.toleranceMm-b.toleranceMm)-radiusSum;
  pairs.push({from:a.id,to:b.id,distanceMm,nominalGapMm,minimumToleranceGapMm,
   nominalMarginMm:nominalGapMm-requiredGapMm,toleranceMarginMm:minimumToleranceGapMm-requiredGapMm,
   nominalMeets:nominalGapMm+1e-9>=requiredGapMm,toleranceEnvelopeMeets:minimumToleranceGapMm+1e-9>=requiredGapMm});
 }
 return {widthMm,heightMm,requiredGapMm,marks,pairs,nominalMeets:pairs.every(p=>p.nominalMeets),
  toleranceEnvelopeMeets:pairs.every(p=>p.toleranceEnvelopeMeets)};
}
export function reopenFeatureClearance(raw){
 fail(raw?.schema===FEATURE_SCHEMA,'Unsupported feature-clearance schema');
 fail(raw.assumption===FEATURE_ASSUMPTION,'Explicit circular-feature and placement-envelope assumption is required');
 fail(Array.isArray(raw.workpieces)&&raw.workpieces.length>=1&&raw.workpieces.length<=8,'Supply one to eight workpiece sizes');
 fail(raw.source&&typeof raw.source==='object','An annotated source task is required');
 const source=JSON.parse(JSON.stringify(raw.source));
 const features=Array.isArray(raw.features)?raw.features.map(f=>({id:f?.id,radiusMm:f?.radiusMm})):raw.features;
 const workpieces=raw.workpieces.map(s=>({widthMm:s?.widthMm,heightMm:s?.heightMm}));
 const reports=workpieces.map(s=>inspectFeatureClearance(source,s.widthMm,s.heightMm,features,raw.requiredGapMm));
 return {bundle:{schema:FEATURE_SCHEMA,assumption:FEATURE_ASSUMPTION,source,features,requiredGapMm:raw.requiredGapMm,workpieces},reports};
}
export function featurePracticeInput(raw,index){
 const {bundle}=reopenFeatureClearance(raw);
 fail(Number.isInteger(index)&&index>=0&&index<bundle.workpieces.length,'Choose one declared workpiece');
 const {widthMm,heightMm}=bundle.workpieces[index];
 return {demo:bundle.source,widthMm,heightMm,showGoals:false,mirrored:false,session:createPractice(bundle.source,widthMm,heightMm)};
}

