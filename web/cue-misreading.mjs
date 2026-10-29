import {renderCueOriginalExamples} from '/web/cue-original-examples.mjs';
import {importCueStudy} from '/src/cue-sufficiency.mjs';
import {importCueQuestionPlan,inspectCueQuestions} from '/src/cue-questions.mjs';
import {readComparison,makeComparison,release} from '/web/decision-comparison-input.mjs';
import {inspectMisreading} from '/src/cue-misreading.mjs';
const $=id=>document.getElementById(id),el=(t,s)=>{const e=document.createElement(t);if(s!==undefined)e.textContent=s;return e;};
let original=null,study=null,sources=[],revision=0,pending=false,controller=null;
function invalidate(){revision++;controller?.abort();pending=false;$('results').textContent='';delete $('results').dataset.report;}
function inputs(){return {maxErrors:Number($('budget').value),basis:$('basis').value,readings:[...$('readings').querySelectorAll('input')].filter(e=>e.value.trim()).map(e=>({cue:e.dataset.cue,value:e.value.trim()}))};}
$('budget').onchange=invalidate;$('basis').oninput=invalidate;
$('open').onchange=async()=>{
 const file=$('open').files[0];if(!file)return;invalidate();const rev=revision;controller=new AbortController();const signal=controller.signal;pending=true;let incoming;
 try{
 if(file.size>48*1024*1024)throw Error('Bundle exceeds 48 MB');let raw=JSON.parse(await file.text());if(rev!==revision)return;
 const own=raw.format==='skill-translator.cue-misreading-bundle/v1',saved=own?raw.inputs:null;raw=own?raw.original:raw;
 if(!['skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v2'].includes(raw?.format))throw Error('Only original v1/v2 cue bundles are supported; newer budget metadata must not be discarded');
 const next=importCueStudy(raw.study);if(raw.format.endsWith('/v2'))importCueQuestionPlan(next,raw.questionPlan);else if(raw.questionPlan!==undefined)throw Error('Effort plan requires v2');inspectCueQuestions(next,raw.questionReadings??[]);
 if(own)inspectMisreading(next,saved);
 incoming=await readComparison(new File([JSON.stringify(raw.comparison)],'comparison.json'),{signal});
 if(JSON.stringify(next.comparison)!==JSON.stringify(incoming.study))throw Error('Cue study differs from original comparison');
 if(rev!==revision){release(incoming.sources);return;}
 release(sources);sources=incoming.sources;incoming=null;original=raw;study=next;pending=false;
 $('budget').value=String(saved?.maxErrors??0);$('basis').value=saved?.basis??'';$('readings').replaceChildren();$('examples').replaceChildren();
 for(const cue of study.cues){const label=el('label',cue.label+' ('+cue.basis+') '),input=el('input');input.dataset.cue=cue.id;input.value=saved?.readings.find(r=>r.cue===cue.id)?.value??'';input.oninput=invalidate;label.append(input);$('readings').append(label);}
 renderCueOriginalExamples($('examples'),study,sources);
 $('editor').hidden=false;$('error').textContent='';$('status').textContent='Original PNGs checked. Enter an explicit assumption basis.';
 }catch(e){if(rev===revision){pending=false;$('error').textContent=e.message;}}finally{if(incoming)release(incoming.sources);}
};
function show(result){
 const host=$('results');host.replaceChildren();host.dataset.report=JSON.stringify(result);
 host.append(el('h2','Retained decisions under this assumption'),el('p',result.indexes.length+' compatible examples: '+result.indexes.map(i=>i+1).join(', ')),el('p','Declared labels: '+result.labels.map(v=>v??'unknown').join(', ')),el('p',result.worstQuestions===null?'No guaranteed question plan: '+result.status:'Minimum worst-case remaining questions: '+result.worstQuestions));
 for(const q of result.questions){const section=el('section');section.append(el('h3','Cue '+q.cue),el('p',q.worstQuestions===null?'No guaranteed plan from this cue':'Worst-case questions including this cue: '+q.worstQuestions));const list=el('ul');for(const b of q.branches)list.append(el('li',(b.kind==='other-category'?'Other category':b.answer)+': '+b.indexes.length+' compatible examples ('+b.indexes.map(i=>i+1).join(', ')+'); '+b.status));section.append(list);host.append(section);}
 if(result.ambiguityCertificates.length){host.append(el('h3','Shared-answer ambiguity witnesses'),el('p','Both different decisions remain possible if the remaining cues have these hypothetical answers. Recorded readings stay fixed. Unknown source cells do not count as disagreements.'));for(const witness of result.ambiguityCertificates){host.append(el('p','Examples '+witness.rows.map(i=>i+1).join(' and ')+': '+witness.answers.map((answer,j)=>study.cues[j].label+' = '+answer+(inputs().readings.some(r=>r.cue===study.cues[j].id)?' (retained reading)':' (constructed answer)')).join('; ')));witness.rows.forEach((row,i)=>host.append(el('p','Example '+(row+1)+' disagrees at '+(witness.mismatches[i].map(j=>study.cues[j].label).join(', ')||'no known cues'))));}}
 const details=el('details');details.append(el('summary','Complete disagreement and question report'),el('pre',JSON.stringify(result,null,2)));host.append(details);
}
$('inspect').onclick=()=>{try{if(pending)throw Error('Source import pending');show(inspectMisreading(study,inputs()));$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('save').onclick=async()=>{try{if(pending)throw Error('Source import pending');const value=inputs();inspectMisreading(study,value);const rev=revision;await makeComparison(study.comparison,sources);if(rev!==revision)throw Error('Inputs changed during export');const blob=new Blob([JSON.stringify({format:'skill-translator.cue-misreading-bundle/v1',original,inputs:value})],{type:'application/json'});if(blob.size>48*1024*1024)throw Error('Bundle exceeds48MB');const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='cue-misreading.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('error').textContent=e.message;}};
