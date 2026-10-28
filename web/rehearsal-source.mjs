import {loadLocalImage,releaseImage} from '/web/image-input.mjs';
import {assertImageMatches,validateCapturedDemo} from '/src/capture.mjs';
// This read-only panel owns its media and selection, never rehearsal state.
export function createRehearsalSource(getSource){
 const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
 let media=null,ticket=0,selected=null;
 const status=message=>{$('originalStatus').textContent=message;};
 function draw(){
  const source=getSource(),view=$('originalImage');view.replaceChildren();
  const choice=$('originalMark');choice.replaceChildren();
  $('originalMarkDetails').textContent='';view.toggleAttribute('hidden',!media);choice.disabled=!media;
  if(!media)return;
  if(!source.landmarks.some(m=>m.id===selected))selected=source.landmarks[0].id;
  source.landmarks.forEach((m,i)=>{const o=document.createElement('option');o.value=m.id;o.textContent=`${i+1}. ${m.label}`;choice.append(o);});choice.value=selected;
  const {widthPx:w,heightPx:h}=media.image;
  view.setAttribute('viewBox',`0 0 ${w} ${h}`);
  // SVG's fitted transform includes letterboxing and the max-height constraint.
  // Convert desired CSS-pixel annotation sizes to original-image units.
  const matrix=view.getScreenCTM(),pixelsPerUnit=matrix?Math.min(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d)):0;
  const scale=pixelsPerUnit>0?1/pixelsPerUnit:Math.max(w,h)/700;
  const svg=(tag,attrs,text='')=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));e.textContent=text;view.append(e);};
  svg('image',{href:media.url,width:w,height:h});
  svg('polygon',{points:source.source.corners.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:'#ffdf68','stroke-width':2*scale});
  source.source.corners.forEach((p,i)=>svg('text',{x:p.x>w/2?p.x-5*scale:p.x+5*scale,y:p.y>h/2?p.y-6*scale:p.y+15*scale,'text-anchor':p.x>w/2?'end':'start',fill:'#fff',stroke:'#111','paint-order':'stroke','stroke-width':2*scale,'font-size':14*scale},`C${i+1}`));
  source.landmarks.forEach((m,i)=>{svg('circle',{cx:m.sourcePx.x,cy:m.sourcePx.y,r:(m.id===selected?12:8)*scale,fill:'none',stroke:m.id===selected?'#ffdf68':'#fff','stroke-width':3*scale,'data-original-mark':m.id});svg('text',{x:m.sourcePx.x>w/2?m.sourcePx.x-14*scale:m.sourcePx.x+14*scale,y:Math.max(18*scale,Math.min(h-5*scale,m.sourcePx.y)),'text-anchor':m.sourcePx.x>w/2?'end':'start',fill:'#fff',stroke:'#111','paint-order':'stroke','stroke-width':2*scale,'font-size':16*scale},String(i+1));});
  const mark=source.landmarks.find(m=>m.id===selected);
  $('originalMarkDetails').textContent=`${mark.label} · source pixel (${mark.sourcePx.x}, ${mark.sourcePx.y}) · declared ${mark.kind}${mark.edge?' · '+mark.edge+' edge':''}. ${mark.why||'No explanation supplied.'}`;
 }
 function install(){
  ticket++;const source=getSource();
  if(media){try{validateCapturedDemo(source);assertImageMatches(source,media.image);}catch{releaseImage(media);media=null;}}
  selected=null;draw();
  status(media?`Original pixels paired · ${media.image.name} · SHA-256 ${media.image.sha256}`:source.source.image?'Pair the original photo or saved frame PNG to inspect its pixels.':'This source has no image identity. Its authored geometry remains available in the rehearsal.');
  $('originalFile').disabled=!source.source.image;
  $('originalProvenance').textContent=`${source.title||'Source'} · ${source.provenance} · original workpiece ${source.source.widthMm} × ${source.source.heightMm} mm.`;
 }
 $('originalFile').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;const current=++ticket;let candidate=null;
  try{candidate=await loadLocalImage(file);if(current!==ticket)return;const source=getSource();validateCapturedDemo(source);assertImageMatches(source,candidate.image);releaseImage(media);media=candidate;candidate=null;draw();status(`Original pixels paired · ${media.image.name} · SHA-256 ${media.image.sha256}`);}
  catch(error){if(current===ticket)status((media?'Image refused; previously accepted source pixels retained. ':'Image refused; no source image is paired. ')+error.message);}
  finally{releaseImage(candidate);if(current===ticket)e.target.value='';}
 });
 $('originalMark').addEventListener('change',()=>{selected=$('originalMark').value;draw();});
 let lastSize='';
 const observer=new ResizeObserver(entries=>{
  const {width,height}=entries[0].contentRect,key=`${width}/${height}`;
  if(key===lastSize)return;lastSize=key;
  if(media&&width>0&&height>0)draw();
 });
 observer.observe($('originalImage'));
 window.addEventListener('pagehide',e=>{if(!e.persisted){observer.disconnect();ticket++;releaseImage(media);media=null;}});
 return {install};
}
