import {annotationContext,createAnnotationBound,importAnnotationBound,inspectAnnotationBound} from '/src/annotation-bound.mjs';
import {loadLocalImage,releaseImage} from '/web/image-input.mjs';
import {assertImageMatches} from '/src/capture.mjs';
const $=id=>document.getElementById(id),KEY='skill-translator-annotation-bound-input/v1';
let original=null,accepted=null,media=null,generation=0,dirty=false;
const error=e=>{$('error').hidden=!e;$('error').textContent=e?.message??'';};
function element(parent,tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;}
function render(){
 const b=accepted,r=inspectAnnotationBound(b.setup,b.observation,b.declaration),w=b.setup.widthMm,h=b.setup.heightMm;
 $('finding').dataset.state=r.status;$('finding').textContent={ 'all-within':'Entire declared region within tolerance','all-outside':'Entire declared region outside tolerance',unresolved:'Region straddles tolerance or meets the numerical boundary guard'}[r.status];
 $('range').textContent=`${r.dimension}: distance ${r.minDistanceMm.toPrecision(6)}–${r.maxDistanceMm.toPrecision(6)} mm; tolerance ${r.toleranceMm} mm. Numerical guard ${r.guardMm.toExponential(2)} mm.`;
 $('nominal').textContent=`Original point: ${r.nominal.errorMm.toPrecision(6)} mm, ${r.nominal.within?'within':'outside'} tolerance. This result is unchanged.`;
 $('missing').textContent=r.missing.length?'Unannotated marks remain missing: '+r.missing.join(', '):'Every source mark has an annotation; only the selected region is evaluated here.';
 $('source').textContent=`Image ${b.observation.image.name} · SHA-256 ${b.observation.image.sha256}`;
 const s=$('diagram');s.replaceChildren();s.setAttribute('viewBox',`${-w*.05} ${-h*.05} ${w*1.1} ${h*1.1}`);
 element(s,'rect',{x:0,y:0,width:w,height:h,fill:'#fff',stroke:'#526e77','stroke-width':Math.max(w,h)/500});
 element(s,'circle',{cx:r.target.x,cy:r.target.y,r:r.toleranceMm,fill:'#d2ecff',stroke:'#186696','stroke-width':Math.max(w,h)/350});
 element(s,r.dimension==='area'?'polygon':'polyline',{points:r.polygon.map(p=>`${p.x},${p.y}`).join(' '),fill:r.dimension==='area'?'#f3b57288':'none',stroke:'#b34c00','stroke-width':Math.max(w,h)/250});
 const c=annotationContext(b.setup,b.observation),p=c.attempts.find(p=>p.id===r.id);element(s,'circle',{cx:p.xMm,cy:p.yMm,r:Math.max(w,h)/150,fill:'#192b32'});
 const photo=$('photo');photo.replaceChildren();if(media){const im=b.observation.image;photo.setAttribute('viewBox',`0 0 ${im.widthPx} ${im.heightPx}`);element(photo,'image',{href:media.url,width:im.widthPx,height:im.heightPx});element(photo,'rect',{x:r.rectangle.xMin,y:r.rectangle.yMin,width:r.rectangle.xMax-r.rectangle.xMin,height:r.rectangle.yMax-r.rectangle.yMin,fill:'none',stroke:'#ff8a26','stroke-width':Math.max(im.widthPx,im.heightPx)/250});}
 $('save').disabled=dirty;
}
function sync(){$('inspect').disabled=false;const d=accepted.declaration;$('mark').replaceChildren();for(const p of accepted.observation.points){const o=document.createElement('option');o.value=p.id;o.textContent=p.id;$('mark').append(o);}$('mark').value=d.id;$('halfWidth').value=d.halfWidthPx;$('halfHeight').value=d.halfHeightPx;dirty=false;render();}
try{const raw=JSON.parse(sessionStorage.getItem(KEY));const c=annotationContext(raw.setup,raw.observation);original=c;accepted=createAnnotationBound(c.setup,c.observation,{id:c.observation.points[0].id,halfWidthPx:0,halfHeightPx:0});sync();}catch(e){error(e);$('inspect').disabled=true;$('save').disabled=true;}
for(const id of ['mark','halfWidth','halfHeight'])$(id).addEventListener('input',()=>{generation++;dirty=true;$('save').disabled=true;$('status').textContent='Inputs changed. Inspect to update the displayed accepted region.';});
$('boundsForm').onsubmit=e=>{e.preventDefault();try{if(!accepted)throw Error('Open from a retained photo observation first.');const candidate=createAnnotationBound(accepted.setup,accepted.observation,{id:$('mark').value,halfWidthPx:Number($('halfWidth').value),halfHeightPx:Number($('halfHeight').value)});accepted=candidate;dirty=false;generation++;error(null);$('status').textContent='Declared region inspected. Practice unchanged.';render();}catch(e){error(e);}};
$('save').onclick=()=>{try{if(dirty||!accepted)throw Error('Inspect valid inputs before saving.');const text=JSON.stringify(accepted);if(new TextEncoder().encode(text).length>4000000)throw Error('Notebook exceeds 4 MB.');const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='annotation-bound.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}catch(e){error(e);}};
$('open').onchange=async e=>{const token=++generation;try{const f=e.target.files[0];if(!f||f.size>4000000)throw Error('Choose a notebook up to 4 MB.');const raw=JSON.parse(await f.text());if(token!==generation)return;const next=importAnnotationBound(raw,original);accepted=next;releaseImage(media);media=null;$('paired').textContent='Image bytes not paired in this tab.';sync();error(null);$('status').textContent='Inputs reopened; all findings recomputed.';}catch(e){if(token===generation)error(e);}finally{if(token===generation)e.target.value='';}};
$('image').onchange=async e=>{const token=++generation;let next;try{if(!accepted)throw Error('Open a notebook first.');next=await loadLocalImage(e.target.files[0]);if(token!==generation){releaseImage(next);return;}assertImageMatches({source:{image:accepted.observation.image}},next.image);releaseImage(media);media=next;$('paired').textContent='Exact image bytes paired locally.';render();error(null);}catch(e){releaseImage(next);if(token===generation)error(e);}finally{if(token===generation)e.target.value='';}};
$('returnPractice').onclick=()=>{try{if(!original)throw Error('No original practice handoff in this tab.');sessionStorage.setItem('skill-translator-observation-result/v1',JSON.stringify(original.setup));location.href='/practice?resume=observation';}catch(e){error(e);}};
addEventListener('pagehide',()=>{generation++;releaseImage(media);});
