// One global source reading, with a fixed rule per selected mark. Rule choices
// factor by mark; we never manufacture a Cartesian list or a probability.
import {derive,GeometryError} from './geometry.mjs';
import {RULES,observationReference,scoreInterpretation,validateObservations} from './evidence.mjs';

export const JOINT_CALIBRATION_SCHEMA='skill-translator-joint-calibration/v1';
export const MAX_JOINT_MARKS=12;
export const MAX_JOINT_HYPOTHESES=24;
const requireThat=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const copy=value=>JSON.parse(JSON.stringify(value));
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

export function jointSourceReference(source){
  const d=derive(source);
  return {marks:d.landmarks.map(mark=>observationReference(source,mark.id))};
}
export function jointSourceReading(source){
  const d=derive(source);
  return {widthMm:d.source.widthMm,heightMm:d.source.heightMm,
    corners:d.source.corners.map(p=>({x:p.x,y:p.y})),
    points:d.landmarks.map(mark=>({landmarkId:mark.id,sourcePx:{x:mark.sourcePx.x,y:mark.sourcePx.y}}))};
}
function selection(source,ids){
  derive(source);
  requireThat(Array.isArray(ids)&&ids.length>=2&&ids.length<=MAX_JOINT_MARKS,
    `Select 2–${MAX_JOINT_MARKS} distinct task marks`);
  const chosen=new Set(ids);
  requireThat(chosen.size===ids.length&&ids.every(id=>source.landmarks.some(m=>m.id===id)),
    'Selected marks must be distinct members of the original source');
  return source.landmarks.map(m=>m.id).filter(id=>chosen.has(id));
}
function condition(source,reading){
  requireThat(reading&&Array.isArray(reading.corners)&&Array.isArray(reading.points),
    'Supply global dimensions, four corners and explicit pixels for every original mark');
  const points=new Map();
  for(const p of reading.points){
    requireThat(p&&typeof p.landmarkId==='string'&&!points.has(p.landmarkId),
      'Every source reading needs distinct mark pixel identities');
    points.set(p.landmarkId,p.sourcePx);
  }
  requireThat(points.size===source.landmarks.length&&source.landmarks.every(m=>points.has(m.id)),
    'A global reading must explicitly retain every original source mark');
  const hypothetical={...source,source:{...source.source,widthMm:reading.widthMm,
    heightMm:reading.heightMm,corners:reading.corners},
    landmarks:source.landmarks.map(m=>({...m,sourcePx:points.get(m.id)}))};
  const d=derive(hypothetical);
  // A global page reading must also contain unselected source marks. No omitted
  // point silently acquires a different page or drops out of the source.
  if(source.source.image){
    const {widthPx,heightPx}=source.source.image;
    for(const p of [...d.source.corners,...d.landmarks.map(m=>m.sourcePx)])requireThat(
      p.x>=0&&p.y>=0&&p.x<=widthPx&&p.y<=heightPx,
      'Every source point and corner must stay inside the original image frame');
  }
  return {derived:d,reading:jointSourceReading(hypothetical)};
}
export function createJointCalibrationHypothesis(source,input){
  const sourceReference=jointSourceReference(source);
  requireThat(input&&typeof input.id==='string'&&/^[a-z0-9-]{1,40}$/.test(input.id)&&input.id!=='nominal',
    'A global reading needs a distinct id other than nominal');
  requireThat(typeof input.label==='string'&&input.label.trim().length>0&&input.label.trim().length<=160,
    'Name the source reading in 1–160 characters');
  requireThat(['proposed-reading','repeat-annotation'].includes(input.basis),
    'Declare a proposed reading or a repeated annotation');
  const {reading}=condition(source,input.reading);
  return {id:input.id,label:input.label.trim(),basis:input.basis,reading,sourceReference};
}
function alternatives(source,hypotheses){
  requireThat(Array.isArray(hypotheses)&&hypotheses.length<=MAX_JOINT_HYPOTHESES,
    `Supply at most ${MAX_JOINT_HYPOTHESES} alternative global readings`);
  const ids=new Set();
  return hypotheses.map(input=>{
    const h=createJointCalibrationHypothesis(source,input);
    requireThat(same(input.sourceReference,h.sourceReference),'Global reading belongs to a different original source');
    requireThat(!ids.has(h.id),'Global source readings need distinct ids');ids.add(h.id);
    return h;
  });
}
export function analyzeJointCalibration(source,landmarkIds,observations,hypotheses=[]){
  const selectedIds=selection(source,landmarkIds),sourceReference=jointSourceReference(source);
  const allRows=validateObservations(source,observations),chosen=new Set(selectedIds);
  const rows=allRows.filter(row=>chosen.has(row.landmarkId));
  const declared=alternatives(source,hypotheses);
  const readings=[{id:'nominal',label:'Original page reading',basis:'original',
    reading:jointSourceReading(source),sourceReference},...declared];
  const evaluated=readings.map(h=>{
    const {derived}=condition(source,h.reading);
    const marks=selectedIds.map(id=>{
      const mark=derived.landmarks.find(m=>m.id===id),own=rows.filter(r=>r.landmarkId===id);
      const candidates=RULES.map(rule=>{
        const residuals=own.map(row=>scoreInterpretation(mark,derived.source,row,rule));
        return {rule,status:!own.length?'untested':residuals.every(r=>r.compatible)?'compatible':'contradicted',
          residuals,contradictions:residuals.filter(r=>!r.compatible).map(r=>r.observationId)};
      });
      return {landmarkId:id,observationCount:own.length,candidates,
        survivingRules:candidates.filter(c=>c.status!=='contradicted').map(c=>c.rule)};
    });
    const excludedBy=marks.filter(m=>!m.survivingRules.length).map(m=>m.landmarkId);
    return {...h,marks,excludedBy,viable:!excludedBy.length,
      combinationCount:marks.reduce((n,m)=>n*m.survivingRules.length,1)};
  });
  const viable=evaluated.filter(h=>h.viable);
  const missingMarkIds=selectedIds.filter(id=>!rows.some(r=>r.landmarkId===id));
  const marginals=selectedIds.map((id,index)=>({landmarkId:id,
    supportingReadingIds:evaluated.filter(h=>h.marks[index].survivingRules.length).map(h=>h.id),
    marginalRules:RULES.filter(rule=>evaluated.some(h=>h.marks[index].survivingRules.includes(rule))),
    jointRules:RULES.filter(rule=>viable.some(h=>h.marks[index].survivingRules.includes(rule)))}));
  const combinationCount=viable.reduce((n,h)=>n+h.combinationCount,0);
  const requiresSourceSwitching=rows.length>0&&!viable.length&&marginals.every(m=>m.supportingReadingIds.length>0);
  const status=!rows.length?'no-evidence':!viable.length?'none-compatible':missingMarkIds.length?'partial-evidence':
    combinationCount===1?'one-joint-explanation':'unresolved';
  return {selectedIds,sourceReference,observations:rows,unselectedObservationCount:allRows.length-rows.length,
    hypotheses:evaluated,viableReadingIds:viable.map(h=>h.id),marginals,missingMarkIds,
    combinationCount,requiresSourceSwitching,status,
    authoredCount:rows.filter(r=>r.evidenceClass==='authored-example').length,
    reportedCount:rows.filter(r=>r.evidenceClass==='reported-measurement').length,
    limitations:['One page reading is shared; each mark retains its own fixed rule across observations.',
      'Counts describe declared finite combinations, not confidence, probabilities or expert intent.',
      'Unobserved marks remain untested. Compatible explanations do not establish physical skill.',
      'These explicit readings do not bound continuous calibration or measurement errors.']};
}
export function exportJointCalibration(source,landmarkIds,observations,hypotheses=[]){
  const selectedIds=selection(source,landmarkIds),rows=validateObservations(source,observations);
  const hs=alternatives(source,hypotheses);
  analyzeJointCalibration(source,selectedIds,rows,hs);
  return {schema:JOINT_CALIBRATION_SCHEMA,source:copy(source),sourceReference:jointSourceReference(source),
    landmarkIds:selectedIds,observations:rows,hypotheses:hs};
}
export function importJointCalibration(bundle,expectedSource=null){
  requireThat(bundle&&bundle.schema===JOINT_CALIBRATION_SCHEMA,'Unsupported joint-calibration schema');
  requireThat(Array.isArray(bundle.hypotheses),'Saved study must explicitly retain its global readings');
  const anchor=jointSourceReference(bundle.source);
  requireThat(same(bundle.sourceReference,anchor),'Joint study source reference differs from its source');
  if(expectedSource)requireThat(same(jointSourceReference(expectedSource),anchor),'Joint study belongs to a different source');
  return exportJointCalibration(bundle.source,bundle.landmarkIds,bundle.observations,bundle.hypotheses);
}
