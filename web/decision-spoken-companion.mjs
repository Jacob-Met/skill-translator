import {validateSequence} from '/src/demonstration-sequence.mjs';
import {readSpokenExplanationBundle,releaseExplanationAssets} from '/web/spoken-explanation-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
export function sameCompanionSource(a,b){return JSON.stringify(validateSequence(a))===JSON.stringify(validateSequence(b));}
export function mountDecisionSpokenCompanion(anchor,{read=readSpokenExplanationBundle}={}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const host=el('section'),title=el('h3','Hear a separately supplied explanation'),note=el('p','Optional: pair the complete explanation notebook for this exact demonstration. Recordings are supplied accounts with their own clock, not original demonstration sound or an answer key.'),label=el('label','Open explanation notebook · up to 64 MiB'),input=el('input'),status=el('p'),cards=el('div'),remove=el('button','Unpair explanations');
 host.id='decision-spoken-companion';host.hidden=true;input.type='file';input.accept='.json,application/json';input.id='spoken-companion-file';label.append(input);status.setAttribute('role','status');remove.type='button';host.append(title,note,label,status,cards,remove,el('p','Practice downloads do not include this optional companion. Keep its notebook and pair it again after reopening practice. Listening adds no score or event to your retained responses.'));anchor.after(host);
 let context=null,accepted=null,controller=null,epoch=0;
 const release=value=>{if(value){releaseSequenceAssets(value.accepted.assets);releaseExplanationAssets(value.audioAssets);}};
 function retire(){epoch++;controller?.abort();controller=null;for(const player of cards.querySelectorAll('audio')){player.pause();player.removeAttribute('src');player.load();}cards.replaceChildren();}
 const available=()=>context?.revealed&&!context.busy&&!document.hidden;
 function draw(){
  retire();host.hidden=!available();if(host.hidden)return;
  input.disabled=false;remove.disabled=!accepted;status.textContent=accepted?'Companion checked. Choose an explanation to play.':'No companion paired.';
  if(!accepted)return;
  const entries=accepted.notebook.explanations.filter(x=>x.stepId===context.stepId),ticket=epoch;
  if(!entries.length)cards.append(el('p','No supplied recording is attached to this revealed step.'));
  for(const entry of entries){const asset=accepted.audioAssets.get(entry.audio.sha256),card=el('article'),player=el('audio');player.controls=true;player.preload='none';player.src=asset.url;player.setAttribute('aria-label','Explanation supplied by '+entry.attribution);
   const current=()=>ticket===epoch&&available()&&card.isConnected&&player.getAttribute('src')===asset.url;
   player.addEventListener('play',()=>{if(!current()){player.pause();return;}if(player.paused||player.currentSrc!==asset.url)return;for(const other of cards.querySelectorAll('audio'))if(other!==player)other.pause();});
   player.addEventListener('error',()=>{if(current())status.textContent='Playback unavailable. Retained notebook and practice responses are unchanged.';});
   card.append(el('h4',entry.attribution),el('p',entry.description||'No written description supplied.'),player,el('p',`Separate recording · ${asset.durationSeconds.toFixed(2)} s`));cards.append(card);
  }
 }
 input.addEventListener('change',async()=>{
  const file=input.files[0];input.value='';if(!file||!available())return;
  retire();const mine=epoch,source=context.source,step=context.stepId;const abort=new AbortController();controller=abort;input.disabled=true;status.textContent='Checking every original frame and audio byte…';let next;
  try{next=await read(file,{signal:abort.signal});if(mine!==epoch||abort.signal.aborted||!available()||context.source!==source||context.stepId!==step){release(next);return;}
   if(!sameCompanionSource(source,next.accepted.sequence))throw Error('The notebook belongs to a different complete demonstration.');
   release(accepted);accepted=next;next=null;draw();
  }catch(e){release(next);if(mine===epoch){draw();status.textContent='Companion refused: '+e.message+' Previously paired notebook is retained.';}}
 });
 remove.onclick=()=>{retire();release(accepted);accepted=null;draw();};
 const visibility=()=>draw(),hide=()=>{retire();host.hidden=true;};document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',visibility);
 return {render(next){if(context?.source!==next?.source){retire();release(accepted);accepted=null;}context=next;draw();},suspend(){if(context)context={...context,busy:true};draw();},reset(){retire();release(accepted);accepted=null;draw();},dispose(){retire();release(accepted);accepted=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',visibility);host.remove();}};
}
