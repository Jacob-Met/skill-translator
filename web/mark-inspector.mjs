import {loadLocalImage,releaseImage} from '/web/image-input.mjs';
import {reopenCapture,exportCapture,MAX_ANNOTATION_BYTES} from '/src/capture-editing.mjs';
import {inspectSourceMark,adoptSourceComponent,inspectionRelation,reproduceSourceInspection,inspectionCrop} from '/src/mark-inspection.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
let demo=null,media=null,decoded=null,landmarkId=null,report=null,raster=null,selected=null,revision=0,importVersion=0;
const number=id=>$(id).value.trim()?Number($(id).value):NaN;
const fail=message=>{$('inspectorError').textContent=message;$('inspectorError').hidden=!message;};
function svg(tag,attrs,text){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;$('sourceView').append(e);return e;}
function chosen(){return demo?.landmarks.find(m=>m.id===landmarkId);}
function cropInput(){return {x:number('cropX'),y:number('cropY'),width:number('cropWidth'),height:number('cropHeight')};}
function settings(){return {method:$('contrastMethod').value,polarity:$('polarity').value,threshold:number('threshold'),radius:number('backgroundRadius'),minArea:number('minArea'),maxArea:number('maxArea')};}
function putCrop(crop){for(const[k,id]of Object.entries({x:'cropX',y:'cropY',width:'cropWidth',height:'cropHeight'}))$(id).value=crop[k];}
function centeredCrop(point){const w=Math.min(64,media.image.widthPx),h=Math.min(64,media.image.heightPx);return {x:Math.max(0,Math.min(media.image.widthPx-w,Math.floor(point.x-w/2))),y:Math.max(0,Math.min(media.image.heightPx-h,Math.floor(point.y-h/2))),width:w,height:h};}
function readCrop(raw){const crop=inspectionCrop(raw,media.image),canvas=document.createElement('canvas');canvas.width=crop.width;canvas.height=crop.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(decoded,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height);return ctx.getImageData(0,0,crop.width,crop.height);}
function clearInspection(){revision++;report=null;raster=null;selected=null;$('adoptRegion').disabled=true;$('regionChoices').replaceChildren();$('proposalDetails').textContent='Choose a component after inspecting the current pixels.';$('extractionStatus').textContent='Inputs changed. Inspect these pixels again; no old component remains selected.';$('inspectPixels').disabled=false;drawSource();drawCrop();}
function drawSource(){
 const view=$('sourceView');view.replaceChildren();if(!media)return;
 const {widthPx:w,heightPx:h}=media.image,scale=Math.max(w,h)/700;view.setAttribute('viewBox',`0 0 ${w} ${h}`);
 svg('image',{href:media.url,x:0,y:0,width:w,height:h});
 svg('polygon',{points:demo.source.corners.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#f6cc56','stroke-width':2*scale});
 for(const [i,m]of demo.landmarks.entries()){svg('circle',{cx:m.sourcePx.x,cy:m.sourcePx.y,r:7*scale,fill:'none',stroke:m.id===landmarkId?'#ed7135':'#168b76','stroke-width':2*scale});svg('text',{x:m.sourcePx.x+8*scale,y:m.sourcePx.y-8*scale,fill:'#ed7135','font-size':14*scale},String(i+1));}
 try{const c=inspectionCrop(cropInput(),media.image);svg('rect',{x:c.x,y:c.y,width:c.width,height:c.height,fill:'none',stroke:'#db2a60','stroke-width':2*scale});}catch{}
}
function drawCrop(){
 const canvas=$('cropView'),ctx=canvas.getContext('2d');
 let pixels=raster;try{if(!pixels&&media)pixels=readCrop(cropInput());}catch{}
 if(!pixels){canvas.width=16;canvas.height=16;ctx.clearRect(0,0,16,16);return;}
 canvas.width=pixels.width;canvas.height=pixels.height;canvas.style.maxWidth=Math.min(560,500*pixels.width/pixels.height)+'px';ctx.putImageData(pixels,0,0);
 if(report&&$('showSupport').checked){const overlay=ctx.getImageData(0,0,canvas.width,canvas.height),chosenLabel=report.candidates.find(c=>c.id===selected)?.label;
  for(let i=0;i<report.labels.length;i++){const label=report.labels[i];if(!label)continue;const color=label===chosenLabel?[14,200,135]:[240,126,45];for(let k=0;k<3;k++)overlay.data[i*4+k]=Math.round(overlay.data[i*4+k]*.45+color[k]*.55);}
  ctx.putImageData(overlay,0,0);
 }
}
function retained(){const relation=inspectionRelation(demo,landmarkId);$('retainedStatus').textContent=relation.message;$('reproduceSaved').disabled=relation.status!=='recorded';}
function selectComponent(id){selected=id;const c=report?.candidates.find(c=>c.id===id);$('adoptRegion').disabled=!c?.eligible;
 $('proposalDetails').textContent=c?`${c.id}: ${c.area} source pixels; center (${c.sourcePx.x.toFixed(3)}, ${c.sourcePx.y.toFixed(3)}) px. Current calibrated position (${c.physicalMm.x.toFixed(3)}, ${c.physicalMm.y.toFixed(3)}) mm. ${c.eligible?'Review the highlighted support before adopting.':'Refused: '+c.proposalReason+'.'}`:'No region selected.';
 for(const b of $('regionChoices').children)b.setAttribute('aria-pressed',String(b.dataset.component===id));drawCrop();
}
function showReport(){
 $('regionChoices').replaceChildren();for(const c of report.candidates){const b=document.createElement('button');b.type='button';b.dataset.component=c.id;b.textContent=`${c.id} · ${c.area} px${c.eligible?'':' · '+c.proposalReason}`;b.setAttribute('aria-pressed','false');b.onclick=()=>selectComponent(c.id);$('regionChoices').append(b);}
 $('extractionStatus').textContent=`${report.candidates.length} regions found; ${report.candidates.filter(c=>c.eligible).length} eligible for explicit review. Crop pixels are not resized. No region was selected automatically.`;drawCrop();
}
$('openSource').addEventListener('submit',async event=>{
 event.preventDefault();const file=$('annotationFile').files[0],photo=$('imageFile').files[0];if(!file||!photo)return;
 const ticket=++importVersion;clearInspection();let candidate=null;
 try{
  if(file.size>MAX_ANNOTATION_BYTES)throw Error('Source JSON must be at most 256 KiB.');const text=await file.text();if(ticket!==importVersion)return;
  candidate=await loadLocalImage(photo);const next=reopenCapture(text,candidate.image);if(!next.landmarks.length)throw Error('Add at least one source mark before inspecting its pixels.');
  const bitmap=new Image();bitmap.src=candidate.url;await bitmap.decode();if(ticket!==importVersion){releaseImage(candidate);candidate=null;return;}
  releaseImage(media);media=candidate;candidate=null;decoded=bitmap;demo=next;landmarkId=demo.landmarks[0].id;
  $('landmarkChoice').replaceChildren(...demo.landmarks.map(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.label;return o;}));
  putCrop(centeredCrop(chosen().sourcePx));$('inspectorWorkspace').hidden=false;$('downloadSource').disabled=false;
  $('pairedIdentity').textContent=media.image.name+' · full SHA-256 '+media.image.sha256;
  $('sourceStatus').textContent='Original image bytes paired. Source geometry and mark meaning remain supplied by the author.';clearInspection();retained();fail('');
 }catch(error){releaseImage(candidate);if(ticket===importVersion)fail('Source refused; previous accepted work is unchanged. '+error.message);}
});
$('landmarkChoice').addEventListener('change',()=>{landmarkId=$('landmarkChoice').value;putCrop(centeredCrop(chosen().sourcePx));clearInspection();retained();fail('');});
for(const id of ['cropX','cropY','cropWidth','cropHeight','contrastMethod','polarity','threshold','backgroundRadius','minArea','maxArea'])$(id).addEventListener('input',()=>{clearInspection();retained();});
$('showSupport').addEventListener('change',drawCrop);
$('sourceView').addEventListener('click',event=>{if(!media)return;const view=$('sourceView'),p=view.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const q=p.matrixTransform(view.getScreenCTM().inverse());if(q.x<0||q.y<0||q.x>media.image.widthPx||q.y>media.image.heightPx)return;const c=cropInput();if(!Number.isInteger(c.width)||!Number.isInteger(c.height))return;c.x=Math.max(0,Math.min(media.image.widthPx-c.width,Math.floor(q.x-c.width/2)));c.y=Math.max(0,Math.min(media.image.heightPx-c.height,Math.floor(q.y-c.height/2)));putCrop(c);clearInspection();});
$('inspectPixels').addEventListener('click',async()=>{clearInspection();const ticket=revision;$('inspectPixels').disabled=true;await new Promise(requestAnimationFrame);if(ticket!==revision)return;
 try{const crop=inspectionCrop(cropInput(),media.image),pixels=readCrop(crop);report=inspectSourceMark(demo,landmarkId,media.image,pixels,crop,settings());raster=pixels;showReport();fail('');}catch(error){fail(error.message);}finally{if(ticket===revision)$('inspectPixels').disabled=false;}
});
$('cropView').addEventListener('click',event=>{if(!report)return;const rect=event.currentTarget.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)*report.crop.width/rect.width),y=Math.floor((event.clientY-rect.top)*report.crop.height/rect.height);if(x<0||y<0||x>=report.crop.width||y>=report.crop.height)return;const label=report.labels[y*report.crop.width+x],c=report.candidates.find(c=>c.label===label);selectComponent(c?.id||null);});
$('adoptRegion').addEventListener('click',()=>{try{if(!report||!selected)throw Error('Select a region from the current inspection.');demo=adoptSourceComponent(demo,landmarkId,media.image,raster,report.crop,report.settings,selected);clearInspection();retained();fail('');$('sourceStatus').textContent='Source point revised from the selected pixels. The prior point and extraction decision are retained; save the revised source and recompute downstream analysis.';}catch(error){fail('Adoption refused; accepted annotations are unchanged. '+error.message);}});
$('reproduceSaved').addEventListener('click',()=>{try{const record=chosen().pixelInspections.at(-1),crop=inspectionCrop(record.crop,media.image),pixels=readCrop(crop),result=reproduceSourceInspection(demo,landmarkId,media.image,pixels);clearInspection();putCrop(crop);for(const[k,id]of Object.entries({method:'contrastMethod',polarity:'polarity',threshold:'threshold',radius:'backgroundRadius',minArea:'minArea',maxArea:'maxArea'}))$(id).value=result.report.settings[k];report=result.report;raster=pixels;showReport();selectComponent(result.component.id);drawSource();$('retainedStatus').textContent=result.message;fail('');}catch(error){fail('Saved inspection not reproduced. '+error.message);}});
$('downloadSource').addEventListener('click',()=>{try{const text=exportCapture(demo),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='skill-inspected-source.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}catch(error){fail(error.message);}});
window.addEventListener('pagehide',event=>{if(!event.persisted){importVersion++;revision++;releaseImage(media);}});
