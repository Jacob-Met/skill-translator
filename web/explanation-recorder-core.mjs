/** Bounded separately supplied audio capture; no stream request until start(). */
export function createRecorder({getStream,makeRecorder,verifyFile,onChange=()=>{},onKeep=async()=>{},maxBytes=5*1024*1024,maxMilliseconds=30000,maxDecodedSeconds=30,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>20*1024*1024||!Number.isFinite(maxMilliseconds)||maxMilliseconds<=0||maxMilliseconds>120000||!Number.isFinite(maxDecodedSeconds)||maxDecodedSeconds<=0||maxDecodedSeconds>120)throw Error('Declare bounded recording limits');
 for(const fn of [getStream,makeRecorder,verifyFile,onKeep])if(typeof fn!=='function')throw Error('Recording requires stream, encoder, decoder and admission adapters');
 let revision=0,session=null,pending=null,accepted=null,state='idle',error=null,controller=null;
 const view=()=>({state,error,pending,accepted});const publish=()=>onChange(view());
 const stopTracks=s=>{for(const track of s?.getTracks?.()??[])try{track.stop();}catch{}};
 function retire(){revision++;controller?.abort();controller=null;const old=session;session=null;if(old){clearTimer(old.timer);old.recorder.ondataavailable=old.recorder.onstop=old.recorder.onerror=null;try{if(old.recorder.state!=='inactive')old.recorder.stop();}catch{}finally{stopTracks(old.stream);}}}
 function discard(){retire();pending=null;state='idle';error=null;publish();}
 async function start(){retire();pending=null;state='requesting';error=null;publish();const token=revision;let stream;
  try{stream=await getStream();if(token!==revision){stopTracks(stream);return;}
   const recorder=makeRecorder(stream),s={stream,recorder,chunks:[],bytes:0,start:now(),timer:null};session=s;
   const fail=message=>{if(session!==s||token!==revision)return;retire();pending=null;state='error';error=message;publish();};
   recorder.ondataavailable=e=>{if(session!==s||token!==revision)return;if(e.data?.size){s.bytes+=e.data.size;if(s.bytes>maxBytes){fail('Recording exceeds the complete byte limit');return;}s.chunks.push(e.data);}};
   recorder.onerror=()=>fail('Audio encoder failed; previous accepted recording retained');
   recorder.onstop=async()=>{if(session!==s||token!==revision)return;clearTimer(s.timer);stopTracks(stream);session=null;const elapsedMilliseconds=now()-s.start;
    if(!s.bytes){state='error';error='Recording contains no audio bytes';publish();return;}
    const mime=recorder.mimeType||s.chunks[0]?.type;if(!mime||!/^audio\//.test(mime)){state='error';error='Encoder supplied no supported audio type';publish();return;}
    const extension=mime.includes('webm')?'webm':mime.includes('ogg')?'ogg':mime.includes('mp4')?'m4a':'audio';
    const file=new File(s.chunks,'recorded-explanation.'+extension,{type:mime});controller=new AbortController();const signal=controller.signal;state='checking';publish();
    try{const metadata=await verifyFile(file,{signal});if(token!==revision||signal.aborted)return;
     if(!Number.isFinite(metadata?.durationSeconds)||metadata.durationSeconds<=0||metadata.durationSeconds>maxDecodedSeconds)throw Error('Decoded audio duration exceeds the declared limit or is unavailable');
     pending={file,elapsedMilliseconds,durationSeconds:metadata.durationSeconds,durationMeaning:'Capture elapsed time and decoded audio duration are separate observations'};state='preview';error=null;publish();
    }catch(e){if(token===revision){state='error';error='Audio refused: '+String(e?.message??e);publish();}}
   };
   recorder.start(200);if(session!==s||token!==revision)return;state='recording';s.timer=setTimer(()=>{if(session===s)stop();},maxMilliseconds);publish();
  }catch(e){stopTracks(stream);if(token===revision){retire();state='error';error='Capture unavailable: '+String(e?.message??e);publish();}}
 }
 function stop(){if(!session||state!=='recording')return;state='stopping';publish();try{session.recorder.stop();}catch(e){retire();state='error';error='Could not finish recording: '+String(e?.message??e);publish();}}
 async function keep(){if(state!=='preview'||!pending)throw Error('Preview checked audio before keeping it');const token=revision,candidate=pending;controller?.abort();controller=new AbortController();const signal=controller.signal;state='admitting';error=null;publish();try{await onKeep(candidate.file,{signal,isCurrent:()=>token===revision&&!signal.aborted,metadata:{elapsedMilliseconds:candidate.elapsedMilliseconds,durationSeconds:candidate.durationSeconds}});if(token!==revision||signal.aborted)return null;accepted=candidate;pending=null;state='idle';publish();return accepted;}catch(e){if(token===revision){state='preview';error='Attachment refused: '+String(e?.message??e);publish();}return null;}}
 return {start,stop,discard,keep,snapshot:view,dispose(){retire();pending=null;accepted=null;state='disposed';error=null;publish();}};
}
