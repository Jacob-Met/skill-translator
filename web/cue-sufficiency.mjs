import {inspectCueQuestions,importCueQuestionPlan} from '/src/cue-questions.mjs';
import {createCueQuestionsView} from '/web/cue-questions-view.mjs';
import {inspectCueSupport} from '/src/cue-support.mjs';
import {CUE_FORMAT,importCueStudy,inspectCueStudy} from '/src/cue-sufficiency.mjs';
import {readComparison,makeComparison,release} from '/web/decision-comparison-input.mjs';
const $=id=>document.getElementById(id), el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let study=null,sources=[],revision=0,controller=null,loading=false;
function invalidate(){questionView.reset();loading=false;revision++;controller?.abort();$('results').replaceChildren();$('support-results').replaceChildren();$('status').textContent='Inputs changed; inspect again.';}
function field(label,value,change){const l=el('label',label),input=el('input');input.type='text';input.maxLength=1000;input.value=value??'';input.oninput=()=>{change(input.value);invalidate();};l.append(input);return l;}
function render(){
 $('editor').hidden=!study;if(!study)return;
 $('cues').replaceChildren();study.cues.forEach((cue,i)=>{const row=el('section');row.append(field(`Cue ${i+1} name`,cue.label,v=>cue.label=v),field('How was this cue supplied?',cue.basis,v=>cue.basis=v));const remove=el('button','Remove cue');remove.disabled=study.cues.length===1;remove.onclick=()=>{invalidate();study.cues.splice(i,1);study.rows.forEach(r=>r.values.splice(i,1));render();};row.append(remove);$('cues').append(row);});
 $('add').disabled=study.cues.length>=8;$('examples').replaceChildren();
 study.comparison.examples.forEach(({source,stepId},i)=>{const section=el('article'),step=source.steps.find(s=>s.id===stepId);section.append(el('h3',`Example ${i+1}: ${source.title} — ${step.title}`));
 for(const [label,id] of [['Before',step.beforeMomentId],['After',step.afterMomentId]]){const moment=source.moments.find(m=>m.id===id),fig=el('figure'),img=el('img');img.src=sources[i].assets.get(id).media.url;img.alt=label+': '+moment.label;fig.append(img,el('figcaption',`${label}: ${moment.visibleState||'No state account'} · ${moment.origin.mediaTimeSeconds} seconds`));section.append(fig);}
 for(const key of ['intent','visibleChange','sensoryCue','recoveryCue'])section.append(el('p',`${key}: ${step[key]||'Not supplied'}`));
 section.append(field('Declared decision (blank = unknown)',study.rows[i].decision,v=>study.rows[i].decision=v.trim()?v:null),field('Basis for this decision label',study.rows[i].basis,v=>study.rows[i].basis=v));
 study.cues.forEach((cue,j)=>section.append(field(`Cue ${j+1} category (blank = unknown)`,study.rows[i].values[j],v=>study.rows[i].values[j]=v.trim()?v:null)));$('examples').append(section);
 });
}
$('add').onclick=()=>{if(study.cues.length>=8)return;invalidate();let n=0;while(study.cues.some(c=>c.id==='cue'+n))n++;study.cues.push({id:'cue'+n,label:'',basis:''});study.rows.forEach(r=>r.values.push(null));render();};
$('open').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;revision++;controller?.abort();questionView.suspend();$('results').replaceChildren();$('support-results').replaceChildren();loading=true;controller=new AbortController();const rev=revision,signal=controller.signal;let incoming;
 try{if(file.size>48*1024*1024)throw Error('Keep the complete study within 48 MB');const raw=JSON.parse(await file.text());let next;
 if(['skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v2'].includes(raw.format)){
 if(raw.format==='skill-translator.cue-bundle/v1'&&raw.questionPlan!==undefined)throw Error('Cue effort assumptions require the v2 bundle');next=importCueStudy(raw.study);incoming=await readComparison(new File([JSON.stringify(raw.comparison)],'comparison.json'),{signal});
 if(JSON.stringify(next.comparison)!==JSON.stringify(incoming.study))throw Error('Cue account differs from retained comparison');
 }else{incoming=await readComparison(file,{signal});next={format:CUE_FORMAT,comparison:incoming.study,cues:[{id:'cue0',label:'',basis:''}],rows:incoming.study.examples.map(()=>({decision:null,basis:'',values:[null]}))};}
 const isCueBundle=['skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v2'].includes(raw.format);const questionReadings=isCueBundle?(raw.questionReadings??[]):[];const questionPlan=raw.format==='skill-translator.cue-bundle/v2'?importCueQuestionPlan(next,raw.questionPlan):null;if(isCueBundle)inspectCueQuestions(next,questionReadings);if(rev!==revision||signal.aborted){release(incoming.sources);return;}release(sources);sources=incoming.sources;incoming=null;study=next;loading=false;$('results').replaceChildren();$('support-results').replaceChildren();render();questionView.restore(questionReadings,questionPlan);$('error').textContent='';$('status').textContent='Original frame bytes checked. Declare cues and decisions before inspection.';
 }catch(e){if(rev===revision)loading=false;if(incoming)release(incoming.sources);if(rev===revision)$('error').textContent='Import refused; accepted work retained. '+e.message;}
};
$('inspect').onclick=()=>{if(loading){$('status').textContent='Source import is pending; wait or edit to cancel it.';return;}try{const f=inspectCueStudy(study),out=$('results');out.replaceChildren(el('h2','Finite example comparison'),el('p',f.boundary));out.append(el('p',`State: ${f.status}. ${f.minimalCueSets.length} inclusion-minimal combinations.`));for(const set of f.minimalCueSets)out.append(el('p',set.map(id=>study.cues.find(c=>c.id===id).label).join(' + ')));for(const group of f.necessityWitnesses)for(const witness of group.witnesses)out.append(el('p',`Within combination ${group.cueIds.join(' + ')}, removing ${witness.cueId} leaves examples ${witness.a+1} and ${witness.b+1} without a known distinction.`));for(const p of f.pairs)out.append(el('p',`Examples ${p.a+1} and ${p.b+1}: ${p.status}; known distinguishing cues: ${p.distinguishingCueIds.join(', ')||'none'}; unknown cues: ${p.unknownCueIds.join(', ')||'none'}.`));for(const p of f.unknownDecisions)out.append(el('p',`Examples ${p.a+1} and ${p.b+1}: decision label unavailable.`));$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('save').onclick=async()=>{try{if(loading)throw Error('Source import is pending');const accepted=importCueStudy(study),questionPlan=questionView.plan(),questionReadings=questionView.readings(),rev=revision,comparison=JSON.parse(await(await makeComparison(accepted.comparison,sources)).text());if(rev!==revision)throw Error('Inputs changed during export; retry');const blob=new Blob([JSON.stringify({format:questionPlan?'skill-translator.cue-bundle/v2':'skill-translator.cue-bundle/v1',study:accepted,comparison,questionReadings,...(questionPlan?{questionPlan}:{})})],{type:'application/json'});if(blob.size>48*1024*1024)throw Error('Complete study exceeds 48 MB');const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='cue-study.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('error').textContent=e.message;}};
window.addEventListener('beforeunload',()=>{controller?.abort();release(sources);});

$('support').onclick=()=>{if(loading){$('status').textContent='Source import is pending; wait or edit to cancel it.';return;}try{
 const report=inspectCueSupport(study),out=$('support-results');
 out.replaceChildren(el('h2','Other-example categorical support'),el('p',report.boundary));
 for(const omission of report.omissions){
  const section=el('section');section.append(el('h3',`Withheld example ${omission.index+1}`),el('p',`Remaining table: ${omission.status}; held declared decision: ${omission.heldDecision??'unknown'}.`));
  if(!omission.combinations.length)section.append(el('p','No remaining separating combination is available; no matching conclusion is supplied.'));
  for(const c of omission.combinations){
   const labels=c.cueIds.map(id=>study.cues.find(cue=>cue.id===id).label).join(' + ');
   section.append(el('h4',labels),el('p',`Declared-label comparison: ${c.comparison}.`));
   for(const [name,rows] of [['Exact categorical witnesses',c.exact],['Unknown-compatible, not exact support',c.unknownCompatible],['Known categorical differences',c.excluded]]){
    section.append(el('p',name+': '+(rows.map(row=>`example ${row.index+1} (decision: ${row.decision??'unknown'}; different cues: ${row.differingCueIds.join(', ')||'none'}; unknown cues: ${row.unknownCueIds.join(', ')||'none'})`).join('; ')||'none')));
   }
  }
  out.append(section);
 }
 $('error').textContent='';
 }catch(e){$('error').textContent=e.message;}};

const questionView=createCueQuestionsView({anchor:$('editor'),getStudy:()=>study,isLoading:()=>loading,onError:message=>$('error').textContent=message,onChange:()=>{revision++;controller?.abort();loading=false;}});

