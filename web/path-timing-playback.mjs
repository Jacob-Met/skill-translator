import {loadLocalVideo,releaseVideo} from '/web/video-input.mjs';
import {assertSequenceClip} from '/src/demonstration-sequence.mjs';
import {inspectPathTiming} from '/src/path-timing.mjs';
import {playPresentedInterval} from '/web/interval-playback.mjs';
const element=(tag,text,parent)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(parent)parent.append(node);return node;};
const seconds=value=>value===null?'not reported':value.toFixed(3)+' s';
export function mountPathTimingPlayback(container){
 container.hidden=true;
 let study=null,revision=0;const clips={left:null,right:null},loads={left:0,right:0},playing={left:null,right:null},panels={};
 element('h2','View the original action intervals',container);
 element('p','Optionally pair each exact original clip to watch the action behind a retained timing difference. Playback uses the encoded clip timeline at 1×. Independent decoder starts and endpoint offsets stay visible; the two videos are not frame-synchronized. A retimed recording does not establish physical real-time. Clips stay local and are not embedded in the comparison download.',container);
 const label=element('label','Matched interval',container),choice=element('select',undefined,label);choice.disabled=true;
 const columns=element('div',undefined,container);columns.className='columns';
 function stop(side){playing[side]?.abort();playing[side]=null;}
 function stopAll(){stop('left');stop('right');}
 function currentRange(side){if(!study)throw Error('Open a timing comparison first.');const result=inspectPathTiming(study),row=result.rows[Number(choice.value)];if(!row)throw Error('Choose a retained interval.');return row[side];}
 function buttons(){for(const side of ['left','right']){panels[side].play.disabled=!(study&&clips[side]);panels[side].pause.disabled=!clips[side];}}
 for(const side of ['left','right']){
  const panel=element('div',undefined,columns);panel.dataset.side=side;element('h3',side==='left'?'First original clip':'Second original clip',panel);
  const fileLabel=element('label','Pair original MP4 or WebM',panel),input=element('input',undefined,fileLabel);input.type='file';input.accept='video/mp4,video/webm,.mp4,.webm';input.disabled=true;
  const host=element('div',undefined,panel),play=element('button','Play selected interval at 1×',panel),pause=element('button','Stop interval',panel),status=element('p','No original clip paired.',panel);play.type=pause.type='button';play.disabled=pause.disabled=true;status.setAttribute('role','status');status.className='clip-status';
  panels[side]={input,host,play,pause,status};
  input.addEventListener('change',async()=>{
   const file=input.files?.[0];input.value='';if(!file||!study)return;stop(side);clips[side]?.video.pause();
   const token=++loads[side],version=revision,source=study.paths[side].sequence;status.textContent='Checking the complete original clip; the accepted clip stays paired until admission.';let received=null;
   try{
    received=await loadLocalVideo(file);if(token!==loads[side]||version!==revision){releaseVideo(received);return;}
    assertSequenceClip(source,received.identity);stop(side);releaseVideo(clips[side]);clips[side]=received;received=null;
    host.replaceChildren(clips[side].video);clips[side].video.className='paired-clip';
    const paired=clips[side];paired.video.addEventListener('play',()=>{if(clips[side]===paired&&!playing[side])status.textContent='Native controls are playing the original clip outside managed interval viewing. Declared comparison intervals are unchanged.';});
    paired.video.addEventListener('seeking',()=>{if(clips[side]===paired&&!playing[side])status.textContent='Native controls moved the original clip. Choose Play selected interval to restore its declared range.';});
    status.textContent='Exact original clip paired. Renaming identical bytes with a supported clip type is allowed.';buttons();
   }catch(error){if(received)releaseVideo(received);if(token===loads[side]&&version===revision)status.textContent='Clip refused: '+error.message+' Previous accepted clip remains paired.';}
  });
  play.addEventListener('click',async()=>{
   if(!clips[side]||!study)return;stop(side);const controller=new AbortController(),version=revision,clip=clips[side];playing[side]=controller;
   try{
    const range=currentRange(side);status.textContent='Requesting '+seconds(range.startSeconds)+'–'+seconds(range.endSeconds)+' at 1× encoded timeline.';
    const result=await playPresentedInterval(clip,range,{signal:controller.signal,onFrame:record=>{if(playing[side]===controller&&revision===version)status.textContent='Presented '+seconds(record.lastPresentedSeconds)+' · requested interval '+seconds(record.requestedStartSeconds)+'–'+seconds(record.requestedEndSeconds)+'. Actual start offset '+seconds(record.firstOffsetSeconds)+'.';}});
    if(playing[side]!==controller||revision!==version)return;playing[side]=null;status.textContent='Stopped: '+(result.reason==='source-ended'?'source ended':'first presented frame at or after endpoint')+'. First '+seconds(result.firstPresentedSeconds)+'; last '+seconds(result.lastPresentedSeconds)+'. Start offset '+seconds(result.firstOffsetSeconds)+'; end offset '+seconds(result.lastOffsetSeconds)+'. These are decoder presentation observations.';
   }catch(error){if(playing[side]===controller&&revision===version){playing[side]=null;status.textContent='Playback stopped: '+error.message;}}
  });
  pause.addEventListener('click',()=>{stop(side);clips[side]?.video.pause();status.textContent='Interval playback stopped. The original clip remains paired.';});
 }
 choice.addEventListener('change',()=>{stopAll();for(const side of ['left','right'])if(clips[side]){clips[side].video.pause();panels[side].status.textContent='Selected interval changed. Play to view its encoded source timeline.';}});
 function update(next){
  revision++;loads.left++;loads.right++;stopAll();study=next;container.hidden=!study;choice.replaceChildren();
  for(const [index,row]of (study?.correspondences??[]).entries()){const option=element('option',(index+1)+'. '+row.label,choice);option.value=String(index);}choice.disabled=!study;
  for(const side of ['left','right']){
   panels[side].input.disabled=!study;
   if(clips[side]){try{if(!study)throw Error('No comparison');assertSequenceClip(study.paths[side].sequence,clips[side].identity);clips[side].video.pause();panels[side].status.textContent='Original clip remains paired to this source. Choose an interval.';}
    catch{releaseVideo(clips[side]);clips[side]=null;panels[side].host.replaceChildren();panels[side].status.textContent='Source changed. Pair its exact original clip.';}}
  }buttons();
 }
 function dispose(){revision++;loads.left++;loads.right++;stopAll();for(const side of ['left','right']){releaseVideo(clips[side]);clips[side]=null;}study=null;buttons();}
 addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
 return {update,dispose};
}
