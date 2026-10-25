import {createDecisionTransfer,createCueDecisionTransfer,recordTransferAction,inspectDecisionTransfer} from '/src/decision-transfer.mjs';
import {readComparison,release} from '/web/decision-comparison-input.mjs';
import {readTransfer,makeTransfer} from '/web/decision-transfer-input.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let sources=[],comparison=null,session=null,revision=0,generation=0,controller=null,busy=false,predictionDirty=false,reflectionDirty=false;
const touch=()=>{revision++;controller?.abort();generation++;busy=false;sync();};
const err=e=>{$('error').textContent=e?.message||'';};
function sync(){$('save').disabled=busy||predictionDirty||reflectionDirty;$('begin').disabled=busy||!comparison;$('answer').disabled=busy||!!(session&&inspectDecisionTransfer(session).findings.steps[0].response);}
function resetDraft(){for(const id of ['expectedChange','cue','recovery','note'])$(id).value='';$('uncertain').checked=false;$('comparison').value='unsure';predictionDirty=reflectionDirty=false;}
function setup(){
 $('setup').hidden=!comparison;for(const id of ['reference','target']){$(id).replaceChildren();comparison?.examples.forEach((e,i)=>{const o=node('option',`${i+1}: ${e.source.title}`);o.value=i;$(id).append(o);});}$('target').value='1';$('familiarity').value='';$('helpMode').value='full-reveal';
}
function card(example,index,title,revealed){
 const article=node('article'),step=example.source.steps.find(s=>s.id===example.stepId);article.append(node('h2',title),node('h3',example.source.title));
 // Target's authored step title and context are withheld with its account.
 if(revealed)article.append(node('p',example.source.context),node('h3',step.title));
 for(const [label,id]of [['Before',step.beforeMomentId],...(revealed?[['After',step.afterMomentId]]:[])]){const m=example.source.moments.find(m=>m.id===id),fig=node('figure'),img=node('img');img.src=sources[index].assets.get(id).media.url;img.alt=`${label}: ${m.label}`;fig.append(img,node('figcaption',`${label}: ${m.visibleState||'No state description'} · ${m.origin.mediaTimeSeconds} seconds`));article.append(fig);}
 if(revealed){const dl=node('dl');for(const [label,key]of [['Intent','intent'],['Visible change','visibleChange'],['Sensory cue','sensoryCue'],['Recovery cue','recoveryCue']])dl.append(node('dt',label),node('dd',step[key]||'Not supplied — unknown.'));article.append(dl);}else article.append(node('p','Target after frame and authored account withheld until reveal.'));
 return article;
}
function render(){
 $('exercise').hidden=!session;if(!session){sync();return;}
 const f=inspectDecisionTransfer(session),s=f.findings.steps[0];$('examples').replaceChildren(card(f.reference,session.referenceIndex,'Studied reference',true),card(f.target,session.targetIndex,'Prediction target',s.revealed));
 for(const id of ['expectedChange','cue','recovery']){if(s.response)$(id).value=s.response[id];$(id).disabled=!!s.response;}$('uncertain').disabled=!!s.response;if(s.response)$('uncertain').checked=s.response.uncertain;
 $('reveal').disabled=s.revealed||busy;$('reflection').hidden=!(s.response&&s.revealed);$('reflect').disabled=!!s.reflection||busy;$('comparison').disabled=$('note').disabled=!!s.reflection;
 if(s.reflection){$('comparison').value=s.reflection.comparison;$('note').value=s.reflection.note;}
 $('selectiveHelp').hidden=!f.selectiveCues;$('targetCues').replaceChildren();
 const requests=s.cueRequests||[];
 for(const [id,field]of [['requestSensory','sensoryCue'],['requestRecovery','recoveryCue']])$(id).disabled=busy||s.revealed||requests.some(r=>r.field===field);
 for(const request of requests)$('targetCues').append(node('p',`${request.field}: ${request.available?request.text:'Not supplied — unknown.'} Requested ${request.beforeAnswer?'before':'after'} the first answer.`));
 $('assistance').textContent=`Declared prior target familiarity: ${f.findings.priorFamiliarity}. ${s.revealedBeforeAnswer?'Target revealed before first response; assistance retained.':s.response?'First response retained before interface reveal.':'No first response yet.'} ${s.reflection?'Self-comparison retained.':''} ${f.selectiveCues?`${s.preAnswerCueRequests.length} cue request(s), ${s.preAnswerCueDisclosures.length} supplied cue disclosure(s) before first answer.`:''}`;sync();
}
async function receive(file,reopen){
 if(!file)return;controller?.abort();controller=new AbortController();const token=++generation,rev=revision,signal=controller.signal;busy=true;sync();let loaded;
 try{loaded=reopen?await readTransfer(file,{signal}):await readComparison(file,{signal});if(token!==generation||rev!==revision||signal.aborted){release(loaded.sources);return;}
  release(sources);sources=loaded.sources;session=reopen?loaded.session:null;comparison=reopen?session.comparison:loaded.study;loaded=null;revision++;resetDraft();setup();render();err(null);$('status').textContent=reopen?'Complete source-bound rehearsal reopened.':'Comparison received. Choose distinct examples and declare familiarity.';
 }catch(e){if(loaded)release(loaded.sources);if(token===generation)err(Error('Import refused; accepted rehearsal retained. '+e.message));}finally{if(token===generation){busy=false;render();}}
}
$('comparisonFile').onchange=e=>receive(e.target.files[0],false);$('transferFile').onchange=e=>receive(e.target.files[0],true);
for(const id of ['reference','target','familiarity','helpMode'])$(id).onchange=()=>{touch();$('status').textContent='Selection applies only when starting a new rehearsal. Current responses remain unchanged.';};
$('begin').onclick=()=>{try{const create=$('helpMode').value==='selective-cues'?createCueDecisionTransfer:createDecisionTransfer;const next=create(comparison,Number($('reference').value),Number($('target').value),$('familiarity').value);touch();session=next;resetDraft();render();err(null);}catch(e){err(e);}};
function act(action){try{session=recordTransferAction(session,action);touch();if(action.type==='answer')predictionDirty=false;if(action.type==='reflect')reflectionDirty=false;render();err(null);}catch(e){err(e);}}
$('prediction').onsubmit=e=>{e.preventDefault();act({type:'answer',response:{expectedChange:$('expectedChange').value,cue:$('cue').value,recovery:$('recovery').value,uncertain:$('uncertain').checked}});};
$('requestSensory').onclick=()=>act({type:'request-cue',field:'sensoryCue'});$('requestRecovery').onclick=()=>act({type:'request-cue',field:'recoveryCue'});
$('reveal').onclick=()=>act({type:'reveal'});$('reflection').onsubmit=e=>{e.preventDefault();act({type:'reflect',comparison:$('comparison').value,note:$('note').value});};
for(const id of ['expectedChange','cue','recovery','uncertain'])$(id).oninput=()=>{predictionDirty=true;touch();};for(const id of ['comparison','note'])$(id).oninput=()=>{reflectionDirty=true;touch();};
$('save').onclick=async()=>{try{if(!session||predictionDirty||reflectionDirty)throw Error('Retain response drafts before exporting');const rev=revision,blob=await makeTransfer(session,sources);if(rev!==revision)throw Error('Rehearsal changed; retry save');const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='decision-transfer.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){err(e);}};
window.addEventListener('beforeunload',()=>{controller?.abort();release(sources);});render();

