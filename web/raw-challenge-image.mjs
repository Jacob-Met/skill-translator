import {derive} from '../src/geometry.mjs';
import {validateCapturedDemo,assertImageMatches} from '../src/capture.mjs';
import {loadLocalImage,releaseImage} from './image-input.mjs';
/** Same exact-image admission and calibrated overlay as the demonstration receiver. */
export function createRawChallengeImage(selected,status){
const $=id=>document.getElementById(id),fmt=n=>Number(n.toPrecision(6)).toString();
let imageGeneration=0,media=null;
function release(){imageGeneration++;releaseImage(media);media=null;}
function annotationTask(annotation){return annotation?.source?.image?validateCapturedDemo(annotation):derive(annotation);}
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
$('image-file').onchange=async()=>{const current=selected(),file=$('image-file').files[0];if(!current?.annotation.source.image||!file)return;const token=++imageGeneration;let received=null;try{received=await loadLocalImage(file);if(token!==imageGeneration){releaseImage(received);return;}assertImageMatches(current.annotation,received.image);const element=new Image();element.src=received.url;await element.decode();if(token!==imageGeneration){releaseImage(received);return;}releaseImage(media);media={...received,element};received=null;draw();status('Original image bytes matched and reattached for this source only.');}catch(e){releaseImage(received);if(token===imageGeneration)status(`Image refused: ${e.message}. Prior accepted pixels retained.`);}finally{$('image-file').value='';}};
window.addEventListener('resize',draw);window.addEventListener('pagehide',event=>{if(!event.persisted)release();});
return {release,draw};
}
