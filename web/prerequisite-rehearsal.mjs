import {createPrerequisiteRehearsal as create,importPrerequisiteRehearsal as reopen,submitPrerequisiteAttempt as submit,prerequisiteFindings as findings} from '/src/prerequisite-rehearsal.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';

const FORMAT='skill-translator.prerequisite-bundle/v1';
const el=id=>document.getElementById(id);
let accepted=null,session=null,locked=false,draft=[],generation=0,controller=null;
const changed=()=>{generation++;controller?.abort();};
const node=(tag,text)=>{const value=document.createElement(tag);if(text!==undefined)value.textContent=text;return value;};
const message=text=>{el('status').textContent=text;};
const title=id=>session.source.steps.find(step=>step.id===id)?.title??id;
function action(text,fn){
  const button=node('button',text);button.type='button';
  button.addEventListener('click',()=>{changed();try{fn();render();}catch(error){message(error.message);}});
  return button;
}
function fill(id){
  const select=el(id),prior=select.value;
  select.replaceChildren(...session.source.steps.map(step=>{const option=node('option',step.title);option.value=step.id;return option;}));
  if(session.source.steps.some(step=>step.id===prior))select.value=prior;
}
function render(){
  el('lesson').hidden=!session;if(!session)return;
  el('title').textContent=session.source.title;
  el('steps').replaceChildren(...session.source.steps.map(step=>{
    const article=node('article');article.className='step';article.append(node('h3',step.title),node('p',step.intent));
    const frames=node('div');frames.className='frames';
    for(const [label,id] of [['Before',step.beforeMomentId],['After',step.afterMomentId]]){
      const moment=session.source.moments.find(value=>value.id===id),figure=node('figure'),img=node('img');
      img.src=accepted.assets.get(id).media.url;img.alt=moment.visibleState||moment.label;
      figure.append(img,node('figcaption',`${label}: ${moment.label} · retained source frame`));frames.append(figure);
    }
    article.append(frames);return article;
  }));
  fill('before');fill('after');
  el('edges').replaceChildren(...session.dependencies.map((edge,index)=>{
    const li=node('li',`${title(edge.before)} → ${title(edge.after)}. ${edge.reason}`);
    if(!locked)li.append(action('Remove prerequisite',()=>{session=create(accepted.sequence,session.dependencies.filter((_,i)=>i!==index));}));
    return li;
  }));
  if(!session.dependencies.length)el('edges').append(node('li','No prerequisites declared. Any order is consistent with this empty set of declarations.'));
  el('edge-form').hidden=locked;el('begin').hidden=locked;el('attempt-panel').hidden=!locked;
  const frozen=session.attempt!==null,order=frozen?session.attempt:draft;
  el('choices').replaceChildren(...session.source.steps.map(step=>{
    const button=action(step.title,()=>{draft=[...draft,step.id];message('Step added to the proposed order.');});
    button.disabled=frozen||order.includes(step.id);button.dataset.stepId=step.id;return button;
  }));
  el('order').replaceChildren(...order.map(id=>node('li',title(id))));
  el('undo').disabled=frozen||order.length===0;el('submit').disabled=frozen;el('feedback').replaceChildren();
  if(frozen){
    const result=findings(accepted.sequence,session),heading=result.consistent?(result.complete?'Complete order agrees with the declarations':'Partial order agrees with the declarations'):'Revise the proposed order';
    el('feedback').append(node('h3',heading));
    for(const violation of result.violations)el('feedback').append(node('p',`${title(violation.before)} must precede ${title(violation.after)}: ${violation.reason} (${violation.kind}).`));
    if(result.missing.length)el('feedback').append(node('p',`Missing steps: ${result.missing.map(title).join('; ')}.`));
    if(result.availableNext.length)el('feedback').append(node('p',`Available next: ${result.availableNext.map(title).join('; ')}.`));
    el('feedback').append(node('p',result.boundary));
  }
}
el('edge-form').addEventListener('submit',event=>{
  event.preventDefault();changed();
  try{session=create(accepted.sequence,[...session.dependencies,{before:el('before').value,after:el('after').value,reason:el('reason').value}]);el('reason').value='';render();message('Prerequisite and reason retained.');}catch(error){message(error.message);}
});
for(const id of ['reason','before','after'])el(id).addEventListener('input',changed);
el('begin').addEventListener('click',()=>{changed();locked=true;draft=[];render();message('Declarations locked for this rehearsal.');});
el('undo').addEventListener('click',()=>{changed();draft=draft.slice(0,-1);render();});
el('submit').addEventListener('click',()=>{
  changed();try{session=submit(accepted.sequence,session,draft);render();message('First attempt retained; findings recomputed from the declarations.');}catch(error){message(error.message);}
});
el('restart').addEventListener('click',()=>{
  changed();session=create(accepted.sequence,session.dependencies);draft=[];locked=true;render();message('Another rehearsal started with the same declarations.');
});
el('open').addEventListener('change',async()=>{
  const file=el('open').files?.[0];if(!file)return;
  const current=++generation;controller?.abort();controller=new AbortController();const signal=controller.signal;
  let incoming=null;
  try{
    if(file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Choose a saved demonstration or rehearsal up to 48 MB.');
    const value=JSON.parse(await file.text());if(signal.aborted)return;
    const wrapped=value?.format===FORMAT;
    const sourceFile=wrapped?new File([JSON.stringify(value.sourceBundle)],'source.json',{type:'application/json'}):file;
    incoming=await readSequenceBundle(sourceFile,{signal});
    const next=wrapped?reopen(incoming.sequence,value.rehearsal):create(incoming.sequence);
    if(current!==generation||signal.aborted){releaseSequenceAssets(incoming.assets);incoming=null;return;}
    if(accepted)releaseSequenceAssets(accepted.assets);
    accepted=incoming;incoming=null;session=next;draft=[];locked=next.attempt!==null;render();
    message(wrapped?'Source frames checked; saved attempt reopened and findings recomputed.':'Source frames checked. Declare the prerequisites you can explain.');
  }catch(error){if(incoming)releaseSequenceAssets(incoming.assets);if(current===generation&&!signal.aborted)message(error.message);}
  finally{if(current===generation)el('open').value='';}
});
el('save').addEventListener('click',async()=>{
  if(!accepted)return;
  const current=generation,source=accepted,sourceSession=session,snapshot=structuredClone(session);el('save').disabled=true;
  try{
    const sourceBundle=JSON.parse(await (await makeSequenceBundle(source.sequence,source.assets)).text());
    if(current!==generation||source!==accepted||sourceSession!==session)throw Error('The rehearsal changed while saving. Save the current version again.');
    const blob=new Blob([JSON.stringify({format:FORMAT,sourceBundle,rehearsal:snapshot},null,2)],{type:'application/json'});
    if(blob.size>MAX_BUNDLE_BYTES)throw Error('The saved rehearsal exceeds 48 MB.');
    const url=URL.createObjectURL(blob),anchor=node('a');anchor.href=url;anchor.download='prerequisite-rehearsal.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    message('Source frames, declarations and the retained first attempt saved.');
  }catch(error){message(error.message);}finally{el('save').disabled=false;}
});
window.addEventListener('pagehide',()=>{controller?.abort();if(accepted)releaseSequenceAssets(accepted.assets);});
render();
