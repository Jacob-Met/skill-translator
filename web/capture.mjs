import {createCapture,appendCaptureMark,validateCapturedDemo} from "/src/capture.mjs";
import {loadLocalImage,releaseImage} from "/web/image-input.mjs";
const $ = id => document.getElementById(id), ns = "http://www.w3.org/2000/svg";
const labels = ["TOP LEFT","TOP RIGHT","BOTTOM RIGHT","BOTTOM LEFT"];
let media = null, corners = [null,null,null,null], activeCorner = 0, demo = null, loadVersion = 0, calibrationDirty = false;
function problem(message="") { $("studioError").textContent=message; $("studioError").hidden=!message; }
function el(parent,tag,attrs={},text="") {
  const node=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,String(v));
  node.textContent=text; parent.append(node); return node;
}
function number(id) { const value=$(id).value.trim(); return value ? Number(value) : NaN; }
function capturePoint() { return {x:number("markX"),y:number("markY")}; }
function clearDraft() { $("markX").value=""; $("markY").value=""; }
function syncCorners() {
  corners.forEach((p,i)=>{ $("cornerX"+i).value=p ? p.x.toFixed(2) : ""; $("cornerY"+i).value=p ? p.y.toFixed(2) : ""; });
}
function render() {
  const svg=$("captureSvg");svg.replaceChildren();
  $("emptyPhoto").hidden=Boolean(media);
  $("applyCalibration").disabled=!media;
  $("addCaptureMark").disabled=!demo||calibrationDirty;
  $("downloadCapture").disabled=!demo?.landmarks.length||calibrationDirty;
  $("revertCalibration").disabled=!demo||!calibrationDirty;
  $("markCount").textContent=demo?.landmarks.length ? demo.landmarks.length+" source mark"+(demo.landmarks.length===1?"":"s")+" ready" : "No marks yet";
  $("capturedMarks").replaceChildren();
  for(const mark of demo?.landmarks||[]){const li=document.createElement("li");li.textContent=mark.label+" · "+(mark.kind==="fraction"?"proportional":mark.edge+" edge")+" · ±"+mark.toleranceMm+" mm";$("capturedMarks").append(li);}
  labels.forEach((_,i)=>$("cornerButton"+i).setAttribute("aria-pressed",String(activeCorner===i)));
  if(!media)return;
  const {widthPx:w,heightPx:h}=media.image, scale=Math.max(w,h)/800;
  svg.setAttribute("viewBox",`0 0 ${w} ${h}`);
  el(svg,"image",{href:media.url,x:0,y:0,width:w,height:h});
  if(corners.every(Boolean))el(svg,"polygon",{points:corners.map(p=>p.x+","+p.y).join(" "),class:"capture-line","stroke-width":2*scale});
  corners.forEach((p,i)=>{if(!p)return;el(svg,"circle",{cx:p.x,cy:p.y,r:11*scale,class:"capture-corner","stroke-width":2*scale});el(svg,"text",{x:p.x,y:p.y,class:"capture-corner-label","font-size":12*scale},String(i+1));});
  for(const [i,mark] of (demo?.landmarks||[]).entries()){el(svg,"circle",{cx:mark.sourcePx.x,cy:mark.sourcePx.y,r:9*scale,class:"capture-mark","stroke-width":2*scale});el(svg,"text",{x:mark.sourcePx.x+15*scale,y:mark.sourcePx.y-12*scale,class:"photo-caption","font-size":13*scale},String(i+1));}
  const p=capturePoint();
  if(demo&&Number.isFinite(p.x)&&Number.isFinite(p.y))el(svg,"circle",{cx:p.x,cy:p.y,r:14*scale,fill:"none",stroke:"#fff3d1","stroke-width":2*scale});
  $("captureInstruction").textContent=activeCorner!==null ? "Click the "+labels[activeCorner].toLowerCase()+" corner ("+(activeCorner+1)+" of 4)." : demo ? "Click the photo to place a mark. Its meaning is yours to describe." : "Review the four corners, then apply the calibration.";
}
labels.forEach((label,i)=>{
  const row=document.createElement("div");row.className="corner-row";
  const button=document.createElement("button");button.id="cornerButton"+i;button.type="button";button.textContent=(i+1)+" · "+label;button.addEventListener("click",()=>{activeCorner=i;render();});row.append(button);
  for(const axis of ["X","Y"]){const input=document.createElement("input");input.id="corner"+axis+i;input.type="number";input.step="any";input.setAttribute("aria-label",label+" "+axis+" pixels");input.addEventListener("input",()=>{const x=number("cornerX"+i),y=number("cornerY"+i);corners[i]=Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;activeCorner=i;calibrationDirty=true;$("calibrationStatus").textContent=demo?"Edited corners are a draft. Apply calibration before using them.":"Review the four corners, then apply calibration.";render();});row.append(input);}
  $("cornerRows").append(row);
});
$("photoFile").addEventListener("change",async event=>{
  const file=event.target.files[0];if(!file)return;const version=++loadVersion;
  try{const loaded=await loadLocalImage(file);if(version!==loadVersion){releaseImage(loaded);return;}releaseImage(media);media=loaded;corners=[null,null,null,null];activeCorner=0;demo=null;calibrationDirty=false;clearDraft();syncCorners();$("photoIdentity").textContent=media.image.name+" · "+media.image.widthPx+" × "+media.image.heightPx+" px · SHA-256 "+media.image.sha256.slice(0,16)+"…";$("calibrationStatus").textContent="Select the four corners of the flat workpiece.";problem();render();}
  catch(error){if(version===loadVersion)problem("Photo refused; previous work preserved. "+error.message);}
  finally{event.target.value="";}
});
$("captureSvg").addEventListener("click",event=>{
  if(!media)return;const svg=$("captureSvg"),p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());
  if(q.x<0||q.y<0||q.x>media.image.widthPx||q.y>media.image.heightPx)return;
  if(activeCorner!==null){corners[activeCorner]={x:q.x,y:q.y};calibrationDirty=true;activeCorner=corners.findIndex(x=>!x);if(activeCorner===-1)activeCorner=null;syncCorners();$("calibrationStatus").textContent=demo?"Edited corners are a draft. Apply calibration before using them.":"Four corners selected. Apply calibration to begin annotating.";}
  else if(demo){$("markX").value=q.x.toFixed(2);$("markY").value=q.y.toFixed(2);}
  problem();render();
});
$("applyCalibration").addEventListener("click",()=>{
  try{if(!media)throw Error("Choose a source photo first.");const next=createCapture(media.image,corners,number("captureWidth"),number("captureHeight"),{title:$("captureTitle").value});next.landmarks=structuredClone(demo?.landmarks||[]);if(next.landmarks.length)validateCapturedDemo(next);demo=next;activeCorner=null;calibrationDirty=false;clearDraft();$("calibrationStatus").textContent="Calibration applied · "+demo.source.widthMm+" × "+demo.source.heightMm+" mm. Source points keep their pixel coordinates.";problem();render();}
  catch(error){problem("Calibration refused; previous annotations preserved. "+error.message);}
});
for(const id of ["captureWidth","captureHeight","captureTitle"])$(id).addEventListener("input",()=>{if(demo){calibrationDirty=true;$("calibrationStatus").textContent="Measurements changed. Apply or revert these edits before adding marks or exporting.";render();}});
$("revertCalibration").addEventListener("click",()=>{if(!demo)return;corners=structuredClone(demo.source.corners);$("captureWidth").value=demo.source.widthMm;$("captureHeight").value=demo.source.heightMm;$("captureTitle").value=demo.title;calibrationDirty=false;activeCorner=null;syncCorners();$("calibrationStatus").textContent="Draft edits reverted. The accepted calibration is active.";problem();render();});
$("markKind").addEventListener("change",()=>{$("markEdge").disabled=$("markKind").value!=="edge_offset_mm";});
for(const id of ["markX","markY"])$(id).addEventListener("input",render);
$("captureMarkForm").addEventListener("submit",event=>{
  event.preventDefault();
  try{if(!demo||calibrationDirty)throw Error("Apply or revert the calibration edits first.");demo=appendCaptureMark(demo,{sourcePx:capturePoint(),label:$("markLabel").value,kind:$("markKind").value,edge:$("markEdge").value,toleranceMm:number("markTolerance"),why:"Human interpretation of the linked source photo; test it against further demonstrations."});clearDraft();problem();render();}
  catch(error){problem("Mark refused; prior annotations preserved. "+error.message);}
});
$("downloadCapture").addEventListener("click",()=>{
  try{if(calibrationDirty)throw Error("Apply or revert calibration edits before exporting.");validateCapturedDemo(demo);const url=URL.createObjectURL(new Blob([JSON.stringify(demo,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="skill-photo-annotations.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  catch(error){problem(error.message);}
});
window.addEventListener("pagehide",()=>releaseImage(media));
render();
