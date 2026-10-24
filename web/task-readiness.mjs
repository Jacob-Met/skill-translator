import {readinessPracticeTask,inspectReadinessPractice} from '/src/readiness-practice.mjs';
import {renderPracticeEvidence} from '/web/readiness-practice.mjs';
import {renderReadinessExplanation} from '/web/readiness-explanation.mjs';
import {createReadiness,importReadiness,readinessFindings,recordReadiness} from '/src/task-readiness.mjs';
import {importPrerequisiteRehearsal} from '/src/prerequisite-rehearsal.mjs';
import {openReadinessBundle,saveReadinessBundle} from '/web/task-readiness-source.mjs';
const $=id=>document.getElementById(id);
let evidence=null,study=null,declaration=null,revision=0,practiceDraft=null;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const message=t=>{$('message').textContent=t;};
const guard=fn=>()=>{try{fn();}catch(error){message(error.message);}};
function clearReveal(){$('finding').replaceChildren();$('frames').replaceChildren();}
function resetObservation(){practiceDraft=null;$('practice-file').value='';$('practice-preview').replaceChildren();$('retain-practice').disabled=true;$('note').value='';$('value').value='unknown';$('evidence-class').value='reported-observation';}
function resetDrafts(){resetObservation();$('reason').value='';$('prediction').value='uncertain';}
function author(){
  $('definitions').replaceChildren();
  for(const step of evidence.sequence.steps){
    const field=el('fieldset');field.dataset.stepId=step.id;field.append(el('legend',step.title),el('p','Authored intent: '+step.intent));
    const details=el('details');details.append(el('summary','Inspect retained before/after evidence'));
    for(const id of [step.beforeMomentId,step.afterMomentId]){const m=evidence.sequence.moments.find(x=>x.id===id),fig=el('figure'),img=el('img');img.src=evidence.urlFor(id);img.alt=m.label;fig.append(img,el('figcaption',`${m.label} · ${m.origin.mediaTimeSeconds}s · ${m.visibleState}`));details.append(fig);}field.append(details);
    for(const edge of declaration.dependencies.filter(e=>e.after===step.id))field.append(el('p',`Declared prerequisite: ${evidence.sequence.steps.find(s=>s.id===edge.before).title} — ${edge.reason}`));
    for(const [key,title] of [['prompt','Observable completion check'],['basis','Expert explanation of this check']]){const label=el('label',title),input=el('textarea');input.className=key;input.maxLength=1600;label.append(input);field.append(label);}
    const after=evidence.sequence.moments.find(m=>m.id===step.afterMomentId);
    if(after.calibratedTask){
      const label=el('label','Use all placement tolerances from this calibrated after-state as the check '),binding=el('input');binding.type='checkbox';binding.className='placement-binding';label.prepend(binding);field.append(label);
      for(const [key,title,value] of [['widthMm','Practice width (mm)',after.calibratedTask.source.widthMm],['heightMm','Practice height (mm)',after.calibratedTask.source.heightMm]]){const label=el('label',title),input=el('input');input.type='number';input.step='any';input.className=key;input.value=value;label.append(input);field.append(label);}
      field.append(el('p','This explicit binding replaces a manual result with a computed geometric criterion only. Other physical completion conditions require separate reported checks.'));
    }
    $('definitions').append(field);
  }
  $('authoring').hidden=false;$('lesson').hidden=true;
}
function render(){
  if(!study)return;const findings=readinessFindings(evidence.sequence,study);
  $('authoring').hidden=true;$('lesson').hidden=false;
  const previous=$('step').value;$('step').replaceChildren();
  for(const s of evidence.sequence.steps){const o=el('option',s.title);o.value=s.id;$('step').append(o);}if(evidence.sequence.steps.some(s=>s.id===previous))$('step').value=previous;
  $('ledger').replaceChildren();
  for(const s of findings.steps){const card=el('div');card.className='entry';card.append(el('strong',evidence.sequence.steps.find(x=>x.id===s.stepId).title));for(const c of s.checks)card.append(el('p',`${c.prompt}: ${c.observation?`${c.observation.value} (${c.observation.evidenceClass}) — ${c.observation.note}`:'No retained observation'}`));for(const c of s.checks)if(c.observation?.practice){const details=el('details');details.append(el('summary','Inspect retained placement evidence'),renderPracticeEvidence(c.observation.practice));card.append(details);}$('ledger').append(card);}
  $('history').replaceChildren();
  for(const item of findings.journal){const p=el('p');if(item.type==='invalidation')p.textContent=`Event ${item.eventIndex+1}: downstream observation credit cleared for ${item.stepIds.join(', ')}.`;else p.textContent=`Event ${item.eventIndex+1}, ${item.stepId}: ${item.prediction} — ${item.reason}. Declared prerequisite evidence: ${item.evidenceReady?'satisfied':'not established'}. ${item.blockedBy.length?'Uncompleted prerequisites: '+item.blockedBy.join(', '):''}`;$('history').append(p);}
  populateChecks();clearReveal();
}
function populateChecks(){
  const previous=$('check').value;$('check').replaceChildren();if(!study)return;
  for(const c of study.definitions.find(s=>s.stepId===$('step').value).checks){const o=el('option',c.prompt);o.value=c.id;$('check').append(o);}
  if([...$('check').options].some(o=>o.value===previous))$('check').value=previous;showCheckKind();
}
function selectedCheck(){return study?.definitions.find(s=>s.stepId===$('step').value)?.checks.find(c=>c.id===$('check').value);}
function showCheckKind(){const geometric=!!selectedCheck()?.placement;$('manual-report').hidden=geometric;$('practice-report').hidden=!geometric;$('observe').hidden=geometric;}
async function load(file,saved){
  if(!file)return;const token=++revision;
  try{
    if(file.size>70_000_000)throw Error('Keep the retained bundle below 70 MB');
    const data=JSON.parse(await file.text());
    if(saved&&data.format!=='skill-translator.readiness-bundle/v1')throw Error('Unsupported saved readiness bundle');
    if(!saved&&data.format!=='skill-translator.prerequisite-bundle/v1')throw Error('Open a saved prerequisite rehearsal from the maintained prerequisite page');
    const next=await openReadinessBundle(saved?data.evidence:data.sourceBundle);
    let accepted,prerequisites;try{accepted=saved?importReadiness(next.sequence,data.study):null;prerequisites=saved?accepted.prerequisites:importPrerequisiteRehearsal(next.sequence,data.rehearsal);}catch(error){next.dispose();throw error;}
    if(token!==revision){next.dispose();return;}
    evidence?.dispose();evidence=next;study=accepted;declaration=prerequisites;$('source-title').textContent=evidence.sequence.title;
    resetDrafts();clearReveal();if(study)render();else author();message('Source frames validated. No physical outcome is inferred.');
  }catch(error){if(token===revision)message(error.message);}
}
$('source-file').addEventListener('change',e=>load(e.target.files[0],false));
$('study-file').addEventListener('change',e=>load(e.target.files[0],true));
for(const id of ['authoring','lesson'])$(id).addEventListener('input',()=>{revision++;});
$('freeze').addEventListener('click',guard(()=>{
  const definitions=[...$('definitions').children].map(f=>({stepId:f.dataset.stepId,checks:[{id:'completion',prompt:f.querySelector('.prompt').value,basis:f.querySelector('.basis').value,...(f.querySelector('.placement-binding')?.checked?{placement:{widthMm:Number(f.querySelector('.widthMm').value),heightMm:Number(f.querySelector('.heightMm').value)}}:{})}]}));
  study=createReadiness(evidence.sequence,declaration,definitions);revision++;render();message('Declarations frozen. The observation journal starts empty.');
}));
$('step').addEventListener('change',()=>{revision++;populateChecks();resetDrafts();clearReveal();});
$('check').addEventListener('change',()=>{revision++;resetObservation();showCheckKind();});
$('choose').addEventListener('click',guard(()=>{
  study=recordReadiness(evidence.sequence,study,{type:'choose',stepId:$('step').value,prediction:$('prediction').value,reason:$('reason').value});revision++;render();
  const s=readinessFindings(evidence.sequence,study).steps.find(s=>s.stepId===$('step').value),source=evidence.sequence.steps.find(x=>x.id===s.stepId);
  $('finding').append(el('h3',s.ready?'Declared prerequisites are satisfied':'Prerequisites are not established'),el('p',s.blockedBy.length?'Inspect these uncompleted prerequisites: '+s.blockedBy.join(', '):'This concerns the declared prerequisites only. Completion checks still require observations.'),el('p','Author intended result: '+source.intent));
  $('finding').append(renderReadinessExplanation({sequence:evidence.sequence,study,selectedStepId:s.stepId,urlFor:evidence.urlFor}));
  for(const edge of study.prerequisites.dependencies.filter(e=>e.after===s.stepId))$('finding').append(el('p',`Declared prerequisite ${edge.before}: ${edge.reason}`));
  for(const c of s.checks)$('finding').append(el('p',`${c.prompt} — Expert basis: ${c.basis}`));
  const moments=new Set([source.beforeMomentId,source.afterMomentId]);for(const id of s.blockedBy){const dep=evidence.sequence.steps.find(x=>x.id===id);moments.add(dep.afterMomentId);}
  for(const id of moments){const m=evidence.sequence.moments.find(x=>x.id===id),fig=el('figure'),img=el('img');img.src=evidence.urlFor(id);img.alt=m.label;fig.append(img,el('figcaption',`${m.label} · presented ${m.origin.mediaTimeSeconds}s · ${m.visibleState}`));$('frames').append(fig);}
}));
$('observe').addEventListener('click',guard(()=>{
  study=recordReadiness(evidence.sequence,study,{type:'observe',stepId:$('step').value,checkId:$('check').value,value:$('value').value,evidenceClass:$('evidence-class').value,note:$('note').value});revision++;render();resetObservation();message('Observation retained; dependent observation credit was recomputed.');
}));
$('save').addEventListener('click',guard(()=>{
  const payload={format:'skill-translator.readiness-bundle/v1',evidence:saveReadinessBundle(evidence),study:importReadiness(evidence.sequence,study)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='task-readiness.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}));

$('open-practice').addEventListener('click',guard(()=>{
  const context=readinessPracticeTask(evidence.sequence,$('step').value,selectedCheck()?.placement);
  sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify({demo:context.demo,widthMm:context.widthMm,heightMm:context.heightMm}));
  window.open('/practice','_blank');
}));
$('practice-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;const token=++revision;practiceDraft=null;$('retain-practice').disabled=true;$('practice-preview').replaceChildren();
  try{
    if(file.size>1_000_000)throw Error('Keep each retained practice session below 1 MB');
    const input=JSON.parse(await file.text());if(token!==revision)return;
    const received=inspectReadinessPractice(evidence.sequence,$('step').value,selectedCheck()?.placement,input);
    practiceDraft=received;$('practice-preview').append(renderPracticeEvidence(received));$('retain-practice').disabled=false;
    message('Inspect this recomputed geometric result, add an observation note, then retain it explicitly.');
  }catch(error){if(token===revision)message(error.message);}
});
$('retain-practice').addEventListener('click',guard(()=>{
  if(!practiceDraft)throw Error('Import and inspect matching practice evidence first');
  study=recordReadiness(evidence.sequence,study,{type:'practice',stepId:$('step').value,checkId:$('check').value,note:$('note').value,session:practiceDraft.session});
  revision++;resetObservation();render();message('Raw practice evidence retained. The geometric check and downstream credit were recomputed.');
}));
