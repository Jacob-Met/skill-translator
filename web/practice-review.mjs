import {createReview,importReview,reviewPractice,focusedPractice} from '/src/practice-review.mjs';
import {demonstration} from '/src/demo.mjs';
import {derive,adapt} from '/src/geometry.mjs';
import {createPractice,placePractice,retryPractice} from '/src/practice.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const fmt=n=>n===null?'—':n.toFixed(2);
let state=null,epoch=0;
function error(message){$('error').hidden=!message;$('error').textContent=message;}
function install(next,message){state=importReview(next);epoch++;error('');render();$('status').textContent=message;}
async function read(file,limit){if(!file||file.size>limit)throw Error('Choose a JSON file within the displayed source/session limits (256 KiB / 2 MiB).');return JSON.parse(await file.text());}
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function drawTrend(host,observations,tolerance){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 600 140');svg.setAttribute('role','img');svg.setAttribute('aria-label','Per-round error distances; missing rounds have no point. Exact values are in the table.');
  const maximum=Math.max(tolerance*1.3,...observations.map(o=>o.evaluation?.errorMm||0),1);
  const y=value=>110-value/maximum*85,x=i=>35+(observations.length===1?0:i/(observations.length-1)*530);
  const add=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;svg.append(n);};
  add('line',{x1:25,x2:580,y1:y(tolerance),y2:y(tolerance),stroke:'#dfb66c','stroke-dasharray':'5 4'});add('text',{x:30,y:15},`Tolerance ${fmt(tolerance)} mm · error scale 0–${fmt(maximum)} mm`);
  observations.forEach((o,i)=>{add('text',{x:x(i)-4,y:130},String(o.round));if(o.placed)add('circle',{cx:x(i),cy:y(o.evaluation.errorMm),r:5,fill:o.evaluation.within?'#62c9ae':'#f0a38e'});else add('text',{x:x(i)-4,y:106},'×');});host.append(svg);
}
function render(){
  const report=reviewPractice(state),{widthMm,heightMm}=state.session.reference.target;
  $('review').hidden=false;$('taskTitle').textContent=state.demo.title||'Retained task';$('setup').textContent=`${widthMm} × ${heightMm} mm · ${report.marks.length} marks · ${report.rounds.length} retained rounds. ${state.demo.provenance||''}`;
  for(const [id,value]of [['baseline',state.baselineRound],['comparison',state.comparisonRound]]){$(id).replaceChildren();for(const r of report.rounds){const option=el('option',`Round ${r.round}${r.active?' (current)':''}`);option.value=r.round;$(id).append(option);}$(id).value=value;}
  const c=report.comparison;
  $('comparisonSummary').textContent=c.sameRound?'One selected round: no between-round change is claimed.':c.commonMarks.length?`Round ${c.baselineRound} → ${c.comparisonRound}: ${c.commonMarks.length} common marks; RMS ${fmt(c.beforeRmsMm)} → ${fmt(c.afterRmsMm)} mm (${c.changeRmsMm>=0?'+':''}${fmt(c.changeRmsMm)} mm). ${c.missingFromEither.length} marks absent from at least one selected round.`:'No marks were placed in both selected rounds. There is no paired error comparison.';
  $('rounds').replaceChildren();for(const r of report.rounds){const card=el('article');card.className='round-card';card.append(el('strong',`Round ${r.round}${r.active?' · current':''}`),el('p',`${r.placed}/${r.total} placed · ${r.complete?(r.passed?'within all tolerances':'outside a tolerance'):'incomplete'}`),el('p',`Observed RMS ${fmt(r.rmsErrorMm)} mm`));$('rounds').append(card);}
  $('marks').replaceChildren();for(const mark of report.marks){
    const card=el('article');card.className='mark-card';card.dataset.id=mark.id;
    const label=el('label'),check=el('input');check.type='checkbox';check.value=mark.id;check.checked=state.selectedIds.includes(mark.id);check.addEventListener('change',()=>{epoch++;state=importReview({...state,selectedIds:check.checked?[...state.selectedIds,mark.id]:state.selectedIds.filter(id=>id!==mark.id)});focus();});label.append(check,el('span',`${mark.label} · tolerance ${fmt(mark.toleranceMm)} mm`));card.append(label);
    card.append(el('p',`${mark.observedRounds} observed rounds; ${mark.outsideRounds} outside tolerance. Selected-round change: ${mark.changeMm===null?'unavailable (missing placement)':fmt(mark.changeMm)+' mm'} (later minus earlier).`));drawTrend(card,mark.observations,mark.toleranceMm);
    const wrap=el('div');wrap.className='table-wrap';const table=el('table'),head=el('tr');for(const title of ['Round','x / y · mm','dx / dy · mm','Error · mm','Result'])head.append(el('th',title));const thead=el('thead');thead.append(head);table.append(thead);const body=el('tbody');
    for(const o of mark.observations){const row=el('tr');for(const text of [String(o.round),o.placed?`${fmt(o.attempt.xMm)} / ${fmt(o.attempt.yMm)}`:'Missing',o.placed?`${fmt(o.evaluation.dxMm)} / ${fmt(o.evaluation.dyMm)}`:'—',fmt(o.evaluation?.errorMm??null),o.placed?(o.evaluation.within?'Within':'Outside'):'Unobserved'])row.append(el('td',text));body.append(row);}table.append(body);wrap.append(table);card.append(wrap);$('marks').append(card);
  }focus();
}
function focus(){const count=state.selectedIds.length;$('focusSummary').textContent=count?`${count} of ${state.demo.landmarks.length} marks explicitly selected. Rules and tolerances remain unchanged.`:'Choose one or more marks above.';$('startDrill').disabled=$('exportSource').disabled=!count;}
for(const id of ['sourceFile','sessionFile','reviewFile'])$(id).addEventListener('change',()=>epoch++);
$('openPair').addEventListener('submit',async event=>{event.preventDefault();const token=++epoch;try{const [demo,session]=await Promise.all([read($('sourceFile').files[0],256*1024),read($('sessionFile').files[0],2*1024*1024)]);const next=createReview(demo,session);if(token!==epoch)return;install(next,'Source and raw practice rounds opened. All results were recomputed.');}catch(e){if(token===epoch)error('Import refused; accepted review retained. '+e.message);}});
$('reviewFile').addEventListener('change',async event=>{const token=++epoch;try{const next=importReview(await read(event.target.files[0],2*1024*1024));if(token!==epoch)return;install(next,'Review reopened from source and raw placements; saved verdicts are ignored.');}catch(e){if(token===epoch)error('Review refused; accepted review retained. '+e.message);}});
for(const id of ['baseline','comparison'])$(id).addEventListener('change',()=>{epoch++;try{const next=importReview({...state,baselineRound:Number($('baseline').value),comparisonRound:Number($('comparison').value)});state=next;error('');render();}catch(e){error(e.message);render();}});
$('example').addEventListener('click',()=>{const demo=structuredClone(demonstration),width=320,height=190,target=adapt(derive(demo),width,height);let session=createPractice(demo,width,height);for(const mark of target.landmarks)session=placePractice(demo,width,height,session,mark.id,{xMm:mark.xMm+4,yMm:mark.yMm+3});session=retryPractice(demo,width,height,session);for(const mark of target.landmarks.slice(0,2))session=placePractice(demo,width,height,session,mark.id,{xMm:mark.xMm+1,yMm:mark.yMm});install(createReview(demo,session),'Authored analytic example, not a measured learner study. The second round deliberately omits one mark.');});
$('saveReview').addEventListener('click',()=>download('practice-review.json',importReview(state)));
$('exportSource').addEventListener('click',()=>download('focused-source.json',focusedPractice(state).demo));
$('startDrill').addEventListener('click',()=>{try{const input=focusedPractice(state);sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify(input));location.assign('/practice');}catch(e){error('Could not open focused practice. '+e.message);}});
