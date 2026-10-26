import {AXIS_SPATIAL_CORRESPONDENCE_FORMAT,AXIS_SCALE_MODEL,SCALED_SPATIAL_CORRESPONDENCE_FORMAT} from '/src/spatial-correspondence.mjs';
import {derive} from '/src/geometry.mjs';
import {cmp,enclosure} from '/vendor/chronos/exact-halfplanes.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
let result=null,current=false,revision=0,pending=false,active=null;
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const svg=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
function enable(){const unique=!pending&&current&&result?.complete&&result.status==='unique';$('semantic').disabled=!unique;$('openDiscovery').disabled=!unique||!$('semantic').checked;$('saveMapping').disabled=$('openDiscovery').disabled;}
function cancelWork(){if(active){active.worker.terminate();active.reject(Error('Computation superseded'));active=null;}pending=false;}
function begin(){revision++;cancelWork();pending=true;enable();$('error').textContent='';$('status').textContent=result?'Calculation pending; the displayed accepted proposal belongs to the previous inputs.':'Calculation pending; no complete proposal yet.';return revision;}
function compute(ticket,kind,raw,extra={}){
 return new Promise((resolve,reject)=>{
  if(ticket!==revision){reject(Error('Computation superseded'));return;}
  let worker;try{worker=new Worker(new URL('./spatial-correspondence-worker.mjs',import.meta.url),{type:'module'});}catch(error){reject(error);return;}
  active={worker,reject};
  worker.onmessage=({data})=>{if(ticket!==revision||data.revision!==ticket)return;worker.terminate();active=null;pending=false;enable();data.error?reject(Error(data.error)):resolve(data.value);};
  worker.onerror=event=>{if(ticket!==revision)return;worker.terminate();active=null;pending=false;enable();reject(Error(event.message||'Correspondence worker unavailable'));};
  try{worker.postMessage({revision:ticket,kind,raw,...extra});}catch(error){worker.terminate();active=null;pending=false;reject(error);}
 });
}
function fail(ticket,error){if(ticket!==revision)return;cancelWork();enable();$('error').textContent='Input or calculation refused; previous accepted proposal retained. '+error.message;$('status').textContent=result?'No new result accepted. The displayed proposal still belongs to its saved original inputs.':'No complete proposal available.';}
function install(value){result=value.result;current=true;pending=false;$('error').textContent='';$('deviation').value=result.study.deviationMm;$('semantic').checked=value.reviewed;$('saveProposal').disabled=false;if(value.sourceEvidenceClass)$('evidence').value=value.sourceEvidenceClass;render();enable();}
function magnitudeRange(polygon,axis){
 try{const values=polygon.map(p=>[BigInt(p[axis].numerator),BigInt(p[axis].denominator)]),low=values.reduce((a,b)=>cmp(a,b)<0?a:b),high=values.reduce((a,b)=>cmp(a,b)>0?a:b);return `${Math.sqrt(enclosure(low).lower).toPrecision(7)}–${Math.sqrt(enclosure(high).upper).toPrecision(7)}`;}catch{return 'outside numeric display range; exact bounds retained';}
}
function supportRange(support,axis){
 if(support.outerSquaredScalePolygon)return magnitudeRange(support.outerSquaredScalePolygon,axis);
 const interval=support.outerSquaredScaleIntervals[axis];if(interval.upper===null)return 'unconstrained by these reference points';
 try{const unseal=x=>[BigInt(x.numerator),BigInt(x.denominator)];return `${Math.sqrt(enclosure(unseal(interval.lower)).lower).toPrecision(7)}–${Math.sqrt(enclosure(unseal(interval.upper)).upper).toPrecision(7)}`;}catch{return 'outside numeric display range; exact bounds retained';}
}
function render(){
 const axis=result.study.format===AXIS_SPATIAL_CORRESPONDENCE_FORMAT;
 $('summary').textContent=`${result.status}. ${result.complete?`${result.completeMappingCount} complete ${axis?'potential':'compatible'} mapping(s).`:`Search not complete: ${result.foundMappingCount} found mapping(s), without a complete count.`} ${result.forcedPairs.length} forced point pair(s); ${result.states} search states.${axis?` ${result.constraintWork} exact constraint work. ${result.completeWitnessedMappingCount??'Unknown'} mapping(s) have conservative witnesses.`:''} Only a qualified unique complete mapping can be reviewed for use.`;
 $('model').textContent=axis?'Model: positive stretch magnitudes along the original reference axes. Unequal magnitudes and their correspondence are inferred together; signs and orientation are not inferred.':result.study.format===SCALED_SPATIAL_CORRESPONDENCE_FORMAT?'Reopened common-scale model: one positive pair-distance scale shared by every pair. Original v2 behavior retained.':'Reopened fixed-distance model: scale 1 only. Original v1 behavior retained.';
 $('scaleRanges').replaceChildren();
 if(result.witnessAxisSupports){
  $('scaleRanges').append(el('h3','Coupled scale support'),el('p',`Showing up to eight potential mappings; every potential mapping contributes to the complete count. Approximate ranges for two observed axes are projections of a joint polygon and cannot be combined freely. An unobserved axis remains unconstrained. Exact support is retained in a reviewed download.`));
  result.witnessAxisSupports.forEach((support,i)=>{$('scaleRanges').append(el('p',`Mapping ${i+1}: horizontal magnitude ${supportRange(support,0)}; vertical magnitude ${supportRange(support,1)}. ${support.hasConservativeWitness?'An inner witness passes despite numerical rounding.':'Numerical boundary unresolved; no inner witness.'} `+result.witnessMappings[i].map(p=>`${p.referenceId} → ${p.observationId}`).join('; ')));});
 }else if(result.witnessScaleIntervals){
  $('scaleRanges').append(el('h3','Supported scale intervals'),el('p','Showing up to eight witnesses; all mappings contribute to complete support. Displayed endpoints are rounded.'));
  result.witnessScaleIntervals.forEach((range,i)=>{$('scaleRanges').append(el('p',`Mapping ${i+1}: scale ${range.lowerInclusive?'[':'('}${range.lower.toPrecision(8)}, ${range.upper===null?'unbounded':range.upper.toPrecision(8)}${range.upper===null?')':']'}. ${range.includesUnitScale?'Includes fixed scale 1.':'Does not include scale 1.'} `+result.witnessMappings[i].map(p=>`${p.referenceId} → ${p.observationId}`).join('; ')));});
 }
 $('limits').textContent=result.limitation;$('pairs').replaceChildren(...result.possibleMatches.map(p=>{const tr=el('tr');tr.append(el('td',p.referenceId),el('td',p.observationIds.join(', ')));return tr;}));
 $('plots').replaceChildren();
 for(const [label,annotation]of [['Reference: original IDs',result.study.reference],['Other source: original IDs',result.study.observation]]){
  const card=el('article');card.className='source-card';card.append(el('h3',label),el('p',annotation.title||'Original annotation'));const d=derive(annotation),w=d.source.widthMm,h=d.source.heightMm,s=Math.min(320/w,210/h),view=svg('svg',{viewBox:'0 0 370 250',role:'img','aria-label':label});view.append(svg('rect',{x:15,y:15,width:w*s,height:h*s,fill:'#e3eee7',stroke:'#698574'}));
  for(const m of d.landmarks){const x=15+m.uv.u*w*s,y=15+m.uv.v*h*s;view.append(svg('circle',{cx:x,cy:y,r:4,fill:'#a95313'}));const text=svg('text',{x:x+6,y:y-5,'font-size':11});text.textContent=m.id;view.append(text);}card.append(view,el('p',`${w} × ${h} mm. Annotation diagram; original image pixels are not reattached here.`));$('plots').append(card);
 }
}
function retire(){revision++;cancelWork();current=false;$('semantic').checked=false;enable();$('status').textContent='Source selection or bound changed. Recompute before reviewing; the displayed accepted proposal remains available to save.';}
for(const id of ['reference','observation','deviation'])$(id).addEventListener('change',retire);
$('deviation').addEventListener('input',retire);
$('semantic').onchange=()=>{revision++;cancelWork();enable();};
$('evidence').onchange=()=>{revision++;cancelWork();enable();};
async function read(file){if(!file||file.size>2_000_000)throw Error('Choose a JSON file within2MB.');return JSON.parse(await file.text());}
$('inspect').onclick=async()=>{
 const ticket=begin();try{const files=[$('reference').files[0],$('observation').files[0]];if(files.some(f=>!f)||files.reduce((s,f)=>s+f.size,0)>1_900_000)throw Error('Choose two annotations within1.9MB combined.');const deviationMm=Number($('deviation').value),[reference,observation]=await Promise.all(files.map(read));if(ticket!==revision)return;const value=await compute(ticket,'inspect',{format:AXIS_SPATIAL_CORRESPONDENCE_FORMAT,model:AXIS_SCALE_MODEL,reference,observation,deviationMm,maxStates:20000,maxConstraintWork:200000});if(ticket!==revision)return;install(value);$('status').textContent='Complete independent-axis search received from original sources; no source normalization or point-pair entry.';}catch(error){fail(ticket,error);}
};
$('reopen').onchange=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;const ticket=begin();try{const raw=await read(file);if(ticket!==revision)return;const value=await compute(ticket,'reopen',raw);if(ticket!==revision)return;install(value);$('status').textContent='Original sources reopened; the retained model and all correspondence evidence recomputed.';}catch(error){fail(ticket,error);}};
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('saveProposal').onclick=()=>{if(result)download('skill-spatial-proposal.json',result.study);};
async function reviewAction(kind){
 if(!current||!result||!$('semantic').checked){$('error').textContent='Recompute and review the current unique mapping first.';return;}
 const raw=result.study,extra={semanticCorrespondenceConfirmed:true,sourceEvidenceClass:$('evidence').value},ticket=begin();
 try{const value=await compute(ticket,kind,raw,extra);if(ticket!==revision)return;if(kind==='review'){download('skill-reviewed-spatial-mapping.json',value);$('status').textContent='Reviewed mapping saved with unchanged originals and recomputed geometric support.';}else{sessionStorage.setItem('skill-translator-mapped-discovery/v1',JSON.stringify(value));location.assign('/relationship-discovery');}}catch(error){fail(ticket,error);}
}
$('saveMapping').onclick=()=>reviewAction('review');$('openDiscovery').onclick=()=>reviewAction('discovery');
$('example').onclick=async()=>{
 const p=[[19,23],[43,31],[29,71],[103,89]],order=[2,0,3,1],q=order.map(i=>[1.6*p[i][0],1.3*p[i][1]]),annotation=(points,prefix,w,h)=>({title:'Authored unequal-axis shuffled pattern',provenance:'Analytic geometry, not physical identity evidence',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:points.map(([x,y],i)=>({id:`${prefix}-${i}`,label:`${prefix} ${i}`,kind:'fraction',sourcePx:{x,y},toleranceMm:1}))}),ticket=begin();
 try{const value=await compute(ticket,'inspect',{format:AXIS_SPATIAL_CORRESPONDENCE_FORMAT,model:AXIS_SCALE_MODEL,reference:annotation(p,'reference',400,300),observation:annotation(q,'local',640,390),deviationMm:.001,maxStates:20000,maxConstraintWork:200000});if(ticket!==revision)return;install(value);$('evidence').value='authored-example';$('status').textContent='Authored example: unequal axis magnitudes and shuffled correspondence inferred without entering either scale.';}catch(error){fail(ticket,error);}
};
window.addEventListener('pagehide',event=>{if(!event.persisted){revision++;cancelWork();}});
