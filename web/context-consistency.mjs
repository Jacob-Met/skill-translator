import {mountContextAllowance} from '/web/context-allowance-view.mjs';
import {CONTEXT_SCHEMA,CONTEXT_INPUT_SCHEMA,MAX_CONTEXT_BYTES,readContextInput,createContextStudy,contextOriginalRules} from '/src/context-consistency.mjs';
import {loadLocalImage,releaseImage} from '/web/image-input.mjs';
import {assertImageMatches} from '/src/capture.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const allowanceView=mountContextAllowance($('result'));
let input=null,accepted=null,result=null,generation=0,worker=null,media=null,imageGeneration=0;
const say=text=>{$('status').textContent=text;};
const fmt=x=>Number.isInteger(x)?String(x):Number(x).toPrecision(6);
const mid=q=>(q.lower+q.upper)/2;
function clearComputation(){allowanceView.reset();generation++;worker?.terminate();worker=null;accepted=null;result=null;$('result').hidden=true;$('save').disabled=true;}
function edited(){clearComputation();say('Declaration changed. Inspect again before using or saving a result.');}
function imageStatus(){const image=input?.source.source.image;$('imageLabel').hidden=!image;$('imageStatus').textContent=image?`Original source image ${image.name} · SHA-256 ${image.sha256}. ${media?'Matching original bytes reattached in this session.':'Original image not attached in this session.'} Additional observation positions are supplied separately; this image does not verify them.`:'This account contains authored planar annotations without an original image identity.';$('sourceImage').hidden=!media;if(media)$('sourceImage').src=media.url;else $('sourceImage').removeAttribute('src');}
function renderRows(ids=[]){const selected=new Set(ids);$('rows').replaceChildren();for(const o of input.observationEvidence.observations.filter(o=>o.landmarkId===$('mark').value)){const label=node('label'),check=node('input'),text=node('span',`${o.label} (${o.id}) · ${o.widthMm} × ${o.heightMm} mm · (${o.xMm}, ${o.yMm}) mm · radius ${o.uncertaintyMm} mm · ${o.evidenceClass}`);check.type='checkbox';check.value=o.id;check.checked=selected.has(o.id);check.dataset.observationId=o.id;label.append(check,text);$('rows').append(label);}}
function acceptInput(next){
 clearComputation();input=next;imageGeneration++;releaseImage(media);media=null;
 $('sourceDetails').hidden=$('setup').hidden=$('saveSection').hidden=false;
 $('sourceText').textContent=`${input.source.title||'Retained source'} · ${input.source.provenance||'Supplied annotation'} · ${input.observationEvidence.observations.length} original observations retained.`;
 $('mark').replaceChildren(...input.source.landmarks.map(m=>{const o=node('option',m.label);o.value=m.id;return o;}));
 $('mark').value=input.group?.landmarkId||input.selectedMark||input.source.landmarks[0].id;
 $('contextLabel').value=input.group?.label||'';$('basis').value=input.group?.basis||'';$('comparable').checked=input.group?.comparable===true;renderRows(input.group?.observationIds);imageStatus();
 say('Original source and observations accepted. Explicitly select and declare one comparable context.');if(input.schema===CONTEXT_SCHEMA)compute();
}
function draft(){return {landmarkId:$('mark').value,observationIds:[...$('rows').querySelectorAll('input:checked')].map(n=>n.value),label:$('contextLabel').value,basis:$('basis').value,comparable:$('comparable').checked};}
function svg(tag,attrs,text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;return n;}
function draw(rows){
 const el=$('diagram');el.replaceChildren();const xs=rows.flatMap(o=>[o.xMm-o.uncertaintyMm,o.xMm+o.uncertaintyMm]),ys=rows.flatMap(o=>[o.yMm-o.uncertaintyMm,o.yMm+o.uncertaintyMm]);let x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;const pad=Math.max(w,h,2)*.12;x-=pad;y-=pad;w+=2*pad;h+=2*pad;el.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);const scale=Math.max(w,h),support=new Set(result.certificate?.support.map(s=>s.observationId)||[]);
 el.append(svg('rect',{x:0,y:0,width:rows[0].widthMm,height:rows[0].heightMm,fill:'none',stroke:'#507262','stroke-width':scale*.004}));
 rows.forEach((o,i)=>{const color=support.has(o.id)?'#f2bd87':'#79c5ae';el.append(svg('circle',{cx:o.xMm,cy:o.yMm,r:o.uncertaintyMm,fill:'none',stroke:color,'stroke-width':scale*.005}),svg('circle',{cx:o.xMm,cy:o.yMm,r:scale*.008,fill:color}),svg('text',{x:o.xMm+scale*.015,y:o.yMm-scale*.015,fill:color,'font-size':scale*.035},String(i+1)));});
 if(result.point)el.append(svg('circle',{cx:mid(result.point.xMm),cy:mid(result.point.yMm),r:scale*.018,fill:'#fff1b9',stroke:'#082019','stroke-width':scale*.004}));
}
function renderResult(){
 $('result').hidden=false;$('result').dataset.status=result.status;$('witness').replaceChildren();
 const rows=accepted.group.observationIds.map(id=>accepted.observationEvidence.observations.find(o=>o.id===id));
 $('resultTitle').textContent=result.status==='incompatible'?'No common position satisfies this declared context':result.status==='common-position'?'The selected disks admit a common position':'Context consistency remains unresolved';
 $('resultSummary').textContent=result.status==='incompatible'?`${rows.length} selected records cannot share one position under the declared closed disks. The following ${result.certificate.support.length} records provide a sufficient mathematical certificate; they are not identified as faulty.`:result.status==='common-position'?`Every one of the ${rows.length} selected disks contains the verified point near (${fmt(mid(result.point.xMm))}, ${fmt(mid(result.point.yMm))}) mm. This does not establish the physical assumptions or a transfer rule.`:result.reason;
 const original=contextOriginalRules(accepted);$('originalRules').textContent=`Original five-rule result across ALL ${original.observations.length} retained observations for this mark: ${original.status}; compatible rules: ${original.compatibleRules.join(', ')||'none'}. Those original numerical checks and every raw record remain unchanged.`;
 if(result.certificate){const list=node('ul');for(const item of result.certificate.support){const o=rows.find(r=>r.id===item.observationId);list.append(node('li',`${o.label} (${o.id}) · position (${o.xMm}, ${o.yMm}) mm · radius ${o.uncertaintyMm} mm · nonnegative certificate weight approximately ${fmt(mid(item.weight))}.`));}$('witness').append(list,node('p','A nonnegative weighted sum of the squared disk inequalities has a strictly positive lower bound. Therefore no point can satisfy all selected inequalities. This does not tell you which assumption should change.'));}
 else if(result.point)$('witness').append(node('p','The light point is a mathematical witness. Each selected disk was checked exactly; diagram coordinates are rounded.'));
 $('exact').textContent=JSON.stringify({method:result.method,certificate:result.certificate,point:result.point,checks:result.checks,work:result.work,workLimit:result.workLimit,examinedSupports:result.examinedSupports},null,2);
 $('limits').replaceChildren(...result.limitations.map(t=>node('li',t)));draw(rows);
}
function compute(){
 clearComputation();let account;try{account=createContextStudy(input,draft());}catch(e){say('Context refused: '+e.message);return;}
 const token=generation;say('Checking exact declared disks; original evidence remains retained.');const w=new Worker('/web/context-consistency-worker.mjs',{type:'module'});worker=w;
 w.onmessage=event=>{if(token!==generation)return;w.terminate();worker=null;if(event.data.error){say('Computation refused: '+event.data.error);return;}accepted=account;result=event.data.result;renderResult();allowanceView.ready(accepted);$('save').disabled=false;say(result.status==='unresolved'?'No complete certificate obtained; original inputs can still be saved.':'Conditional mathematical result recomputed from the original inputs.');};
 w.onerror=()=>{if(token!==generation)return;w.terminate();worker=null;say('The computation worker failed. No new result is claimed; inspect again or retain the original inputs.');};w.postMessage(account);
}
$('contextForm').addEventListener('input',edited);$('contextForm').onsubmit=e=>{e.preventDefault();compute();};$('mark').onchange=()=>{edited();renderRows();};
for(const [id,value]of [['selectAll',true],['selectNone',false]])$(id).onclick=()=>{for(const c of $('rows').querySelectorAll('input'))c.checked=value;edited();};
$('inputFile').onchange=async()=>{const file=$('inputFile').files[0];if(!file)return;$('inputFile').value='';const token=++generation;worker?.terminate();worker=null;try{if(file.size>MAX_CONTEXT_BYTES)throw Error('Choose a complete JSON account no larger than 2 MB.');const next=readContextInput(JSON.parse(await file.text()));if(token!==generation)return;acceptInput(next);}catch(e){if(token===generation)say('Import refused; previous source and account retained. '+e.message);}finally{if(token===generation)$('inputFile').value='';}};
$('imageFile').onchange=async()=>{const file=$('imageFile').files[0];if(!file)return;const token=++imageGeneration,expected=input?.source.source.image;let next;try{if(!expected)throw Error('This source declares no original image.');next=await loadLocalImage(file);if(token!==imageGeneration){releaseImage(next);return;}assertImageMatches(input.source,next.image);releaseImage(media);media=next;imageStatus();}catch(e){releaseImage(next);if(token===imageGeneration)say('Original image refused; previous attachment retained. '+e.message);}finally{if(token===imageGeneration)$('imageFile').value='';}};
$('save').onclick=()=>{if(!accepted||!result)return;const url=URL.createObjectURL(new Blob([JSON.stringify(accepted,null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download='skill-context-consistency.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Saved original source, all observations and your declared group; findings recompute on reopening.');};
window.addEventListener('pagehide',()=>{generation++;worker?.terminate();releaseImage(media);});
try{const raw=sessionStorage.getItem(CONTEXT_INPUT_SCHEMA);if(raw){const next=readContextInput(JSON.parse(raw));acceptInput(next);sessionStorage.removeItem(CONTEXT_INPUT_SCHEMA);}}catch(e){say('Source handoff refused. '+e.message);}
