import {executeFixedReadings} from '/src/cue-fixed-execution.mjs';
import {importCueStudy} from '/src/cue-sufficiency.mjs';
import {importCueQuestionPlan,inspectCueQuestions} from '/src/cue-questions.mjs';
import {inspectReadingWithdrawals} from '/src/cue-reading-withdrawals.mjs';
import {readComparison,makeComparison,release} from '/web/decision-comparison-input.mjs';
import {renderCueOriginalExamples} from '/web/cue-original-examples.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const format='skill-translator.cue-fixed-execution/v1';let original=null,study=null,sources=[],baseline=null,run=null,epoch=0,pending=false,controller=null;
function retire(){epoch++;controller?.abort();pending=false;run=null;$('results').replaceChildren();$('answer-form').hidden=true;$('save').disabled=true;}
for(const id of ['budget','basis','horizon','planning-basis'])$(id).addEventListener('input',()=>{retire();$('status').textContent='Planning inputs changed. Start a separate new fixed sequence; no prior horizon was refilled.';});
function inspect(value=run){return executeFixedReadings(study,value.inputs,value.planning,value.answers);}
function render(){
 if(!run)return;const x=inspect(),h=$('results');h.replaceChildren();
 h.dataset.account=JSON.stringify({status:x.status,used:x.used,remaining:x.remaining,indexes:x.account.indexes});
 h.append(el('h2','Frozen fixed reading sequence'),el('p',x.boundary),el('p',x.used+' scheduled readings recorded; '+(x.remaining??'no executable sequence')+' remain. '+x.remainingCapacity+' retained-history slots remain.'));
 for(const [i,q] of (x.schedule??[]).entries())h.append(el('p',(i+1)+'. '+q.label+' ('+q.cue+')'+(i<x.used?' — supplied':i===x.used?' — next':' — later')));
 const messages={'outside-evidence':'No retained example fits the supplied answers.','unknown-decision':'A compatible example has an unknown decision.','no-fixed-schedule-within-bound':'No fixed schedule fits the declared bound.','insufficient-history-capacity':'The fixed schedule does not fit the remaining history slots.'};
 h.append(el('h3',x.status==='schedule-complete'?'Fixed sequence complete; represented decisions: '+x.account.labels.join(', '):x.status==='reading-ready'?'Next cue: '+x.next.label:messages[x.status]));
 for(const r of x.account.rows)h.append(el('p','Example '+(r.index+1)+': '+(r.compatible?'compatible':'outside bound')+'; disagreement positions '+(r.disagreements.map(i=>i+1).join(', ')||'none')+'; unknown positions '+(r.unknown.map(i=>i+1).join(', ')||'none')));
 run.answers.forEach((a,i)=>h.append(el('p','Reading '+(i+1)+': '+a.value+'; '+({'hypothetical':'Hypothetical answer','source-inspection':'Inspected original frame',unspecified:'Origin unspecified'}[a.provenance.kind])+'; '+a.provenance.basis)));
 const d=el('details');d.append(el('summary','Original baseline event history'),el('pre',JSON.stringify(run.inputs.events,null,2)));h.append(d);
 $('answer-form').hidden=x.status!=='reading-ready';$('save').disabled=pending;
}
$('open').onchange=async()=>{
 const file=$('open').files[0];if(!file)return;const ticket=++epoch;controller?.abort();controller=new AbortController();pending=true;$('save').disabled=true;let incoming;
 try{
  if(file.size>48*1024*1024)throw Error('Bundle exceeds 48 MB');let raw=JSON.parse(await file.text());if(ticket!==epoch)return;
  const own=raw.format===format,planned=raw.format==='skill-translator.cue-repeat-schedule/v1',bridge=raw.format==='skill-translator.cue-reading-withdrawals/v1',saved=(own||planned)?{inputs:raw.inputs,planning:raw.planning,answers:own?raw.answers:[]}:null;const nextBaseline=(own||planned||bridge)?raw.inputs:null;raw=(own||planned||bridge)?raw.original:raw;
  if(!['skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v2'].includes(raw?.format))throw Error('Only original v1/v2 cue bundles are supported; later budget metadata must stay in its own workflow');
  const next=importCueStudy(raw.study);if(raw.format.endsWith('/v2'))importCueQuestionPlan(next,raw.questionPlan);else if(raw.questionPlan!==undefined)throw Error('Effort plan requires v2');inspectCueQuestions(next,raw.questionReadings??[]);
  if(own||planned||bridge)inspectReadingWithdrawals(next,nextBaseline);if(own||planned)executeFixedReadings(next,saved.inputs,saved.planning,saved.answers);
  incoming=await readComparison(new File([JSON.stringify(raw.comparison)],'comparison.json'),{signal:controller.signal});if(JSON.stringify(next.comparison)!==JSON.stringify(incoming.study))throw Error('Cue study differs from original comparison');
  if(ticket!==epoch){release(incoming.sources);incoming=null;return;}
  release(sources);sources=incoming.sources;incoming=null;study=next;original=raw;baseline=structuredClone(nextBaseline??{maxErrors:0,basis:'',events:[]});run=saved?structuredClone(saved):null;pending=false;
  $('budget').value=String(baseline.maxErrors);$('basis').value=baseline.basis;$('horizon').value=saved?String(saved.planning.maxAdditional):'';$('planning-basis').value=saved?.planning.basis??'';
  $('anchor').replaceChildren();study.comparison.examples.forEach((ex,i)=>ex.source.moments.forEach(m=>{const o=el('option','Example '+(i+1)+' · '+m.label+' · '+m.origin.mediaTimeSeconds+'s');o.value=JSON.stringify({exampleIndex:i,momentId:m.id,frameSha256:m.image.sha256});$('anchor').append(o);}));
  $('results').replaceChildren();$('answer-form').hidden=true;renderCueOriginalExamples($('examples'),study,sources);[...$('examples').children].forEach((article,i)=>{const context=study.comparison.examples[i].source.context;if(context)article.insertBefore(el('p','Original source attribution and context: '+context),article.querySelector('figure'));});$('editor').hidden=false;if(run)render();$('error').textContent='';$('status').textContent='Original PNGs checked. Fixed sequence inputs and saved answers are independently replayed.';
 }catch(e){if(ticket===epoch){$('error').textContent=e.message;}}finally{if(incoming)release(incoming.sources);if(ticket===epoch){pending=false;$('save').disabled=!run;}}
};
$('start').onclick=()=>{try{if(pending||!study)throw Error('Accept an original source first');const candidate={inputs:{...structuredClone(baseline),maxErrors:Number($('budget').value),basis:$('basis').value},planning:{maxAdditional:$('horizon').value===''?NaN:Number($('horizon').value),basis:$('planning-basis').value},answers:[]};inspect(candidate);epoch++;run=candidate;render();$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('record').onclick=()=>{try{if(pending||!run)throw Error('Start a fixed sequence first');const state=inspect();if(state.status!=='reading-ready')throw Error('No remaining fixed sequence question');const kind=$('origin').value,provenance={kind,basis:$('reading-basis').value,...(kind==='source-inspection'?JSON.parse($('anchor').value):{})};const candidate={...run,answers:[...run.answers,{cue:state.next.cue,value:$('answer').value,provenance}]};inspect(candidate);epoch++;run=candidate;render();$('answer').value='';$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('save').onclick=async()=>{const ticket=epoch;try{if(pending||!run)throw Error('No accepted fixed sequence account');const saved=structuredClone(run);inspect(saved);await makeComparison(study.comparison,sources);if(ticket!==epoch)throw Error('Inputs changed during export');const blob=new Blob([JSON.stringify({format,original,...saved})],{type:'application/json'});if(blob.size>48*1024*1024)throw Error('Bundle exceeds 48 MB');const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='cue-fixed-execution.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){if(ticket===epoch)$('error').textContent=e.message;}};
addEventListener('pagehide',()=>{epoch++;controller?.abort();release(sources);});
