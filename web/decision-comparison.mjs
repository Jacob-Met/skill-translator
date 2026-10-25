import {mountAccountQuestion} from '/web/account-question.mjs';
import {DECISION_COMPARISON_FORMAT,compareDecisionAccounts,rehearseDecisionExample} from '/src/decision-comparison.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
import {budget} from '/web/order-evidence-input.mjs';
import {readComparison,makeComparison,release} from '/web/decision-comparison-input.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let sources=[],selected=[],revision=0,generation=0,controller=null,busy=false;
let accountQuestions;
const study=()=>({format:DECISION_COMPARISON_FORMAT,examples:sources.map((s,i)=>({source:s.sequence,stepId:selected[i]})),relationship:$('relationship').value,explanation:$('explanation').value});
function invalidate(){revision++;controller?.abort();generation++;busy=false;sync();accountQuestions?.refresh();}
function sync(){$('save').disabled=busy||sources.length<2;$('source').disabled=busy||sources.length>=6;}
function download(blob,name){const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function run(action){Promise.resolve().then(action).catch(e=>{$('error').textContent=e.message;});}
function render(){
 $('examples').replaceChildren();sources.forEach((s,i)=>{
 const card=node('article'),select=node('select');select.setAttribute('aria-label',`Matched step for example ${i+1}`);
 for(const step of s.sequence.steps){const option=node('option',step.title);option.value=step.id;select.append(option);}select.value=selected[i];select.onchange=()=>{selected[i]=select.value;invalidate();render();};
 const remove=node('button','Remove example');remove.onclick=()=>{invalidate();releaseSequenceAssets(s.assets);sources.splice(i,1);selected.splice(i,1);render();};
 card.append(node('h2',s.sequence.title),node('p',s.sequence.context),select,remove);
 const step=s.sequence.steps.find(t=>t.id===selected[i]);
 for(const [label,id]of [['Before',step.beforeMomentId],['After',step.afterMomentId]]){const m=s.sequence.moments.find(m=>m.id===id),fig=node('figure'),img=node('img');img.src=s.assets.get(id).media.url;img.alt=`${label}: ${m.label}`;fig.append(img,node('figcaption',`${label}: ${m.visibleState||'No visible-state account supplied'} · ${m.origin.mediaTimeSeconds} seconds · ${m.image.sha256}`));card.append(fig);}
 const dl=node('dl');for(const [label,key]of [['Intended result','intent'],['Visible change','visibleChange'],['Sensory cue','sensoryCue'],['Recovery cue','recoveryCue']])dl.append(node('dt',label),node('dd',step[key]||'Not supplied — unknown.'));card.append(dl);
 const raw=node('button','Save original source'),practice=node('button','Save selected practice');
 raw.onclick=()=>run(async()=>{const rev=revision,blob=await makeSequenceBundle(s.sequence,s.assets);if(rev!==revision)throw Error('Selection changed; retry export');download(blob,`decision-source-${i+1}.json`);});
 practice.onclick=()=>run(()=>{const p=rehearseDecisionExample(study(),i);download(new Blob([JSON.stringify(p)],{type:'application/json'}),`decision-practice-${i+1}.json`);});card.append(raw,practice);$('examples').append(card);
 });sync();accountQuestions?.refresh();
}
async function receive(file,replace){
 if(!file)return;controller?.abort();controller=new AbortController();const token=++generation,rev=revision,signal=controller.signal;busy=true;sync();let incoming;
 try{
  incoming=replace?await readComparison(file,{signal}):{sources:[await readSequenceBundle(file,{signal})]};
  if(token!==generation||rev!==revision||signal.aborted){release(incoming.sources);return;}
  if(!replace&&(!incoming.sources[0].sequence.steps.length||sources.length>=6))throw Error('Choose a source with steps; keep at most six examples');
  const next=replace?incoming.sources:[...sources,...incoming.sources];budget(new Map(next.map((s,i)=>[i,s])));
  const ids=replace?incoming.study.examples.map(e=>e.stepId):[...selected,incoming.sources[0].sequence.steps[0].id];
  if(replace){release(sources);$('relationship').value=incoming.study.relationship;$('explanation').value=incoming.study.explanation;}
  sources=next;selected=ids;incoming=null;revision++;$('error').textContent='';$('status').textContent='Original frame bytes verified. Select the corresponding step explicitly.';render();
 }catch(e){if(incoming)release(incoming.sources);if(token===generation)$('error').textContent='Import refused; accepted comparison retained. '+e.message;}
 finally{if(token===generation){busy=false;sync();}}
}
$('source').onchange=e=>receive(e.target.files[0],false);$('open').onchange=e=>receive(e.target.files[0],true);
for(const id of ['relationship','explanation'])$(id).oninput=invalidate;
$('save').onclick=()=>run(async()=>{const value=study();compareDecisionAccounts(value);const rev=revision,blob=await makeComparison(value,sources);if(rev!==revision)throw Error('Comparison changed; retry export');download(blob,'decision-comparison.json');});
accountQuestions=mountAccountQuestion({container:$('account-questions'),getComparison:study,onChange:()=>{revision++;controller?.abort();generation++;busy=false;sync();},download});
window.addEventListener('beforeunload',()=>{controller?.abort();release(sources);});render();

