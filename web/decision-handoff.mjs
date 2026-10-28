// A transient channel carries one immutable source snapshot. No browser database,
// local storage, server upload or retained copy is created by the handoff.
const TIMEOUT=60000;
const DECISION=Object.freeze({
  prefix:'skill-translator-decision-handoff/v1/',route:'/decision-practice',
  unavailable:'Direct practice is unavailable in this browser. Save the sequence and open it in Decision practice.',
  blocked:'The practice tab was blocked. Allow a new tab or save the sequence and open it in Decision practice.',
  changed:'The demonstration changed while preparing practice. Open practice again to use the current account.',
  sendTimeout:'The practice tab did not finish receiving the source. Keep this demonstration and try again, or save it for manual import.',
  refused:'The practice tab refused the source.',
  receiveUnavailable:'Direct source handoff is unavailable. Open a saved demonstration instead.',
  receiveTimeout:'The source studio did not finish this handoff. Return to it and open practice again, or import a saved sequence.',
  receiveRefused:'Source refused; accepted exercise retained. ',
  receiving:'Receiving the demonstration and its original PNG frames from Source Studio…',
});
const APPEARANCE=Object.freeze({
  prefix:'skill-translator-appearance-handoff/v1/',route:'/appearance-pair',
  unavailable:'Direct comparison is unavailable in this browser. Keep these originals in Source Studio and open a saved sequence in Compare retained frames.',
  blocked:'The comparison tab was blocked. Allow a new tab and compare again. Your retained frames and draft remain in Source Studio.',
  changed:'The retained source changed while preparing comparison. Compare again to use the current originals.',
  sendTimeout:'The comparison tab did not finish receiving the originals. Keep this source and try again.',
  refused:'The comparison tab refused the original source.',
  receiveUnavailable:'Direct frame handoff is unavailable. Return to Source Studio or open a saved sequence.',
  receiveTimeout:'Source Studio did not finish this handoff. Return to it and compare again, or open a saved sequence.',
  receiveRefused:'Comparison source refused. ',
  receiving:'Receiving retained original PNG frames from Source Studio…',
});
function openSourceWindow(makeSource,{signal,isCurrent=()=>true}={},consumer){
  if(typeof BroadcastChannel!=='function')return Promise.reject(Error(consumer.unavailable));
  const token=crypto.randomUUID(),channel=new BroadcastChannel(consumer.prefix+token);
  let page;
  try{page=window.open(consumer.route+'#source='+token,'_blank');if(!page)throw Error(consumer.blocked);page.opener=null;}
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
      if(signal?.aborted||!isCurrent()){finish(Error(consumer.changed));return;}
      sent=true;channel.postMessage({type:'source',blob});
    };
    const timer=setTimeout(()=>finish(Error(consumer.sendTimeout)),TIMEOUT);
    signal?.addEventListener('abort',cancel,{once:true});
    channel.onmessage=event=>{
      if(event.data?.type==='ready'){ready=true;send();}
      else if(sent&&event.data?.type==='accepted')finish();
      else if(event.data?.type==='refused')finish(Error(event.data.message||consumer.refused));
    };
    if(signal?.aborted){cancel();return;}
    Promise.resolve().then(makeSource).then(value=>{if(finished)return;blob=value;send();},finish);
  });
}

function receiveSourceWindow({accept,onStatus,onError},consumer){
  const params=new URLSearchParams(location.hash.slice(1)),token=params.get('source');
  if(!token)return ()=>{};
  history.replaceState(null,'',location.pathname+location.search);
  if(!/^[0-9a-f-]{36}$/i.test(token)||typeof BroadcastChannel!=='function'){onError(consumer.receiveUnavailable);return ()=>{};}
  const channel=new BroadcastChannel(consumer.prefix+token),controller=new AbortController();let received=false,closed=false;
  const close=()=>{if(closed)return;closed=true;clearTimeout(timer);channel.close();};
  const cancel=()=>{controller.abort();if(!closed)channel.postMessage({type:'refused',message:'Another source operation replaced the demonstration handoff.'});close();};
  const timer=setTimeout(()=>{controller.abort();onError(consumer.receiveTimeout);close();},TIMEOUT);
  channel.onmessage=async event=>{
    if(closed)return;
    if(event.data?.type==='cancel'){controller.abort();onError(event.data.message||'The source handoff was canceled.');close();return;}
    if(received||event.data?.type!=='source')return;
    received=true;
    try{if(!(event.data.blob instanceof Blob))throw Error('The source handoff did not include a sequence file.');await accept(event.data.blob,controller.signal);if(controller.signal.aborted||closed)return;channel.postMessage({type:'accepted'});close();}
    catch(error){if(!closed){channel.postMessage({type:'refused',message:error.message});onError(consumer.receiveRefused+error.message);close();}}
  };
  onStatus(consumer.receiving);
  channel.postMessage({type:'ready'});
  return cancel;
}
export const openDecisionPractice=(makeSource,options)=>openSourceWindow(makeSource,options,DECISION);
export const receiveDecisionHandoff=options=>receiveSourceWindow(options,DECISION);
export const openAppearanceComparison=(makeSource,options)=>openSourceWindow(makeSource,options,APPEARANCE);
export const receiveAppearanceHandoff=options=>receiveSourceWindow(options,APPEARANCE);
