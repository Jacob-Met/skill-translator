import {createSequence,validateSequence,appendMoment,editMoment,removeMoment,upsertStep,removeStep,sequenceFindings,assertSequenceClip,MAX_MOMENTS,attachMomentCalibration,removeMomentCalibration,momentTask} from '/src/demonstration-sequence.mjs';
import {MAX_ANNOTATION_BYTES} from '/src/sequence-capture.mjs';
import {createPractice} from '/src/practice.mjs';
import {frameOrigin} from '/src/frame-origin.mjs';
import {loadLocalVideo,releaseVideo as releaseLocalVideo,capturePresentedFrame} from '/web/video-input.mjs';
import {loadLocalImage,releaseImage} from '/web/image-input.mjs';
import {makeSequenceBundle,readSequenceBundle,releaseSequenceAssets,exportMomentFrame,MAX_FRAME_BYTES} from '/web/sequence-input.mjs';
import {createVisualScanner} from '/web/visual-scan.mjs';

const $=id=>document.getElementById(id);
let sequence=null,clip=null,assets=new Map(),selectedStep=null,editingStep=null,editingMoment=null;
let stepDirty=false,busy=false,revision=0,generation=0,controller=null;
let selectedCalibration=null;
let visualScanner=null;
const status=message=>{$('status').textContent=message;};
const uid=prefix=>prefix+'-'+crypto.randomUUID();
const time=value=>value.toFixed(3)+' s';
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function button(label,action,className='quiet'){const node=element('button',label,className);node.type='button';node.addEventListener('click',action);return node;}
function beginIO(){controller?.abort();controller=new AbortController();busy=true;const request={generation:++generation,signal:controller.signal};syncButtons();return request;}
const current=request=>request.generation===generation&&!request.signal.aborted;
function endIO(request){if(current(request)){busy=false;controller=null;syncButtons();}}
function commit(next){sequence=validateSequence(next);revision++;render();}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const calibrationMoment=()=>sequence?.moments.find(m=>m.id===selectedCalibration);
function releaseVideo(loaded){
  if(loaded)for(const event of ['seeking','seeked'])loaded.video.removeEventListener(event,syncButtons);
  releaseLocalVideo(loaded);
}
function syncButtons(){
  visualScanner?.sync();
  const seeking=Boolean(clip?.video.seeking);
  $('capture-moment').disabled=busy||(!editingMoment&&(seeking||!clip||!sequence||sequence.moments.length>=MAX_MOMENTS));
  $('capture-moment').textContent=editingMoment?'Save moment notes':seeking?'Waiting for video…':'Retain this moment';
  $('moment-time').disabled=Boolean(editingMoment);$('cancel-moment').hidden=!editingMoment;
  $('use-playhead').disabled=busy||seeking||!clip||Boolean(editingMoment);
  $('save-step').disabled=busy||!sequence||sequence.moments.length<2;
  $('export-sequence').disabled=busy||!sequence?.steps.length||stepDirty||Boolean(editingMoment);
  $('draft-status').textContent=stepDirty?'Unsaved step draft. Save or clear it before exporting.':editingStep?'Editing the selected step. Its retained frame identities stay unchanged.':sequence?.moments.length>=2?'Choose the evidence, then describe the intended change.':'Retain two moments to explain a change.';
  for(const button of document.querySelectorAll('.moment-actions button,.detail-heading button'))button.disabled=busy;
  const moment=calibrationMoment(),task=moment?.calibratedTask;
  $('calibration-moment').disabled=!sequence?.moments.length;$('moment-annotations').disabled=!moment;
  $('save-moment-png').disabled=busy||!moment;$('remove-moment-task').disabled=busy||!task;
  for(const id of ['practice-moment','save-moment-task'])$(id).disabled=busy||!task||stepDirty||Boolean(editingMoment);
}
function fillMomentOptions(select,preferred,fallback){
  select.replaceChildren();for(const moment of sequence?.moments||[]){const option=element('option',moment.label+' · '+time(moment.origin.mediaTimeSeconds));option.value=moment.id;select.append(option);}
  select.value=sequence?.moments.some(m=>m.id===preferred)?preferred:(fallback||'');
}
function resetStepEditor(){
  editingStep=null;stepDirty=false;$('step-editor-heading').textContent='Author a step';
  for(const id of ['step-title','step-intent','step-change','step-sensory','step-recovery'])$(id).value='';
  if(sequence?.moments.length){$('step-before').value=sequence.moments[0].id;$('step-after').value=sequence.moments.at(-1).id;}
  syncButtons();
}
function resetMomentEditor(){editingMoment=null;$('moment-label').value='';$('moment-state').value='';syncButtons();}
function frameFigure(moment,role){
  const figure=element('figure'),image=element('img');image.src=assets.get(moment.id).media.url;image.alt=role+': '+moment.label;
  figure.append(image,element('figcaption',role+' · '+moment.label+' · presented '+time(moment.origin.mediaTimeSeconds)+(moment.visibleState?' — '+moment.visibleState:'')));return figure;
}
function showStepEditor(step){
  editingStep=step.id;selectedStep=step.id;stepDirty=false;
  $('step-before').value=step.beforeMomentId;$('step-after').value=step.afterMomentId;
  for(const [id,key] of [['step-title','title'],['step-intent','intent'],['step-change','visibleChange'],['step-sensory','sensoryCue'],['step-recovery','recoveryCue']])$(id).value=step[key];
  $('step-editor-heading').textContent='Revise this step';renderDetail();syncButtons();$('step-editor-heading').scrollIntoView({block:'nearest'});
}
function renderDetail(){
  const container=$('step-detail');container.replaceChildren();$('steps').replaceChildren();
  if(!sequence?.steps.length){container.append(element('p','Save an authored step to compare its before and after evidence.','empty'));$('account-gaps').textContent='';return;}
  const found=sequenceFindings(sequence),step=sequence.steps.find(s=>s.id===selectedStep)||sequence.steps[0];selectedStep=step.id;
  for(const item of sequence.steps){const tab=button(item.title,()=>{selectedStep=item.id;renderDetail();});tab.setAttribute('aria-pressed',String(item.id===selectedStep));$('steps').append(tab);}
  const before=sequence.moments.find(m=>m.id===step.beforeMomentId),after=sequence.moments.find(m=>m.id===step.afterMomentId);
  const heading=element('div',undefined,'detail-heading'),actions=element('div',undefined,'actions');heading.append(element('h3',step.title));
  actions.append(button('Revise step',()=>showStepEditor(step)),button('Remove step',()=>{
    try{const next=removeStep(sequence,step.id);if(editingStep===step.id)resetStepEditor();selectedStep=null;commit(next);status('Step removed. Its source moments remain available.');}catch(e){status(e.message);}
  }));heading.append(actions);container.append(heading);
  container.append(element('p','Time between retained frames: '+time(after.origin.mediaTimeSeconds-before.origin.mediaTimeSeconds)+'. This interval does not identify the exact action onset or completion.','note'));
  const comparison=element('div',undefined,'compare-grid');comparison.append(frameFigure(before,'Before'),frameFigure(after,'After'));container.append(comparison);
  const account=element('dl');for(const [label,key] of [['Intended result','intent'],['Visible change','visibleChange'],['Supplied sensory cue','sensoryCue'],['Recovery cue','recoveryCue']])account.append(element('dt',label),element('dd',step[key]||'Not supplied by the author.'));container.append(account);
  const missing=found.steps.find(s=>s.id===step.id).missingAccount.length;
  $('account-gaps').textContent=(missing?missing+' parts of this account remain unsupplied. ':'')+(found.overlappingSteps.length?found.overlappingSteps.length+' overlapping step intervals are retained; order alone does not establish cause. ':'')+(found.unassignedMoments.length?found.unassignedMoments.length+' retained moments are not yet linked to a step.':'');
  syncButtons();
}
function render(){
  const before=$('step-before').value,after=$('step-after').value;
  fillMomentOptions($('step-before'),before,sequence?.moments[0]?.id);
  fillMomentOptions($('step-after'),stepDirty||editingStep?after:null,sequence?.moments.at(-1)?.id);
  $('moment-count').textContent=(sequence?.moments.length||0)+' / '+MAX_MOMENTS;
  $('moments').replaceChildren();
  if(!sequence?.moments.length)$('moments').append(element('p','Retained frames will appear here in presented-time order.','empty'));
  for(const moment of sequence?.moments||[]){
    const card=element('article',undefined,'moment-card'),image=element('img');image.src=assets.get(moment.id).media.url;image.alt=moment.label;
    const body=element('div',undefined,'moment-body');body.append(element('h3',moment.label),element('p','Presented '+time(moment.origin.mediaTimeSeconds)+' · requested '+time(moment.origin.requestedTimeSeconds)),element('p',moment.visibleState||'Visible state not yet described.'));
    const actions=element('div',undefined,'moment-actions');
    actions.append(button('Use as before',()=>{$('step-before').value=moment.id;stepDirty=true;revision++;syncButtons();}),button('Use as after',()=>{$('step-after').value=moment.id;stepDirty=true;revision++;syncButtons();}),
      button('Edit notes',()=>{editingMoment=moment.id;$('moment-label').value=moment.label;$('moment-state').value=moment.visibleState;$('moment-time').value=moment.origin.requestedTimeSeconds;syncButtons();$('moment-label').focus();}),
      button('Calibrate / practice',()=>{selectedCalibration=moment.id;revision++;renderCalibration();syncButtons();$('calibration-heading').scrollIntoView({block:'start'});}),
      button('Remove',()=>{try{const next=removeMoment(sequence,moment.id),old=assets.get(moment.id);assets.delete(moment.id);if(editingMoment===moment.id)resetMomentEditor();commit(next);releaseImage(old.media);status('Moment removed. Remaining source identities are unchanged.');}catch(e){status(e.message);}}));
    body.append(actions);card.append(image,body);$('moments').append(card);
  }
  const identity=sequence?{clip:sequence.clip,frames:sequence.moments.map(m=>({id:m.id,imageSha256:m.image.sha256,presentedSeconds:m.origin.mediaTimeSeconds,requestedSeconds:m.origin.requestedTimeSeconds}))}:null;
  $('source-identity').textContent=identity?JSON.stringify(identity,null,2):'No source retained.';
  $('clip-summary').textContent=clip?clip.identity.name+' · '+time(clip.identity.durationSeconds)+' · original file paired.':sequence?'Saved frames are available. Choose the matching original clip to retain another moment.':'The video and retained images stay in your browser.';
  renderDetail();renderCalibration();syncButtons();
}
function renderCalibration(){
  if(!sequence?.moments.some(m=>m.id===selectedCalibration))selectedCalibration=sequence?.moments.at(-1)?.id||null;
  fillMomentOptions($('calibration-moment'),selectedCalibration,selectedCalibration);
  const moment=calibrationMoment(),task=moment?.calibratedTask,preview=$('calibration-preview');
  preview.replaceChildren();preview.hidden=!moment;$('calibration-marks').replaceChildren();
  $('calibration-source').textContent=moment?moment.label+' · presented '+time(moment.origin.mediaTimeSeconds)+' · requested '+time(moment.origin.requestedTimeSeconds)+'. The saved PNG is byte-for-byte the retained frame.':'Retain a source moment to begin.';
  $('calibration-summary').textContent=task?`${task.landmarks.length} calibrated mark${task.landmarks.length===1?'':'s'} · supplied workpiece ${task.source.widthMm} × ${task.source.heightMm} mm. Timeline and authored account remain attached.`:'No calibrated task attached.';
  if(!moment)return;
  const image=element('img');image.src=assets.get(moment.id).media.url;image.alt='Retained source for '+moment.label;preview.append(image);
  if(!task)return;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`);svg.setAttribute('aria-hidden','true');
  const radius=Math.max(moment.image.widthPx,moment.image.heightPx)/55;
  task.landmarks.forEach((mark,i)=>{
    const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',mark.sourcePx.x);circle.setAttribute('cy',mark.sourcePx.y);circle.setAttribute('r',radius);
    const label=document.createElementNS(ns,'text');label.setAttribute('x',mark.sourcePx.x);label.setAttribute('y',mark.sourcePx.y);label.setAttribute('font-size',radius*1.1);label.textContent=String(i+1);svg.append(circle,label);
    const meaning=mark.kind==='fraction'?'Proportional position':`Fixed ${mark.edge} clearance`;
    const item=element('li',mark.label);item.append(element('small',`${meaning} · tolerance ${mark.toleranceMm} mm · source (${mark.sourcePx.x}, ${mark.sourcePx.y}) px`));$('calibration-marks').append(item);
  });preview.append(svg);
}
function currentMomentTask(){return momentTask({...sequence,title:$('sequence-title').value,context:$('sequence-context').value},selectedCalibration);}
$('calibration-moment').addEventListener('change',()=>{selectedCalibration=$('calibration-moment').value;revision++;renderCalibration();syncButtons();});
$('save-moment-png').addEventListener('click',async()=>{
  const moment=calibrationMoment();if(!moment)return;const request=beginIO(),version=revision;
  try{const blob=await exportMomentFrame(moment,assets.get(moment.id),{signal:request.signal});if(!current(request))return;
    if(version!==revision){status('The selected account changed while saving. Save the current moment again.');return;}
    download(blob,moment.id+'.png');status('Saved the exact retained PNG. Open it in Source capture, then attach the exported annotations here.');
  }catch(error){reportFailure(request,error);}finally{endIO(request);}
});
$('moment-annotations').addEventListener('change',async()=>{
  const input=$('moment-annotations'),file=input.files[0],momentId=selectedCalibration;if(!file||!momentId)return;
  const request=beginIO(),version=revision;
  try{if(file.size<1||file.size>MAX_ANNOTATION_BYTES)throw Error('Choose annotations up to 256 KiB.');
    const text=await file.text();if(!current(request))return;
    if(version!==revision){status('The account changed while reading annotations. Current work was preserved; attach again when ready.');return;}
    const next=attachMomentCalibration(sequence,momentId,JSON.parse(text));commit(next);status('Calibrated annotations attached to the exact retained moment. Save the sequence to retain them with its PNG.');
  }catch(error){reportFailure(request,error);}finally{if(input.files[0]===file)input.value='';endIO(request);}
});
$('remove-moment-task').addEventListener('click',()=>{try{commit(removeMomentCalibration(sequence,selectedCalibration));status('Annotations removed. The original frame, timeline and authored steps remain.');}catch(error){status(error.message);}});
$('save-moment-task').addEventListener('click',()=>{try{download(new Blob([JSON.stringify(currentMomentTask(),null,2)],{type:'application/json'}),'sequence-moment-task.json');status('Saved the calibrated task with its exact frame identity and current authored step context.');}catch(error){status(error.message);}});
$('practice-moment').addEventListener('click',()=>{
  const key='skill-translator-practice-input/v1';let previous=null,wrote=false;
  try{const demo=currentMomentTask(),widthMm=demo.source.widthMm,heightMm=demo.source.heightMm;createPractice(demo,widthMm,heightMm);
    previous=sessionStorage.getItem(key);sessionStorage.setItem(key,JSON.stringify({demo,widthMm,heightMm,mirrored:false,showGoals:false}));wrote=true;
    const page=window.open('/practice','_blank');if(!page)throw Error('The new practice tab was blocked. Save the task source and open it in Practice.');page.opener=null;
    status('Practice opened in a new tab. This sequence remains here; practice assesses only the selected geometric state.');
  }catch(error){if(wrote){if(previous===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,previous);}status(error.message);}
});
function reportFailure(request,error){if(current(request))status(error.message);}
$('clip-file').addEventListener('change',async()=>{
  const file=$('clip-file').files[0];if(!file)return;const request=beginIO();let candidate;
  try{
    candidate=await loadLocalVideo(file);if(!current(request)){releaseVideo(candidate);return;}
    const next=sequence?(assertSequenceClip(sequence,candidate.identity),sequence):createSequence(candidate.identity,{title:$('sequence-title').value,context:$('sequence-context').value});
    const previous=clip;clip=candidate;candidate=null;
    for(const event of ['seeking','seeked'])clip.video.addEventListener(event,syncButtons);
    $('video-host').replaceChildren(clip.video);releaseVideo(previous);
    visualScanner.receiveClip();
    $('moment-time').max=String(Math.max(0,clip.identity.durationSeconds-.001));commit(next);status('Original clip ready. Retain moments before and after a meaningful change.');
  }catch(error){if(candidate)releaseVideo(candidate);reportFailure(request,error);}finally{endIO(request);}
});
$('capture-moment').addEventListener('click',async()=>{
  if(editingMoment){
    try{const next=editMoment(sequence,editingMoment,{label:$('moment-label').value,visibleState:$('moment-state').value});resetMomentEditor();commit(next);status('Moment notes revised. Its PNG and frame-time record are unchanged.');}catch(e){status(e.message);}return;
  }
  if(!clip||!sequence)return;
  const request=beginIO(),version=revision,requested=Number($('moment-time').value),label=$('moment-label').value||'Moment '+(sequence.moments.length+1),visibleState=$('moment-state').value;let media;
  try{
    if(!$('moment-time').value.trim())throw Error('Enter a requested frame time.');
    const captured=await capturePresentedFrame(clip,requested,{signal:request.signal});if(!current(request))return;
    if(version!==revision){status('The account changed while capturing. Retain the moment again with the current notes.');return;}
    const total=[...assets.values()].reduce((sum,a)=>sum+a.file.size,0)+captured.file.size;if(total>MAX_FRAME_BYTES)throw Error('Retained PNG files exceed the 32 MB sequence budget.');
    media=await loadLocalImage(captured.file);if(!current(request)){releaseImage(media);return;}
    if(version!==revision){releaseImage(media);media=null;status('The account changed while capturing. Retain the moment again with the current notes.');return;}
    const moment={id:uid('moment'),label,visibleState,image:media.image,origin:frameOrigin(clip.identity,captured.requestedTimeSeconds,captured.metadata,media.image)};
    const next=appendMoment(sequence,moment);assets.set(moment.id,{file:captured.file,media});media=null;resetMomentEditor();commit(next);
    status('Retained '+label+' at presented '+time(moment.origin.mediaTimeSeconds)+' (requested '+time(requested)+').');
  }catch(error){if(media)releaseImage(media);reportFailure(request,error);}finally{endIO(request);}
});
$('cancel-moment').addEventListener('click',()=>{resetMomentEditor();status('Moment note edit cancelled.');});
$('use-playhead').addEventListener('click',()=>{
  if(!clip||busy||editingMoment)return;clip.video.pause();
  const selected=Math.min(clip.video.currentTime,Math.max(0,clip.identity.durationSeconds-.001));
  $('moment-time').value=selected.toFixed(3);revision++;
  status('Requested time set from the video playhead. Retain this moment to preserve its actual presented frame.');
});
for(const id of ['step-before','step-after','step-title','step-intent','step-change','step-sensory','step-recovery'])$(id).addEventListener('input',()=>{stepDirty=true;revision++;syncButtons();});
for(const id of ['sequence-title','sequence-context','moment-time','moment-label','moment-state'])$(id).addEventListener('input',()=>{revision++;});
$('cancel-step').addEventListener('click',()=>{resetStepEditor();revision++;status('Step draft cleared. Saved steps are unchanged.');});
$('save-step').addEventListener('click',()=>{
  if(!sequence)return;
  try{
    const id=editingStep||uid('step'),next=upsertStep(sequence,{id,beforeMomentId:$('step-before').value,afterMomentId:$('step-after').value,title:$('step-title').value,intent:$('step-intent').value,visibleChange:$('step-change').value,sensoryCue:$('step-sensory').value,recoveryCue:$('step-recovery').value});
    selectedStep=id;resetStepEditor();commit(next);status('Authored step saved. Inspect its before and after evidence below.');
  }catch(error){status(error.message);}
});
$('sequence-file').addEventListener('change',async()=>{
  const file=$('sequence-file').files[0];if(!file)return;const request=beginIO(),version=revision;let candidate;
  try{
    candidate=await readSequenceBundle(file,{signal:request.signal});if(!current(request)){releaseSequenceAssets(candidate.assets);return;}
    if(version!==revision){releaseSequenceAssets(candidate.assets);candidate=null;status('The account changed while reopening. Your current work was preserved; reopen again when ready.');return;}
    let matching=false;if(clip){try{assertSequenceClip(candidate.sequence,clip.identity);matching=true;}catch{}}
    if(clip&&!matching){releaseVideo(clip);clip=null;visualScanner.clear();$('video-host').replaceChildren(element('p','Choose the original clip to retain more moments.'));}
    const old=assets;assets=candidate.assets;const next=candidate.sequence;candidate=null;
    selectedStep=next.steps[0]?.id||null;sequence=next;resetMomentEditor();resetStepEditor();
    $('sequence-title').value=next.title;$('sequence-context').value=next.context;commit(next);releaseSequenceAssets(old);
    status('Reopened '+next.moments.length+' verified source frames and '+next.steps.length+' authored steps. Findings were recomputed.');
  }catch(error){if(candidate)releaseSequenceAssets(candidate.assets);reportFailure(request,error);}finally{endIO(request);}
});
$('export-sequence').addEventListener('click',async()=>{
  if(!sequence||stepDirty||editingMoment)return;
  let next;try{next=validateSequence({...sequence,title:$('sequence-title').value,context:$('sequence-context').value});commit(next);}catch(error){status(error.message);return;}
  const request=beginIO(),version=revision,snapshot=new Map(assets);
  try{
    const blob=await makeSequenceBundle(next,snapshot,{signal:request.signal});if(!current(request))return;
    if(version!==revision){status('Work changed while saving. Save again to include the current account.');return;}
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='demonstration-sequence.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status('Saved the authored account with its exact retained PNG frames. Keep the original video separately.');
  }catch(error){reportFailure(request,error);}finally{endIO(request);}
});
$('clear-sequence').addEventListener('click',()=>{
  controller?.abort();generation++;controller=null;busy=false;releaseVideo(clip);clip=null;releaseSequenceAssets(assets);assets=new Map();sequence=null;selectedStep=null;revision++;
  visualScanner.clear();
  $('video-host').replaceChildren(element('p','Local video preview'));$('clip-file').value='';$('sequence-file').value='';
  $('sequence-title').value='A task explained through its changes';$('sequence-context').value='';$('moment-time').value='0';
  resetMomentEditor();resetStepEditor();render();status('New demonstration. Choose its original clip.');
});
window.addEventListener('pagehide',event=>{if(!event.persisted){controller?.abort();releaseVideo(clip);releaseSequenceAssets(assets);}});
visualScanner=createVisualScanner({getClip:()=>clip,isBusy:()=>busy,canSelect:()=>!editingMoment,
  beginIO,isCurrent:current,endIO,
  cancelIO:request=>{if(current(request)){controller?.abort();generation++;controller=null;busy=false;syncButtons();}},
  onSelect:seconds=>{
    clip.video.pause();clip.video.currentTime=seconds;$('moment-time').value=String(seconds);revision++;
    syncButtons();
    $('moment-time').focus();status('Inspect the sampled time in the clip, then retain the original frame you need.');
  }});
render();
