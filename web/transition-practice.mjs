import {createTransitionPractice,importTransitionPractice,transitionTask,receiveTransitionPractice,declareLearnerReference,predictTransition,revealTransition,inspectTransitionPractice,MAX_TRANSITION_BYTES} from '/src/transition-practice.mjs';
import {stateChangeEvidence,validateStateChange} from '/src/sequence-change.mjs';
import {readStateChangeBundle,makeStateChangeBundle,MAX_CHANGE_BUNDLE_BYTES} from '/web/sequence-change-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
import {renderTransitionFindings} from '/web/transition-practice-view.mjs';
const FORMAT='skill-translator.transition-practice-bundle/v1',MAX_BYTES=MAX_CHANGE_BUNDLE_BYTES+MAX_TRANSITION_BYTES+65536;
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let comparison=null,assets=null,account=null,revision=0,pending=null;
const status=text=>{$('status').textContent=text;};
function invalidate(){revision++;pending?.abort();pending=null;}
function begin(){invalidate();pending=new AbortController();return {revision,signal:pending.signal};}
const current=op=>op.revision===revision&&!op.signal.aborted;
const guard=fn=>()=>{try{fn();}catch(error){status(error.message);}};
function takeFile(id){const file=$(id).files[0];$(id).value='';return file;}
function resetDrafts(){$('same-reference').checked=false;$('reference-basis').value='';$('endpoint-prediction').value='unknown';$('change-prediction').value='unknown';$('reason').value='';}
function showSource(){
 const source=stateChangeEvidence(comparison);$('workspace').hidden=false;$('source-title').textContent=source.step.title;
 $('reference').textContent=`Source reference: ${source.reference.label}. ${source.reference.basis} Supplied dimensions: ${source.widthMm} × ${source.heightMm} mm. Explicit correspondences: ${source.pairs.length}.`;
 $('source-frames').replaceChildren();
 for(const [stage,id] of [['Before',source.beforeMomentId],['After',source.afterMomentId]]){const moment=comparison.sequence.moments.find(m=>m.id===id),figure=el('figure'),img=el('img');img.src=assets.get(id).media.url;img.alt=`${stage}: ${moment.label}`;figure.append(img,el('figcaption',`${stage}: ${moment.label} · retained presented time ${moment.origin.mediaTimeSeconds}s · ${moment.visibleState}`));$('source-frames').append(figure);}
}
function author(){
 $('author').hidden=false;$('practice').hidden=true;$('criteria').replaceChildren();
 for(const pair of comparison.pairs){const field=el('div');field.className='criterion';field.dataset.pairId=pair.id;field.append(el('h3',pair.label),el('p',`Explicit mapping: ${pair.beforeMarkId} → ${pair.afterMarkId}`));
  const toleranceLabel=el('label','Maximum endpoint-change discrepancy (mm)'),input=el('input');input.type='number';input.min='0.000001';input.max='50';input.step='any';input.className='tolerance';toleranceLabel.append(input);
  const basisLabel=el('label','Basis for this separate change criterion'),basis=el('textarea');basis.className='basis';basis.maxLength=1600;basisLabel.append(basis);field.append(toleranceLabel,basisLabel);$('criteria').append(field);
 }
}
function render(){
 if(!account)return;const report=inspectTransitionPractice(account);$('author').hidden=true;$('practice').hidden=false;
 for(const stage of ['before','after']){const session=account[stage];$(stage+'-summary').textContent=session?`Raw round ${session.round} retained: ${session.attempts.length} placement(s), ${session.history.length} prior round(s). ${session.photoObservation?'Photo annotations retained; '+session.photoObservation.evidenceClass+'.':'Manual coordinate record.'}`:'No session retained';}
 $('declare-reference').disabled=!account.before||!account.after||!!account.prediction;
 for(const id of ['same-reference','reference-basis'])$(id).disabled=!!account.prediction;
 $('reference-status').textContent=account.learnerReference?'Retained learner reference: '+account.learnerReference.basis:'No learner common-reference declaration retained. Receiving either state resets it.';
 if(account.prediction){$('endpoint-prediction').value=account.prediction.endpoint;$('change-prediction').value=account.prediction.change;$('reason').value=account.prediction.reason;}
 for(const id of ['endpoint-prediction','change-prediction','reason'])$(id).disabled=!!account.prediction;
 $('predict').disabled=!account.learnerReference||!!account.prediction;$('reveal').disabled=!account.prediction||account.revealed;
 $('prediction-record').textContent=account.prediction?`Retained prediction: endpoints ${account.prediction.endpoint}; change ${account.prediction.change}. ${account.prediction.reason}`:'No prediction committed. Computed observations are withheld.';
 $('findings').replaceChildren(renderTransitionFindings(report));
}
async function load(file,saved){
 if(!file)return;const op=begin();let received=null;
 try{
  if(file.size>MAX_BYTES)throw Error('Complete transition bundle exceeds its retained-source limit');
  let raw=null,input=file;
  if(saved){raw=JSON.parse(await file.text());if(!current(op))return;if(raw?.format!==FORMAT)throw Error('Unsupported saved transition bundle');input=new Blob([JSON.stringify(raw.sourceBundle)],{type:'application/json'});}
  received=await readStateChangeBundle(input,{signal:op.signal});if(!current(op)){releaseSequenceAssets(received.assets);return;}
  const source=validateStateChange(received.state);stateChangeEvidence(source);if(!source.pairs.length)throw Error('Retain explicit point correspondences in the calibrated-state comparison first');
  const restored=saved?importTransitionPractice(raw.account):null;
  if(restored&&JSON.stringify(restored.comparison)!==JSON.stringify(source))throw Error('Saved practice and retained demonstration comparison differ');
  releaseSequenceAssets(assets||new Map());assets=received.assets;received=null;comparison=source;account=restored;resetDrafts();showSource();
  if(account){$('same-reference').checked=!!account.learnerReference;$('reference-basis').value=account.learnerReference?.basis||'';render();}else author();
  status('Original frames and correspondence declarations received. No physical action is inferred.');
 }catch(error){if(received)releaseSequenceAssets(received.assets);if(current(op))status('Import refused: '+error.message);}
}
$('source-file').addEventListener('change',()=>load(takeFile('source-file'),false));$('study-file').addEventListener('change',()=>load(takeFile('study-file'),true));
$('author').addEventListener('input',invalidate);
$('freeze').addEventListener('click',guard(()=>{
 const criteria=[...$('criteria').children].map(field=>({pairId:field.dataset.pairId,toleranceMm:field.querySelector('.tolerance').valueAsNumber,basis:field.querySelector('.basis').value}));
 const next=createTransitionPractice(comparison,criteria);invalidate();account=next;resetDrafts();render();status('Change criteria frozen. Collect before and after practice separately.');
}));
for(const stage of ['before','after']){
 $('open-'+stage).addEventListener('click',guard(()=>{const {demo,widthMm,heightMm}=transitionTask(comparison,stage);sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify({demo,widthMm,heightMm}));window.open('/practice','_blank');}));
 $(stage+'-file').addEventListener('change',async()=>{const file=takeFile(stage+'-file');if(!file||!account)return;const op=begin();try{
  if(file.size>256*1024)throw Error('Practice session must fit the maintained 256 KiB limit');const input=JSON.parse(await file.text());if(!current(op))return;
  const next=receiveTransitionPractice(account,stage,input);if(JSON.stringify(next)===JSON.stringify(account)){status('Same normalized practice evidence retained; committed prediction and findings are unchanged.');return;}account=next;resetDrafts();render();status(`${stage==='before'?'Before':'After'} evidence received. Reconfirm the learner reference and make a new prediction.`);
 }catch(error){if(current(op))status('Session refused: '+error.message);}});
}
$('learner-reference').addEventListener('input',()=>{if(account?.prediction)return;invalidate();if(account){account=declareLearnerReference(account,null);$('endpoint-prediction').value='unknown';$('change-prediction').value='unknown';$('reason').value='';render();}});
$('declare-reference').addEventListener('click',guard(()=>{const next=declareLearnerReference(account,{samePlaneAndCorners:$('same-reference').checked,basis:$('reference-basis').value});invalidate();account=next;render();status('Common learner reference retained as a supplied declaration.');}));
for(const id of ['endpoint-prediction','change-prediction','reason'])$(id).addEventListener('input',invalidate);
$('predict').addEventListener('click',guard(()=>{const next=predictTransition(account,{endpoint:$('endpoint-prediction').value,change:$('change-prediction').value,reason:$('reason').value});invalidate();account=next;render();status('Prediction committed. Reveal to compare the two geometric criteria.');}));
$('reveal').addEventListener('click',guard(()=>{const next=revealTransition(account);invalidate();account=next;render();status('Findings recomputed from original correspondence and actual retained placements.');}));
$('save').addEventListener('click',async()=>{
 if(!account)return;const snapshot=importTransitionPractice(account),accepted=account,op=begin();
 try{const source=await makeStateChangeBundle(snapshot.comparison,assets,{signal:op.signal});const sourceBundle=JSON.parse(await source.text());if(!current(op)||accepted!==account)return;
  const blob=new Blob([JSON.stringify({format:FORMAT,sourceBundle,account:snapshot})],{type:'application/json'});if(blob.size>MAX_BYTES)throw Error('Complete saved bundle exceeds its reopening limit; no evidence was dropped');
  const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='transition-practice.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Complete source frames, declarations, raw sessions and prediction saved.');
 }catch(error){if(current(op))status('Save refused: '+error.message);}
});
window.addEventListener('pagehide',event=>{if(!event.persisted){invalidate();releaseSequenceAssets(assets||new Map());}});
