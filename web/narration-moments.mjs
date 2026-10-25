import {createClockControls} from './narration-clock.mjs';
import {MAX_TRANSCRIPT_BYTES,parseNarration} from '/src/timed-narration.mjs';
import {createNarrationNavigation,narrationMomentCandidates,requestedNarrationMoment,importNarrationNavigation,narrationNavigationSource} from '/src/narration-moments.mjs';
export function createNarrationNavigator({getClip,isBusy,canSelect,onSelect}){
 const $=id=>document.getElementById('narration-'+id);
 let clipSession=null,navigation=null,draftText=null,revision=0,viewRevision=0,page=0,dirty=false;
 const status=text=>{$('status').textContent=text;};
 const clock=createClockControls({host:$('offset').parentElement.insertBefore(document.createElement('div'),$('pair').parentElement),onDirty:markDirty});
 const saved=document.createElement('input');saved.type='file';saved.accept='.json,application/json';saved.id='narration-navigation-file';
 const savedLabel=document.createElement('label');savedLabel.htmlFor=saved.id;savedLabel.textContent='Reopen saved narration navigation for this clip';
 const save=document.createElement('button');save.type='button';save.className='quiet';save.id='narration-navigation-save';save.textContent='Save narration and clock declarations';
 $('results').before(savedLabel,saved,save);
 save.addEventListener('click',()=>{
  if(blocked()||dirty||!navigation)return;
  const value=importNarrationNavigation(navigation,getClip().identity),serialized=JSON.stringify(value,null,2);
  if(new TextEncoder().encode(serialized).length>2*1024*1024){status('Saved navigation exceeds 2 MiB; no source discarded.');return;}
  const url=URL.createObjectURL(new Blob([serialized],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='narration-navigation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 saved.addEventListener('change',async()=>{
  const file=saved.files[0],snapshot=getClip();if(!file||!snapshot||blocked())return;
  const version=++revision;
  try{
   if(file.size>2*1024*1024)throw Error('Keep saved navigation within 2 MiB.');
   const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(version!==revision||snapshot!==getClip())return;
   const next=importNarrationNavigation(JSON.parse(text),snapshot.identity),original=narrationNavigationSource(next);
   navigation=next;draftText=original.transcript;$('file').value='';$('attribution').value=original.attribution;$('offset').value=original.offsetSeconds;clock.restore(next.clock);clock.report(next.clock,snapshot.identity.durationSeconds);dirty=false;page=0;
   if(render())status('Saved narration paired to this exact original clip; timing recomputed from retained inputs.');
  }catch(error){if(version===revision&&snapshot===getClip())status('Saved navigation refused: '+error.message);}
  controls();
 });
 function blocked(){return !getClip()||isBusy()||getClip().video.seeking||!canSelect();}
 function controls(){
  const busy=blocked();clock.sync(busy);saved.disabled=busy;save.disabled=busy||dirty||!navigation;
  for(const id of ['file','attribution','offset'])$(id).disabled=busy;
  $('pair').disabled=busy||draftText===null;$('discard').disabled=busy||!navigation||!dirty;
  $('search').disabled=busy||!navigation||dirty;
  for(const button of $('results').querySelectorAll('button[data-choice]'))button.disabled=busy||dirty||button.dataset.available!=='true';
  $('previous').disabled=busy||dirty||!navigation||page===0;
  $('next').disabled=busy||dirty||!navigation||$('next').dataset.last==='true';
 }
 function reset(next){
  revision++;viewRevision++;clock.restore(null);saved.value='';clipSession=next;navigation=null;draftText=null;page=0;dirty=false;
  $('file').value='';$('attribution').value='';$('offset').value='0';$('search').value='';$('results').replaceChildren();$('count').textContent='No narration paired.';$('next').dataset.last='true';
  status(next?'Choose the supplied narration for this original clip.':'Load the original clip in the studio before pairing narration.');
 }
 function sync(){if(getClip()!==clipSession)reset(getClip());controls();}
 function markDirty(){revision++;dirty=true;status('Unpaired narration settings. Pair them, or discard the draft to keep navigating the accepted transcript.');controls();}
 for(const id of ['attribution','offset'])$(id).addEventListener('input',markDirty);
 $('file').addEventListener('change',async()=>{
  const file=$('file').files[0],snapshot=getClip();if(!file||!snapshot)return;
  const version=++revision;draftText=null;dirty=true;status('Reading transcript…');controls();
  try{
   if(file.size<1||file.size>MAX_TRANSCRIPT_BYTES)throw Error('Choose a UTF-8 WebVTT file up to 256 KiB.');
   const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());
   if(version!==revision||snapshot!==getClip())return;
   parseNarration(text);draftText=text;dirty=true;status('Transcript read. Declare its attribution and timeline offset, then pair.');controls();
  }catch(error){if(version===revision&&snapshot===getClip()){status('Transcript refused: '+error.message);controls();}}
 });
 $('pair').addEventListener('click',()=>{
  revision++;try{
   if(blocked()||draftText===null)throw Error('Wait for the original clip and choose a transcript.');
   if(!$('offset').value.trim())throw Error('Declare the offset, including zero.');
   const next=createNarrationNavigation(getClip().identity,{text:draftText,attribution:$('attribution').value,offsetSeconds:Number($('offset').value),clock:clock.read()});
   navigation=next;dirty=false;page=0;clock.report(next.clock,getClip().identity.durationSeconds);
   if(render())status('Narration paired to the current original clip. A candidate time is a request, not a captured frame timestamp.');
  }catch(error){status('Pairing refused: '+error.message);controls();}
 });
 $('discard').addEventListener('click',()=>{
  if(!navigation)return;revision++;const original=narrationNavigationSource(navigation);draftText=original.transcript;$('file').value='';$('attribution').value=original.attribution;$('offset').value=original.offsetSeconds;clock.restore(navigation.clock);clock.report(navigation.clock,getClip().identity.durationSeconds);dirty=false;
  if(render())status('Draft discarded. The accepted transcript and timing remain paired.');
 });
 $('search').addEventListener('input',()=>{revision++;page=0;render();});
 $('previous').addEventListener('click',()=>{if(page>0){revision++;page--;render();}});
 $('next').addEventListener('click',()=>{revision++;page++;render();});
 function render(){
  if(!navigation)return false;const version=++viewRevision,snapshot=getClip();
  try{
   const found=narrationMomentCandidates(navigation,snapshot.identity,{query:$('search').value,page});
   $('count').textContent=found.matches+' of '+found.totalCues+' cues match. Page '+(page+1)+' of '+found.pages+'.';$('next').dataset.last=String(page===found.pages-1);
   $('results').replaceChildren(...found.cues.map(cue=>{
    const article=document.createElement('article'),heading=document.createElement('p'),text=document.createElement('p'),actions=document.createElement('div');
    heading.textContent='Cue '+(cue.index+1)+(cue.id?' · '+cue.id:'')+' · transcript '+cue.startSeconds+'–'+cue.endSeconds+' s → clip '+cue.alignedStartSeconds+'–'+cue.alignedEndSeconds+' s'+(cue.extrapolated?' · cue extends beyond fitting landmarks':'');
    text.className='narration-cue-text';text.textContent=cue.text;actions.className='actions';
    for(const option of cue.options){
     const button=document.createElement('button');button.type='button';button.className='quiet';button.dataset.choice=option.kind;button.dataset.cue=String(cue.index);button.dataset.available=String(option.available);
     button.textContent='Preview '+option.kind+' · '+option.seconds+' s'+(option.available?'':' · outside clip');if(option.reason)button.title=option.reason;
     button.addEventListener('click',()=>{
      if(version!==viewRevision||snapshot!==getClip()||dirty||blocked())return;
      try{const choice=requestedNarrationMoment(navigation,getClip().identity,cue.index,option.kind);onSelect(choice.requestedSeconds);status('Requested '+choice.requestedSeconds+' s from cue '+(cue.index+1)+(choice.extrapolated?' (extrapolated)':'')+'. Inspect the video, then use Retain this moment. The captured presented time may differ.');controls();}
      catch(error){status('Preview refused: '+error.message);}
     });actions.append(button);
    }
    article.append(heading,text,actions);return article;
   }));
   if(!found.matches)$('results').textContent='No cue matches these literal words. Clear the search to inspect all narration.';controls();return true;
  }catch(error){$('results').replaceChildren();$('count').textContent='Navigation unavailable; inspect clock check.';$('next').dataset.last='true';status('Navigation refused: '+error.message);controls();return false;}
 }
 sync();return {sync};
}
