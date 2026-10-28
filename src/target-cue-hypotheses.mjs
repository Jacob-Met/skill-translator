import {importTargetCueStudy,inspectTargetCueStudy} from './target-cue-study.mjs';
import {TARGET_ALTERNATIVES_FORMAT,inspectTargetCueAlternatives} from './target-cue-alternatives.mjs';
export const TARGET_HYPOTHESES_FORMAT='skill-translator.target-cue-hypotheses/v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function importTargetCueHypotheses(raw){
 check(raw?.format===TARGET_HYPOTHESES_FORMAT,'Open complete attributed target hypotheses');
 check(raw.declaration==='only-listed-complete-hypotheses','Explicitly declare the listed complete hypotheses');
 const target=importTargetCueStudy(raw.target);
 check(Array.isArray(raw.hypotheses)&&raw.hypotheses.length>=2&&raw.hypotheses.length<=64,'Supply two to 64 complete hypotheses');
 const ids=new Set(),combinations=new Set();let cueIds=null;
 const hypotheses=raw.hypotheses.map(h=>{
  check(typeof h?.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(h.id)&&!ids.has(h.id),'Use distinct bounded hypothesis identifiers');ids.add(h.id);
  check(typeof h.basis==='string'&&h.basis.trim()&&h.basis.length<=1000,'Explain why each complete interpretation remains possible');
  check(Array.isArray(h.readings)&&h.readings.length>=1&&h.readings.length<=3,'Each complete hypothesis supplies one to three uncertain cues');
  const admitted=importTargetCueStudy({...target,readings:[...target.readings,...h.readings]}).readings.slice(target.readings.length);
  const order=target.reference.cues.map(c=>c.id).filter(id=>admitted.some(r=>r.cueId===id));
  if(cueIds===null)cueIds=order;else check(JSON.stringify(order)===JSON.stringify(cueIds),'Every complete hypothesis must supply the same uncertain cues');
  const readings=order.map(id=>admitted.find(r=>r.cueId===id)),key=JSON.stringify([h.basis.trim(),readings]);
  check(!combinations.has(key),'Duplicate fully attributed hypotheses do not add evidence');combinations.add(key);
  return {id:h.id,basis:h.basis.trim(),readings};
 });
 for(const id of cueIds){const values=new Set(hypotheses.map(h=>h.readings.find(r=>r.cueId===id).value));check(values.size>=2&&values.size<=4,'Each uncertain cue has two to four explicitly supplied categories; retain constant readings as fixed');}
 return {format:TARGET_HYPOTHESES_FORMAT,declaration:'only-listed-complete-hypotheses',target,hypotheses};
}
export function inspectTargetCueHypotheses(raw){
 const study=importTargetCueHypotheses(raw),interpretations=study.hypotheses.map(h=>({id:h.id,basis:h.basis,readings:h.readings,report:inspectTargetCueStudy({...study.target,readings:[...study.target.readings,...h.readings]}).report}));
 const rows=study.target.reference.rows.map((_,i)=>i),possibleExampleIndexes=rows.filter(i=>interpretations.some(h=>h.report.compatibleExampleIndexes.includes(i))),alwaysCompatibleExampleIndexes=rows.filter(i=>interpretations.every(h=>h.report.compatibleExampleIndexes.includes(i)));
 const vectorMap=new Map();for(const h of study.hypotheses){const values=h.readings.map(r=>({cueId:r.cueId,value:r.value})),key=JSON.stringify(values);if(!vectorMap.has(key))vectorMap.set(key,{values,hypothesisIds:[]});vectorMap.get(key).hypothesisIds.push(h.id);}
 const crossProductProvenance=[];
 const alternatives=study.hypotheses[0].readings.map(r=>{const found=new Map();for(const h of study.hypotheses){const row=h.readings.find(x=>x.cueId===r.cueId);if(!found.has(row.value))found.set(row.value,row);}for(const [value,representative]of found){const supporting=study.hypotheses.filter(h=>h.readings.some(x=>x.cueId===r.cueId&&x.value===value));crossProductProvenance.push({cueId:r.cueId,value,representativeHypothesisId:supporting[0].id,representativeReading:representative,attributions:supporting.map(h=>({hypothesisId:h.id,hypothesisBasis:h.basis,reading:h.readings.find(x=>x.cueId===r.cueId)}))});}return {cueId:r.cueId,readings:[...found.values()]};});
 const crossProduct=inspectTargetCueAlternatives({format:TARGET_ALTERNATIVES_FORMAT,target:study.target,combinationDeclaration:'all-combinations',alternatives});
 return {interpretations,categoricalVectors:[...vectorMap.values()],crossProductProvenance,possibleExampleIndexes,alwaysCompatibleExampleIndexes,excludedExampleIndexes:rows.filter(i=>!possibleExampleIndexes.includes(i)),unsupportedHypothesisIds:interpretations.filter(h=>!h.report.compatibleExampleIndexes.length).map(h=>h.id),crossProduct,additionalCrossProductExampleIndexes:crossProduct.possibleExampleIndexes.filter(i=>!possibleExampleIndexes.includes(i)),referenceWasRefitted:false,targetDecisionInferred:false,boundary:'Complete hypotheses and their correlation are explicitly supplied, never inferred. Equal categorical vectors can retain different original frame attributions; their record counts are not probabilities. The counterfactual uses the first admitted reading per category only for computation; all contributing original attributions remain in crossProductProvenance. Every listed hypothesis is evaluated against unchanged original reference rows. The cross-product is a separately labeled counterfactual that allows every marginal combination; it is not the declared hypothesis set. Unknown reference cues can stay compatible without positive support. No probability, physical correctness, action or learning effect is inferred.'};
}
