import {mountDecisionSpokenCompanion} from '/web/decision-spoken-companion.mjs';
import {createDecisionPractice,importDecisionPractice,recordDecisionAction,decisionPracticeFindings,decisionEvidence} from '/src/decision-practice.mjs';
import {readSequenceBundle,releaseSequenceAssets} from '/web/sequence-input.mjs';
import {makeDecisionPracticeBundle,readDecisionPracticeBundle} from '/web/decision-practice-input.mjs';
import {receiveDecisionHandoff} from '/web/decision-handoff.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let cancelHandoff=()=>{};
let source=null,assets=new Map(),session=null,revision=0,generation=0,controller=null,busy=false,predictionDirty=false,reflectionDirty=false;
const spokenCompanion=mountDecisionSpokenCompanion($('account'));
let pendingStepIds=new Set();
const error=message=>{$('error').hidden=!message;$('error').textContent=message;};
function seedPendingStepIds(next){pendingStepIds=new Set(next.stepIds);}
function selectedStepIds(){return source?source.steps.filter(step=>pendingStepIds.has(step.id)).map(step=>step.id):[];}
function syncStepChoices(){
  const count=selectedStepIds().length,message=source?(count?count+' of '+source.steps.length+' decisions selected for a fresh exercise.':'Choose at least one decision to start a fresh exercise.'):'';
  if($('selectionStatus').textContent!==message)$('selectionStatus').textContent=message;
  $('startSelected').disabled=!source||busy||count===0;
}
function renderStepChoices(){
  $('selectionPanel').hidden=!source;$('practiceStepChoices').replaceChildren(node('legend','Decisions to include'));
  if(!source){$('selectionPanel').open=false;return;}
  const acceptedSource=source;
  for(const step of source.steps){
    const label=node('label'),input=node('input');label.className='practice-step-choice';input.type='checkbox';input.value=step.id;input.checked=pendingStepIds.has(step.id);
    input.addEventListener('input',()=>{
      if(!input.isConnected||source!==acceptedSource)return;
      if(input.checked)pendingStepIds.add(step.id);else pendingStepIds.delete(step.id);
      revision++;sync();
    });
    label.append(input,node('span',step.title));$('practiceStepChoices').append(label);
  }
}

function sync(){
  syncStepChoices();
  $('restart').disabled=!source||busy;$('sessionFile').disabled=!source||busy;
  $('saveComplete').disabled=!session||busy||predictionDirty||reflectionDirty;
  if(!session)return;
  const findings=decisionPracticeFindings(source,session),step=findings.steps[findings.currentIndex];
  $('submitPrediction').disabled=busy||!!step.response;$('reveal').disabled=busy||step.revealed;
  $('saveReflection').disabled=busy||!!step.reflection;$('advance').disabled=busy||!step.reflection||findings.currentIndex===findings.steps.length-1;
  $('saveSession').disabled=busy||predictionDirty||reflectionDirty;
  $('draftStatus').textContent=predictionDirty||reflectionDirty?'An unsaved response draft is present. Submit it before exporting.':'Only retained responses and interface actions are exported.';
}

function historyEvidenceDetails(source,step,assets,returnTarget){
  const details=node('details');details.className='history-evidence';
  details.append(node('summary',`Review previously disclosed evidence: ${step.title}`));
  function buildOnOpen(){
    if(!details.open||!details.isConnected)return;
    details.removeEventListener('toggle',buildOnOpen);
    const frames=node('div');frames.className='frames';
    for(const [label,momentId]of [['Before',step.beforeMomentId],['After',step.afterMomentId]]){
      const figure=node('figure'),moment=source.moments.find(item=>item.id===momentId);
      const url=moment?assets.get(momentId)?.media?.url:null;
      if(typeof url==='string'&&url.length){
        const img=node('img');img.alt=moment.label?`${label}: ${moment.label}`:`${label} evidence`;img.decoding='async';
        img.addEventListener('error',()=>img.replaceWith(node('p',`${label} image unavailable.`)),{once:true});
        img.src=url;figure.append(img);
      }else figure.append(node('p',`${label} image unavailable.`));
      figure.append(node('figcaption',moment?`${label} · ${moment.label} · presented ${moment.origin.mediaTimeSeconds.toFixed(3)} s${moment.visibleState?' · '+moment.visibleState:''}`:`${label} evidence unavailable.`));
      frames.append(figure);
    }
    details.append(frames,node('p','Authored account — inspect, do not treat as an automatic answer key'));
    const account=node('dl');
    for(const [label,key]of [['Intended result','intent'],['Visible change','visibleChange'],['Supplied sensory cue','sensoryCue'],['Recovery cue','recoveryCue']])account.append(node('dt',label),node('dd',step[key]||'Not supplied by the author.'));
    const returnLink=node('a',returnTarget.label);returnLink.href='#'+returnTarget.id;returnLink.className='history-return';
    const returnParagraph=node('p');returnParagraph.append(returnLink);details.append(account,returnParagraph);
  }
  details.addEventListener('toggle',buildOnOpen);
  return details;
}

function render(){
  renderStepChoices();
  $('exercise').hidden=!session;if(!session){spokenCompanion.render(null);sync();return;}
  const result=decisionPracticeFindings(source,session),state=result.steps[result.currentIndex],step=source.steps.find(s=>s.id===state.id);
  spokenCompanion.render({source,stepId:state.id,revealed:state.revealed,busy});
  const before=source.moments.find(m=>m.id===step.beforeMomentId),after=source.moments.find(m=>m.id===step.afterMomentId);
  const returnTarget=!state.response?{id:'predictionHeading',label:'Return to your current prediction'}:state.revealed&&!state.reflection?{id:'reflectionHeading',label:'Return to your current reflection'}:{id:'stepTitle',label:'Return to your current step'};
  $('sourceContext').textContent=`Supplied demonstration context · ${source.title}${source.context?' — '+source.context:''}`;
  $('stepNumber').textContent=`STEP ${result.currentIndex+1} / ${result.steps.length}${result.complete?' · EXERCISE RETAINED':''}`;$('stepTitle').textContent=step.title;
  $('beforeImage').src=assets.get(before.id).media.url;$('beforeCaption').textContent=`Before · ${before.label} · presented ${before.origin.mediaTimeSeconds.toFixed(3)} s${before.visibleState?' · '+before.visibleState:''}`;
  $('afterFigure').hidden=!state.revealed;
  if(state.revealed){$('afterImage').src=assets.get(after.id).media.url;$('afterCaption').textContent=`After · ${after.label} · presented ${after.origin.mediaTimeSeconds.toFixed(3)} s${after.visibleState?' · '+after.visibleState:''}`;}else $('afterImage').removeAttribute('src');
  for(const [id,key]of [['expectedChange','expectedChange'],['decisionCue','cue'],['recovery','recovery']]){$(id).value=state.response?.[key]||'';$(id).disabled=!!state.response;}
  $('uncertain').checked=state.response?.uncertain||false;$('uncertain').disabled=!!state.response;
  $('assistance').textContent=state.revealedBeforeAnswer?'The interface revealed the source before your first response. That assistance remains in the retained history.':state.response?'Your first response was retained before the interface reveal. Prior familiarity remains your declaration.':'You may record uncertainty or reveal the account first; the interface order is retained.';
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
  $('progress').textContent=`${result.answered}/${result.steps.length} responses retained · ${result.selfComparisons.length} self-comparisons · ${result.revealedBeforeAnswer.length} source reveals before response. Declared familiarity: ${result.priorFamiliarity}. No correctness or physical skill score is produced.`;
  $('history').replaceChildren();for(const [index,entry]of result.steps.entries()){const historicalStep=source.steps.find(s=>s.id===entry.id),card=node('article');card.append(node('h3',historicalStep.title));if(entry.response){for(const [label,key]of [['Expected change','expectedChange'],['Decision cue','cue'],['Recovery judgment','recovery']])card.append(node('p',`${label}: ${entry.response[key]||'Not supplied'}`));card.append(node('p',`Uncertainty declared: ${entry.response.uncertain?'yes':'no'}. Source revealed before response: ${entry.revealedBeforeAnswer?'yes':'no'}.`));}else card.append(node('p','No response retained.'));if(entry.reflection)card.append(node('p',`Learner self-comparison: ${entry.reflection.comparison}. ${entry.reflection.note}`));if(entry.reflection?.reconsideration){const r=entry.reflection.reconsideration;card.append(node('p',`Reconsidered judgment: ${r.judgment||'Not supplied'}`),node('p',`Remaining question: ${r.question||'Not supplied'}`));for(const e of entry.evidence)card.append(node('p',`${labels[e.key]}: ${e.kind==='retained-frame'?`${e.momentId} · ${e.presentedSeconds} s · SHA-256 ${e.image.sha256}`:e.available?e.text:'Not supplied — unknown'}`));}if(index<result.currentIndex&&entry.revealed&&entry.reflection)card.append(historyEvidenceDetails(source,historicalStep,assets,returnTarget));$('history').append(card);}sync();
}
function act(type,fields={}){try{
  const draft=type==='reveal'&&predictionDirty?{expectedChange:$('expectedChange').value,cue:$('decisionCue').value,recovery:$('recovery').value,uncertain:$('uncertain').checked}:null;
  const findings=decisionPracticeFindings(source,session);session=recordDecisionAction(source,session,{type,stepId:findings.currentStepId,...fields});predictionDirty=false;reflectionDirty=false;revision++;error('');render();
  if(draft){$('expectedChange').value=draft.expectedChange;$('decisionCue').value=draft.cue;$('recovery').value=draft.recovery;$('uncertain').checked=draft.uncertain;predictionDirty=true;sync();}
  $('status').textContent=draft?'Source reveal recorded before submission; your unsubmitted draft is retained.':'Action retained. Earlier submitted responses are unchanged.';
}catch(e){error(e.message);}}
function begin(){spokenCompanion.suspend();controller?.abort();controller=new AbortController();const request={token:++generation,revision,signal:controller.signal};busy=true;sync();return request;}
const current=request=>request.token===generation&&!request.signal.aborted;
function finish(request){if(request.token===generation){busy=false;controller=null;sync();if(session){const f=decisionPracticeFindings(source,session),s=f.steps[f.currentIndex];spokenCompanion.render({source,stepId:s.id,revealed:s.revealed,busy});}}}
async function acceptSource(file,{complete=false,externalSignal}={}){
  const request=begin(),familiarity=$('familiarity').value;let loaded;
  const abort=()=>controller?.abort();externalSignal?.addEventListener('abort',abort,{once:true});
  try{
    if(externalSignal?.aborted)throw Error('The source handoff was canceled.');
    loaded=await (complete?readDecisionPracticeBundle:readSequenceBundle)(file,{signal:request.signal});
    if(!current(request)||request.revision!==revision)throw Error('The exercise changed while reading; accepted work remains.');
    const next=complete?loaded.session:createDecisionPractice(loaded.sequence,undefined,familiarity),old=assets;
    source=loaded.sequence;assets=loaded.assets;loaded=null;session=next;seedPendingStepIds(next);predictionDirty=reflectionDirty=false;revision++;
    $('familiarity').value=session.priorFamiliarity;error('');render();releaseSequenceAssets(old);
    $('status').textContent=complete?'Complete practice reopened: every original PNG was verified and retained actions were replayed.':'Retained source frames verified. Describe the first situation before revealing the account.';
  }catch(e){if(loaded)releaseSequenceAssets(loaded.assets);e.stale=!current(request);throw e;}
  finally{externalSignal?.removeEventListener('abort',abort);finish(request);}
}
for(const [id,complete]of [['sourceFile',false],['completeFile',true]])$(id).addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;cancelHandoff();
  try{await acceptSource(file,{complete});}catch(e){if(!e.stale)error('Source refused; accepted exercise retained. '+e.message);}
});
$('sessionFile').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file||!source)return;cancelHandoff();const request=begin();
  try{if(file.size<1||file.size>1024*1024)throw Error('Choose decision practice up to 1 MiB');const value=JSON.parse(await file.text());if(!current(request)||request.revision!==revision)return;const next=importDecisionPractice(source,value);spokenCompanion.reset();session=next;seedPendingStepIds(next);predictionDirty=reflectionDirty=false;revision++;$('familiarity').value=session.priorFamiliarity;error('');render();$('status').textContent='Practice reopened by replaying source-bound actions. Saved verdicts are not trusted.';}catch(e){if(current(request))error('Practice refused; accepted exercise retained. '+e.message);}finally{finish(request);}
});
function startFresh(stepIds){
  if(!source||busy)return;
  try{
    const next=createDecisionPractice(source,stepIds,$('familiarity').value);
    spokenCompanion.reset();session=next;seedPendingStepIds(next);predictionDirty=reflectionDirty=false;revision++;error('');render();
    $('status').textContent=stepIds?'A new empty exercise has begun on '+next.stepIds.length+' selected decisions from the same accepted source.':'A new empty exercise has begun on the same accepted source.';
  }catch(e){error(e.message);}
}
$('restart').addEventListener('click',()=>startFresh());
$('startSelected').addEventListener('click',()=>{
  if($('startSelected').disabled)return;
  const ids=selectedStepIds();if(ids.length)startFresh(ids);
});
$('familiarity').addEventListener('change',()=>{revision++;$('status').textContent='Start a new exercise to apply this familiarity declaration. The accepted exercise is unchanged.';});
for(const id of ['expectedChange','decisionCue','recovery','uncertain'])$(id).addEventListener('input',()=>{predictionDirty=true;revision++;sync();});
for(const id of ['comparison','reflection','revisedJudgment','remainingQuestion'])$(id).addEventListener('input',()=>{reflectionDirty=true;revision++;sync();});
$('predictionForm').addEventListener('submit',event=>{event.preventDefault();act('answer',{response:{expectedChange:$('expectedChange').value,cue:$('decisionCue').value,recovery:$('recovery').value,uncertain:$('uncertain').checked}});});
$('reveal').addEventListener('click',()=>act('reveal'));
$('reflectionForm').addEventListener('submit',event=>{event.preventDefault();const anchors=[...$('evidenceChoices').querySelectorAll('input:checked')].map(input=>input.value),judgment=$('revisedJudgment').value,question=$('remainingQuestion').value;act('reflect',{comparison:$('comparison').value,note:$('reflection').value,...(anchors.length||judgment.trim()||question.trim()?{reconsideration:{anchors,judgment,question}}:{})});});
$('advance').addEventListener('click',()=>act('advance'));
$('saveSession').addEventListener('click',()=>{try{if(predictionDirty||reflectionDirty)throw Error('Retain your draft before exporting');const accepted=importDecisionPractice(source,session),blob=new Blob([JSON.stringify(accepted,null,2)],{type:'application/json'});if(blob.size>1024*1024)throw Error('Practice exceeds the 1 MiB export limit');const url=URL.createObjectURL(blob),link=node('a');link.href=url;link.download='decision-practice.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e.message);}});
$('saveComplete').addEventListener('click',async()=>{
  if(!session||predictionDirty||reflectionDirty)return;
  const request=begin();
  try{
    const blob=await makeDecisionPracticeBundle(source,assets,session,{signal:request.signal});
    if(!current(request)||request.revision!==revision)throw Error('The exercise changed while saving. Save again to include the current work.');
    const url=URL.createObjectURL(blob),link=node('a');link.href=url;link.download='complete-decision-practice.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    error('');$('status').textContent='Saved the complete practice, including every original frame and retained response. Reopen this one file to continue.';
  }catch(e){if(current(request))error(e.message);}finally{finish(request);}
});
cancelHandoff=receiveDecisionHandoff({accept:(file,signal)=>acceptSource(file,{externalSignal:signal}),onStatus:message=>{$('status').textContent=message;},onError:error});
window.addEventListener('beforeunload',()=>{spokenCompanion.dispose();cancelHandoff();controller?.abort();releaseSequenceAssets(assets);});



