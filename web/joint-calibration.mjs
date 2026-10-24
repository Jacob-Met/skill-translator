import {derive} from '/src/geometry.mjs';
import {createObservation,importEvidence} from '/src/evidence.mjs';
import {CALIBRATION_SCHEMA,importCalibrationInvestigation} from '/src/calibration-evidence.mjs';
import {JOINT_CALIBRATION_SCHEMA,jointSourceReading,createJointCalibrationHypothesis,analyzeJointCalibration,exportJointCalibration,importJointCalibration} from '/src/joint-calibration.mjs';
const $=id=>document.getElementById(id),names={fraction:'proportional',left:'left clearance',right:'right clearance',top:'top clearance',bottom:'bottom clearance'};
const clone=x=>JSON.parse(JSON.stringify(x)),fmt=x=>Number(x.toFixed(4)).toLocaleString('en-US',{maximumFractionDigits:4});
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let study=null,revision=0,serial=0;
function error(message){$('error').textContent=message;$('error').hidden=!message;}
function action(fn){try{fn();error('');}catch(e){error(e.message);}}
function nextId(prefix){const ids=new Set([...(study?.observations??[]).map(o=>o.id),...(study?.hypotheses??[]).map(h=>h.id)]);let id;do{id=prefix+'-'+(++serial);}while(ids.has(id));return id;}
function number(id){if(!$(id).value.trim())throw Error('Complete every numerical field.');return Number($(id).value);}
function defaultIds(source){derive(source);if(source.landmarks.length<2)throw Error('Shared-source comparison needs at least two original source marks; no marks are invented.');return source.landmarks.slice(0,12).map(m=>m.id);}
function promoteInvestigation(value){
 const single=importCalibrationInvestigation(value);defaultIds(single.source);
 const ids=[single.landmarkId,...single.source.landmarks.filter(m=>m.id!==single.landmarkId).slice(0,11).map(m=>m.id)],original=jointSourceReading(single.source);
 const hypotheses=single.hypotheses.map(h=>{
  const reading={widthMm:h.reading.widthMm,heightMm:h.reading.heightMm,corners:h.reading.corners,
   points:original.points.map(p=>({landmarkId:p.landmarkId,sourcePx:clone(p.landmarkId===single.landmarkId?h.reading.sourcePx:p.sourcePx)}))};
  // Validation covers every original mark. A reading invalid for another mark
  // refuses the entire handoff, rather than silently dropping that alternative.
  return createJointCalibrationHypothesis(single.source,{id:h.id,label:h.label,basis:h.basis,reading});
 });
 return exportJointCalibration(single.source,ids,single.observations,hypotheses);
}
function openStudy(value){if(value?.schema===JOINT_CALIBRATION_SCHEMA)return importJointCalibration(value);if(value?.schema===CALIBRATION_SCHEMA)return promoteInvestigation(value);throw Error('Open a joint or existing single-mark calibration investigation.');}
function commit(candidate,reset=false){
 const next=importJointCalibration(candidate);analyzeJointCalibration(next.source,next.landmarkIds,next.observations,next.hypotheses);
 const changed=!study||JSON.stringify(next.sourceReference)!==JSON.stringify(study.sourceReference);
 study=next;revision++;render();if(changed||reset){resetReading();$('observedWidth').value=Math.min(10000,next.source.source.widthMm*2);$('observedHeight').value=Math.min(10000,next.source.source.heightMm*2);$('observedX').value='';$('observedY').value='';$('observationLabel').value='';}
}
function update({ids=study.landmarkIds,observations=study.observations,hypotheses=study.hypotheses}={}){commit(exportJointCalibration(study.source,ids,observations,hypotheses));}
function select(id,items){const n=$(id),old=n.value;n.replaceChildren(...items.map(item=>{const o=el('option',item.label);o.value=item.id;return o;}));if(items.some(i=>i.id===old))n.value=old;}
function numeric(label,id,value){const wrap=el('label',label),input=el('input');input.type='number';input.step='any';input.required=true;input.id=id;input.value=value;wrap.append(input);return wrap;}
function resetReading(){
 if(!study)return;const r=jointSourceReading(study.source);$('sourceWidth').value=r.widthMm;$('sourceHeight').value=r.heightMm;$('readingLabel').value='Alternative shared page reading';$('readingBasis').value='proposed-reading';
 $('cornerFields').replaceChildren(...r.corners.map((p,i)=>{const box=el('div',undefined,'point-reading');box.append(el('h4',['Top left','Top right','Bottom right','Bottom left'][i]));const fields=el('div',undefined,'field-grid');fields.append(numeric('Image x · px','corner-'+i+'-x',p.x),numeric('Image y · px','corner-'+i+'-y',p.y));box.append(fields);return box;}));
 $('pointFields').replaceChildren(...r.points.map((p,i)=>{const box=el('div',undefined,'point-reading'),mark=study.source.landmarks.find(m=>m.id===p.landmarkId);box.append(el('h4',(mark.label||mark.id)+' · '+mark.id));const fields=el('div',undefined,'field-grid');fields.append(numeric('Image x · px','point-'+i+'-x',p.sourcePx.x),numeric('Image y · px','point-'+i+'-y',p.sourcePx.y));box.append(fields);return box;}));
}
function draw(analysis){
 const svg=$('sourceDrawing');svg.replaceChildren();if(!study)return;
 const original=analysis.hypotheses[0],chosen=analysis.hypotheses.find(h=>h.id===$('drawingReading').value)||original;
 const all=[...original.reading.corners,...original.reading.points.map(p=>p.sourcePx),...chosen.reading.corners,...chosen.reading.points.map(p=>p.sourcePx)];
 const xmin=Math.min(...all.map(p=>p.x)),ymin=Math.min(...all.map(p=>p.y)),w=Math.max(...all.map(p=>p.x))-xmin,h=Math.max(...all.map(p=>p.y))-ymin,scale=Math.min(400/w,210/h),left=(520-w*scale)/2,top=(280-h*scale)/2;
 const at=p=>({x:left+(p.x-xmin)*scale,y:top+(p.y-ymin)*scale}),add=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;svg.append(n);};
 for(const [reading,color,alternate]of [[original,'#8edcc7',false],...(chosen.id==='nominal'?[]:[[chosen,'#efb576',true]])]){
  add('polygon',{points:reading.reading.corners.map(at).map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:color,'stroke-width':2,...(alternate?{'stroke-dasharray':'6 5'}:{})});
  for(const p of reading.reading.points){const q=at(p.sourcePx),selected=study.landmarkIds.includes(p.landmarkId);add('circle',{cx:q.x,cy:q.y,r:alternate?7:4,fill:alternate?'none':color,stroke:color,opacity:selected?1:.4,'stroke-width':2});if(!alternate)add('text',{x:q.x+9,y:q.y-9,fill:color},p.landmarkId);}
 }
 $('drawingCaption').textContent=`${chosen.label}: ${fmt(chosen.reading.widthMm)} × ${fmt(chosen.reading.heightMm)} mm. Original cyan; alternative amber; muted marks are outside selected scope. Annotation coordinates only — original photograph pixels are not displayed.`;
}
function render(){
 const accepted=Boolean(study);for(const id of ['scopeFields','readingFields','observationFields','drawingReading','observationsFile','exportJoint'])$(id).disabled=!accepted;
 if(!study){$('summary').dataset.status='no-source';$('summary').textContent='No accepted source study.';return;}
 const a=analyzeJointCalibration(study.source,study.landmarkIds,study.observations,study.hypotheses);
 $('sourceTitle').textContent=study.source.title||'Retained original source annotation';$('sourceDescription').textContent=`${study.source.landmarks.length} original marks; ${fmt(study.source.source.widthMm)} × ${fmt(study.source.source.heightMm)} mm. Alternative authoring does not alter this original source.`;
 $('scopeMarks').replaceChildren(...study.source.landmarks.map(m=>{const label=el('label'),checkbox=el('input');checkbox.type='checkbox';checkbox.value=m.id;checkbox.checked=study.landmarkIds.includes(m.id);checkbox.dataset.mark=m.id;checkbox.onchange=()=>{revision++;action(()=>{const ids=[...$('scopeMarks').querySelectorAll('input:checked')].map(n=>n.value);try{update({ids});}catch(e){render();throw e;}});};label.append(checkbox,el('span',m.label||m.id));return label;}));
 $('scopeSummary').textContent=`${a.selectedIds.length} selected; ${a.unselectedObservationCount} observations outside scope retained. Missing evidence for: ${a.missingMarkIds.join(', ')||'none'}.`;
 select('observationMark',study.source.landmarks.map(m=>({id:m.id,label:(m.label||m.id)+' · '+m.id})));select('drawingReading',a.hypotheses);
 $('readingRecords').replaceChildren(...study.hypotheses.map(h=>{const box=el('div',undefined,'record');box.append(el('strong',h.label),el('p',`${h.basis}; ${h.reading.points.length} explicit original marks; global dimensions ${fmt(h.reading.widthMm)} × ${fmt(h.reading.heightMm)} mm.`));const remove=el('button','Remove reading');remove.type='button';remove.setAttribute('aria-label','Remove reading '+h.label);remove.onclick=()=>action(()=>update({hypotheses:study.hypotheses.filter(x=>x.id!==h.id)}));box.append(remove);return box;}));
 $('observationRecords').replaceChildren(...study.observations.map(o=>{const box=el('div',undefined,'record');box.append(el('strong',o.label),el('p',`${o.landmarkId}: (${fmt(o.xMm)}, ${fmt(o.yMm)}) mm on ${fmt(o.widthMm)} × ${fmt(o.heightMm)} mm; radius ${fmt(o.uncertaintyMm)} mm; ${o.evidenceClass}${study.landmarkIds.includes(o.landmarkId)?'':' · outside selected scope'}.`));const remove=el('button','Remove observation');remove.type='button';remove.setAttribute('aria-label','Remove observation '+o.label);remove.onclick=()=>action(()=>update({observations:study.observations.filter(x=>x.id!==o.id)}));box.append(remove);return box;}));
 $('summary').dataset.status=a.status;$('summary').textContent=`${a.status.toUpperCase().replaceAll('-',' ')} · ${a.viableReadingIds.length}/${a.hypotheses.length} shared readings survive; ${a.combinationCount} offered joint combinations. ${a.authoredCount} authored / ${a.reportedCount} reported observations in scope. Counts are not confidence.`;
 $('switching').hidden=!a.requiresSourceSwitching;$('switching').textContent='Every mark has a marginal fit, but those fits require incompatible global source readings. No single retained page reading explains all selected marks.';
 $('marginals').replaceChildren(...a.marginals.map(m=>{const box=el('div',undefined,'rule-card');box.dataset.mark=m.landmarkId;box.append(el('h3',m.landmarkId),el('p','Marginal rules: '+(m.marginalRules.map(r=>names[r]).join(', ')||'none')),el('p','Supported under readings: '+(m.supportingReadingIds.join(', ')||'none')),el('p','Rules under a coherent global reading: '+(m.jointRules.map(r=>names[r]).join(', ')||'none')));return box;}));
 const head=el('tr');for(const label of ['Global reading',...a.selectedIds,'Whole source'])head.append(el('th',label));$('matrixHead').replaceChildren(head);
 $('matrixRows').replaceChildren(...a.hypotheses.map(h=>{const tr=el('tr');tr.dataset.reading=h.id;tr.dataset.viable=String(h.viable);const title=el('td',h.label);title.append(el('small',h.basis));tr.append(title);for(const m of h.marks){const td=el('td',m.observationCount?m.survivingRules.map(r=>names[r]).join(', ')||'no rule survives':'untested — five offered rules');td.append(el('small',`${m.observationCount} observation(s)`));tr.append(td);}const last=el('td',h.viable?'viable under current evidence':'excluded by '+h.excludedBy.join(', '));last.append(el('small',h.combinationCount+' finite rule combinations'));tr.append(last);return tr;}));
 $('residuals').replaceChildren(...a.hypotheses.map(h=>{const details=el('details');details.append(el('summary',h.label),el('pre',JSON.stringify(h.marks.map(m=>({mark:m.landmarkId,observationCount:m.observationCount,candidates:m.candidates})),null,2)));return details;}));draw(a);
}
$('readingForm').onsubmit=e=>{e.preventDefault();action(()=>{
 if(!study)throw Error('Open a source first.');const reading={widthMm:number('sourceWidth'),heightMm:number('sourceHeight'),corners:[0,1,2,3].map(i=>({x:number('corner-'+i+'-x'),y:number('corner-'+i+'-y')})),points:study.source.landmarks.map((m,i)=>({landmarkId:m.id,sourcePx:{x:number('point-'+i+'-x'),y:number('point-'+i+'-y')}}))};
 const candidate=createJointCalibrationHypothesis(study.source,{id:nextId('reading'),label:$('readingLabel').value,basis:$('readingBasis').value,reading});update({hypotheses:[...study.hypotheses,candidate]});$('drawingReading').value=candidate.id;draw(analyzeJointCalibration(study.source,study.landmarkIds,study.observations,study.hypotheses));
});};
$('observationForm').onsubmit=e=>{e.preventDefault();action(()=>{
 if(!study)throw Error('Open a source first.');const candidate=createObservation(study.source,{id:nextId('observation'),landmarkId:$('observationMark').value,label:$('observationLabel').value,evidenceClass:$('observationClass').value,widthMm:number('observedWidth'),heightMm:number('observedHeight'),xMm:number('observedX'),yMm:number('observedY'),uncertaintyMm:number('observedRadius')});update({observations:[...study.observations,candidate]});$('observationLabel').value='';$('observedX').value='';$('observedY').value='';
});};
$('resetReading').onclick=()=>action(()=>{revision++;resetReading();});$('drawingReading').onchange=()=>action(()=>draw(analyzeJointCalibration(study.source,study.landmarkIds,study.observations,study.hypotheses)));
$('exportJoint').onclick=()=>action(()=>{if(!study)throw Error('Open a study first.');const saved=exportJointCalibration(study.source,study.landmarkIds,study.observations,study.hypotheses),url=URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)+'\n'],{type:'application/json'}));const a=el('a');a.href=url;a.download='skill-translator-shared-source.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
async function load(input,kind){const file=input.files?.[0];if(!file)return;const own=++revision;try{
 if(file.size>4*1024*1024)throw Error('Use local JSON no larger than 4 MB.');const text=await file.text();if(own!==revision)return;const raw=JSON.parse(text);let next;
 if(kind==='study')next=openStudy(raw);else if(kind==='source')next=exportJointCalibration(raw,defaultIds(raw),[],[]);else{if(!study)throw Error('Open the original source before observations.');next=exportJointCalibration(study.source,study.landmarkIds,importEvidence(study.source,raw),study.hypotheses);}
 if(own!==revision)return;commit(next,true);error('');$('notice').textContent='Validated input accepted; joint conclusions recomputed. Original annotations remain unchanged.';
 }catch(e){if(own===revision)error('Import refused: '+e.message);}finally{if(input.files?.[0]===file)input.value='';}}
$('studyFile').onchange=e=>load(e.target,'study');$('sourceFile').onchange=e=>load(e.target,'source');$('observationsFile').onchange=e=>load(e.target,'observations');document.addEventListener('input',()=>{revision++;});
function example(coherent){
 const source={title:'One original page, two task marks',provenance:'Authored analytic comparison only; no physical measurement',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[['guide',20,30],['index',60,50]].map(([id,x,y])=>({id,label:id==='guide'?'Guide mark':'Index mark',kind:'edge_offset_mm',edge:'left',sourcePx:{x,y},toleranceMm:1}))};
 const rows=[['guide',coherent?30:20,60],['index',90,100]].map(([mark,x,y])=>createObservation(source,{id:'authored-'+mark,landmarkId:mark,label:'Authored '+mark+' observation',evidenceClass:'authored-example',widthMm:200,heightMm:160,xMm:x,yMm:y,uncertaintyMm:.01}));
 const h=createJointCalibrationHypothesis(source,{id:'wide',label:'Shared width 150 mm',basis:'proposed-reading',reading:{...jointSourceReading(source),widthMm:150}});
 commit(exportJointCalibration(source,['guide','index'],rows,[h]),true);$('observationClass').value='authored-example';$('notice').textContent=coherent?'Authored coherent control: one shared wide reading supports both marks.':'Authored source-switch trap: individual fits require incompatible shared page readings.';
}
$('incoherentExample').onclick=()=>action(()=>example(false));$('coherentExample').onclick=()=>action(()=>example(true));
render();
try{const saved=sessionStorage.getItem('skill-translator.joint-calibration-training');if(saved){const next=openStudy(JSON.parse(saved));commit(next,true);sessionStorage.removeItem('skill-translator.joint-calibration-training');$('notice').textContent='Single-mark investigation promoted to explicit full-source readings. Other marks remain untested until evidence is supplied.';}}catch(e){error('Shared-source handoff refused: '+e.message);}
