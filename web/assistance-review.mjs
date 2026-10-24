import {createAssistanceReview,inspectAssistanceReview} from '/src/assistance-review.mjs';
const $=id=>document.getElementById(id);
let accepted=null,loadVersion=0;
const mm=value=>value===null?'Not observed':`${value.toFixed(3)} mm`;
const point=value=>value?`${mm(value.xMm)} across / ${mm(value.yMm)} down`:'Not placed';
function element(tag,text,parent,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;parent?.append(node);return node;}
function resultText(result){return `${result.placed}/${result.total} marks placed · ${!result.complete?'Incomplete':result.passed?'Within all tolerances':'Outside one or more tolerances'} · RMS error: ${mm(result.rmsErrorMm)}`;}
function table(parent,caption,headers,rows){const wrap=element('div',undefined,parent,'table-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',caption);const t=element('table',undefined,wrap);element('caption',caption,t);const tr=element('tr',undefined,element('thead',undefined,t));headers.forEach(h=>{const th=element('th',h,tr);th.scope='col';});const body=element('tbody',undefined,t);rows.forEach(row=>{const r=element('tr',undefined,body);row.forEach(v=>element('td',v,r));});}
const changes={added_after_request:'Added after this request',still_missing:'Still missing',missing_at_commit:'Missing at commitment',unchanged:'Unchanged',moved:'Moved'};
function render(raw){
 const report=inspectAssistanceReview(raw),container=$('trials');container.replaceChildren();
 $('summary').textContent=`${report.trials.filter(t=>t.submitted).length} of ${report.trials.length} trials committed`;
 for(const trial of report.trials){
  const article=element('article',undefined,container,'trial');article.dataset.trial=trial.index;
  element('h3',`Trial ${trial.index+1} · ${trial.widthMm} × ${trial.heightMm} mm`,article);
  element('p',`${trial.requestCount} target request(s) recorded`,article,'meta');
  if(!trial.submitted){element('p',trial.started?'Not committed. Target-based assessment is withheld until the trial is submitted.':'Not started. No result available.',article);continue;}
  element('p',`Committed result: ${resultText(trial.result)}`,article,'tag');
  if(!trial.checkpoints.length){element('p','No targets were requested in this record. There is no pre-request snapshot to compare; this does not establish absence of outside help.',article);continue;}
  const label=element('label','Choose a retained target request ',article);
  const selector=element('select',undefined,label);selector.setAttribute('aria-label',`Target request for trial ${trial.index+1}`);
  trial.checkpoints.forEach((checkpoint,i)=>{const option=element('option',`${i===0?'First request':'Later request '+(i+1)} · action ${checkpoint.actionIndex+1}`,selector);option.value=i;});
  const checkpointHost=element('div',undefined,article);
  const renderCheckpoint=()=>{
   checkpointHost.replaceChildren();const checkpoint=trial.checkpoints[Number(selector.value)];
   const section=element('section',undefined,checkpointHost,'checkpoint');
   element('h4',`${checkpoint.firstRequest?'First target request':'Later target request '+(checkpoint.requestIndex+1)} · action ${checkpoint.actionIndex+1}`,section);
   element('p',checkpoint.firstRequest?'Placements retained immediately before the first recorded target request.':'This snapshot follows earlier target help; it is not an unassisted first attempt.',section,'meta');
   element('p',`At this request: ${resultText(checkpoint.before)}`,section);
   const comparison=checkpoint.comparison;
   element('p',comparison.pairedCount?`Same ${comparison.pairedCount} mark(s), placed at both times: RMS error ${mm(comparison.beforePairedRmsMm)} before → ${mm(comparison.afterPairedRmsMm)} at commitment.`:'No marks were placed at both times. A paired error comparison is unavailable.',section);
   element('p',`${comparison.added.length} mark(s) added after this request. ${comparison.missing.length} mark(s) missing at commitment. Changes are descriptive; they do not establish an effect caused by help.`,section);
   const details=element('details',undefined,section);details.open=checkpoint.firstRequest;element('summary','Inspect each retained mark',details);
   table(details,'Before request and at commitment',['Mark','Before request','At commitment','Error before → committed','Change / movement'],comparison.rows.map(row=>[row.label,point(row.before),point(row.after),`${mm(row.beforeErrorMm)} → ${mm(row.afterErrorMm)}`,`${changes[row.change]}${row.movementMm===null?'':` · ${mm(row.movementMm)}`}`]));
  };
  selector.addEventListener('change',renderCheckpoint);renderCheckpoint();
 }
 $('limitations').replaceChildren();report.limitations.forEach(text=>element('li',text,$('limitations')));
 $('review').hidden=false;$('saveRehearsal').disabled=false;
}
$('openRehearsal').addEventListener('change',async event=>{
 const file=event.target.files[0],version=++loadVersion;if(!file)return;
 try{if(file.size>1024*1024)throw Error('Rehearsal file exceeds 1 MiB.');const next=createAssistanceReview(JSON.parse(await file.text()));if(version!==loadVersion)return;render(next);accepted=next;$('error').textContent='';$('status').textContent='Original rehearsal loaded. Assessments recomputed from retained actions.';}
 catch(error){if(version===loadVersion)$('error').textContent=`Rehearsal refused; previous accepted review retained. ${error.message}`;}
 finally{if(version===loadVersion)event.target.value='';}
});
$('saveRehearsal').addEventListener('click',()=>{if(!accepted)return;const blob=new Blob([JSON.stringify(createAssistanceReview(accepted),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='skill-rehearsal-reviewed.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
