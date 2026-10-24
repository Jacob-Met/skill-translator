import {GeometryError} from './geometry.mjs';
import {analyzeWidthStudy,checkWidth,widthComparison,widthPracticeInput} from './feature-width.mjs';
export const WIDTH_ALLOWANCE_SCHEMA='skill-translator-width-allowance/v1';
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const inside=(band,w)=>(w>band.minWidthMm||w===band.minWidthMm&&band.minInclusive)&&(w<band.maxWidthMm||w===band.maxWidthMm&&band.maxInclusive);
function erode(band,minus,plus){const minWidthMm=band.minWidthMm+minus,maxWidthMm=band.maxWidthMm-plus;if(minWidthMm>maxWidthMm||minWidthMm===maxWidthMm&&!(band.minInclusive&&band.maxInclusive))return null;return {...band,minWidthMm,maxWidthMm};}
export function importWidthAllowance(raw){
 fail(raw?.schema===WIDTH_ALLOWANCE_SCHEMA,'Unsupported whole-width-allowance schema');
 const study=analyzeWidthStudy(raw.study).bundle;
 for(const key of ['minusMm','plusMm'])fail(typeof raw[key]==='number'&&Number.isFinite(raw[key])&&raw[key]>=0&&raw[key]<=10000,'Declare finite nonnegative width allowances up to 10,000 mm');
 fail(typeof raw.basis==='string'&&raw.basis.trim().length>0&&raw.basis.length<=2000,'Supply the basis for the actual-width allowance');
 const nominalWidthMm=raw.nominalWidthMm??null;
 fail(nominalWidthMm===null||typeof nominalWidthMm==='number'&&Number.isFinite(nominalWidthMm)&&nominalWidthMm>=study.minWidthMm&&nominalWidthMm<=study.maxWidthMm,'Nominal width must lie in the studied domain');
 return {schema:WIDTH_ALLOWANCE_SCHEMA,study,minusMm:raw.minusMm,plusMm:raw.plusMm,basis:raw.basis.trim(),nominalWidthMm};
}
export function analyzeWidthAllowance(raw){
 const bundle=importWidthAllowance(raw),study=analyzeWidthStudy(bundle.study),{minusMm,plusMm}=bundle;
 const domain=erode({minWidthMm:study.bundle.minWidthMm,maxWidthMm:study.bundle.maxWidthMm,minInclusive:true,maxInclusive:true},minusMm,plusMm);
 const candidates=study.candidates.map(b=>erode(b,minusMm,plusMm)).filter(Boolean);
 const qualified=study.bands.filter(b=>b.status==='meets').map(b=>erode(b,minusMm,plusMm)).filter(Boolean);
 return {bundle,domain,candidates,qualified,guardMm:study.guardMm,scope:'Entire declared actual-width interval within guarded affine-model passing bands. Engineering numerical allowance, not certified interval arithmetic or a physical guarantee. Width uncertainty is declared, not measured.'};
}
export function checkWidthAllowance(raw,nominalWidthMm){
 const bundle=importWidthAllowance(raw),study=analyzeWidthStudy(bundle.study);
 fail(typeof nominalWidthMm==='number'&&Number.isFinite(nominalWidthMm),'Supply a finite nominal width');
 const minWidthMm=nominalWidthMm-bundle.minusMm,maxWidthMm=nominalWidthMm+bundle.plusMm;
 fail(minWidthMm>=study.bundle.minWidthMm&&maxWidthMm<=study.bundle.maxWidthMm,'The whole actual-width interval must lie inside the studied domain; no extrapolation');
 const interval={minWidthMm,maxWidthMm},nominal=checkWidth(bundle.study,nominalWidthMm);
 // Positive proof requires one contiguous passing band to contain both inclusive
 // ends. Unresolved cells or missing coverage may never be silently omitted.
 const covering=study.bands.find(b=>b.status==='meets'&&inside(b,minWidthMm)&&inside(b,maxWidthMm));
 if(covering&&nominal.meets&&!nominal.boundaryUncertain)return {nominalWidthMm,interval,status:'qualified',nominal,witness:null};
 for(const band of study.bands){
  if(band.status!=='fails')continue;
  const lo=Math.max(minWidthMm,band.minWidthMm),hi=Math.min(maxWidthMm,band.maxWidthMm);
  if(lo>hi||lo===hi&&!inside(band,lo))continue;
  // A midpoint belongs to every nonempty open overlap; try endpoints only
  // when admitted. Every asserted counterexample is independently rechecked.
  const widths=[lo+(hi-lo)/2,...[lo,hi].filter(w=>inside(band,w))];
  for(const widthMm of widths){if(widthMm<minWidthMm||widthMm>maxWidthMm||!inside(band,widthMm))continue;const result=checkWidth(bundle.study,widthMm);if(!result.meets)return {nominalWidthMm,interval,status:'fails',nominal,witness:result};}
 }
 // The nominal point itself is an admissible actual width, including tiny
 // intervals where floating subtraction leaves no representable midpoint.
 if(!nominal.meets)return {nominalWidthMm,interval,status:'fails',nominal,witness:nominal};
 return {nominalWidthMm,interval,status:'unresolved',nominal,witness:null};
}
export function allowanceComparison(raw,nominalWidthMm){const bundle=importWidthAllowance(raw),result=checkWidthAllowance(bundle,nominalWidthMm);fail(result.status==='qualified','The whole width allowance is not qualified; resolve or change the declaration before nominal handoff');return widthComparison(bundle.study,nominalWidthMm);}
export function allowancePracticeInput(raw,nominalWidthMm){const bundle=importWidthAllowance(raw);allowanceComparison(bundle,nominalWidthMm);return widthPracticeInput(bundle.study,nominalWidthMm);}
