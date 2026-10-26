/** A second energy explanation; never a replacement for fixed activity. */
export const AUDIO_CONTRAST_SETTINGS=Object.freeze({backgroundQuantile:.2,enterRatio:4,exitRatio:2,minimumEnterRms:.001,minimumExitRms:.0005,minimumWindows:2,minimumBackgroundWindows:25});

// Input is the complete validated window ledger returned by analyzeAudioActivity.
// No PCM rescaling, channel mixing or timestamp reconstruction occurs here.
export function findAudioContrasts(windows,channels,segmentCount=null){
 if(!Array.isArray(windows)||windows.length>3000||!Number.isInteger(channels)||channels<1||channels>2)throw Error('Unsupported complete audio contrast ledger.');
 const groups=new Map();
 if(segmentCount!==null){if(!Number.isSafeInteger(segmentCount)||segmentCount<1||segmentCount>20000)throw Error('Invalid original audio segment count.');for(let i=0;i<segmentCount;i++)groups.set(i,[]);}
 for(const w of windows){
  if(!Number.isSafeInteger(w.segment)||w.segment<0||(segmentCount!==null&&w.segment>=segmentCount)||!Array.isArray(w.channelRms)||w.channelRms.length!==channels||w.channelRms.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1))throw Error('Invalid original audio contrast window.');
  if(!groups.has(w.segment))groups.set(w.segment,[]);groups.get(w.segment).push(w);
 }
 const segments=[],events=[];
 for(const [segment,rows] of groups){
  const count=rows.length;
  if(count<AUDIO_CONTRAST_SETTINGS.minimumBackgroundWindows){segments.push({segment,windows:count,status:'insufficient-background',backgroundRms:null,enterRms:null,exitRms:null});continue;}
  const rank=Math.floor(AUDIO_CONTRAST_SETTINGS.backgroundQuantile*(count-1));
  const backgroundRms=Array.from({length:channels},(_,c)=>rows.map(w=>w.channelRms[c]).sort((a,b)=>a-b)[rank]);
  const enterRms=backgroundRms.map(v=>Math.max(AUDIO_CONTRAST_SETTINGS.minimumEnterRms,AUDIO_CONTRAST_SETTINGS.enterRatio*v));
  const exitRms=backgroundRms.map(v=>Math.max(AUDIO_CONTRAST_SETTINGS.minimumExitRms,AUDIO_CONTRAST_SETTINGS.exitRatio*v));
  segments.push({segment,windows:count,status:'available',backgroundRank:rank,backgroundRms,enterRms,exitRms});
  let run=null;
  const finish=()=>{if(run&&run.windowCount>=AUDIO_CONTRAST_SETTINGS.minimumWindows)events.push({...run,id:'audio-contrast-'+events.length});run=null;};
  for(const w of rows){
   if(run&&!w.channelRms.some((v,c)=>v>=exitRms[c]))finish();
   if(!run&&w.channelRms.some((v,c)=>v>=enterRms[c]))run={segment,firstWindow:w.index,lastWindow:w.index,windowCount:0,start:w.start,end:w.end,peakRms:0};
   if(run){run.lastWindow=w.index;run.windowCount++;run.end=w.end;run.peakRms=Math.max(run.peakRms,...w.channelRms);}
  }
  finish();
 }
 return {settings:{...AUDIO_CONTRAST_SETTINGS},segments,events,boundary:'Background is the lower fifth of original per-channel window energy, not an independently measured noise floor. Sustained or slowly changing sound can be missed; gain changes and unrelated bursts can be proposed. No physical event or audibility is inferred.'};
}
