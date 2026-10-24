// Declared planar patches; maintained point adaptation stays the sole target source.
import {derive,adapt,GeometryError} from './geometry.mjs';
import {createPractice} from './practice.mjs';
export const CONTACT_STUDY_SCHEMA='skill-translator-contact-study/v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const byteLength=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const insist=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const dimension=n=>finite(n)&&n>0&&n<=10000;
function rotation(degrees){
 insist(finite(degrees)&&Math.abs(degrees)<=3600,'Declare an angle from -3600 to 3600 degrees.');
 const angle=((degrees%360)+360)%360;
 if(angle%90===0)return {angle,cos:[1,0,-1,0][angle/90],sin:[0,1,0,-1][angle/90]};
 return {angle,cos:Math.cos(angle*Math.PI/180),sin:Math.sin(angle*Math.PI/180)};
}
export function declaredPatch(raw){
 insist(raw&&['rectangle','circle'].includes(raw.kind),'Declare a rectangular or circular contact patch.');
 insist(typeof raw.label==='string'&&raw.label.trim().length>0&&raw.label.length<=160,'Name the declared patch.');
 insist(typeof raw.provenance==='string'&&raw.provenance.trim().length>0&&raw.provenance.length<=1000,'Describe the origin of the patch dimensions.');
 insist(['authored','reported_measurement'].includes(raw.evidenceKind),'Label authored or reported patch measurements.');
 const anchor=raw.anchorMm??{x:0,y:0};insist(anchor&&finite(anchor.x)&&finite(anchor.y),'Declare a finite registration point in patch coordinates.');
 const r=rotation(raw.angleDeg??0);
 const patch={kind:raw.kind,label:raw.label,provenance:raw.provenance,evidenceKind:raw.evidenceKind,anchorMm:{x:anchor.x,y:anchor.y},angleDeg:r.angle};
 if(raw.kind==='rectangle'){
  insist(dimension(raw.widthMm)&&dimension(raw.heightMm),'Patch width/height must be positive and at most 10000 mm.');
  insist(Math.abs(anchor.x)<=raw.widthMm/2&&Math.abs(anchor.y)<=raw.heightMm/2,'Registration point must lie in the declared contact patch.');
  return {...patch,widthMm:raw.widthMm,heightMm:raw.heightMm};
 }
 insist(dimension(raw.radiusMm),'Patch radius must be positive and at most 10000 mm.');
 insist(Math.hypot(anchor.x,anchor.y)<=raw.radiusMm,'Registration point must lie in the declared contact patch.');
 return {...patch,radiusMm:raw.radiusMm};
}
/** Analytic support extrema; no orientation sampling or safe-tool recommendation. */
export function inspectContactPatch(demo,markId,widthMm,heightMm,rawPatch){
 const target=adapt(derive(demo),widthMm,heightMm),mark=target.landmarks.find(m=>m.id===markId);
 insist(mark,'Choose an existing task mark.');
 const patch=declaredPatch(rawPatch),r=rotation(patch.angleDeg);
 const center={x:mark.xMm-r.cos*patch.anchorMm.x+r.sin*patch.anchorMm.y,
  y:mark.yMm-r.sin*patch.anchorMm.x-r.cos*patch.anchorMm.y};
 const hx=patch.kind==='circle'?patch.radiusMm:Math.abs(r.cos)*patch.widthMm/2+Math.abs(r.sin)*patch.heightMm/2;
 const hy=patch.kind==='circle'?patch.radiusMm:Math.abs(r.sin)*patch.widthMm/2+Math.abs(r.cos)*patch.heightMm/2;
 const extrema={minX:center.x-hx,maxX:center.x+hx,minY:center.y-hy,maxY:center.y+hy};
 const clearancesMm={left:extrema.minX,right:widthMm-extrema.maxX,top:extrema.minY,bottom:heightMm-extrema.maxY};
 const minimumClearanceMm=Math.min(...Object.values(clearancesMm));
 const numericBoundaryScaleMm=64*Number.EPSILON*Math.max(1,widthMm,heightMm,Math.abs(center.x),Math.abs(center.y),hx,hy);
 const state=minimumClearanceMm < -numericBoundaryScaleMm?'overhang':minimumClearanceMm > numericBoundaryScaleMm?'inside':'numerical_boundary';
 const corners=patch.kind==='rectangle'?[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({
  x:center.x+r.cos*x*patch.widthMm/2-r.sin*y*patch.heightMm/2,
  y:center.y+r.sin*x*patch.widthMm/2+r.cos*y*patch.heightMm/2})):null;
 return {patch,mark:{id:mark.id,xMm:mark.xMm,yMm:mark.yMm},workpiece:{widthMm,heightMm},center,corners,extrema,clearancesMm,minimumClearanceMm,state,numericBoundaryScaleMm,
  interpretation:'Signed distance of the declared planar patch extent from each workpiece boundary; positive lies inward. Numerical-boundary status is arithmetic resolution, not a measurement tolerance.',
  unknowns:['Dimensions, registration point and orientation are supplied declarations.',
   'The source calibration and transferred point are conditional on authored task relationships.',
   'Patch containment does not establish pressure, friction, contact, support stiffness or a successful operation.',
   'Tool body, handle, operator reach, other obstacles and out-of-plane geometry are not represented.',
   'Workpiece boundaries are not inferred forbidden zones; the user must judge whether this patch requires full containment.']};
}

function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
function reference(source,markId,widthMm,heightMm){
 insist(byteLength(source)<=256*1024,'Source annotations exceed 256 KiB.');
 const session=createPractice(source,widthMm,heightMm);
 insist(session.reference.landmarks.some(m=>m.id===markId),'Choose an existing task mark.');
 return {...session.reference,selectedMarkId:markId};
}
export function createContactStudy(source,markId,widthMm,heightMm){
 return {schema:CONTACT_STUDY_SCHEMA,source:copy(source),markId,widthMm,heightMm,
  reference:reference(source,markId,widthMm,heightMm),patches:[]};
}
export function importContactStudy(raw,matchingSource=null){
 insist(raw?.schema===CONTACT_STUDY_SCHEMA,'Unsupported contact-patch study.');
 insist(byteLength(raw)<=512*1024,'Contact-patch study exceeds 512 KiB.');
 const source=matchingSource??raw.source;
 const expected=reference(source,raw.markId,raw.widthMm,raw.heightMm);
 const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 insist(same(expected,raw.reference)&&same(reference(raw.source,raw.markId,raw.widthMm,raw.heightMm),expected),'Source task, rules, image identity or target setup differs from this study.');
 insist(Array.isArray(raw.patches)&&raw.patches.length<=8,'Retain at most eight declared alternatives.');
 const ids=new Set(),patches=Array.from(raw.patches,row=>{
  insist(row&&typeof row.id==='string'&&/^[a-z0-9-]{1,32}$/.test(row.id)&&!ids.has(row.id),'Every patch alternative needs a unique stable ID.');ids.add(row.id);
  return {id:row.id,...declaredPatch(row)};
 });
 return {...createContactStudy(source,raw.markId,raw.widthMm,raw.heightMm),patches};
}
export function saveContactPatch(raw,id,patch){
 const study=importContactStudy(raw),next={id,...declaredPatch(patch)},index=study.patches.findIndex(p=>p.id===id);
 if(index<0)study.patches.push(next);else study.patches[index]=next;
 return importContactStudy(study);
}
export function removeContactPatch(raw,id){
 const study=importContactStudy(raw);insist(study.patches.some(p=>p.id===id),'Choose a retained patch to remove.');
 return {...study,patches:study.patches.filter(p=>p.id!==id)};
}
export function retargetContactStudy(raw,markId,widthMm,heightMm){
 const study=importContactStudy(raw),next=createContactStudy(study.source,markId,widthMm,heightMm);
 return importContactStudy({...next,patches:study.patches});
}
export function inspectContactStudy(raw){
 const study=importContactStudy(raw);
 return study.patches.map(p=>({id:p.id,...inspectContactPatch(study.source,study.markId,study.widthMm,study.heightMm,p)}));
}
