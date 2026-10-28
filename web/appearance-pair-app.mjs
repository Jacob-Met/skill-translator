import {FORMAT as TRIPLET_FORMAT,defaultAppearanceTriplet} from '/src/appearance-triplet.mjs';
import {readAppearanceCompositionInput,makeAppearanceTripletSamples,makeAppearanceTripletBundle} from '/web/appearance-triplet-input.mjs';
import {renderAppearanceTripletResult} from '/web/appearance-triplet-view.mjs';
import {defaultAppearanceRequest} from '/src/appearance-pair.mjs';
import {readAppearanceInput,makeAppearanceSamples,makeAppearanceBundle,releaseAppearanceInput} from '/web/appearance-pair-input.mjs';
import {renderAppearancePairResult} from '/web/appearance-pair-view.mjs';
import {receiveAppearanceHandoff} from '/web/decision-handoff.mjs';

const $=id=>document.getElementById(id);
const ui={mode:$('comparison-mode'),middle:$('middle'),file:$('source-file'),before:$('before'),after:$('after'),width:$('width'),radius:$('radius'),compute:$('compute'),cancel:$('cancel'),save:$('save'),status:$('status'),result:$('result'),settings:$('settings')};
let loaded=null,revision=0,controller=null,worker=null,result=null,busy=false;
let cancelHandoff=()=>{},handoffActive=new URLSearchParams(location.hash.slice(1)).has('source');
const downloads=new Set();
const moments=()=>loaded?[...loaded.sequence.moments].sort((a,b)=>a.origin.mediaTimeSeconds-b.origin.mediaTimeSeconds):[];
const hasPair=()=>{const rows=moments();return rows.length>=2&&rows.some(m=>m.origin.mediaTimeSeconds>rows[0].origin.mediaTimeSeconds);};
function status(state,message){ui.status.dataset.state=state;ui.status.textContent=message;}
const triple=()=>ui.mode.value==='triplet';
function render(){if(result?.source.format===TRIPLET_FORMAT)renderAppearanceTripletResult(ui.result,result,{onPage:page});else renderAppearancePairResult(ui.result,result);}
function page(offset,limit){if(!worker||busy||!result)return;busy=true;controls();status('computing','Finding the requested page of complete additive combinations…');worker.postMessage({type:'page',requestId:revision,source:result.source,page:{offset,limit}});}
function controls(){ $('middle-choice').hidden=!triple();$('middle-figure').hidden=!triple();ui.settings.disabled=!loaded;ui.compute.disabled=!loaded||!hasPair()||busy;ui.cancel.disabled=!busy;ui.save.disabled=!result||busy;}
function retire(){
  revision++;controller?.abort();controller=null;worker?.terminate();worker=null;busy=false;result=null;
  renderAppearancePairResult(ui.result,null);controls();return revision;
}
function clearSource(){
  for(const key of ['before','middle','after']){ui[key].replaceChildren();const image=$(key+'-image');image.removeAttribute('src');image.hidden=true;image.alt='';$(key+'-caption').textContent=key==='before'?'First original frame':'Later original frame';}
  $('source-details').textContent='No source open.';$('source-name').textContent='Choose a complete exported sequence with original PNGs.';
  $('sample-details').textContent='The sample preserves the whole-frame aspect ratio. Settings belong to the measurement.';
}
function releaseCurrent(){if(loaded)releaseAppearanceInput(loaded);loaded=null;clearSource();controls();}
function stopHandoff(){handoffActive=false;const cancel=cancelHandoff;cancelHandoff=()=>{};cancel();}
function finish(ticket,state,message){
  if(ticket!==revision)return false;
  if(result?.source.format!==TRIPLET_FORMAT){worker?.terminate();worker=null;}controller=null;busy=false;status(state,message);controls();return true;
}
function fail(ticket,error,fallback='The comparison could not run. Try again.'){
  if(ticket!==revision)return;
  result=null;renderAppearancePairResult(ui.result,null);
  finish(ticket,'error',error?.message||fallback);
}
function preview(){
  for(const key of ['before','middle','after']){
    const m=loaded?.sequence.moments.find(m=>m.id===ui[key].value),asset=m&&loaded.assets.get(m.id),image=$(key+'-image');
    if(!m||!asset){image.removeAttribute('src');image.hidden=true;continue;}
    image.src=asset.media.url;image.hidden=false;image.alt=(key==='before'?'First':'Later')+' original frame at '+m.origin.mediaTimeSeconds+' seconds';
    $(key+'-caption').textContent=(m.label||m.id)+' · '+m.origin.mediaTimeSeconds+' s · '+m.image.widthPx+' × '+m.image.heightPx+' original pixels';
  }
  if(!loaded)return;
  try{
    const q=selected().request;
    $('sample-details').textContent='Whole-frame sample: '+q.widthPx+' × '+q.heightPx+' pixels. Shared search support: '+q.support.width+' × '+q.support.height+' pixels, with shifts from −'+q.radius+' to +'+q.radius+' in each direction. Changing settings defines a new comparison.';
  }catch(error){$('sample-details').textContent=error.message;}
}
function selected(){
  const settings={widthPx:ui.width.valueAsNumber,radius:ui.radius.valueAsNumber};return triple()?defaultAppearanceTriplet(loaded.sequence,ui.before.value,ui.middle.value,ui.after.value,settings):defaultAppearanceRequest(loaded.sequence,ui.before.value,ui.after.value,settings);
}
function startingSettings(m){
  if(!m)return {width:160,radius:16};
  const ratio=m.image.heightPx/m.image.widthPx;
  let width=Math.min(160,Math.floor(160/ratio),Math.floor(Math.sqrt(14400/ratio)));
  while(width>0&&(Math.round(width*ratio)>160||width*Math.round(width*ratio)>14400))width--;
  const height=Math.round(width*ratio);
  return {width:Math.max(3,width),radius:Math.max(1,Math.min(16,Math.floor((Math.min(width,height)-3)/2)))};
}
function populate(fileName){
  const rows=moments();
  for(const key of ['before','middle','after']){
    ui[key].replaceChildren();
    for(const m of rows){const option=document.createElement('option');option.value=m.id;option.textContent=m.origin.mediaTimeSeconds+' s · '+(m.label||m.id);ui[key].append(option);}
  }
  const saved=loaded.request?.request;ui.mode.value=loaded.request?.format===TRIPLET_FORMAT?'triplet':'pair';
  const first=rows[0],later=rows.find(m=>m.origin.mediaTimeSeconds>first?.origin.mediaTimeSeconds);
  ui.before.value=saved?.frames[0].momentId||first?.id||'';ui.after.value=saved?.frames.at(-1).momentId||later?.id||first?.id||'';ui.middle.value=(triple()?saved?.frames[1].momentId:null)||rows[1]?.id||first?.id||'';
  const defaults=startingSettings(first);ui.width.value=saved?.widthPx??defaults.width;ui.radius.value=saved?.radius??defaults.radius;
  $('source-name').textContent=fileName+' · '+rows.length+' retained original frame'+(rows.length===1?'':'s')+'.';
  $('source-details').textContent=JSON.stringify(loaded.sequence.clip,null,2);
  preview();controls();
}
async function openSource(file,{signal:handoffSignal}={}){
  const ticket=retire();releaseCurrent();if(!file){status('empty','Open source to begin.');return false;}
  controller=new AbortController();const signal=controller.signal;busy=true;controls();status('loading','Verifying original source and PNGs…');
  const abortHandoff=()=>{if(ticket!==revision)return;retire();releaseCurrent();status('cancelled','Source transfer cancelled. Open source to begin.');};
  handoffSignal?.addEventListener('abort',abortHandoff,{once:true});
  if(handoffSignal?.aborted){abortHandoff();handoffSignal.removeEventListener('abort',abortHandoff);return false;}
  let received;
  try{
    received=await readAppearanceCompositionInput(file,{signal});
    if(ticket!==revision){releaseAppearanceInput(received);return false;}
    if(handoffSignal&&received.request)throw Error('Source Studio must send an original sequence. Open saved comparisons through the file control.');
    loaded=received;received=null;populate(file.name);
    if(!hasPair()){finish(ticket,'error','Retain at least two original frames at different times to compare.');return false;}
    const saved=!!loaded.request;
    finish(ticket,'ready',saved?'Saved source verified. Recomputing its declared comparison…':'Original source verified. Choose two frames and compare them.');
    if(saved)await compute();
    return true;
  }catch(error){if(received)releaseAppearanceInput(received);fail(ticket,error,'The source could not be opened.');return false;}
  finally{handoffSignal?.removeEventListener('abort',abortHandoff);}
}
async function compute(){
  if(!loaded)return;
  const owner=loaded,ticket=retire();controller=new AbortController();const signal=controller.signal;busy=true;controls();
  status('computing','Sampling the original frames and checking every declared shift…');
  try{
    const request=selected(),isTriple=request.format===TRIPLET_FORMAT,samples=await (isTriple?makeAppearanceTripletSamples:makeAppearanceSamples)(owner,request,{signal});
    if(ticket!==revision||owner!==loaded)return;
    const next=new Worker(isTriple?'/web/appearance-triplet-worker.mjs':'/web/appearance-pair-worker.mjs',{type:'module'});worker=next;
    next.onmessage=event=>{
      if(ticket!==revision||worker!==next||(isTriple?event.data?.requestId:event.data?.revision)!==ticket)return;
      try{
        if(event.data.error)throw Error(event.data.error);
        if(event.data.type==='page'){if(!result||JSON.stringify(event.data.source)!==JSON.stringify(result.source))throw Error('Composition changed while paging');result={...result,join:event.data.join};render();finish(ticket,'complete','Complete additive witness page ready.');return;}
        const answer=event.data.result;
        if(!answer||JSON.stringify(answer.source)!==JSON.stringify(samples.source))throw Error('The returned comparison does not match the current source and settings.');
        result=answer;render();
        finish(ticket,'complete',isTriple?'Three directed comparisons and their complete additive join recomputed from original PNGs.':'Comparison recomputed from both original PNGs. Source and settings are ready to save.');
      }catch(error){fail(ticket,error);}
    };
    next.onerror=event=>{event.preventDefault();if(ticket===revision&&worker===next)fail(ticket,new Error('The comparison worker could not run. Try again.'));};
    if(isTriple)next.postMessage({type:'compute',requestId:ticket,source:samples.source,sequence:owner.sequence,samples:samples.samples},samples.samples.map(s=>s.rgba.buffer));
    else next.postMessage({revision:ticket,source:samples.source,sequence:owner.sequence,before:samples.before,after:samples.after},[samples.before.rgba.buffer,samples.after.rgba.buffer]);
  }catch(error){fail(ticket,error);}
}
async function save(){
  if(!loaded||!result||busy)return;
  const owner=loaded,answer=result,ticket=revision;controller=new AbortController();const signal=controller.signal;busy=true;controls();status('complete','Verifying original PNGs for source-only export…');
  try{
    const blob=await (answer.source.format===TRIPLET_FORMAT?makeAppearanceTripletBundle:makeAppearanceBundle)(owner,answer.source,{signal});
    if(ticket!==revision||owner!==loaded||answer!==result)return;
    const url=URL.createObjectURL(blob);downloads.add(url);
    const link=document.createElement('a');link.href=url;link.download=answer.source.format===TRIPLET_FORMAT?'appearance-triplet.json':'appearance-pair.json';document.body.append(link);link.click();link.remove();
    setTimeout(()=>{URL.revokeObjectURL(url);downloads.delete(url);},0);
    finish(ticket,'complete','Saved the complete original sequence and comparison settings. Reopening recomputes the result.');
  }catch(error){fail(ticket,error,'The source could not be saved.');}
}
ui.file.addEventListener('change',()=>{const file=ui.file.files?.[0];ui.file.value='';stopHandoff();void openSource(file);});
for(const input of [ui.mode,ui.before,ui.middle,ui.after,ui.width,ui.radius])input.addEventListener('input',()=>{if(!loaded)return;if(input===ui.mode&&triple()){try{selected();}catch{const rows=moments().filter((m,i,a)=>i===0||m.origin.mediaTimeSeconds>a[i-1].origin.mediaTimeSeconds);if(rows.length>=3){ui.before.value=rows[0].id;ui.middle.value=rows[1].id;ui.after.value=rows[2].id;}}}retire();preview();status('ready','Selection or settings changed. Recompute before saving.');});
ui.compute.addEventListener('click',()=>void compute());ui.save.addEventListener('click',()=>void save());
ui.cancel.addEventListener('click',()=>{if(!busy)return;stopHandoff();retire();status('cancelled',loaded?'Operation cancelled. The current source and settings remain available.':'Source loading cancelled. Open source to begin.');});
window.addEventListener('pagehide',()=>{stopHandoff();retire();releaseCurrent();for(const url of downloads)URL.revokeObjectURL(url);downloads.clear();});
controls();
cancelHandoff=receiveAppearanceHandoff({
  accept:async(blob,signal)=>{
    if(!handoffActive)throw Error('Another input replaced the direct source handoff.');
    const accepted=await openSource(new File([blob],'retained-frames.json',{type:'application/json'}),{signal});
    if(signal.aborted)return;
    if(!accepted)throw Error(ui.status.textContent||'The original source was refused.');
    handoffActive=false;
  },
  onStatus:message=>{handoffActive=true;busy=true;controls();status('loading',message);},
  onError:message=>{if(!handoffActive)return;handoffActive=false;retire();status('error',message);},
});
