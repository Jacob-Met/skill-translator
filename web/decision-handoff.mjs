// A transient channel carries one immutable source snapshot. No browser database,
// local storage, server upload or retained copy is created by the handoff.
const PREFIX='skill-translator-decision-handoff/v1/';
const TIMEOUT=60000;
export function openDecisionPractice(makeSource,{signal,isCurrent=()=>true}={}){
  if(typeof BroadcastChannel!=='function')return Promise.reject(Error('Direct practice is unavailable in this browser. Save the sequence and open it in Decision practice.'));
  const token=crypto.randomUUID(),channel=new BroadcastChannel(PREFIX+token);
  let page;
  try{page=window.open('/decision-practice#source='+token,'_blank');if(!page)throw Error('The practice tab was blocked. Allow a new tab or save the sequence and open it in Decision practice.');page.opener=null;}
  catch(error){channel.close();return Promise.reject(error);}
  return new Promise((resolve,reject)=>{
    let ready=false,blob=null,sent=false,finished=false;
    const finish=(error)=>{
      if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);
      if(error)channel.postMessage({type:'cancel',message:error.message});
      channel.close();error?reject(error):resolve();
    };
    const cancel=()=>finish(Error('The demonstration handoff was replaced. The source studio remains available.'));
    const send=()=>{
      if(finished||sent||!ready||!blob)return;
      if(signal?.aborted||!isCurrent()){finish(Error('The demonstration changed while preparing practice. Open practice again to use the current account.'));return;}
      sent=true;channel.postMessage({type:'source',blob});
    };
    const timer=setTimeout(()=>finish(Error('The practice tab did not finish receiving the source. Keep this demonstration and try again, or save it for manual import.')),TIMEOUT);
    signal?.addEventListener('abort',cancel,{once:true});
    channel.onmessage=event=>{
      if(event.data?.type==='ready'){ready=true;send();}
      else if(sent&&event.data?.type==='accepted')finish();
      else if(event.data?.type==='refused')finish(Error(event.data.message||'The practice tab refused the source.'));
    };
    if(signal?.aborted){cancel();return;}
    Promise.resolve().then(makeSource).then(value=>{if(finished)return;blob=value;send();},finish);
  });
}

export function receiveDecisionHandoff({accept,onStatus,onError}){
  const params=new URLSearchParams(location.hash.slice(1)),token=params.get('source');
  if(!token)return ()=>{};
  history.replaceState(null,'',location.pathname+location.search);
  if(!/^[0-9a-f-]{36}$/i.test(token)||typeof BroadcastChannel!=='function'){onError('Direct source handoff is unavailable. Open a saved demonstration instead.');return ()=>{};}
  const channel=new BroadcastChannel(PREFIX+token),controller=new AbortController();let received=false,closed=false;
  const close=()=>{if(closed)return;closed=true;clearTimeout(timer);channel.close();};
  const cancel=()=>{controller.abort();if(!closed)channel.postMessage({type:'refused',message:'Another source operation replaced the demonstration handoff.'});close();};
  const timer=setTimeout(()=>{controller.abort();onError('The source studio did not finish this handoff. Return to it and open practice again, or import a saved sequence.');close();},TIMEOUT);
  channel.onmessage=async event=>{
    if(closed)return;
    if(event.data?.type==='cancel'){controller.abort();onError(event.data.message||'The source handoff was canceled.');close();return;}
    if(received||event.data?.type!=='source')return;
    received=true;
    try{if(!(event.data.blob instanceof Blob))throw Error('The source handoff did not include a sequence file.');await accept(event.data.blob,controller.signal);if(controller.signal.aborted||closed)return;channel.postMessage({type:'accepted'});close();}
    catch(error){if(!closed){channel.postMessage({type:'refused',message:error.message});onError('Source refused; accepted exercise retained. '+error.message);close();}}
  };
  onStatus('Receiving the demonstration and its original PNG frames from Source Studio…');
  channel.postMessage({type:'ready'});
  return cancel;
}
