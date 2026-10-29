import {renderCueOriginalExamples} from '/web/cue-original-examples.mjs';
import {importCueStudy} from '/src/cue-sufficiency.mjs';
import {importCueQuestionPlan,inspectCueQuestions} from '/src/cue-questions.mjs';
import {readComparison,makeComparison,release} from '/web/decision-comparison-input.mjs';
import {inspectReadingProvenance as inspectMisreading} from '/src/cue-reading-provenance.mjs';
const $=id=>document.getElementById(id),el=(t,s)=>{const e=document.createElement(t);if(s!==undefined)e.textContent=s;return e;};
const originLabel=kind=>({'source-inspection':'Inspected original frame',hypothetical:'Hypothetical answer',unspecified:'Origin unspecified'}[kind]);
let chronology=[];
let original=null,study=null,sources=[],revision=0,pending=false,controller=null;
function invalidate(){revision++;controller?.abort();pending=false;$('results').textContent='';delete $('results').dataset.report;}
function inputs(){return {maxErrors:Number($('budget').value),basis:$('basis').value,entries:structuredClone(chronology)};}
$('budget').onchange=invalidate;$('basis').oninput=invalidate;
$('open').onchange=async()=>{
 const file=$('open').files[0];if(!file)return;invalidate();const rev=revision;controller=new AbortController();const signal=controller.signal;pending=true;let incoming;
 try{
 if(file.size>48*1024*1024)throw Error('Bundle exceeds 48 MB');let raw=JSON.parse(await file.text());if(rev!==revision)return;
 const own=raw.format==='skill-translator.cue-reading-provenance/v1',saved=own?raw.inputs:null;raw=own?raw.original:raw;
 if(!['skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v2'].includes(raw?.format))throw Error('Only original v1/v2 cue bundles are supported; newer budget metadata must not be discarded');
 const next=importCueStudy(raw.study);if(raw.format.endsWith('/v2'))importCueQuestionPlan(next,raw.questionPlan);else if(raw.questionPlan!==undefined)throw Error('Effort plan requires v2');inspectCueQuestions(next,raw.questionReadings??[]);
 if(own)inspectMisreading(next,saved);
 incoming=await readComparison(new File([JSON.stringify(raw.comparison)],'comparison.json'),{signal});
 if(JSON.stringify(next.comparison)!==JSON.stringify(incoming.study))throw Error('Cue study differs from original comparison');
 if(rev!==revision){release(incoming.sources);return;}
 release(sources);sources=incoming.sources;incoming=null;original=raw;study=next;pending=false;
 $('budget').value=String(saved?.maxErrors??0);$('basis').value=saved?.basis??'';$('readings').replaceChildren();$('examples').replaceChildren();
 chronology=structuredClone(saved?.entries??[]);$('cue').replaceChildren();for(const cue of study.cues){const o=el('option',cue.label+' ('+cue.id+')');o.value=cue.id;$('cue').append(o);}renderChronology();$('anchor').replaceChildren();study.comparison.examples.forEach((ex,i)=>ex.source.moments.forEach(m=>{const o=el('option','Example '+(i+1)+' · '+m.origin.mediaTimeSeconds+'s · '+m.label);o.value=JSON.stringify({exampleIndex:i,momentId:m.id,frameSha256:m.image.sha256});$('anchor').append(o);}));
 renderCueOriginalExamples($('examples'),study,sources);
 $('editor').hidden=false;$('error').textContent='';$('status').textContent='Original PNGs checked. Enter an explicit assumption basis.';
 }catch(e){if(rev===revision){pending=false;$('error').textContent=e.message;}}finally{if(incoming)release(incoming.sources);}
};
function renderChronology(){const h=$('readings');h.replaceChildren(el('h2','Recorded reading order'));chronology.forEach((r,i)=>h.append(el('p',`${i+1}. ${r.cue} = ${r.value} · ${originLabel(r.provenance.kind)}: ${r.provenance.basis}`)));}
$('append').onclick=()=>{try{if(pending||!study)throw Error('Load an accepted source first');const kind=$('origin-kind').value,provenance={kind,basis:$('origin-basis').value,...(kind==='source-inspection'?JSON.parse($('anchor').value):{})};const r={cue:$('cue').value,value:$('value').value,provenance};const next={...inputs(),entries:[...chronology,r]};inspectMisreading(study,next);chronology=next.entries;invalidate();renderChronology();$('value').value='';$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
function outcome(result){const labels=result.labels.filter(x=>x!==null).join(", " );return result.status==="outside-evidence"?"No retained example fits the declared bound":result.status==="unknown-decision"?"A retained example has an unknown decision"+(labels?"; represented labels: "+labels:""):result.status==="one-retained-label"?"One represented decision remains: "+labels:"Multiple represented decisions remain: "+labels;}
function show(result){const h=$('results');h.replaceChildren();h.dataset.report=JSON.stringify(result);h.append(el('h2','Retained decisions after ordered readings'),el('p',result.boundary),el('p',outcome(result)+'; examples '+result.indexes.map(i=>i+1).join(', ')));for(const row of result.rows)h.append(el('p',`Example ${row.index+1}: ${row.compatible?'compatible':'outside bound'}; disagreements at reading positions ${row.disagreements.map(i=>i+1).join(', ')||'none'}; unknown source positions ${row.unknown.map(i=>i+1).join(', ')||'none'}`));for(const q of result.next){h.append(el('h3','If another reading of '+study.cues.find(c=>c.id===q.cue).label+' ('+q.cue+') were supplied'));for(const b of q.branches)h.append(el('p',(b.kind==='other-category'?'Any other category':b.value)+': '+outcome(b)+'; retained examples '+b.indexes.map(i=>i+1).join(', ')));}const d=el('details');d.append(el('summary','Every prefix and exact mismatch account'),el('pre',JSON.stringify(result,null,2)));h.append(d);h.append(el('h2','Where each reading came from'),el('p',result.provenanceBoundary));for(const p of result.provenance)h.append(el('p','Reading '+(p.index+1)+': '+originLabel(p.kind)+' · '+p.basis+(p.kind==='source-inspection'?' · Example '+(p.exampleIndex+1)+', '+p.role+', '+p.presentedSeconds+(p.presentedSeconds===1?' second':' seconds'):'')+' · '+p.meaning));}
$('inspect').onclick=()=>{try{if(pending)throw Error('Source import pending');show(inspectMisreading(study,inputs()));$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('save').onclick=async()=>{try{if(pending)throw Error('Source import pending');const value=inputs();inspectMisreading(study,value);const rev=revision;await makeComparison(study.comparison,sources);if(rev!==revision)throw Error('Inputs changed during export');const blob=new Blob([JSON.stringify({format:'skill-translator.cue-reading-provenance/v1',original,inputs:value})],{type:'application/json'});if(blob.size>48*1024*1024)throw Error('Bundle exceeds48MB');const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='cue-reading-provenance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('error').textContent=e.message;}};
