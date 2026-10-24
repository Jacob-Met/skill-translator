import {createRelationshipRehearsal,importRelationshipRehearsal,reviewRelationshipRehearsal,exportRelationshipRehearsal,applyRehearsalRelationshipReview,RELATIONSHIP_REHEARSAL_SCHEMA} from '/src/relationship-rehearsal.mjs';
const $=id=>document.getElementById(id);let accepted=null,generation=0;
function element(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function render(){
 $('error').textContent='';$('add').disabled=!accepted;$('save').disabled=!accepted;
 if(!accepted)return;
 for(const id of ['from','to']){const old=$(id).value;$(id).replaceChildren(...accepted.rehearsal.source.landmarks.map(m=>{const o=element('option',m.label);o.value=m.id;return o;}));if([...$(id).options].some(o=>o.value===old))$(id).value=old;}
 $('rules').replaceChildren(...accepted.rules.map(r=>{const row=element('p',`${r.label}: ${r.from} → ${r.to}, ${r.kind}, ±${r.toleranceMm} mm `),button=element('button','Remove');button.onclick=()=>{generation++;accepted=createRelationshipRehearsal(accepted.rehearsal,accepted.rules.filter(x=>x.id!==r.id));render();};row.append(button);return row;}));
 const review=reviewRelationshipRehearsal(accepted);$('results').replaceChildren(...review.trials.map(t=>{
 const section=element('section','');section.append(element('h2',`Trial ${t.index} · ${t.widthMm} × ${t.heightMm} mm`),element('p',`Recorded help: ${t.assistance.replaceAll('_',' ')}`));
 if(!t.assessment){section.append(element('p',t.started?'Not committed — feedback withheld.':'Not started — feedback withheld.'));return section;}
 section.append(element('p',`Original positions: ${t.assessment.practice.passed?'within tolerances':t.assessment.practice.complete?'outside tolerances':'incomplete'}`));
 if(!accepted.rules.length)section.append(element('p','No relationship criteria declared.'));
 for(const r of t.assessment.results)section.append(element('p',`${r.label}: ${r.status}; reference ${r.expectedMm} mm; observed ${r.observedMm??'missing'}; difference ${r.differenceMm??'unavailable'}${r.missing.length?`; missing ${r.missing.join(', ')}`:''}`));
 for(const reveal of t.reveals)section.append(element('p',`Before target request at action ${reveal.actionIndex}: ${JSON.stringify(reveal.priorAttempts)}`));return section;
 }));$('status').textContent='Accepted raw account. Findings recomputed from committed placements.';
}
async function load(input,criteria=false){const token=++generation,file=input.files[0];if(!file)return;$('status').textContent='Reading file; previous accepted account retained.';try{if(file.size>2*1024*1024)throw Error('File exceeds 2 MiB');const raw=JSON.parse(await file.text());if(token!==generation)return;const next=criteria?applyRehearsalRelationshipReview(accepted,raw):raw.schema===RELATIONSHIP_REHEARSAL_SCHEMA?importRelationshipRehearsal(raw):createRelationshipRehearsal(raw);accepted=next;render();}catch(e){if(token===generation){$('error').textContent=e.message;$('status').textContent='Import refused; previous accepted account retained.';}}}
$('account').onchange=()=>load($('account'));$('criteria').onchange=()=>load($('criteria'),true);
$('ruleForm').oninput=()=>{generation++;};
$('ruleForm').onsubmit=e=>{e.preventDefault();generation++;try{const id=crypto.randomUUID();accepted=createRelationshipRehearsal(accepted.rehearsal,[...accepted.rules,{id,label:$('label').value,from:$('from').value,to:$('to').value,kind:$('kind').value,toleranceMm:Number($('tolerance').value)}]);render();}catch(error){$('error').textContent=error.message;}};
$('save').onclick=()=>{if(!accepted)return;const url=URL.createObjectURL(new Blob([exportRelationshipRehearsal(accepted)],{type:'application/json'})),a=element('a','');a.href=url;a.download='relationship-rehearsal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
