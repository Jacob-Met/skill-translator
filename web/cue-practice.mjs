import {mountRevealedStepPlayback} from '/web/revealed-step-playback.mjs';
import {createCuePractice as createDecisionPractice,importCuePractice as importDecisionPractice,recordCueAction as recordDecisionAction,inspectCuePractice as decisionPracticeFindings} from '/src/cue-practice.mjs';
import {decisionEvidence} from '/src/decision-practice.mjs';
import {readSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const originalPlayback=mountRevealedStepPlayback($('revealed-step-playback'));
let source=null,assets=new Map(),session=null,revision=0,generation=0,controller=null,busy=false,predictionDirty=false,reflectionDirty=false;
const error=message=>{$('error').hidden=!message;$('error').textContent=message;};
function sync(){
  originalPlayback.update(source,session,{busy});
  $('restart').disabled=!source||busy;$('sessionFile').disabled=!source||busy;
  if(!session)return;
  const findings=decisionPracticeFindings(source,session),step=findings.steps[findings.currentIndex];
  for(const [id,field]of [['requestSensory','sensoryCue'],['requestRecovery','recoveryCue']])$(id).disabled=busy||step.revealed||step.cueRequests.some(r=>r.field===field);
  $('submitPrediction').disabled=busy||!!step.response;$('reveal').disabled=busy||step.revealed;
  $('saveReflection').disabled=busy||!!step.reflection;$('advance').disabled=busy||!step.reflection||findings.currentIndex===findings.steps.length-1;
  $('saveSession').disabled=busy||predictionDirty||reflectionDirty;
  $('draftStatus').textContent=predictionDirty||reflectionDirty?'An unsaved response draft is present. Submit it before exporting.':'Only retained responses and interface actions are exported.';
}
function render(){
  $('exercise').hidden=!session;if(!session){sync();return;}
  const result=decisionPracticeFindings(source,session),state=result.steps[result.currentIndex],step=source.steps.find(s=>s.id===state.id);
  const before=source.moments.find(m=>m.id===step.beforeMomentId),after=source.moments.find(m=>m.id===step.afterMomentId);
  $('sourceContext').textContent=`Supplied demonstration context · ${source.title}${source.context?' — '+source.context:''}`;
  $('stepNumber').textContent=`STEP ${result.currentIndex+1} / ${result.steps.length}${result.complete?' · EXERCISE RETAINED':''}`;$('stepTitle').textContent=step.title;
  $('beforeImage').src=assets.get(before.id).media.url;$('beforeCaption').textContent=`Before · ${before.label} · presented ${before.origin.mediaTimeSeconds.toFixed(3)} s${before.visibleState?' · '+before.visibleState:''}`;
  $('afterFigure').hidden=!state.revealed;
  if(state.revealed){$('afterImage').src=assets.get(after.id).media.url;$('afterCaption').textContent=`After · ${after.label} · presented ${after.origin.mediaTimeSeconds.toFixed(3)} s${after.visibleState?' · '+after.visibleState:''}`;}else $('afterImage').removeAttribute('src');
  for(const [id,key]of [['expectedChange','expectedChange'],['decisionCue','cue'],['recovery','recovery']]){$(id).value=state.response?.[key]||'';$(id).disabled=!!state.response;}
  $('uncertain').checked=state.response?.uncertain||false;$('uncertain').disabled=!!state.response;
  $('assistance').textContent=state.revealedBeforeAnswer?'The interface revealed the full outcome before your first response. That assistance remains in the retained history.':state.response?'Your first response was retained before the full outcome reveal. Prior familiarity remains your declaration.':'You may record uncertainty or reveal the account first; the interface order is retained.';
  $('cueAccount').replaceChildren();
  for(const request of state.cueRequests){const title=request.field==='sensoryCue'?'Supplied sensory cue':'Recovery cue';$('cueAccount').append(node('h3',title),node('p',request.available?request.text:'Not supplied — unknown; this request cannot reveal an absent account.'),node('p',`Requested ${request.beforeAnswer?'before':'after'} the first submitted prediction.`));}
  const help=state.preAnswerCueRequests.length?` Before your first response: ${state.preAnswerCueDisclosures.length} supplied cue(s) disclosed from ${state.preAnswerCueRequests.length} request(s).`:' No selective cue request was recorded before your first response.';
  $('assistance').textContent+=help;
  $('account').replaceChildren();$('account').hidden=!state.revealed;
  if(state.revealed){$('account').append(node('h3','Authored account — inspect, do not treat as an automatic answer key'));const dl=node('dl');for(const [label,key]of [['Intended result','intent'],['Visible change','visibleChange'],['Supplied sensory cue','sensoryCue'],['Recovery cue','recoveryCue']])dl.append(node('dt',label),node('dd',step[key]||'Not supplied by the author.'));$('account').append(dl);}
  $('reflectionForm').hidden=!(state.response&&state.revealed);$('comparison').value=state.reflection?.comparison||'unsure';$('reflection').value=state.reflection?.note||'';$('comparison').disabled=$('reflection').disabled=!!state.reflection;
  $('evidenceChoices').replaceChildren();
  const labels={before:'Before frame',after:'After frame',intent:'Intended result',visibleChange:'Visible change',sensoryCue:'Sensory cue',recoveryCue:'Recovery cue'};
  if(state.revealed)for(const evidence of decisionEvidence(source,state.id)){
    const label=node('label'),input=node('input');label.className='check';input.type='checkbox';input.value=evidence.key;input.checked=state.reflection?.reconsideration?.anchors.includes(evidence.key)||false;input.disabled=!!state.reflection;
    input.addEventListener('input',()=>{reflectionDirty=true;revision++;sync();});
    label.append(input,document.createTextNode(' '+labels[evidence.key]+(evidence.available?'':' — not supplied; unknown')));$('evidenceChoices').append(label);
  }
  $('revisedJudgment').value=state.reflection?.reconsideration?.judgment||'';$('remainingQuestion').value=state.reflection?.reconsideration?.question||'';
  $('revisedJudgment').disabled=$('remainingQuestion').disabled=!!state.reflection;
  $('progress').textContent=`${result.answered}/${result.steps.length} responses retained · ${result.selfComparisons.length} self-comparisons · ${result.revealedBeforeAnswer.length} full outcome reveals before response. Declared familiarity: ${result.priorFamiliarity}. No correctness or physical skill score is produced.`;
  $('history').replaceChildren();for(const entry of result.steps){const title=source.steps.find(s=>s.id===entry.id).title,card=node('article');card.append(node('h3',title));if(entry.response){for(const [label,key]of [['Expected change','expectedChange'],['Decision cue','cue'],['Recovery judgment','recovery']])card.append(node('p',`${label}: ${entry.response[key]||'Not supplied'}`));card.append(node('p',`Uncertainty declared: ${entry.response.uncertain?'yes':'no'}. Full outcome revealed before response: ${entry.revealedBeforeAnswer?'yes':'no'}.`));}else card.append(node('p','No response retained.'));for(const r of entry.cueRequests)card.append(node('p',`${r.field==='sensoryCue'?'Sensory':'Recovery'} cue requested ${r.beforeAnswer?'before':'after'} first response: ${r.available?r.text:'Not supplied — unknown'}`));if(entry.reflection)card.append(node('p',`Learner self-comparison: ${entry.reflection.comparison}. ${entry.reflection.note}`));if(entry.reflection?.reconsideration){const r=entry.reflection.reconsideration;card.append(node('p',`Reconsidered judgment: ${r.judgment||'Not supplied'}`),node('p',`Remaining question: ${r.question||'Not supplied'}`));for(const e of entry.evidence)card.append(node('p',`${labels[e.key]}: ${e.kind==='retained-frame'?`${e.momentId} · ${e.presentedSeconds} s · SHA-256 ${e.image.sha256}`:e.available?e.text:'Not supplied — unknown'}`));}$('history').append(card);}sync();
}
function act(type,fields={}){try{
  const draft=['reveal','request-cue'].includes(type)&&predictionDirty?{expectedChange:$('expectedChange').value,cue:$('decisionCue').value,recovery:$('recovery').value,uncertain:$('uncertain').checked}:null;
  const findings=decisionPracticeFindings(source,session);session=recordDecisionAction(source,session,{type,stepId:findings.currentStepId,...fields});predictionDirty=false;reflectionDirty=false;revision++;error('');render();
  if(draft){$('expectedChange').value=draft.expectedChange;$('decisionCue').value=draft.cue;$('recovery').value=draft.recovery;$('uncertain').checked=draft.uncertain;predictionDirty=true;sync();}
  $('status').textContent=draft?'Requested source information recorded before submission; your unsubmitted draft is retained.':'Action retained. Earlier submitted responses are unchanged.';
}catch(e){error(e.message);}}
function begin(){controller?.abort();controller=new AbortController();const request={token:++generation,revision,signal:controller.signal};busy=true;sync();return request;}
const current=request=>request.token===generation&&!request.signal.aborted;
function finish(request){if(current(request)){busy=false;controller=null;sync();}}
$('sourceFile').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;const request=begin(),familiarity=$('familiarity').value;let loaded;
  try{loaded=await readSequenceBundle(file,{signal:request.signal});if(!current(request)||request.revision!==revision){releaseSequenceAssets(loaded.assets);loaded=null;if(current(request))$('status').textContent='The exercise changed while reading; the accepted work remains.';return;}
    const next=createDecisionPractice(loaded.sequence,undefined,familiarity),old=assets;source=loaded.sequence;assets=loaded.assets;loaded=null;session=next;predictionDirty=reflectionDirty=false;revision++;error('');render();releaseSequenceAssets(old);$('status').textContent='Retained source frames verified. Describe the first situation before revealing the account.';
  }catch(e){if(loaded)releaseSequenceAssets(loaded.assets);if(current(request))error('Source refused; accepted exercise retained. '+e.message);}finally{finish(request);}
});
$('sessionFile').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file||!source)return;const request=begin();
  try{if(file.size<1||file.size>2*1024*1024)throw Error('Choose decision practice up to 2 MiB');const value=JSON.parse(await file.text());if(!current(request)||request.revision!==revision)return;const next=importDecisionPractice(source,value);session=next;predictionDirty=reflectionDirty=false;revision++;$('familiarity').value=session.priorFamiliarity;error('');render();$('status').textContent='Practice reopened by replaying source-bound actions. Saved verdicts are not trusted.';}catch(e){if(current(request))error('Practice refused; accepted exercise retained. '+e.message);}finally{finish(request);}
});
$('restart').addEventListener('click',()=>{if(!source)return;session=createDecisionPractice(source,undefined,$('familiarity').value);predictionDirty=reflectionDirty=false;revision++;error('');render();$('status').textContent='A new empty exercise has begun on the same accepted source.';});
$('familiarity').addEventListener('change',()=>{revision++;$('status').textContent='Start a new exercise to apply this familiarity declaration. The accepted exercise is unchanged.';});
for(const id of ['expectedChange','decisionCue','recovery','uncertain'])$(id).addEventListener('input',()=>{predictionDirty=true;revision++;sync();});
for(const id of ['comparison','reflection','revisedJudgment','remainingQuestion'])$(id).addEventListener('input',()=>{reflectionDirty=true;revision++;sync();});
$('predictionForm').addEventListener('submit',event=>{event.preventDefault();act('answer',{response:{expectedChange:$('expectedChange').value,cue:$('decisionCue').value,recovery:$('recovery').value,uncertain:$('uncertain').checked}});});
$('requestSensory').addEventListener('click',()=>act('request-cue',{field:'sensoryCue'}));
$('requestRecovery').addEventListener('click',()=>act('request-cue',{field:'recoveryCue'}));
$('reveal').addEventListener('click',()=>act('reveal'));
$('reflectionForm').addEventListener('submit',event=>{event.preventDefault();const anchors=[...$('evidenceChoices').querySelectorAll('input:checked')].map(input=>input.value),judgment=$('revisedJudgment').value,question=$('remainingQuestion').value;act('reflect',{comparison:$('comparison').value,note:$('reflection').value,...(anchors.length||judgment.trim()||question.trim()?{reconsideration:{anchors,judgment,question}}:{})});});
$('advance').addEventListener('click',()=>act('advance'));
$('saveSession').addEventListener('click',()=>{try{if(predictionDirty||reflectionDirty)throw Error('Retain your draft before exporting');const accepted=importDecisionPractice(source,session),blob=new Blob([JSON.stringify(accepted,null,2)],{type:'application/json'});if(blob.size>2*1024*1024)throw Error('Practice exceeds the 2 MiB export limit');const url=URL.createObjectURL(blob),link=node('a');link.href=url;link.download='cue-practice.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e.message);}});
window.addEventListener('beforeunload',()=>{controller?.abort();releaseSequenceAssets(assets);});
