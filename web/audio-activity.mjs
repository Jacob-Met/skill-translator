import {OPUS_CLOCK_PROFILE} from '/src/audio-decoder-clock.mjs';
import {analyzeAudioActivity,mapAudioActivity} from '/src/audio-activity.mjs';
import {playPresentedInterval} from '/web/interval-playback.mjs';
const NAV='skill-translator.audio-navigation/v1',MAX_BYTES=48*1024*1024;
const node=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(parent)parent.append(e);return e;};
export function createAudioActivityNavigator({host,getClip,isBusy,canSelect,onSelect}){
 let session=null,raw=null,analysis=null,declaration=null,mapped=[],dirty=true,revision=0,reading=null,playing=null,preparing=null;
 host.id='audio-activity';host.classList.add('audio-activity');
 node('summary','Find audible activity in the original clip',host);
 node('p','Prepare native audio from this selected original, or load an existing report from this exact file. Fixed20ms per-channel energy windows propose audible activity, not physical contact, success or expert meaning. The complete PCM, original timestamps, gaps and all candidates remain in the report.',host);
 const input=(label,id,type='text')=>{const l=node('label',label,host),e=node('input',undefined,l);e.id='audio-'+id;e.type=type;return e;};
 const source=input('Native report or saved audio navigation','file','file');source.accept='.json,application/json';
 const origin=input('Declared container time corresponding to browser media time zero (seconds)','origin','number');origin.step='any';
 const basis=input('Basis for this clock origin; do not assume the first audio sample is time zero','basis');basis.maxLength=1200;
 const button=(text,id)=>{const b=node('button',text,host);b.id='audio-'+id;b.type='button';return b;};
 const prepare=button('Prepare audio from this original clip','prepare'),cancelPrepare=button('Cancel audio preparation','cancel-prepare');
 const clockLabel=node('label','Native decoder clock check',host),clockProfile=node('select',undefined,clockLabel);clockProfile.id='audio-clock-profile';
 for(const [value,label] of [['strict','Strict original PTS (default)'],[OPUS_CLOCK_PROFILE,'Opus 1ms · exact decoder replay']]){const option=node('option',label,clockProfile);option.value=value;}
 node('p','The optional Opus clock profile requires FFmpeg and FFprobe 6.1.1-3ubuntu5, original 48kHz Opus and 1ms container ticks. It checks the decoder sample clock separately; source sub-tick timing remains unknown. This selection applies to the next preparation.',host);
 const clockNotice=node('p','',host);clockNotice.id='audio-clock-notice';
 const streamLabel=node('label','Original audio stream (choose only when several are present)',host),streams=node('select',undefined,streamLabel);streams.id='audio-stream';
 node('p','Preparation sends this already selected original to the local application server. It needs FFmpeg and supports at most 60 seconds of decoded mono/stereo audio. Original pixels and sound are preserved. A sole audio stream is chosen automatically; several streams require your choice. The browser clock origin remains explicitly declared.',host);
 const pair=button('Use this explicit media origin','pair');
 const summary=node('p','No native audio report paired.',host);summary.id='audio-summary';
 const methodLabel=node('label','Candidate method',host),method=node('select',undefined,methodLabel);method.id='audio-method';
 for(const [value,label] of [['fixed','Fixed full-scale energy'],['contrast','Relative to this segment’s background']]){const option=node('option',label,method);option.value=value;}
 node('p','Relative candidates use the lower fifth of each channel’s window energy as background, with fixed 4× entry and 2× exit ratios. At least 25 windows are needed per continuous segment. This is an energy comparison, not measured noise or physical meaning; steady sound and short or very quiet changes can be missed.',host);
 const selectLabel=node('label','Complete activity candidates',host),choice=node('select',undefined,selectLabel);choice.id='audio-event';
 const detail=node('p','',host);detail.id='audio-event-detail';
 const audio=input('Enable original clip audio (may be silent)','enabled','checkbox');
 const play=button('Play original activity interval','play'),stop=button('Stop activity playback','stop'),preview=button('Preview original frame at activity onset','preview'),save=button('Save audio navigation and raw evidence','save');
 const status=node('p','Choose the original clip in the studio first.',host);status.id='audio-status';status.setAttribute('role','status');
 node('p','The browser verifies the paired source identity and recomputes the supplied PCM analysis. It does not independently authenticate the native decoder or the declared origin. Frame presentation is not sample-exact audio timing. Retain and describe a frame using the ordinary studio controls.',host);
 const message=text=>{status.textContent=text;};
 const event=()=>mapped.find(e=>e.id===choice.value);
 const map=(value,origin,clip)=>mapAudioActivity(method.value==='contrast'?{...value,events:value.contrasts.events}:value,origin,clip);
 function cancelPreparation(){const old=preparing;preparing=null;old?.abort();}
 function cancel(){const old=playing;playing=null;old?.abort();getClip()?.video.pause();}
 function cancelPlayback(){if(!playing)return false;cancel();message('Activity playback retired by another studio preview or playhead action. Original source and navigation remain paired.');controls();return true;}
 function blocked(){return !getClip()||isBusy()||!canSelect()||reading!==null;}
 function controls(){const unavailable=blocked();clockProfile.disabled=unavailable;source.disabled=!getClip()||isBusy();prepare.disabled=unavailable||!getClip()?.file;cancelPrepare.disabled=!preparing;streams.disabled=unavailable||!streams.options.length;origin.disabled=basis.disabled=unavailable||!analysis;pair.disabled=unavailable||!analysis;method.disabled=unavailable||dirty||!analysis;choice.disabled=unavailable||dirty||!mapped.length;audio.disabled=unavailable;play.disabled=preview.disabled=unavailable||dirty||!event()?.available||Boolean(getClip()?.video.seeking&&!playing);stop.disabled=!playing;save.disabled=unavailable||dirty||!declaration;if(getClip())audio.checked=!getClip().video.muted;}
 function describe(){const e=event();detail.textContent=e?'Container '+e.start.exactSeconds+'–'+e.end.exactSeconds+' seconds; requested browser interval '+e.startSeconds.toFixed(3)+'–'+e.endSeconds.toFixed(3)+' s; '+e.windowCount+' windows; peak RMS '+e.peakRms.toFixed(4)+(e.available?'':'. Unavailable: complete interval lies outside this clip.'):'No qualifying activity candidate. Silence, short/quiet events and missing coverage are not evidence of task completion.';if(analysis&&method.value==='contrast'){const segment=analysis.contrasts.segments.find(s=>s.segment===e?.segment);detail.textContent+=segment?' Background RMS by channel: '+segment.backgroundRms.map(v=>v.toPrecision(4)).join(', ')+'. Entry RMS: '+segment.enterRms.map(v=>v.toPrecision(4)).join(', ')+'. Exit RMS: '+segment.exitRms.map(v=>v.toPrecision(4)).join(', ')+'.':' '+analysis.contrasts.segments.filter(s=>s.status==='insufficient-background').length+' segments lack 25 complete windows for background comparison.';}}
 function render(){clockNotice.textContent=analysis?.clock?analysis.clock.qualification:'Strict preparation compares each filter timestamp with original PTS within half a sample. Original timestamps remain the declared source clock.';choice.replaceChildren();for(const e of mapped){const o=node('option',(method.value==='contrast'?'Relative contrast ':'Activity ')+(mapped.indexOf(e)+1)+' · '+e.startSeconds.toFixed(3)+'–'+e.endSeconds.toFixed(3)+' s'+(e.available?'':' · unavailable'),choice);o.value=e.id;}summary.textContent=analysis?analysis.windows.length+' complete20ms windows; '+analysis.events.length+' fixed candidates; '+analysis.contrasts.events.length+' relative candidates; '+analysis.gaps.length+' original timestamp gaps; '+analysis.partials.length+' partial tails. All windows and candidates retained.':'No native audio report paired.';describe();controls();}
 function reset(next){revision++;reading=null;cancelPreparation();streams.replaceChildren();cancel();session=next;raw=analysis=declaration=null;mapped=[];dirty=true;source.value='';origin.value='';basis.value='';method.value='fixed';if(next)next.video.muted=true;render();message(next?'Prepare original audio here, or load an existing native report from this exact clip.':'Choose the original clip in the studio first.');}
 function sync(){if(getClip()!==session)reset(getClip());if((isBusy()||!canSelect())&&preparing){revision++;reading=null;cancelPreparation();message('Native audio preparation retired while studio work changes. Accepted navigation preserved.');}if((isBusy()||!canSelect())&&playing){cancel();message('Activity playback retired while studio work changes.');}controls();}
 function draft(){revision++;cancelPreparation();cancel();dirty=true;message('Clock declaration is an unpaired draft. Apply it before playback, preview or saving.');controls();}
 origin.addEventListener('input',draft);basis.addEventListener('input',draft);
 source.addEventListener('change',async()=>{
  const file=source.files?.[0],clip=getClip();source.value='';if(!file||!clip||isBusy())return;cancelPreparation();cancel();const version=++revision;reading=version;controls();
  try{if(file.size<1||file.size>MAX_BYTES)throw Error('Keep the complete native report within48MiB; no source is discarded.');const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()));if(version!==revision||clip!==getClip())return;
   const isNavigation=value?.format===NAV;if(isNavigation&&Object.keys(value).sort().join('|')!==['declaration','format','report'].sort().join('|'))throw Error('Saved audio navigation has unsupported fields.');
   const nextRaw=isNavigation?value.report:value,next=await analyzeAudioActivity(nextRaw);if(version!==revision||clip!==getClip())return;
   if(next.source.sha256!==clip.identity.sha256||next.source.sizeBytes!==clip.identity.sizeBytes)throw Error('Native report belongs to a different original clip.');
   const nextDeclaration=isNavigation?value.declaration:null,nextMapped=nextDeclaration?map(next,nextDeclaration,clip.identity):[];
   raw=nextRaw;analysis=next;declaration=nextDeclaration;mapped=nextMapped;dirty=!nextDeclaration;origin.value=nextDeclaration?String(nextDeclaration.mediaOriginSeconds):'';basis.value=nextDeclaration?.basis||'';render();message(nextDeclaration?'Saved audio navigation reopened; analysis recomputed from complete retained PCM and original timestamps.':'Native report received. Declare the browser media origin before previewing its candidates.');
  }catch(error){if(version===revision&&clip===getClip())message('Audio import refused: '+error.message+' Accepted navigation preserved.');}
  finally{if(reading===version){reading=null;controls();}}
 });

 cancelPrepare.addEventListener('click',()=>{if(!preparing)return;revision++;reading=null;cancelPreparation();message('Native audio preparation cancelled. Accepted navigation preserved.');controls();});
 prepare.addEventListener('click',async()=>{
  if(prepare.disabled)return;const clip=getClip(),version=++revision,controller=new AbortController();cancelPreparation();cancel();preparing=controller;reading=version;controls();message('Preparing complete original audio on the local application server…');
  try{
   const response=await fetch('/api/audio-intake',{method:'POST',headers:{'Content-Type':'application/octet-stream','x-audio-name':encodeURIComponent(clip.identity.name),'x-audio-sha256':clip.identity.sha256,'x-audio-stream':streams.value||'auto','x-audio-clock':clockProfile.value},body:clip.file,signal:controller.signal});
   const result=await response.json();if(version!==revision||clip!==getClip()||preparing!==controller)return;
   if(!response.ok)throw Error(result.error||'Native audio preparation was refused.');
   if(result.format!=='skill-translator.audio-intake/v1'||result.source?.sha256!==clip.identity.sha256||result.source?.sizeBytes!==clip.identity.sizeBytes)throw Error('Native response does not bind this exact original clip.');
   if(result.status==='no-audio'){streams.replaceChildren();message('No original audio stream was found. Accepted navigation preserved.');return;}
   if(result.status==='choose-stream'){
    if(!Array.isArray(result.streams)||!result.streams.length||result.streams.some(s=>!Number.isSafeInteger(s.index)||s.index<0||s.index>100))throw Error('Native stream choices are unavailable.');
    streams.replaceChildren();for(const s of result.streams){const option=node('option','Stream '+s.index+' · '+s.codec+' · '+s.channels+' channels · '+s.sampleRate+' Hz'+(s.language?' · '+s.language:'')+(s.title?' · '+s.title:''),streams);option.value=String(s.index);}message('Several original audio streams are available. Choose one, then prepare its complete original evidence. Accepted navigation preserved.');return;
   }
   if(result.status!=='prepared')throw Error('Unsupported native preparation result.');
   const next=await analyzeAudioActivity(result.report);if(version!==revision||clip!==getClip()||preparing!==controller)return;
   if(next.source.sha256!==clip.identity.sha256||next.source.sizeBytes!==clip.identity.sizeBytes)throw Error('Prepared report belongs to another original clip.');
   const nextDeclaration=!dirty?declaration:null,nextMapped=nextDeclaration?map(next,nextDeclaration,clip.identity):[];
   raw=result.report;analysis=next;declaration=nextDeclaration;mapped=nextMapped;dirty=!nextDeclaration;
   if(!nextDeclaration){origin.value='';basis.value='';}render();message(nextDeclaration?'Original audio prepared and recomputed. The existing explicit origin for this same original clip remains applied.':'Original audio prepared and recomputed. Explicitly declare its browser media origin before previewing candidates.');
  }catch(error){if(version===revision&&clip===getClip()&&preparing===controller)message('Native audio preparation refused: '+error.message+' Accepted navigation preserved.');}
  finally{if(preparing===controller)preparing=null;if(reading===version){reading=null;controls();}}
 });
 pair.addEventListener('click',()=>{revision++;cancel();try{if(blocked()||!analysis||!origin.value.trim())throw Error('Supply the native report and explicitly declare an origin, including zero.');const next={sourceSha256:analysis.source.sha256,mediaOriginSeconds:Number(origin.value),basis:basis.value},events=map(analysis,next,getClip().identity);declaration=next;mapped=events;dirty=false;render();message('Explicit media origin applied. Listen and inspect original context before assigning physical meaning.');}catch(error){dirty=true;message('Origin refused: '+error.message);controls();}});
 method.addEventListener('change',()=>{if(blocked()||dirty||!analysis||!declaration)return;revision++;cancel();mapped=map(analysis,declaration,getClip().identity);render();message('Candidate method changed. Both methods recompute from the unchanged original evidence; saved navigation retains that evidence; a fresh session reopens with fixed energy selected.');});
 choice.addEventListener('change',()=>{cancel();describe();controls();});
 audio.addEventListener('change',()=>{if(!blocked())getClip().video.muted=!audio.checked;});
 play.addEventListener('click',async()=>{if(play.disabled)return;cancel();const clip=getClip(),selected=event(),version=revision,controller=new AbortController();playing=controller;controls();message('Playing requested original interval '+selected.startSeconds.toFixed(3)+'–'+selected.endSeconds.toFixed(3)+' s.');
  try{const result=await playPresentedInterval(clip,selected,{signal:controller.signal});if(playing!==controller||revision!==version||getClip()!==clip)return;playing=null;message('Stopped: '+result.reason+'. First presented '+(result.firstPresentedSeconds??'not reported')+' s; last '+(result.lastPresentedSeconds??'not reported')+' s. Video timestamps are not audio sample boundaries.');controls();}catch(error){if(playing===controller&&version===revision){playing=null;message('Activity playback stopped: '+error.message);controls();}}
 });
 stop.addEventListener('click',()=>{cancel();message('Activity playback stopped. Original source and analysis remain paired.');controls();});
 preview.addEventListener('click',()=>{if(preview.disabled)return;const selected=event();cancel();onSelect(selected.startSeconds);message('Requested original frame at activity onset '+selected.startSeconds.toFixed(3)+' s. Inspect it, then retain and describe it using the studio controls.');controls();});
 save.addEventListener('click',()=>{if(save.disabled)return;const text=JSON.stringify({format:NAV,report:raw,declaration},null,2),blob=new Blob([text],{type:'application/json'});if(blob.size>MAX_BYTES){message('Complete navigation exceeds48MiB; no source discarded.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='audio-navigation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 addEventListener('pagehide',e=>{if(!e.persisted){revision++;reading=null;cancelPreparation();cancel();}});reset(getClip());return {sync,cancelPlayback};
}
