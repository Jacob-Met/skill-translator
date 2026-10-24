import {createOrderStudy,orderEvidenceFindings,declareOrderPrerequisites} from '/src/order-evidence.mjs';
import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets,MAX_BUNDLE_BYTES} from '/web/sequence-input.mjs';
import {budget,readOrderBundle,makeOrderBundle,releaseOrderSources} from '/web/order-evidence-input.mjs';
const el=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let state=null,epoch=0,controller=null,pairIndex=0,admissionTail=Promise.resolve();
const status=s=>{el('status').textContent=s;};
const invalidate=()=>{epoch++;controller?.abort();};
const begin=()=>{invalidate();controller=new AbortController();return {epoch,signal:controller.signal,prior:state};};
const current=t=>t.epoch===epoch&&!t.signal.aborted&&t.prior===state;
// Decode, adoption and cleanup complete before another admission starts.
// Epochs invalidate immediately, including requests waiting in this queue.
const enqueueAdmission=fn=>{const next=admissionTail.then(fn);admissionTail=next.catch(()=>{});return next;};
const stepTitle=id=>state.study.reference.steps.find(s=>s.id===id)?.title??id;
const stepLabel=id=>{const index=state.study.reference.steps.findIndex(s=>s.id===id);return `${index+1}. ${stepTitle(id)}`;};
function button(text,fn){const b=node('button',text);b.type='button';b.onclick=()=>{invalidate();try{fn();render();}catch(e){status(e.message);}};return b;}
function replaceStudy(study){state={...state,study,declarations:[]};el('reason').value='';status('Correspondences changed; prior declaration selections cleared.');}
function render(){
 el('workspace').hidden=!state;if(!state)return;
 el('referenceTitle').textContent=state.study.reference.title;
 const usage=budget(state.sources);
 el('budget').textContent=`${state.sources.size}/8 examples · ${(usage.bytes/1048576).toFixed(1)}/32 MB PNG data · ${(usage.pixels/1e6).toFixed(1)}/32 megapixels`;
 el('comparisonFile').disabled=state.study.comparisons.length>=7;el('mappings').replaceChildren();
 for(const c of state.study.comparisons){
  const article=node('section');article.className='example';
  article.append(node('h3',c.label),node('p','Declare correspondences explicitly. Matching names do not establish the same step.'));
  for(const [refIndex,ref] of state.study.reference.steps.entries()){
   const label=node('label',`${ref.title} (reference step ${refIndex+1}) corresponds to`),select=node('select');
   select.dataset.comparison=c.id;select.dataset.reference=ref.id;
   const blank=node('option','Unmapped / unavailable');blank.value='';select.append(blank);
   for(const [stepIndex,step] of c.sequence.steps.entries()){const option=node('option',`${stepIndex+1}. ${step.title}`);option.value=step.id;select.append(option);}
   select.value=c.matches.find(m=>m.referenceStepId===ref.id)?.comparisonStepId??'';
   select.onchange=()=>{
    invalidate();
    try{
     const matches=c.matches.filter(m=>m.referenceStepId!==ref.id);
     if(select.value)matches.push({referenceStepId:ref.id,comparisonStepId:select.value});
     replaceStudy(createOrderStudy(state.study.reference,state.study.comparisons.map(x=>x.id===c.id?{...c,matches}:x)));
    }catch(e){status(e.message);}
    render();
   };
   label.append(select);article.append(label);
  }
  article.append(button('Remove comparison',()=>{
   const sources=new Map(state.sources),removed=sources.get(c.id);sources.delete(c.id);
   const study=createOrderStudy(state.study.reference,state.study.comparisons.filter(x=>x.id!==c.id));
   state={study,sources,declarations:[]};releaseSequenceAssets(removed.assets);el('reason').value='';
  }));
  el('mappings').append(article);
 }
 const findings=orderEvidenceFindings(state.study);
 pairIndex=Math.min(pairIndex,findings.pairs.length-1);
 el('pair').replaceChildren(...findings.pairs.map((p,i)=>{const option=node('option',`${stepLabel(p.a)} / ${stepLabel(p.b)}`);option.value=String(i);return option;}));
 el('pair').value=String(pairIndex);const selected=findings.pairs[pairIndex];
 el('result').replaceChildren(node('h3',selected.candidate?'Same non-overlapping order in every mapped example':selected.oppositeOrders?'Both orders appear in retained examples':'Ordering remains unresolved'),node('p',findings.boundary));
 if(selected.candidate)el('result').append(node('p',`${stepTitle(selected.candidate.before)} is at-or-before ${stepTitle(selected.candidate.after)} in all ${findings.sourceCount} included examples.`));
 if(selected.oppositeOrders)el('result').append(node('p','Inspect the opposing witnesses. These records do not support one universal recorded order.'));
 el('witnesses').replaceChildren(node('p',`A: ${stepTitle(selected.a)}. B: ${stepTitle(selected.b)}.`));
 for(const witness of selected.witnesses){
  const card=node('article');card.className='witness';card.append(node('h3',witness.label),node('p',({'a-before-b':'A is at-or-before B','b-before-a':'B is at-or-before A',overlap:'The retained intervals overlap',unmapped:'An explicit correspondence is missing'})[witness.relation]));
  const frames=node('div');frames.className='frames';const source=state.sources.get(witness.sourceId);
  for(const [side,span]of [['A',witness.a],['B',witness.b]]){
   if(!span){card.append(node('p',`${side}: no explicit correspondence.`));continue;}
   card.append(node('p',`${side}: retained interval ${span.start}–${span.end} seconds.`));
   for(const [phase,id]of [['before',span.beforeMomentId],['after',span.afterMomentId]]){
    const m=source.sequence.moments.find(x=>x.id===id),figure=node('figure'),img=node('img');
    img.src=source.assets.get(id).media.url;img.alt=m.visibleState||m.label;
    figure.append(img,node('figcaption',`${side} ${phase}: ${m.label}`));frames.append(figure);
   }
  }
  card.append(frames);el('witnesses').append(card);
 }
 el('declare').disabled=!selected.candidate;el('lesson').disabled=!state.declarations.length;
 el('declarations').replaceChildren(...state.declarations.map((d,i)=>{
  const li=node('li',`${stepTitle(d.before)} → ${stepTitle(d.after)}: ${d.reason}`);
  li.append(button('Remove declaration',()=>{state={...state,declarations:state.declarations.filter((_,j)=>j!==i)};}));return li;
 }));
}
el('pair').onchange=()=>{invalidate();pairIndex=Number(el('pair').value);el('reason').value='';render();};
el('reason').oninput=invalidate;
el('declare').onclick=()=>{
 invalidate();
 try{
  const p=orderEvidenceFindings(state.study).pairs[pairIndex];if(!p.candidate)throw Error('Choose a unanimous mapped order first.');
  const next=[...state.declarations,{...p.candidate,reason:el('reason').value}];
  const lesson=declareOrderPrerequisites(state.study,next);state={...state,declarations:lesson.dependencies};
  el('reason').value='';render();status('Expert declaration retained separately from observed chronology.');
 }catch(e){status(e.message);}
};
function importSource(file,reference){
 if(!file)return;
 const token=begin();
 return enqueueAdmission(async()=>{
  if(!current(token))return;
  let loaded=null;
  try{
   if(file.size<1||file.size>MAX_BUNDLE_BYTES)throw Error('Choose a source bundle up to 48 MB.');
   if(!reference&&!state)throw Error('Open a reference first.');
   loaded=await readSequenceBundle(file,{signal:token.signal});
   if(!current(token)){releaseSequenceAssets(loaded.assets);loaded=null;return;}
   let next;
   if(reference){
    const study=createOrderStudy(loaded.sequence),sources=new Map([['reference',loaded]]);
    budget(sources);next={study,sources,declarations:[]};
   }else{
    let n=1;while(state.sources.has(`example-${n}`))n++;
    const id=`example-${n}`,study=createOrderStudy(state.study.reference,[...state.study.comparisons,{id,label:loaded.sequence.title,sequence:loaded.sequence,matches:[]}]),sources=new Map(state.sources);
    sources.set(id,loaded);budget(sources);next={study,sources,declarations:[]};
   }
   if(reference&&state)releaseOrderSources(state.sources);
   state=next;loaded=null;pairIndex=0;el('reason').value='';render();
   status('Source PNGs checked. Match steps explicitly to inspect their order.');
  }catch(e){
   if(loaded)releaseSequenceAssets(loaded.assets);
   if(token.epoch===epoch&&!token.signal.aborted)status(e.message);
  }finally{
   if(token.epoch===epoch){el('referenceFile').value='';el('comparisonFile').value='';}
  }
 });
}
el('referenceFile').onchange=()=>importSource(el('referenceFile').files?.[0],true);
el('comparisonFile').onchange=()=>importSource(el('comparisonFile').files?.[0],false);
el('studyFile').onchange=()=>{
 const file=el('studyFile').files?.[0];if(!file)return;
 const token=begin();
 return enqueueAdmission(async()=>{
  if(!current(token))return;
  let loaded=null;
  try{
   loaded=await readOrderBundle(file,{signal:token.signal});
   if(!current(token)){releaseOrderSources(loaded.sources);loaded=null;return;}
   if(state)releaseOrderSources(state.sources);
   state=loaded;loaded=null;pairIndex=0;el('reason').value='';render();
   status('Study reopened; original PNGs checked and all findings recomputed.');
  }catch(e){
   if(loaded)releaseOrderSources(loaded.sources);
   if(token.epoch===epoch&&!token.signal.aborted)status(e.message);
  }finally{if(token.epoch===epoch)el('studyFile').value='';}
 });
};
function download(blob,name){
 const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function save(lessonOnly){
 if(!state)return;const snapshot=state,version=epoch;
 const button=el(lessonOnly?'lesson':'save');button.disabled=true;
 try{
  let blob;
  if(lessonOnly){
   const lesson=declareOrderPrerequisites(snapshot.study,snapshot.declarations),source=snapshot.sources.get('reference');
   const sourceBundle=JSON.parse(await(await makeSequenceBundle(snapshot.study.reference,source.assets)).text());
   blob=new Blob([JSON.stringify({format:'skill-translator.prerequisite-bundle/v1',sourceBundle,rehearsal:lesson},null,2)],{type:'application/json'});
   if(blob.size>MAX_BUNDLE_BYTES)throw Error('Exported rehearsal exceeds 48 MB.');
  }else blob=await makeOrderBundle(snapshot.study,snapshot.sources,snapshot.declarations);
  if(version!==epoch||state!==snapshot)throw Error('Study changed during saving; save the current version again.');
  download(blob,lessonOnly?'declared-order-rehearsal.json':'order-evidence.json');
  status(lessonOnly?'Declared reference rehearsal exported. Save the study to retain all comparison evidence.':'Complete study and exact source frames saved.');
 }catch(e){status(e.message);}
 finally{button.disabled=false;if(lessonOnly)button.disabled=!state?.declarations.length;}
}
el('save').onclick=()=>save(false);el('lesson').onclick=()=>save(true);
window.addEventListener('pagehide',()=>{invalidate();if(state)releaseOrderSources(state.sources);});render();
