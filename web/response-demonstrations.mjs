import {derive} from '../src/geometry.mjs';
import {validateCapturedDemo,assertImageMatches} from '../src/capture.mjs';
import {loadLocalImage,releaseImage} from './image-input.mjs';
import {validateResponseStudy} from '../src/response-family.mjs';
import {DEMONSTRATION_RESPONSE_SCHEMA,validateDemonstrationResponse,analyzeDemonstrationResponse,exportDemonstrationResponse,responseFromDemonstrations} from '../src/response-demonstrations.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let omissionAudit=null,auditWorker=null;
let account=null,analysis=null,pending=null,inspection='reference',generation=0,imageGeneration=0,media=null;
const status=t=>{$('status').textContent=t;},fmt=n=>Number(n.toPrecision(6)).toString();
function release(){imageGeneration++;releaseImage(media);media=null;}
function annotationTask(annotation){return annotation?.source?.image?validateCapturedDemo(annotation):derive(annotation);}
function selected(){
 if(!account)return null;
 if(inspection==='pending'&&pending)return {annotation:pending,landmarkId:$('pending-mark').value,label:'Pending additional source'};
 if(inspection==='reference')return {annotation:account.referenceStudy.source,landmarkId:account.referenceStudy.landmarkId,label:'Original reference'};
 return inspection.startsWith('extra:')?account.demonstrations.find(d=>d.id===inspection.slice(6))||null:null;
}
function draw(){
 const current=selected();if(!current)return;const {annotation,landmarkId}=current,task=annotationTask(annotation),mark=task.landmarks.find(m=>m.id===landmarkId);if(!mark)return;
 const canvas=$('source-canvas'),ctx=canvas.getContext('2d'),w=Math.max(280,Math.round(canvas.clientWidth)),h=Math.min(500,Math.max(260,w*.62)),dpr=devicePixelRatio||1;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#edf3ec';ctx.fillRect(0,0,w,h);
 const meta=annotation.source.image,corners=annotation.source.corners;
 const minX=meta?0:Math.min(...corners.map(p=>p.x)),minY=meta?0:Math.min(...corners.map(p=>p.y)),maxX=meta?meta.widthPx:Math.max(...corners.map(p=>p.x)),maxY=meta?meta.heightPx:Math.max(...corners.map(p=>p.y));
 const scale=Math.min((w-48)/(maxX-minX),(h-48)/(maxY-minY)),ox=(w-(maxX-minX)*scale)/2,oy=(h-(maxY-minY)*scale)/2;
 const point=p=>({x:ox+(p.x-minX)*scale,y:oy+(p.y-minY)*scale});
 if(media?.element)ctx.drawImage(media.element,ox,oy,(maxX-minX)*scale,(maxY-minY)*scale);
 ctx.lineWidth=2;ctx.strokeStyle='#214e3d';ctx.beginPath();corners.forEach((p,i)=>{const q=point(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.stroke();
 ctx.font='14px system-ui';ctx.textBaseline='middle';corners.forEach((p,i)=>{const q=point(p);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(q.x,q.y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17312f';ctx.fillText(String(i+1),q.x-4,q.y);});
 const q=point(mark.sourcePx);ctx.fillStyle='#fae17e';ctx.strokeStyle='#442b13';ctx.beginPath();ctx.arc(q.x,q.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
 $('source-detail').textContent=`${current.label} · ${annotation.title||'Supplied annotation'} · ${annotation.source.widthMm} × ${annotation.source.heightMm} mm. ${meta?'Declared original image: '+meta.name+' · SHA-256 '+meta.sha256:'No source image identity retained.'}`;
 $('coordinate-detail').textContent=`Explicit mark ${mark.id}: supplied pixel (${fmt(mark.sourcePx.x)}, ${fmt(mark.sourcePx.y)}); annotation-derived position (${fmt(mark.uv.u*task.source.widthMm)}, ${fmt(mark.uv.v*task.source.heightMm)}) mm. Calibration and dimensions remain supplied.`;
 $('image-file').disabled=!meta;$('image-status').textContent=media?'Original file SHA-256, dimensions, type and orientation match this annotation. Pixels reattached locally.':meta?'Annotation geometry only. Reattach the matching original file to inspect pixels.':'Annotation geometry only; this source has no original-image identity to verify.';
}
function render(){
 $('workspace').hidden=false;$('reference-title').textContent=`${account.referenceStudy.source.title||'Reference source'} · mark ${account.referenceStudy.landmarkId} · ${account.referenceStudy.observations.length} original numeric observation(s).`;
 const choices=[{id:'reference',label:'Original reference'},...(pending?[{id:'pending',label:'Pending additional source'}]:[]),...account.demonstrations.map(d=>({id:'extra:'+d.id,label:d.label}))];
 $('inspection').replaceChildren(...choices.map(c=>{const o=node('option',c.label);o.value=c.id;return o;}));if(!choices.some(c=>c.id===inspection))inspection='reference';$('inspection').value=inspection;
 const a=analysis.analysis;$('family-summary').textContent=a.status==='incompatible'?'No complete affine family satisfies all retained observations under the supplied bounds.':`${a.observationCount} observations; ${a.variationRank} independent size-variation directions. ${a.status==='unobserved'?'No additional response evidence yet.':'A complete affine family remains compatible with supplied bounds.'}`;
 $('target-range').textContent=a.status==='incompatible'?'No common target range.':`At ${account.referenceStudy.target.widthMm} × ${account.referenceStudy.target.heightMm} mm: x ${fmt(a.axes.x.prediction.lower)}–${fmt(a.axes.x.prediction.upper)} mm; y ${fmt(a.axes.y.prediction.lower)}–${fmt(a.axes.y.prediction.upper)} mm. ${Object.values(a.axes).some(v=>v.extendsBeyondSheet)?'Some ranges extend beyond the sheet; no clipping applied.':''}`;
 $('demonstrations').replaceChildren(...account.demonstrations.map(d=>{const row=analysis.response.observations.find(r=>r.id===d.id),tr=node('tr');tr.append(node('td',`${d.label} · ${d.id} (${d.evidenceClass})`),node('td',`(${fmt(row.xMm)}, ${fmt(row.yMm)}) mm`),node('td',`${row.widthMm} × ${row.heightMm} mm; ±(${row.xBoundMm}, ${row.yBoundMm}) mm`));const td=node('td'),button=node('button','Remove');button.onclick=()=>{const draft=pending,previousInspection=inspection;accept({...account,demonstrations:account.demonstrations.filter(r=>r.id!==d.id)},'Source removed; remaining original evidence recomputed.');pending=draft;inspection=previousInspection;$('admission').hidden=!pending;render();};button.setAttribute('aria-label','Remove '+d.label);td.append(button);tr.append(td);[...tr.children].forEach((cell,i)=>cell.dataset.label=['Additional source','Derived position','Workpiece and bounds','Action'][i]);return tr;}));
 $('limits').replaceChildren(...[...analysis.limitations,...a.limitations].map(t=>node('li',t)));draw();
}
function accept(raw,message){const next=validateDemonstrationResponse(raw),out=analyzeDemonstrationResponse(next);generation++;auditWorker?.terminate();omissionAudit=null;$('audit-result').hidden=true;$('audit-status').textContent='';$('omission-audit').hidden=false;release();account=next;analysis=out;pending=null;inspection='reference';$('admission').hidden=true;render();status(message);}
async function jsonFile(file){if(!file||file.size>2_000_000)throw Error('Choose JSON no larger than2MB');return JSON.parse(await file.text());}
$('account-file').onchange=async()=>{const token=++generation;try{const raw=await jsonFile($('account-file').files[0]);if(token!==generation)return;accept(raw.schema===DEMONSTRATION_RESPONSE_SCHEMA?raw:{schema:DEMONSTRATION_RESPONSE_SCHEMA,referenceStudy:validateResponseStudy(raw),demonstrations:[]},'Reference and raw annotations accepted; all derived coordinates recomputed.');}catch(e){if(token===generation)status(`Import refused: ${e.message}. Previous account retained.`);}finally{$('account-file').value='';}};
$('annotation-file').onchange=async()=>{if(!account)return;const token=++generation;try{const raw=await jsonFile($('annotation-file').files[0]);if(token!==generation)return;const task=annotationTask(raw);pending=raw;generation++;release();$('pending-mark').replaceChildren(...task.landmarks.map(m=>{const o=node('option',m.label+' · '+m.id);o.value=m.id;return o;}));$('label').value=raw.title||'Additional source';$('x-bound').value='';$('y-bound').value='';$('correspondence').checked=false;$('pending-title').textContent=`${raw.title||'Additional source'} · ${task.source.widthMm} × ${task.source.heightMm} mm`;$('admission').hidden=false;inspection='pending';render();status('Additional annotation inspected. Choose correspondence and declare bounds before retaining it.');}catch(e){if(token===generation)status(`Annotation refused: ${e.message}. Previous account and pending source retained.`);}finally{$('annotation-file').value='';}};
$('pending-mark').onchange=()=>{generation++;$('correspondence').checked=false;draw();};
$('admission').addEventListener('input',()=>{generation++;});
$('admission').onsubmit=event=>{event.preventDefault();if(!account||!pending)return;try{let n=1;while([...account.referenceStudy.observations,...account.demonstrations].some(r=>r.id===`demonstration-${n}`))n++;const id=`demonstration-${n}`,row={id,label:$('label').value,evidenceClass:$('basis').value,annotation:pending,landmarkId:$('pending-mark').value,correspondenceConfirmed:$('correspondence').checked,xBoundMm:$('x-bound').valueAsNumber,yBoundMm:$('y-bound').valueAsNumber};accept({...account,demonstrations:[...account.demonstrations,row]},'Raw annotation and explicit correspondence retained; response family recomputed.');inspection='extra:'+id;render();}catch(e){status(`Admission refused: ${e.message}`);}};
$('inspection').onchange=()=>{inspection=$('inspection').value;release();draw();};
$('image-file').onchange=async()=>{const current=selected(),file=$('image-file').files[0];if(!current?.annotation.source.image||!file)return;const token=++imageGeneration;let received=null;try{received=await loadLocalImage(file);if(token!==imageGeneration){releaseImage(received);return;}assertImageMatches(current.annotation,received.image);const element=new Image();element.src=received.url;await element.decode();if(token!==imageGeneration){releaseImage(received);return;}releaseImage(media);media={...received,element};received=null;draw();status('Original image bytes matched and reattached for this source only.');}catch(e){releaseImage(received);if(token===imageGeneration)status(`Image refused: ${e.message}. Prior accepted pixels retained.`);}finally{$('image-file').value='';}};
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value)],{type:'application/json'})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>{if(account)download(exportDemonstrationResponse(account),'skill-response-demonstrations.json');};
$('export-response').onclick=()=>{if(account)download(responseFromDemonstrations(account),'skill-response-family.json');};
window.addEventListener('resize',draw);window.addEventListener('pagehide',event=>{if(!event.persisted)release();});

const auditLabels={contained:'Every remaining-model prediction is inside the supplied bounds',overlaps:'Some predictions are inside; others are outside',excluded:'No compatible prediction','remainder-incompatible':'Remaining observations are incompatible; no prediction'};
function selectAudit(){
 const row=omissionAudit?.rows.find(r=>r.omission.observation.id===$('audit-row').value);if(!row)return;
 const o=row.omission;$('audit-summary').textContent=`${o.observation.label}: ${auditLabels[o.status]}. ${o.retainedCount} other observations retained.`;
 $('audit-custody').textContent=row.sourceKind==='retained-annotation'?'The original additional annotation and explicit corresponding mark remain available for inspection. Pair its original image to inspect pixels.':'This row was supplied numerically. No additional original annotation exists for this observation; inspection shows the fixed reference only.';
 $('audit-exact').textContent=JSON.stringify(o.axes,null,2);
}
$('audit-run').onclick=()=>{
 if(!account)return;const token=generation;auditWorker?.terminate();const worker=new Worker('/web/demonstration-holdout-worker.mjs',{type:'module'});auditWorker=worker;
 $('audit-status').textContent='Computing complete source-retaining omission audit.';
 worker.onmessage=event=>{worker.terminate();if(token!==generation||worker!==auditWorker)return;if(event.data.error){$('audit-status').textContent='Audit refused: '+event.data.error;return;}omissionAudit=event.data.result;$('audit-row').replaceChildren(...omissionAudit.rows.map(r=>{const o=node('option',r.omission.observation.label+' · '+r.omission.observation.id);o.value=r.omission.observation.id;return o;}));$('audit-result').hidden=!omissionAudit.rows.length;selectAudit();$('audit-status').textContent=`Complete: ${omissionAudit.rows.length} omissions recomputed from retained original inputs.`;};
 worker.onerror=()=>{worker.terminate();if(token===generation&&worker===auditWorker)$('audit-status').textContent='Audit unavailable; original account retained.';};worker.postMessage(account);
};
$('audit-row').onchange=selectAudit;
$('audit-inspect').onclick=()=>{const row=omissionAudit?.rows.find(r=>r.omission.observation.id===$('audit-row').value);if(!row)return;inspection=row.inspection;release();render();$('inspection').focus();$('source-canvas').scrollIntoView({block:'center'});};
