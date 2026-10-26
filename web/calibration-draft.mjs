import {loadLocalImage,releaseImage} from './image-input.mjs';
import {reopenCapture,MAX_ANNOTATION_BYTES} from '../src/capture-editing.mjs';
import {calibrationDraftRequest,receiveCalibrationDraft} from '../src/calibration-draft.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
async function encoded(url){const bytes=new Uint8Array(await(await fetch(url)).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export function installCalibrationDraft({target,propose}) {
  let reference=null,media=null,rois=[],start=null,version=0,controller=null;
  function invalidate(){version++;controller?.abort();controller=null;$('proposeCalibration').disabled=false;}
  function status(text){$('transferStatus').textContent=text;}
  function draw(){
    const svg=$('referencePatchSvg');svg.replaceChildren();if(!media)return;
    const add=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);};
    svg.setAttribute('viewBox',`0 0 ${media.image.widthPx} ${media.image.heightPx}`);
    add('image',{href:media.url,width:media.image.widthPx,height:media.image.heightPx});
    for(const [x,y,w,h]of rois)add('rect',{x,y,width:w,height:h,fill:'none',stroke:'#ffcf66','stroke-width':Math.max(media.image.widthPx,media.image.heightPx)/300});
    if(start)add('circle',{cx:start[0],cy:start[1],r:3,fill:'#ffcf66'});
    $('patchCoordinates').value=rois.map(r=>r.join(', ')).join('\n');
  }
  $('loadCalibrationReference').onclick=async()=>{
    invalidate();const token=version;let candidate=null;
    try{
      const task=$('referenceTask').files[0],photo=$('referencePhoto').files[0];
      if(!task||!photo||task.size>MAX_ANNOTATION_BYTES)throw Error('Choose reference annotations up to 256 KiB and their original PNG.');
      const text=await task.text();candidate=await loadLocalImage(photo);
      if(token!==version){releaseImage(candidate);return;}
      const restored=reopenCapture(text,candidate.image);
      if(candidate.image.mimeType!=='image/png')throw Error('The translation profile requires original PNGs.');
      releaseImage(media);media=candidate;candidate=null;reference=restored;rois=[];start=null;draw();
      status('Reference loaded. Select at least two separate patches fixed relative to the workpiece plane. Click opposite corners for each patch.');
    }catch(error){releaseImage(candidate);if(token===version)status('Reference refused; prior reference retained. '+error.message);}
  };
  $('referencePatchSvg').onclick=event=>{
    if(!media)return;invalidate();const svg=event.currentTarget,p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse()),point=[Math.round(q.x),Math.round(q.y)];
    if(point[0]<0||point[1]<0||point[0]>media.image.widthPx||point[1]>media.image.heightPx)return;
    if(!start)start=point;else{rois.push([Math.min(start[0],point[0]),Math.min(start[1],point[1]),Math.abs(start[0]-point[0]),Math.abs(start[1]-point[1])]);start=null;}draw();
  };
  $('clearReferencePatches').onclick=()=>{invalidate();rois=[];start=null;draw();};
  for(const id of ['referenceTask','referencePhoto','stationaryBasis','stationaryPlane','patchCoordinates'])$(id).addEventListener('input',()=>{invalidate();status('Inputs changed. Request a new draft after reviewing the reference.');});
  for(const id of ['referenceTask','referencePhoto'])$(id).addEventListener('change',()=>{invalidate();reference=null;releaseImage(media);media=null;rois=[];start=null;draw();status('Reference files changed. Load and review this reference before requesting a draft.');});
  $('proposeCalibration').onclick=async()=>{
    invalidate();const token=version,current=target();controller=new AbortController();const abort=controller;
    try{
      if(!current||!reference||!media)throw Error('Load the current target PNG and a calibrated reference first.');
      rois=$('patchCoordinates').value.trim().split('\n').filter(Boolean).map(line=>line.split(',').map(value=>Number(value.trim())));
      const request=calibrationDraftRequest(reference,current.image,rois,{stationaryPlane:$('stationaryPlane').checked,basis:$('stationaryBasis').value});
      draw();$('proposeCalibration').disabled=true;status('Matching the declared stationary patches against the original target PNG…');
      const [referencePngBase64,targetPngBase64]=await Promise.all([encoded(media.url),encoded(current.url)]);
      if(token!==version||target()!==current)return;
      const response=await fetch('/api/calibration-translation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...request,referencePngBase64,targetPngBase64}),signal:abort.signal});
      const report=await response.json();if(!response.ok)throw Error(report.error||'Native matching refused.');
      if(token!==version||target()!==current)return;
      const draft=receiveCalibrationDraft(request,report);propose(draft);
      status(`Draft translated by ${report.registration.frames[1].stage.join(', ')} px. Review all four target corners and edit as needed, then use Apply calibration. ${draft.evidence.limits}`);
    }catch(error){if(token===version)status('No draft applied; current work retained. '+error.message);}
    finally{if(token===version){controller=null;$('proposeCalibration').disabled=false;}}
  };
  window.addEventListener('pagehide',event=>{invalidate();if(!event.persisted)releaseImage(media);});
  return {invalidate};
}
