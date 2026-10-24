import {demonstration} from "/src/demo.mjs";
import {derive} from "/src/geometry.mjs";
import {assertImageMatches} from "/src/capture.mjs";
import {loadLocalImage,releaseImage} from "/web/image-input.mjs";
import {createCalibrationCheck,analyzeCalibration,exportCalibrationChecks,importCalibrationChecks} from "/src/calibration-checks.mjs";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let demo=structuredClone(demonstration),checks=[],draft=null,sourceRead=0,checksRead=0,photoRead=0,nextId=1,media=null;
const format=(n,d=2)=>n===null?"—":Number(n).toFixed(d);
function element(name,attrs={},text){const e=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function clearFeedback(){ $("error").textContent="";$("notice").textContent=""; }
function reject(error){$("error").textContent=error.message||String(error);}
function notice(text){$("notice").textContent=text;}
function sourceFrame(){
  const p=demo.source.corners,x=p.map(x=>x.x),y=p.map(x=>x.y),w=Math.max(...x)-Math.min(...x),h=Math.max(...y)-Math.min(...y),pad=Math.max(w,h)*.1;
  return {x:Math.min(...x)-pad,y:Math.min(...y)-pad,w:w+2*pad,h:h+2*pad};
}
function renderSource(result){
  const svg=$("sourceMap");svg.replaceChildren();const b=sourceFrame();svg.setAttribute("viewBox",`${b.x} ${b.y} ${b.w} ${b.h}`);
  if(media)svg.append(element("image",{href:media.url,x:0,y:0,width:media.image.widthPx,height:media.image.heightPx}));
  svg.append(element("polygon",{points:demo.source.corners.map(p=>`${p.x},${p.y}`).join(" "),class:"surface","fill-opacity":media ? 0.13 : 1}));
  const r=Math.max(b.w,b.h)/120;
  demo.source.corners.forEach((p,i)=>{svg.append(element("circle",{cx:p.x,cy:p.y,r,class:"corner"}));svg.append(element("text",{x:p.x+r*2,y:p.y-r*2},["TL","TR","BR","BL"][i]));});
  result.results.forEach((row,i)=>{svg.append(element("circle",{cx:row.sourcePx.x,cy:row.sourcePx.y,r,class:`check ${row.status==="incompatible"?"bad":""}`}));svg.append(element("text",{x:row.sourcePx.x+r*2,y:row.sourcePx.y-r*2},String(i+1)));});
  if(draft)svg.append(element("circle",{cx:draft.x,cy:draft.y,r:r*1.15,class:"draft"}));
}
function renderResiduals(result){
  const svg=$("residualMap");svg.replaceChildren();const s=demo.source,w=s.widthMm,h=s.heightMm;
  // Include out-of-page predictions without changing physical map coordinates.
  const points=[{xMm:0,yMm:0},{xMm:w,yMm:h},...result.results.flatMap(r=>r.projected?[r,r.projected]:[r])];
  const minX=Math.min(...points.map(p=>p.xMm)),maxX=Math.max(...points.map(p=>p.xMm)),minY=Math.min(...points.map(p=>p.yMm)),maxY=Math.max(...points.map(p=>p.yMm));
  const scale=Math.min(480/(maxX-minX||1),300/(maxY-minY||1));
  const p=v=>({x:40+(v.xMm-minX)*scale,y:45+(v.yMm-minY)*scale});
  const a=p({xMm:0,yMm:0});svg.append(element("rect",{x:a.x,y:a.y,width:w*scale,height:h*scale,class:"surface"}));
  svg.append(element("text",{x:40,y:25},`Source: ${w} × ${h} mm`));
  if(result.coverage.hull.length>=3)svg.append(element("polygon",{points:result.coverage.hull.map(v=>{const q=p(v);return `${q.x},${q.y}`;}).join(" "),class:"extent"}));
  result.coverage.landmarks.forEach(mark=>{const q=p(mark);svg.append(element("path",{d:`M ${q.x} ${q.y-4} l 4 4 l -4 4 l -4 -4 Z`,class:"target"}));});
  result.results.forEach((row,i)=>{const a=p(row);if(row.projected){const b=p(row.projected);svg.append(element("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:"line"}));svg.append(element("path",{d:`M ${b.x-4} ${b.y-4} l 8 8 M ${b.x-4} ${b.y+4} l 8 -8`,class:"line"}));}
    svg.append(element("circle",{cx:a.x,cy:a.y,r:5,class:`check ${row.status==="incompatible"?"bad":""}`}));svg.append(element("text",{x:a.x+7,y:a.y-7},String(i+1)));});
}
function render(){
  const r=analyzeCalibration(demo,checks);$("sourceTitle").textContent=demo.title||"Imported source";
  $("sourceDetail").textContent=`${demo.source.widthMm} × ${demo.source.heightMm} mm · ${demo.landmarks.length} task landmarks`;
  $("sourceProvenance").textContent=demo.provenance||"Source attribution was not supplied. Measurement attribution is required for every check.";
  $("photoControl").hidden=!demo.source.image;
  $("photoStatus").textContent=demo.source.image?(media?"Original photo paired by full digest and displayed coordinate identity.":"This source names a photo. Pair the original local file to inspect its pixels; the coordinate map remains available."):"This source has no attached image identity. The source coordinate map is shown.";
  const labels={"no-independent-checks":"No independent calibration evidence","incompatible":"Measurements disagree with this calibration","compatible-at-checks":"Compatible at the supplied check points"};
  $("resultState").textContent=labels[r.status];$("resultState").dataset.state=r.status;
  $("resultText").textContent=`${r.independentCount} independent check location(s): ${r.reportedCount} reported measurement(s), ${r.authoredCount} authored example(s). ${r.fittedCornerCount?`${r.fittedCornerCount} fitted-corner check(s) excluded. `:""}${r.incompatibleCount?`${r.incompatibleCount} check(s) exceed their bound or cannot support the mapping.`:"No check can establish accuracy between unmeasured locations."}`;
  $("metrics").replaceChildren();for(const [label,value]of [["Largest residual",format(r.maxErrorMm)+" mm"],["RMS residual",format(r.rmsErrorMm)+" mm"],["Check hull extent",format(r.coverage.areaFraction*100,1)+"%"]]){
    const card=document.createElement("div");card.className="metric";card.textContent=label;const strong=document.createElement("strong");strong.textContent=value;card.append(strong);$("metrics").append(card);}
  $("coverageText").textContent=r.coverage.hull.length<3?"Checks do not enclose an area. Add independently measured points distributed across the workpiece to inspect more locations.":"Extent uses the measured physical check positions. Locations inside this outline have not automatically been tested.";
  $("landmarkList").replaceChildren();for(const mark of r.coverage.landmarks){const row=document.createElement("div");row.className="landmark";row.textContent=mark.label;const detail=document.createElement("span");detail.textContent=`${mark.nearestCheckMm===null?"No check nearby":format(mark.nearestCheckMm,1)+" mm to nearest check"} · ${mark.withinCheckHull?"inside check extent":"outside check extent"}`;row.append(detail);$("landmarkList").append(row);}
  $("checkRows").replaceChildren();for(const [i,row]of r.results.entries()){
    const tr=document.createElement("tr");for(const text of [`${i+1}. ${row.label}`,row.evidenceClass==="authored-example"?"Authored example":"Reported measurement",`${format(row.errorMm)} / ${format(row.uncertaintyMm)} mm`,row.status.replaceAll("-"," ")]){const td=document.createElement("td");td.textContent=text;tr.append(td);}
    const info=document.createElement("small");info.textContent=`Pixel (${format(row.sourcePx.x,1)}, ${format(row.sourcePx.y,1)}) → measured (${format(row.xMm,1)}, ${format(row.yMm,1)}) mm`;tr.firstChild.append(info);
    if(row.reason){const note=document.createElement("small");note.textContent=row.reason;tr.children[3].append(note);}
    const td=document.createElement("td"),remove=document.createElement("button");remove.textContent="Remove";remove.setAttribute("aria-label",`Remove ${row.label}`);remove.addEventListener("click",()=>{clearFeedback();checksRead++;checks=checks.filter(x=>x.id!==row.id);render();});td.append(remove);tr.append(td);$("checkRows").append(tr);
  }
  $("emptyLedger").hidden=checks.length>0;$("measuredX").max=demo.source.widthMm;$("measuredY").max=demo.source.heightMm;
  renderSource(r);renderResiduals(r);
}
function selectSource(candidate,text){derive(candidate);analyzeCalibration(candidate,[]);releaseImage(media);media=null;photoRead++;demo=structuredClone(candidate);checks=[];draft=null;sourceRead++;checksRead++;nextId=1;$("checkForm").reset();render();notice(text);}
async function jsonFile(file){if(!file||file.size>1_000_000)throw Error("Choose a JSON file no larger than 1 MB");return JSON.parse(await file.text());}
$("sourceFile").addEventListener("change",async event=>{clearFeedback();const token=++sourceRead,file=event.target.files?.[0];event.target.value="";if(!file)return;
  try{const candidate=await jsonFile(file);if(token!==sourceRead)return;selectSource(candidate,"Source opened. Take new checks or reopen a matching saved check file.");}
  catch(error){if(token===sourceRead)reject(error);}});
$("checksFile").addEventListener("change",async event=>{clearFeedback();const token=++checksRead,sourceToken=sourceRead,file=event.target.files?.[0];event.target.value="";if(!file)return;
  try{const bundle=await jsonFile(file);if(token!==checksRead||sourceToken!==sourceRead)return;const candidate=importCalibrationChecks(demo,bundle);analyzeCalibration(demo,candidate);checks=candidate;render();notice("Checks reopened against the same source. Findings have been recomputed.");}
  catch(error){if(token===checksRead&&sourceToken===sourceRead)reject(error);}});
$("photoFile").addEventListener("change",async event=>{clearFeedback();const token=++photoRead,sourceToken=sourceRead,file=event.target.files?.[0];event.target.value="";if(!file)return;let candidate;
  try{candidate=await loadLocalImage(file);if(token!==photoRead||sourceToken!==sourceRead){releaseImage(candidate);return;}
    assertImageMatches(demo,candidate.image);releaseImage(media);media=candidate;candidate=null;render();notice("Matching photo paired locally. Check coordinates refer to these displayed pixels.");}
  catch(error){releaseImage(candidate);if(token===photoRead&&sourceToken===sourceRead)reject(error);}});
$("sourceMap").addEventListener("click",event=>{const svg=event.currentTarget,p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());
  $("pixelX").value=q.x.toFixed(3);$("pixelY").value=q.y.toFixed(3);draft={x:q.x,y:q.y};renderSource(analyzeCalibration(demo,checks));});
$("checkForm").addEventListener("submit",event=>{event.preventDefault();clearFeedback();try{
  while(checks.some(c=>c.id===`check-${nextId}`))nextId++;
  const row=createCalibrationCheck(demo,{id:`check-${nextId}`,label:$("checkLabel").value,evidenceClass:$("evidenceClass").value,
    independentMeasurement:$("independent").checked,sourcePx:{x:Number($("pixelX").value),y:Number($("pixelY").value)},
    xMm:Number($("measuredX").value),yMm:Number($("measuredY").value),uncertaintyMm:Number($("bound").value)});
  const candidate=[...checks,row];analyzeCalibration(demo,candidate);checksRead++;checks=candidate;nextId++;draft=null;render();notice("Measurement added. The calibration and task targets are unchanged.");
}catch(error){reject(error);}});
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("exportChecks").addEventListener("click",()=>{clearFeedback();try{download("calibration-checks.json",exportCalibrationChecks(demo,checks));}catch(error){reject(error);}});
$("exportSource").addEventListener("click",()=>download("calibration-source.json",demo));
$("clearChecks").addEventListener("click",()=>{clearFeedback();checksRead++;checks=[];draft=null;render();notice("Checks cleared from this tab. Saved files are unchanged.");});
function example(mismatch){clearFeedback();const source={title:"Authored calibration challenge",provenance:"Analytically authored coordinates; not a photographed workpiece or physical measurement.",
  source:{widthMm:240,heightMm:160,corners:[{x:40,y:30},{x:520,y:30},{x:520,y:350},{x:40,y:350}]},
  landmarks:[{id:"center",label:"Center registration",kind:"fraction",sourcePx:{x:280,y:190},toleranceMm:2},
    {id:"edge",label:"Edge clearance",kind:"edge_offset_mm",edge:"left",sourcePx:{x:60,y:190},toleranceMm:2}]};
  selectSource(source,"");checks=[[60,40],[180,40],[180,120],[60,120],[120,80]].map(([xMm,yMm],i)=>createCalibrationCheck(demo,
    {id:`example-${i}`,label:`Authored independent coordinate ${i+1}`,evidenceClass:"authored-example",independentMeasurement:true,
      sourcePx:{x:40+2*xMm+(mismatch&&i===4?8:0),y:30+2*yMm},xMm,yMm,uncertaintyMm:.5}));
  render();notice(mismatch?"Authored challenge: one interior pixel is displaced by 8 px (4 mm); the fitted corners still agree.":"Authored control: five independently specified positions agree with the source mapping.");}
$("exampleGood").addEventListener("click",()=>example(false));$("exampleBad").addEventListener("click",()=>example(true));
render();
