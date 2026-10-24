import {derive,adapt,GeometryError} from './geometry.mjs';
import {reopenFeatureClearance,inspectFeatureClearance,featurePracticeInput,FEATURE_GAP_EPSILON} from './feature-clearance.mjs';
export const WIDTH_SCHEMA='skill-translator-feature-width/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const dimension=x=>typeof x==='number'&&Number.isFinite(x)&&x>=1&&x<=10000;
export function importWidthStudy(raw){
 fail(raw?.schema===WIDTH_SCHEMA,'Unsupported width-study schema');
 const comparison=reopenFeatureClearance(raw.comparison).bundle;
 const {heightMm,minWidthMm,maxWidthMm,mode}=raw;
 fail([heightMm,minWidthMm,maxWidthMm].every(dimension)&&minWidthMm<=maxWidthMm,'Supply an ordered width range and fixed height from 1 to 10,000 mm');
 fail(['nominal','envelope'].includes(mode),'Choose nominal or envelope separation');
 const derived=derive(comparison.source);
 fail(derived.landmarks.every(m=>m.kind==='fraction'||m.kind==='edge_offset_mm'&&['left','right','top','bottom'].includes(m.edge)),'Unsupported affine transfer rule');
 adapt(derived,minWidthMm,heightMm);adapt(derived,maxWidthMm,heightMm);
 const selectedWidthMm=raw.selectedWidthMm??null;
 fail(selectedWidthMm===null||dimension(selectedWidthMm)&&selectedWidthMm>=minWidthMm&&selectedWidthMm<=maxWidthMm,'Selected width is outside the declared interval');
 return {schema:WIDTH_SCHEMA,comparison,heightMm,minWidthMm,maxWidthMm,mode,selectedWidthMm};
}
function inspect(s,w){const c=s.comparison;return inspectFeatureClearance(c.source,w,s.heightMm,c.features,c.requiredGapMm);}
function model(s){
 const a=inspect(s,s.minWidthMm),b=inspect(s,s.maxWidthMm),span=s.maxWidthMm-s.minWidthMm;
 const scale=Math.max(1,s.heightMm,s.minWidthMm,s.maxWidthMm,...a.marks.map(m=>m.radiusMm),s.comparison.requiredGapMm);
 const guardMm=FEATURE_GAP_EPSILON+512*Number.EPSILON*scale;
 for(const t of [.25,.5,.75]){const actual=inspect(s,s.minWidthMm+span*t);a.marks.forEach((m,i)=>{fail(Math.abs(actual.marks[i].xMm-(m.xMm+(b.marks[i].xMm-m.xMm)*t))<=guardMm&&Math.abs(actual.marks[i].yMm-m.yMm)<=guardMm,'Transfer cannot be qualified as affine across this range');});}
 const pairs=[];
 for(let i=0;i<a.marks.length;i++)for(let j=i+1;j<a.marks.length;j++){
  const m=a.marks[i],n=a.marks[j],dx=m.xMm-n.xMm,end=b.marks[i].xMm-b.marks[j].xMm;
  const base=m.radiusMm+n.radiusMm+s.comparison.requiredGapMm;
  pairs.push({from:m.id,to:n.id,dx,slope:end-dx,dy:m.yMm-n.yMm,radius:base+(s.mode==='envelope'&&base>0?m.toleranceMm+n.toleranceMm:0),vacuous:base===0,tinyEnvelope:s.mode==='envelope'&&base>0&&base<=guardMm,nearConstant:Math.abs(end-dx)<=guardMm});
 }
 return {pairs,guardMm};
}
function roots(p,r){
 if(p.vacuous||p.slope===0||r<=Math.abs(p.dy))return [];
 const x=Math.sqrt((r-Math.abs(p.dy))*(r+Math.abs(p.dy)));
 return [(-x-p.dx)/p.slope,(x-p.dx)/p.slope].filter(Number.isFinite).sort((a,b)=>a-b);
}
function marginBounds(p,l,h){
 const x=p.dx+p.slope*l,y=p.dx+p.slope*h;
 const min=x*y<=0?0:Math.min(Math.abs(x),Math.abs(y)),max=Math.max(Math.abs(x),Math.abs(y));
 return [Math.hypot(min,p.dy)-p.radius,Math.hypot(max,p.dy)-p.radius];
}
function join(cells){const out=[];for(const c of cells){const last=out.at(-1);if(last&&last.status===c.status&&last.maxWidthMm===c.minWidthMm&&(last.maxInclusive||c.minInclusive)){last.maxWidthMm=c.maxWidthMm;last.maxInclusive=c.maxInclusive;}else out.push({...c});}return out;}
export function analyzeWidthStudy(raw){
 const bundle=importWidthStudy(raw),s=bundle,{pairs,guardMm}=model(s),span=s.maxWidthMm-s.minWidthMm;
 const width=t=>s.minWidthMm+span*t;
 if(span===0){const checked=checkWidth(s,s.minWidthMm);return {bundle,pairs,guardMm,candidates:checked.meets?[{minWidthMm:s.minWidthMm,maxWidthMm:s.maxWidthMm,minInclusive:true,maxInclusive:true}]:[],bands:[{minWidthMm:s.minWidthMm,maxWidthMm:s.maxWidthMm,minInclusive:true,maxInclusive:true,status:checked.boundaryUncertain?'unresolved':checked.meets?'meets':'fails'}]};}
 const points=new Set([0,1]);for(const p of pairs)for(const r of [p.radius,Math.max(0,p.radius-4*guardMm),p.radius+4*guardMm])for(const t of roots(p,r))if(t>0&&t<1)points.add(t);
 const sorted=[...points].sort((a,b)=>a-b),cells=[];
 const classify=(l,h)=>{let uncertain=false;for(const p of pairs){if(p.vacuous)continue;const [lo,hi]=marginBounds(p,l,h);if(hi< -guardMm&&!p.tinyEnvelope)return 'fails';if(lo<=guardMm)uncertain=true;}return uncertain?'unresolved':'meets';};
 for(let i=0;i<sorted.length;i++){let t=sorted[i];cells.push({minWidthMm:width(t),maxWidthMm:width(t),minInclusive:true,maxInclusive:true,status:classify(t,t)});if(i+1<sorted.length)cells.push({minWidthMm:width(t),maxWidthMm:width(sorted[i+1]),minInclusive:false,maxInclusive:false,status:classify(t,sorted[i+1])});}
 // Model candidates use closed roots and subtract open forbidden intervals.
 let intervals=[[0,1]];
 for(const p of pairs){if(p.vacuous)continue;const rr=roots(p,p.radius);if(!rr.length){if(Math.hypot(p.dx,p.dy)<p.radius&&p.slope===0)intervals=[];continue;}
  const [lo,hi]=rr,next=[];for(const [l,h] of intervals){if(hi<=l||lo>=h){next.push([l,h]);continue;}if(lo>=l)next.push([l,Math.min(h,lo)]);if(hi<=h)next.push([Math.max(l,hi),h]);}intervals=next;
 }
 return {bundle,pairs,guardMm,candidates:intervals.map(([l,h])=>({minWidthMm:width(l),maxWidthMm:width(h),minInclusive:true,maxInclusive:true})),bands:join(cells),scope:'Affine model candidates and guarded numerical bands; engineering allowance, not certified interval arithmetic. Recheck an interior chosen width through the maintained consumer.'};
}
export function checkWidth(raw,widthMm){
 const bundle=importWidthStudy(raw);fail(dimension(widthMm)&&widthMm>=bundle.minWidthMm&&widthMm<=bundle.maxWidthMm,'Choose a width inside the declared interval');
 const {pairs,guardMm}=model(bundle),report=inspect(bundle,widthMm),meets=bundle.mode==='nominal'?report.nominalMeets:report.toleranceEnvelopeMeets;
 const boundaryUncertain=report.pairs.some((p,i)=>!pairs[i].vacuous&&Math.abs(bundle.mode==='nominal'?p.nominalMarginMm:p.toleranceMarginMm)<=guardMm);
 return {widthMm,report,meets,boundaryUncertain,guardMm};
}
export function widthComparison(raw,widthMm){const bundle=importWidthStudy(raw),checked=checkWidth(bundle,widthMm);fail(checked.meets&&!checked.boundaryUncertain,'Chosen width fails or is numerically unresolved; choose a qualified interior width');return reopenFeatureClearance({...bundle.comparison,workpieces:[{widthMm,heightMm:bundle.heightMm}]}).bundle;}
export function widthPracticeInput(raw,widthMm){return featurePracticeInput(widthComparison(raw,widthMm),0);}
