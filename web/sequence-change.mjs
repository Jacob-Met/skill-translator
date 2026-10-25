import {inspectPatternChange} from '/src/pattern-change.mjs';
import {createStateChange,validateStateChange,declareStateReference,upsertCorrespondence,removeCorrespondence,stateChangeEvidence,separationChange,MAX_CORRESPONDENCES} from '/src/sequence-change.mjs';
import {toDisplay} from '/src/geometry.mjs';
import {readStateChangeBundle,makeStateChangeBundle} from '/web/sequence-change-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';

const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const svg=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));if(text!==undefined)n.textContent=text;return n;};
const palette=['#d1e9a0','#ffcc91','#a9cfff','#e5b4e9','#8ee3ce','#ffacac'];
const number=x=>(Math.abs(x)<.0005?0:x).toFixed(2),point=p=>`${number(p.xMm)}, ${number(p.yMm)}`;
const sourceMarkLabel=mark=>`${mark.label} (${mark.sourcePx.x.toFixed(1)}, ${mark.sourcePx.y.toFixed(1)} px)`;
const status=text=>{$('change-status').textContent=text;};
let state=null,assets=new Map(),generation=0,revision=0,controller=null,busy=false,referenceDirty=false,pairDirty=false;
function begin(){controller?.abort();controller=new AbortController();busy=true;sync();return {generation:++generation,revision,signal:controller.signal};}
const current=op=>op.generation===generation&&!op.signal.aborted;
function finish(op){if(current(op)){busy=false;controller=null;sync();}}
function edited(){revision++;sync();}
function options(select,items,preferred){select.replaceChildren(...items.map(([value,label])=>{const o=node('option',label);o.value=value;return o;}));if(items.some(([v])=>v===preferred))select.value=preferred;}
function endpoints(){const step=state.sequence.steps.find(s=>s.id===state.stepId);return {step,before:state.sequence.moments.find(m=>m.id===step.beforeMomentId),after:state.sequence.moments.find(m=>m.id===step.afterMomentId)};}
function sync(){
  $('change-step').disabled=!state||busy;
  $('save-change').disabled=!state||busy||referenceDirty||pairDirty;
  $('declare-reference').disabled=!state||busy;
  $('discard-reference').disabled=!state||busy;
  const allowed=state?.reference&&!referenceDirty&&!busy;
  for(const id of ['before-mark','after-mark','pair-label'])$(id).disabled=!allowed;
  $('add-pair').disabled=!allowed||state.pairs.length>=MAX_CORRESPONDENCES;
  for(const button of document.querySelectorAll('#paired-points button'))button.disabled=busy||referenceDirty;
  $('reference-status').textContent=referenceDirty?'Reference draft changed. Apply it or discard it before saving or pairing points.':state?.reference?`Declared reference: ${state.reference.label}. ${state.reference.basis}`:'No shared reference has been declared.';
}
function fillReference(){const r=state.reference;$('reference-label').value=r?.label??'';$('reference-basis').value=r?.basis??'';$('reference-confirm').checked=Boolean(r);referenceDirty=false;}
function frame(moment,role){
  const fig=node('figure'),view=svg('svg',{viewBox:`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`,role:'img','aria-label':`${role} source frame and declared point overlays`});
  view.append(svg('image',{href:assets.get(moment.id).media.url,width:moment.image.widthPx,height:moment.image.heightPx}));
  const radius=Math.max(moment.image.widthPx,moment.image.heightPx)/75;
  state.pairs.forEach((pair,i)=>{const id=role==='Before'?pair.beforeMarkId:pair.afterMarkId,mark=moment.calibratedTask.landmarks.find(m=>m.id===id),{x,y}=mark.sourcePx;
    view.append(svg('circle',{cx:x,cy:y,r:radius,fill:palette[i%palette.length],stroke:'#0b1710','stroke-width':radius*.2}),svg('text',{x,y:y+radius*.35,'text-anchor':'middle',fill:'#0b1710','font-size':radius*1.2,'font-weight':700},String(i+1)));
  });
  fig.append(view,node('figcaption',`${role}: ${moment.label} · presented ${moment.origin.mediaTimeSeconds.toFixed(3)} s · requested ${moment.origin.requestedTimeSeconds.toFixed(3)} s${moment.visibleState?' · '+moment.visibleState:''}`));return fig;
}
function drawPlane(evidence){
  const view=$('common-plane');view.replaceChildren();
  const scale=Math.min(660/evidence.widthMm,390/evidence.heightMm),box={width:evidence.widthMm*scale,height:evidence.heightMm*scale};box.x=(760-box.width)/2;box.y=(500-box.height)/2;
  const target={widthMm:evidence.widthMm,heightMm:evidence.heightMm};
  view.append(svg('rect',{...box,fill:'#14271b',stroke:'#63815a','stroke-width':1.5}),svg('text',{x:box.x,y:box.y-15,fill:'#b5c7ae','font-size':14},`${number(evidence.widthMm)} × ${number(evidence.heightMm)} mm · declared reference`));
  evidence.pairs.forEach((pair,i)=>{const a=toDisplay(pair.before,target,box),b=toDisplay(pair.after,target,box),color=palette[i%palette.length];
    view.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:color,'stroke-width':2,'stroke-dasharray':'5 5'}),svg('circle',{cx:a.x,cy:a.y,r:7,fill:'#0b1710',stroke:color,'stroke-width':2.5}),svg('circle',{cx:b.x,cy:b.y,r:5,fill:color}),svg('text',{x:Math.min(735,b.x+10),y:Math.max(20,b.y-10),fill:color,'font-size':14},String(i+1)));
  });
}
function relationship(){
  if(!state?.reference||state.pairs.length<2)return;
  try{const r=separationChange(state,$('relationship-first').value,$('relationship-second').value);$('relationship-result').textContent=`Separation: ${number(r.before.distanceMm)} → ${number(r.after.distanceMm)} mm; change ${number(r.change.distanceMm)} mm. Directed horizontal separation: ${number(r.before.horizontalMm)} → ${number(r.after.horizontalMm)} mm. Directed vertical separation: ${number(r.before.verticalMm)} → ${number(r.after.verticalMm)} mm.`;}
  catch(error){$('relationship-result').textContent=error.message;}
}
function pattern(){
  const report=inspectPatternChange(state);
  $('pattern-summary').textContent=report.pairs.length?`${report.pairedPoints} declared points · all ${report.pairs.length} pair separations · largest absolute change ${number(report.largestSeparationChangeMm)} mm. Unpaired source marks are excluded; see the coverage above.`:'Pair at least two source points to inspect their relationships.';
  $('pattern-pairs').replaceChildren(...report.rankedPairs.map(p=>{const row=node('tr');for(const value of [p.labels.join(' / '),number(p.beforeMm),number(p.afterMm),number(p.changeMm)])row.append(node('td',value));return row;}));
  $('pattern-orientation').textContent=report.triangles.length?`All ${report.triangles.length} point triples inspected: ${report.reversed.length} nominal side reversal(s), ${report.degenerate.length} collinear in at least one state. ${report.reversed.length?'The computed nominal points cannot all be related by one planar translation and proper rotation; this does not establish a visible or physical reversal.':'No nominal reversal was found; this alone does not establish a rigid motion.'}`:'At least three correspondences are needed to inspect triangle sides.';
  const witnesses=[...report.reversed,...report.degenerate];
  $('pattern-witnesses').replaceChildren(...witnesses.slice(0,30).map(t=>node('li',`${t.labels.join(' / ')}: ${t.finding==='reversed'?'nominal side reversal':'collinear in at least one state'} (signed sides ${t.before} → ${t.after}).`)));
  $('pattern-witness-limit').textContent=witnesses.length>30?`Showing the first 30 of ${witnesses.length} witnesses. All triples were evaluated; remove or isolate correspondences to inspect another subset.`:'';
  $('pattern-boundary').textContent=report.boundary;
}
function render(){
  $('change-workspace').hidden=!state;if(!state){sync();return;}
  options($('change-step'),state.sequence.steps.map(s=>[s.id,s.title]),state.stepId);
  const {step,before,after}=endpoints();$('step-heading').textContent=step.title;$('frame-times').textContent=`${(after.origin.mediaTimeSeconds-before.origin.mediaTimeSeconds).toFixed(3)} s between retained frames`;
  $('step-account').textContent=`Intended result: ${step.intent}${step.visibleChange?' · Visible change: '+step.visibleChange:''}`;
  $('source-frames').replaceChildren(frame(before,'Before'),frame(after,'After'));
  $('calibration-state').textContent=[['Before',before],['After',after]].map(([label,m])=>m.calibratedTask?`${label}: ${m.calibratedTask.source.widthMm} × ${m.calibratedTask.source.heightMm} mm, ${m.calibratedTask.landmarks.length} source marks.`:`${label}: no calibrated task. Return to the sequence editor to attach one.`).join(' ');
  for(const [id,m]of [['before-mark',before],['after-mark',after]])options($(id),(m.calibratedTask?.landmarks??[]).map(mark=>[mark.id,sourceMarkLabel(mark)]),$(id).value);
  $('paired-points').replaceChildren(...state.pairs.map(p=>{const a=before.calibratedTask.landmarks.find(m=>m.id===p.beforeMarkId),b=after.calibratedTask.landmarks.find(m=>m.id===p.afterMarkId);const li=node('li',`${p.label} — before: ${sourceMarkLabel(a)}; after: ${sourceMarkLabel(b)}`),button=node('button','Remove');button.type='button';button.className='quiet';button.addEventListener('click',()=>{state=removeCorrespondence(state,p.id);edited();render();status('Removed the correspondence; original source marks remain.');});li.append(button);return li;}));
  $('change-results').hidden=!state.reference||!state.pairs.length;
  $('pattern-panel').hidden=!state.reference;
  if(state.reference){const evidence=stateChangeEvidence(state);$('unpaired-points').textContent=`Unpaired before: ${evidence.unpaired.before.map(p=>p.label).join(', ')||'none'}. Unpaired after: ${evidence.unpaired.after.map(p=>p.label).join(', ')||'none'}.`;
    drawPlane(evidence);pattern();$('change-rows').replaceChildren(...evidence.pairs.map((p,i)=>{const tr=node('tr');for(const value of [`${i+1}. ${p.label}`,point(p.before),point(p.after),`${number(p.dxMm)}, ${number(p.dyMm)}`,number(p.endpointDistanceMm)])tr.append(node('td',value));return tr;}));
  }else $('unpaired-points').textContent='Source marks remain unpaired until you declare their common reference and correspondence.';
  $('relationship-panel').hidden=state.pairs.length<2;
  options($('relationship-first'),state.pairs.map(p=>[p.id,p.label]),$('relationship-first').value);
  const second=$('relationship-second').value,first=$('relationship-first').value;
  options($('relationship-second'),state.pairs.map(p=>[p.id,p.label]),second&&second!==first?second:state.pairs.find(p=>p.id!==first)?.id);relationship();
  $('source-record').textContent=JSON.stringify({title:state.sequence.title,context:state.sequence.context,step,reference:state.reference,moments:[before,after].map(m=>({id:m.id,image:m.image,origin:m.origin,evidenceClass:m.calibratedTask?.evidenceClass,calibration:m.calibratedTask?.source}))},null,2);sync();
}
$('change-file').addEventListener('change',async()=>{
  const file=$('change-file').files[0];$('change-file').value='';if(!file)return;const op=begin();let received;
  try{received=await readStateChangeBundle(file,{signal:op.signal});if(!current(op)||revision!==op.revision){releaseSequenceAssets(received.assets);received=null;if(current(op))status('The comparison changed while reading the file. Newer work remains.');return;}
    releaseSequenceAssets(assets);assets=received.assets;state=received.state;received=null;revision++;pairDirty=false;$('pair-label').value='';fillReference();render();status('Reopened verified source frames. Derived positions are recomputed from their original annotations.');
  }catch(error){if(received)releaseSequenceAssets(received.assets);if(current(op))status(`Cannot open comparison: ${error.message} Previous accepted work remains.`);}finally{finish(op);}
});
$('change-step').addEventListener('change',()=>{try{state=createStateChange(state.sequence,$('change-step').value);pairDirty=false;$('pair-label').value='';fillReference();edited();render();status('Selected another step. Declare its reference and point identities; the complete source sequence is retained.');}catch(error){status(error.message);render();}});
for(const id of ['reference-label','reference-basis','reference-confirm'])$(id).addEventListener('input',()=>{referenceDirty=true;edited();});
$('discard-reference').addEventListener('click',()=>{fillReference();edited();render();status('Reference draft discarded. Accepted declarations remain.');});
$('reference-form').addEventListener('submit',event=>{event.preventDefault();try{state=declareStateReference(state,{label:$('reference-label').value,basis:$('reference-basis').value,samePlaneAndCorners:$('reference-confirm').checked});referenceDirty=false;edited();render();status('Shared reference retained as your explicit declaration. Choose specific source points to compare.');}catch(error){status(error.message);}});
for(const id of ['before-mark','after-mark','pair-label'])$(id).addEventListener('input',()=>{pairDirty=Boolean($('pair-label').value.trim());edited();});
$('pair-form').addEventListener('submit',event=>{event.preventDefault();try{state=upsertCorrespondence(state,{id:'pair-'+crypto.randomUUID(),label:$('pair-label').value,beforeMarkId:$('before-mark').value,afterMarkId:$('after-mark').value});pairDirty=false;$('pair-label').value='';edited();render();status('Declared correspondence added. Positions and separation are recomputed from the retained source calibrations.');}catch(error){status(error.message);}});
for(const id of ['relationship-first','relationship-second'])$(id).addEventListener('change',relationship);
$('save-change').addEventListener('click',async()=>{if(!state||referenceDirty||pairDirty)return;const op=begin();try{const blob=await makeStateChangeBundle(state,assets,{signal:op.signal});if(!current(op)||revision!==op.revision){if(current(op))status('The comparison changed while saving. Save the current declarations again.');return;}const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='demonstrated-state-change.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Saved the complete source frames, annotations and current declarations. Derived differences will be recomputed when reopened.');}catch(error){if(current(op))status(error.message);}finally{finish(op);}});
window.addEventListener('pagehide',event=>{if(event.persisted)return;controller?.abort();releaseSequenceAssets(assets);});
render();

