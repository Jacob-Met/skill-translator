// Deterministic calibration experiments. Samples are not uncertainty bounds.
// Reuse the maintained geometry; never replace accepted source or practice data.
import {derive,adapt,GeometryError} from './geometry.mjs';

export const SENSITIVITY_SCHEMA='skill-translator-sensitivity/v1';
const METHOD='individual axes plus 128 paired low-discrepancy scenarios/v1';
const LIMITS={cornerPx:50,landmarkPx:50,sourceWidthMm:1000,sourceHeightMm:1000,targetWidthMm:1000,targetHeightMm:1000};
const PRIMES=[2,3,5,7,11,13,17,19,23,29,31,37,41,43];
function requireThat(ok,message){if(!ok)throw new GeometryError(message);}
const copy=value=>JSON.parse(JSON.stringify(value));

export function sensitivitySettings(input={}){
  requireThat(input&&typeof input==='object'&&!Array.isArray(input),'Supply calibration perturbation assumptions');
  requireThat(Object.keys(input).every(key=>Object.hasOwn(LIMITS,key)),'Unknown calibration perturbation assumption');
  return Object.fromEntries(Object.entries(LIMITS).map(([key,max])=>{
    const value=input[key]??0;
    requireThat(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max,`${key} must be between 0 and ${max}`);
    return [key,value];
  }));
}
function parameters(settings){
  const names=['Top-left','Top-right','Bottom-right','Bottom-left'];
  return [
    ...names.flatMap((name,index)=>['x','y'].map(axis=>({key:`corner-${index}-${axis}`,label:`${name} corner ${axis}`,magnitude:settings.cornerPx}))),
    {key:'mark-x',label:'Mark pixel x',magnitude:settings.landmarkPx},
    {key:'mark-y',label:'Mark pixel y',magnitude:settings.landmarkPx},
    ...['sourceWidthMm','sourceHeightMm','targetWidthMm','targetHeightMm'].map(key=>({key,label:key.replace(/([A-Z])/g,' $1').replace('Mm',' (mm)'),magnitude:settings[key]}))
  ];
}
function radicalInverse(index,base){
  let value=0,weight=1/base;
  while(index){value+=(index%base)*weight;index=Math.floor(index/base);weight/=base;}
  return value;
}
function scenarios(params){
  const rows=[],seen=new Set();
  const add=(id,kind,vector,parameter=null)=>{
    const values=vector.map((x,i)=>params[i].magnitude?x:0),key=JSON.stringify(values);
    if(seen.has(key))return;
    seen.add(key);rows.push({id,kind,parameter,values});
  };
  add('nominal','nominal',params.map(()=>0));
  params.forEach((p,index)=>{
    if(!p.magnitude)return;
    for(const sign of [-1,1]){
      const vector=params.map(()=>0);vector[index]=sign;
      add(`${p.key}:${sign<0?'minus':'plus'}`,'individual',vector,p.key);
    }
  });
  if(params.some(p=>p.magnitude)){
    for(const sign of [-1,1])add(`all:${sign}`,'combined',params.map(()=>sign));
    for(let i=1;i<=64;i++){
      const vector=params.map((_,j)=>2*radicalInverse(i,PRIMES[j])-1);
      add(`paired:${i}:a`,'combined',vector);
      add(`paired:${i}:b`,'combined',vector.map(x=>-x));
    }
  }
  return rows;
}

export function analyzeSensitivity(demo,landmarkId,widthMm,heightMm,input={}){
  const accepted=derive(demo),mark=demo.landmarks.find(m=>m.id===landmarkId);
  requireThat(mark,'Choose an existing landmark for calibration sensitivity');
  const settings=sensitivitySettings(input),params=parameters(settings);
  const nominal=adapt({...accepted,landmarks:accepted.landmarks.filter(m=>m.id===landmarkId)},widthMm,heightMm).landmarks[0];
  const valid=[],invalid=[];
  for(const scenario of scenarios(params)){
    const d=scenario.values.map((v,i)=>v*params[i].magnitude);
    const changed={...demo,source:{...demo.source,
      corners:demo.source.corners.map((p,i)=>({x:p.x+d[2*i],y:p.y+d[2*i+1]})),
      widthMm:demo.source.widthMm+d[10],heightMm:demo.source.heightMm+d[11]},
      landmarks:[{...mark,sourcePx:{x:mark.sourcePx.x+d[8],y:mark.sourcePx.y+d[9]}}]};
    try {
      const predicted=adapt(derive(changed),widthMm+d[12],heightMm+d[13]).landmarks[0];
      const dxMm=predicted.xMm-nominal.xMm,dyMm=predicted.yMm-nominal.yMm;
      valid.push({id:scenario.id,kind:scenario.kind,parameter:scenario.parameter,
        xMm:predicted.xMm,yMm:predicted.yMm,dxMm,dyMm,shiftMm:Math.hypot(dxMm,dyMm)});
    }catch(error){
      if(!(error instanceof GeometryError))throw error;
      invalid.push({id:scenario.id,kind:scenario.kind,parameter:scenario.parameter,reason:error.message});
    }
  }
  requireThat(valid.length>0,'No valid calibration scenario');
  const largest=valid.reduce((a,b)=>b.shiftMm>a.shiftMm?b:a);
  const influences=params.filter(p=>p.magnitude).map(p=>{
    const cases=valid.filter(s=>s.kind==='individual'&&s.parameter===p.key);
    return {key:p.key,label:p.label,magnitude:p.magnitude,
      maxIndividualShiftMm:cases.length?Math.max(...cases.map(s=>s.shiftMm)):null,
      invalidIndividualCases:invalid.filter(s=>s.kind==='individual'&&s.parameter===p.key).length};
  }).sort((a,b)=>b.invalidIndividualCases-a.invalidIndividualCases||(b.maxIndividualShiftMm??0)-(a.maxIndividualShiftMm??0));
  const reasons=Object.entries(invalid.reduce((m,s)=>(m[s.reason]=(m[s.reason]??0)+1,m),{})).map(([reason,count])=>({reason,count}));
  return {schema:SENSITIVITY_SCHEMA,method:METHOD,landmarkId,label:mark.label,settings,
    nominal:{xMm:nominal.xMm,yMm:nominal.yMm,toleranceMm:nominal.toleranceMm},
    totalScenarios:valid.length+invalid.length,validScenarios:valid.length,invalidScenarios:invalid.length,
    status:invalid.length?'some-scenarios-refused':'sampled',valid,invalid,reasons,influences,
    sampledRange:{minXmm:Math.min(...valid.map(s=>s.xMm)),maxXmm:Math.max(...valid.map(s=>s.xMm)),
      minYmm:Math.min(...valid.map(s=>s.yMm)),maxYmm:Math.max(...valid.map(s=>s.yMm))},
    largestSample:largest,maxSampledShiftMm:largest.shiftMm,
    exceedsDeclaredTolerance:largest.shiftMm>nominal.toleranceMm+1e-9,
    meaning:'Movement of a predicted mark under the stated hypothetical input perturbations. Accepted annotations and actual placements are unchanged.',
    limitations:'Finite deterministic scenarios, not probabilities, confidence intervals or a guaranteed envelope. Invalid geometries are reported rather than imputed. Calibration bias, nonplanarity, lens distortion and physical measurement validity are not established.'};
}

export function exportSensitivity(demo,landmarkId,widthMm,heightMm,input={}){
  const result=analyzeSensitivity(demo,landmarkId,widthMm,heightMm,input);
  return {schema:SENSITIVITY_SCHEMA,method:METHOD,source:copy(demo),landmarkId,
    target:{widthMm,heightMm},assumptions:result.settings};
}
export function importSensitivity(bundle){
  requireThat(bundle&&bundle.schema===SENSITIVITY_SCHEMA&&bundle.method===METHOD,'Unsupported calibration-sensitivity session');
  const demo=copy(bundle.source),landmarkId=bundle.landmarkId,widthMm=bundle.target?.widthMm,heightMm=bundle.target?.heightMm;
  const analysis=analyzeSensitivity(demo,landmarkId,widthMm,heightMm,bundle.assumptions);
  return {demo,landmarkId,widthMm,heightMm,settings:analysis.settings,analysis};
}
