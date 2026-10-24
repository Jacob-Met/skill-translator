import {createContextOrder,planContextOrder} from '/src/context-order.mjs';
import {readContextBundle,makeContextBundle,normalizeContextDrafts} from '/web/context-order-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
const el=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let state=null,result=null,selected=null,epoch=0,controller=null,admissionTail=Promise.resolve(),computing=false,saving=false,savingOriginal=false;
const status=text=>{el('status').textContent=text;};
function cancelPending(){epoch++;controller?.abort();}
function enqueueAdmission(fn){const next=admissionTail.then(fn);admissionTail=next.catch(()=>{});return next;}
const current=t=>t.epoch===epoch&&!t.signal.aborted&&t.prior===state;
function label(id){const i=state.media.sequence.steps.findIndex(s=>s.id===id);return i<0?id:`${i+1} · ${state.media.sequence.steps[i].title}`;}
function complete(){return Boolean(state&&state.drafts.every(d=>d.context.trim()&&d.basis.trim()));}
function buttons(){el('compare').disabled=!complete()||computing;el('save').disabled=!state||saving;el('saveOriginal').disabled=!state||savingOriginal;}
function labels(){const unique=[...new Set(state.drafts.map(d=>d.context.trim()).filter(Boolean))];el('contextLabels').replaceChildren(...unique.map(value=>{const o=node('option');o.value=value;return o;}));}
function inspect(){
 if(!state)return;const step=state.media.sequence.steps.find(s=>s.id===selected)??state.media.sequence.steps[0];selected=step.id;el('inspectStep').value=selected;const card=el('inspector');card.replaceChildren(node('h3',label(step.id)),node('p',step.intent));
 const frames=node('div');frames.className='frames';for(const [phase,id]of [['Before',step.beforeMomentId],['After',step.afterMomentId]]){const moment=state.media.sequence.moments.find(m=>m.id===id),figure=node('figure'),img=node('img');img.src=state.media.assets.get(id).media.url;img.alt=moment.visibleState||moment.label;img.dataset.momentId=id;figure.append(img,node('figcaption',`${phase}: ${moment.label} · retained frame at ${moment.origin.mediaTimeSeconds} seconds`));frames.append(figure);}card.append(frames);
 if(step.visibleChange)card.append(node('p',`Supplied visible-change account: ${step.visibleChange}`));if(step.sensoryCue)card.append(node('p',`Supplied sensory cue: ${step.sensoryCue}`));if(step.recoveryCue)card.append(node('p',`Supplied recovery cue: ${step.recoveryCue}`));
}
function renderResult(){
 el('plan').hidden=!result;el('groups').replaceChildren();el('planSummary').replaceChildren();if(!result)return;
 const summary=node('p'),cost=node('strong',String(result.minimumChanges)),count=node('strong',result.optimalOrderCount.toLocaleString());cost.id='minimumChanges';count.id='optimalCount';summary.append(cost,document.createTextNode(' declared context changes · '),count,document.createTextNode(' equally optimal orders.'));el('planSummary').append(summary);
 if(result.sourceList.satisfiesDeclarations)el('planSummary').append(node('p',`Source-listed order: ${result.sourceList.contextChanges} changes. This result has ${result.fewerChangesThanSourceList} fewer under the supplied declarations.`));else{el('planSummary').append(node('p','The source-listed order conflicts with the declared prerequisites. No reduction is computed against that incompatible baseline.'));for(const edge of result.sourceList.violations)el('planSummary').append(node('p',`${label(edge.before)} must precede ${label(edge.after)}: ${edge.reason}`));}
 for(const group of result.groups){const li=node('li');li.append(node('strong',`Context: ${group.context}`));for(const id of group.stepIds){const b=node('button',`Inspect ${label(id)}`);b.type='button';b.dataset.inspectStep=id;b.onclick=()=>{cancelPending();selected=id;inspect();status('Showing the original retained account for this step.');};li.append(b);}el('groups').append(li);}
 el('modelBoundary').textContent=result.model+' '+result.boundary;
}
function edit(stepId,key,value,input){
 cancelPending();const old=state.drafts.find(d=>d.stepId===stepId);
 try{const drafts=normalizeContextDrafts(state.media.sequence,state.drafts.map(d=>d.stepId===stepId?{...d,[key]:value}:d));state={...state,drafts};result=null;renderResult();labels();buttons();status('Context draft changed. Compare again to recompute the order.');}catch(e){input.value=old[key];status(e.message);}
}
function render(){
 el('workspace').hidden=!state;if(!state){buttons();return;}
 el('sourceTitle').textContent=state.media.sequence.title;el('dependencyCount').textContent=String(state.prerequisites.dependencies.length);el('dependencies').replaceChildren(...state.prerequisites.dependencies.map(d=>node('li',`${label(d.before)} precedes ${label(d.after)}: ${d.reason}`)));if(!state.prerequisites.dependencies.length)el('dependencies').append(node('li','No prerequisites were declared.'));
 const attempt=state.prerequisites.attempt;el('retainedAttempt').textContent=attempt===null?'No first proposal was submitted in the imported rehearsal.':attempt.length?`Unchanged first proposal: ${attempt.map(label).join(' → ')}. This comparison does not replace or regrade it.`:'An empty first proposal remains retained. This comparison does not replace or regrade it.';
 el('contexts').replaceChildren();state.drafts.forEach((d,i)=>{const row=node('section');row.className='context-row';row.append(node('h3',label(d.stepId)));const fields=node('div');fields.className='context-fields';for(const [key,title,max]of [['context','Declared context label',80],['basis','Authored basis for this grouping',1200]]){const lab=node('label',title),input=node(key==='context'?'input':'textarea');if(key==='context'){input.type='text';input.setAttribute('list','contextLabels');}input.id=`${key}-${i}`;input.dataset.stepId=d.stepId;input.maxLength=max;input.value=d[key];input.oninput=()=>edit(d.stepId,key,input.value,input);lab.append(input);fields.append(lab);}row.append(fields);el('contexts').append(row);});
 labels();el('inspectStep').replaceChildren(...state.media.sequence.steps.map(s=>{const o=node('option',label(s.id));o.value=s.id;return o;}));inspect();renderResult();buttons();
}
el('inspectStep').onchange=()=>{cancelPending();selected=el('inspectStep').value;inspect();};
el('open').onchange=()=>{
 const file=el('open').files?.[0];if(!file)return;cancelPending();controller=new AbortController();const token={epoch,signal:controller.signal,prior:state};
 enqueueAdmission(async()=>{if(!current(token))return;let incoming=null;
  try{incoming=await readContextBundle(file,{signal:token.signal});if(!current(token)){releaseSequenceAssets(incoming.media.assets);incoming=null;return;}if(state)releaseSequenceAssets(state.media.assets);state=incoming;incoming=null;result=null;selected=state.media.sequence.steps[0].id;render();status('Source frames checked; original proposal and context drafts retained. Compare explicitly when all declarations are complete.');}
  catch(e){if(incoming)releaseSequenceAssets(incoming.media.assets);if(token.epoch===epoch&&!token.signal.aborted)status(e.message);}
  finally{if(token.epoch===epoch)el('open').value='';}
 });
};
el('compare').onclick=async()=>{
 if(!state||computing)return;cancelPending();const snapshot=state,version=epoch;computing=true;buttons();status('Comparing the complete set of declared steps…');
 try{await new Promise(resolve=>setTimeout(resolve,0));if(state!==snapshot||epoch!==version)return;const study=createContextOrder(snapshot.media.sequence,snapshot.prerequisites,snapshot.drafts),next=planContextOrder(snapshot.media.sequence,study);if(state!==snapshot||epoch!==version)return;result=next;renderResult();status('Conditional comparison recomputed. The original learner proposal is unchanged.');}catch(e){if(state===snapshot&&epoch===version)status(e.message);}finally{computing=false;buttons();}
};
async function save(originalOnly){
 if(!state||(originalOnly?savingOriginal:saving))return;const snapshot=state,version=epoch;if(originalOnly)savingOriginal=true;else saving=true;buttons();
 try{const blob=await makeContextBundle(snapshot,{originalOnly});if(state!==snapshot||epoch!==version)throw Error('The study changed while saving. Save the current version again.');const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=originalOnly?'original-prerequisite-rehearsal.json':'context-order.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(originalOnly?'Original rehearsal exported with its first proposal unchanged.':'Source frames, original prerequisite record and context drafts saved.');}catch(e){status(e.message);}finally{if(originalOnly)savingOriginal=false;else saving=false;buttons();}
}
el('save').onclick=()=>save(false);el('saveOriginal').onclick=()=>save(true);window.addEventListener('pagehide',()=>{cancelPending();if(state)releaseSequenceAssets(state.media.assets);});render();
