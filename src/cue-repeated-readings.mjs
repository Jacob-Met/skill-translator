import {importCueStudy} from './cue-sufficiency.mjs';
export function inspectRepeatedReadings(raw,inputs){
 const study=importCueStudy(raw);
 if(!inputs||!Number.isInteger(inputs.maxErrors)||inputs.maxErrors<0||inputs.maxErrors>2||typeof inputs.basis!=='string'||!inputs.basis.trim()||inputs.basis.length>1000||!Array.isArray(inputs.readings)||inputs.readings.length>30)throw Error('Declare a total error budget 0–2, basis and at most 30 ordered readings');
 const cues=study.cues.map(c=>c.id),readings=inputs.readings;
 for(const r of readings)if(!r||Object.keys(r).sort().join(',')!=='cue,value'||!cues.includes(r.cue)||typeof r.value!=='string'||!r.value.trim()||r.value.length>1000)throw Error('Every ordered reading needs an original cue and a nonempty category');
 const summarize=rs=>{
  const rows=study.rows.map((row,index)=>{const disagreements=[],unknown=[];rs.forEach((r,j)=>{const v=row.values[cues.indexOf(r.cue)];if(v===null)unknown.push(j);else if(v!==r.value)disagreements.push(j);});return {index,decision:row.decision,disagreements,unknown,compatible:disagreements.length<=inputs.maxErrors};});
  const compatible=rows.filter(r=>r.compatible),labels=[...new Set(compatible.map(r=>r.decision))];
  return {rows,indexes:compatible.map(r=>r.index),labels,status:!compatible.length?'outside-evidence':labels.includes(null)?'unknown-decision':labels.length===1?'one-retained-label':'ambiguous'};
 };
 const current=summarize(readings),history=Array.from({length:readings.length+1},(_,i)=>({count:i,...summarize(readings.slice(0,i))}));
 const next=readings.length===30?[]:cues.map((cue,j)=>{
  const categories=[...new Set(study.rows.map(r=>r.values[j]).filter(v=>v!==null))];let other='OTHER';while(categories.includes(other))other+='_';
  return {cue,branches:[...categories.map(value=>({kind:'known-category',value})),{kind:'other-category',value:other}].map(a=>({...a,...summarize([...readings,{cue,value:a.value}])}))};
 });
 return {...current,history,next,maxErrors:inputs.maxErrors,basis:inputs.basis,boundary:'All readings share one declared TOTAL mismatch bound. Repetition does not imply independent errors or physical reliability. Unknown source cells remain compatible, not confirmed. Only retained examples are compared.'};
}
