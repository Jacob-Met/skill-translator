import {demonstration} from "/src/demo.mjs";
import {derive} from "/src/geometry.mjs";
import {createObservation,importEvidence,validateObservations,observationReference,RULES} from "/src/evidence.mjs";
import {createCalibrationHypothesis,analyzeCalibrationEvidence,proposeCalibrationVariation,
  exportCalibrationInvestigation,importCalibrationInvestigation} from "/src/calibration-evidence.mjs";

const $=id=>document.getElementById(id);
const names={fraction:"Proportional position",left:"Left clearance",right:"Right clearance",top:"Top clearance",bottom:"Bottom clearance"};
const colors=["#b7d4ff","#8edcc7","#efb576","#e7a9e7","#f3a49d"];
const num=id=>Number($(id).value);
const fmt=(n,d=2)=>Number(n.toFixed(d)).toLocaleString("en-US",{maximumFractionDigits:d});
const clone=value=>JSON.parse(JSON.stringify(value));
let source=clone(demonstration),markId=source.landmarks[0].id,observations=[],studies=new Map();
let readingId="nominal",trialId="",serial=0,revision=0;
const variants=()=>studies.get(markId)||[];
function nextId(prefix){
  const ids=new Set([...observations.map(o=>o.id),...[...studies.values()].flat().map(h=>h.id)]);
  let id;do{id=`${prefix}-${++serial}`;}while(ids.has(id));return id;
}
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
function error(message){$("error").textContent=message;$("error").hidden=!message;}
function action(fn){try{fn();error("");}catch(e){error(e.message);}}
function svgNode(tag,attrs={},text){const e=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
function fillSelect(node,items,current){node.replaceChildren(...items.map(item=>{const o=el("option",item.label);o.value=item.id;return o;}));node.value=current;}
function resetDraft(){
  const m=source.landmarks.find(m=>m.id===markId);
  $("sourceWidth").value=source.source.widthMm;$("sourceHeight").value=source.source.heightMm;
  $("sourceX").value=m.sourcePx.x;$("sourceY").value=m.sourcePx.y;
  source.source.corners.forEach((p,i)=>{$(`corner${i}x`).value=p.x;$(`corner${i}y`).value=p.y;});
  $("readingLabel").value="Alternative source reading";$("readingBasis").value="proposed-reading";
}
function resetObservationDraft(){
  const d=derive(source),m=d.landmarks.find(m=>m.id===markId);
  $("obsWidth").value=Math.min(10000,source.source.widthMm*1.5);
  $("obsHeight").value=Math.min(10000,source.source.heightMm*1.5);
  $("obsX").value=fmt(m.uv.u*num("obsWidth"),4).replaceAll(",","");
  $("obsY").value=fmt(m.uv.v*num("obsHeight"),4).replaceAll(",","");
}
function setSource(candidate,selectedId=null){
  const derived=derive(candidate);
  // Validate the entire renderable source before replacing any accepted state.
  // This also checks that photo coordinates remain inside its original frame.
  for(const m of derived.landmarks)analyzeCalibrationEvidence(candidate,m.id,[],[]);
  source=clone(candidate);markId=selectedId||source.landmarks[0].id;
  observations=[];studies=new Map();readingId="nominal";trialId="";
  resetDraft();resetObservationDraft();
  $("obsLabel").value="Authored comparison";$("obsClass").value="authored-example";$("obsRadius").value="0.5";
}
function sourceDrawing(analysis){
  const original=analysis.hypotheses[0],chosen=analysis.hypotheses.find(h=>h.id===readingId)||original;
  const svg=$("sourceDrawing");svg.replaceChildren();
  const points=[...original.reading.corners,original.reading.sourcePx,...chosen.reading.corners,chosen.reading.sourcePx];
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys);
  const width=Math.max(...xs)-minX,height=Math.max(...ys)-minY;
  const scale=Math.min(420/width,210/height),dx=(520-width*scale)/2,dy=(280-height*scale)/2;
  const at=p=>({x:dx+(p.x-minX)*scale,y:dy+(p.y-minY)*scale});
  for(const [h,color,dashed] of [[original,"#8edcc7",false],...(chosen.id!=="nominal"?[[chosen,"#efb576",true]]:[])]){
    const ps=h.reading.corners.map(at),mark=at(h.reading.sourcePx);
    svg.append(svgNode("polygon",{points:ps.map(p=>`${p.x},${p.y}`).join(" "),fill:"none",stroke:color,"stroke-width":2,...(dashed?{"stroke-dasharray":"6 5"}:{})}));
    svg.append(svgNode("circle",{cx:mark.x,cy:mark.y,r:dashed?7:4,fill:dashed?"none":color,stroke:color,"stroke-width":2}));
  }
  svg.append(svgNode("text",{x:20,y:282},"Annotation coordinates · original image pixels are not displayed here"));
  $("readingCaption").textContent=`${chosen.label}: ${fmt(chosen.reading.widthMm)} × ${fmt(chosen.reading.heightMm)} mm; source point (${fmt(chosen.reading.sourcePx.x)}, ${fmt(chosen.reading.sourcePx.y)}) px. ${chosen.basis==="original"?"Original annotation.":chosen.basis==="repeat-annotation"?"User-labeled repeated annotation.":"Proposed alternative; not an observed correction."}`;
}
function trialDrawing(analysis){
  const svg=$("trialDrawing");svg.replaceChildren();
  const trial=analysis.observations.find(o=>o.id===trialId)||analysis.observations[0];
  if(!trial){svg.append(svgNode("text",{x:30,y:140},"Add or import an observation to compare predictions."));$("trialCaption").textContent="The original source is not a second discriminating observation.";return;}
  const h=analysis.hypotheses.find(h=>h.id===readingId)||analysis.hypotheses[0];
  const scale=Math.min(420/trial.widthMm,210/trial.heightMm);
  const w=trial.widthMm*scale,ht=trial.heightMm*scale,x=(520-w)/2,y=(270-ht)/2;
  const at=p=>({x:x+p.xMm*scale,y:y+p.yMm*scale});
  svg.append(svgNode("rect",{x,y,width:w,height:ht,fill:"#162123",stroke:"#48615f"}));
  const observed=at(trial);
  svg.append(svgNode("circle",{cx:observed.x,cy:observed.y,r:trial.uncertaintyMm*scale,fill:"#8edcc718",stroke:"#edf0e8","stroke-dasharray":"3 3"}));
  svg.append(svgNode("path",{d:`M ${observed.x-6} ${observed.y} h 12 M ${observed.x} ${observed.y-6} v 12`,stroke:"#edf0e8","stroke-width":2}));
  h.candidates.forEach((c,i)=>{
    const p=c.residuals.find(r=>r.observationId===trial.id)?.predicted;if(!p)return;
    const point=at(p);
    svg.append(svgNode("circle",{cx:point.x,cy:point.y,r:4,fill:colors[i]}));
    svg.append(svgNode("text",{x:point.x+7,y:point.y-5-i*3,fill:colors[i]},String(i+1)));
  });
  svg.append(svgNode("text",{x:20,y:282},`${fmt(trial.widthMm)} × ${fmt(trial.heightMm)} mm · ${trial.evidenceClass==="authored-example"?"authored example":"reported measurement"}`));
  $("trialCaption").textContent=`${trial.label} · ${h.label}. Cross + circle: entered result and ±${fmt(trial.uncertaintyMm)} mm radius. Predictions: 1 proportional, 2 left, 3 right, 4 top, 5 bottom.`;
}
function renderRecords(analysis){
  $("readingList").replaceChildren();
  for(const h of variants()){
    const row=el("div",undefined,"record"),label=el("span",h.label);label.append(el("small",h.basis==="proposed-reading"?"Proposed reading":"Repeated annotation"));
    const remove=el("button","Remove");remove.type="button";remove.setAttribute("aria-label",`Remove reading ${h.label}`);
    remove.addEventListener("click",()=>action(()=>{revision++;studies.set(markId,variants().filter(x=>x.id!==h.id));if(readingId===h.id)readingId="nominal";render();}));
    row.append(label,remove);$("readingList").append(row);
  }
  $("observationList").replaceChildren();
  for(const o of analysis.observations){
    const row=el("div",undefined,"record"),label=el("span",o.label);
    label.append(el("small",`${fmt(o.widthMm)} × ${fmt(o.heightMm)} mm; (${fmt(o.xMm)}, ${fmt(o.yMm)}) ±${fmt(o.uncertaintyMm)} mm · ${o.evidenceClass}`));
    const remove=el("button","Remove");remove.type="button";remove.setAttribute("aria-label",`Remove observation ${o.label}`);
    remove.addEventListener("click",()=>action(()=>{revision++;observations=observations.filter(x=>x.id!==o.id);render();}));
    row.append(label,remove);$("observationList").append(row);
  }
}
function renderResults(analysis){
  const summary=$("summary");summary.dataset.status=analysis.status;
  const status=analysis.status==="no-evidence"?"No additional observations yet. All five rules are untested.":
    analysis.status==="none-compatible"?"No coherent source reading explains all observations under any of the five rules.":
    `${analysis.survivingRules.length} ${analysis.survivingRules.length===1?"rule survives":"rules survive"} across ${analysis.hypotheses.length} entered source ${analysis.hypotheses.length===1?"reading":"readings"}.`;
  summary.textContent=status+(analysis.sensitive?" The conclusion depends on how the original source is read.":"");
  $("ruleCards").replaceChildren();
  for(const r of analysis.rules){
    const card=el("article",undefined,`rule-card ${r.status}`);card.dataset.rule=r.rule;
    const state=r.status==="untested"?"Not tested":r.status==="all-readings-compatible"?"All entered readings fit":r.status==="reading-sensitive"?"Depends on source reading":"No coherent reading";
    card.append(el("h3",names[r.rule]),el("p",state,"state"));
    card.append(el("p",r.status==="untested"?"Add a result on another workpiece.":`${r.supportingHypothesisIds.length} of ${analysis.hypotheses.length} readings fit every observation.`));
    if(r.requiresSwitching)card.append(el("p","Different readings fit different trials, but no single reading fits all of them. Switching per trial is refused."));
    $("ruleCards").append(card);
  }
  $("matrix").replaceChildren();
  for(const h of analysis.hypotheses){
    const tr=el("tr"),th=el("th",h.label);th.scope="row";tr.append(th);
    for(const c of h.candidates){
      const td=el("td",c.status==="untested"?"Untested":c.status==="compatible"?"Fits all":"Contradicted",c.status);
      if(c.status==="contradicted"){
        const failed=c.residuals.filter(r=>!r.compatible),worst=Math.max(...failed.filter(r=>r.excessMm!==null).map(r=>r.excessMm));
        td.append(el("small",failed.some(r=>r.predicted===null)?"Clearance cannot fit a trial sheet":`${failed.length} ${failed.length===1?"trial":"trials"}; max ${fmt(worst)} mm beyond radius`));
      }
      tr.append(td);
    }
    $("matrix").append(tr);
  }
  const radius=num("planRadius");
  if($("planRadius").value.trim()===""||!Number.isFinite(radius)||radius<0||radius>1000){
    $("proposal").dataset.status="invalid-radius";
    $("proposal").textContent="Enter an observation radius between 0 and 1,000 mm to compare possible next observations.";
    return;
  }
  const proposal=proposeCalibrationVariation(source,markId,observations,variants(),radius);
  $("proposal").dataset.status=proposal?.status||"no-comparison";
  $("proposal").textContent=!proposal?(analysis.status==="none-compatible"?"Review the conflicting observations and source readings before proposing another geometric test.":"Fewer than two surviving rule types remain. This limited family cannot propose a between-rule comparison."):
    proposal.separablePairs===0?"None of the 16 tested dimension combinations separates the remaining rule prediction sets at this measurement radius. More precise or different evidence is needed.":
      `At ${fmt(proposal.widthMm)} × ${fmt(proposal.heightMm)} mm, ${proposal.separablePairs} of ${proposal.totalPairs} rule pairs separate for every surviving entered reading at ±${fmt(proposal.uncertaintyMm)} mm. The closest predictions are ${fmt(proposal.minSeparationMm)} mm apart. ${proposal.admissibleDimensions} of 16 tested sizes fit every surviving explanation.`;
}
function render(){
  const a=analyzeCalibrationEvidence(source,markId,observations,variants());
  $("sourceTitle").textContent=source.title||"Local annotated demonstration";
  $("sourceSummary").textContent=String(source.provenance||"Authored annotation")+(source.source.image?` · Original image SHA-256 ${source.source.image.sha256.slice(0,12)}…`:"");
  fillSelect($("landmark"),source.landmarks,markId);
  if(!a.hypotheses.some(h=>h.id===readingId))readingId="nominal";
  fillSelect($("readingChoice"),a.hypotheses,readingId);
  if(!a.observations.some(o=>o.id===trialId))trialId=a.observations[0]?.id||"";
  fillSelect($("trialChoice"),a.observations.length?a.observations:[{id:"",label:"No observation yet"}],trialId);
  sourceDrawing(a);trialDrawing(a);renderRecords(a);renderResults(a);
}
$("hypothesisForm").addEventListener("submit",e=>{e.preventDefault();action(()=>{
  const candidate=createCalibrationHypothesis(source,markId,{id:nextId("reading"),label:$("readingLabel").value,basis:$("readingBasis").value,
    reading:{widthMm:num("sourceWidth"),heightMm:num("sourceHeight"),sourcePx:{x:num("sourceX"),y:num("sourceY")},
      corners:[0,1,2,3].map(i=>({x:num(`corner${i}x`),y:num(`corner${i}y`)}))}});
  const next=[...variants(),candidate];analyzeCalibrationEvidence(source,markId,observations,next);
  revision++;studies.set(markId,next);readingId=candidate.id;render();
});});
$("observationForm").addEventListener("submit",e=>{e.preventDefault();action(()=>{
  const candidate=createObservation(source,{id:nextId("trial"),landmarkId:markId,label:$("obsLabel").value,evidenceClass:$("obsClass").value,
    widthMm:num("obsWidth"),heightMm:num("obsHeight"),xMm:num("obsX"),yMm:num("obsY"),uncertaintyMm:num("obsRadius")});
  const next=validateObservations(source,[...observations,candidate]);
  revision++;observations=next;trialId=candidate.id;render();
});});
$("restoreDraft").addEventListener("click",()=>action(resetDraft));
$("landmark").addEventListener("change",()=>action(()=>{revision++;markId=$("landmark").value;readingId="nominal";resetDraft();resetObservationDraft();render();}));
$("readingChoice").addEventListener("change",()=>action(()=>{readingId=$("readingChoice").value;render();}));
$("trialChoice").addEventListener("change",()=>action(()=>{trialId=$("trialChoice").value;render();}));
$("planRadius").addEventListener("input",()=>action(render));
async function loadFile(input,kind){
  const file=input.files[0];if(!file)return;const ticket=++revision;
  try{
    if(file.size>(kind==="investigation"?1024:256)*1024)throw Error("This local JSON file exceeds the supported size limit");
    const text=await file.text();if(ticket!==revision)return;
    const value=JSON.parse(text);
    if(kind==="source"){setSource(value);}
    else if(kind==="observation"){observations=importEvidence(source,value);}
    else{
      const loaded=importCalibrationInvestigation(value);
      setSource(loaded.source,loaded.landmarkId);observations=loaded.observations;studies.set(markId,loaded.hypotheses);
    }
    error("");render();
  }catch(e){if(ticket===revision)error("Import refused: "+e.message);}
  finally{if(ticket===revision)input.value="";}
}
$("sourceFile").addEventListener("change",e=>loadFile(e.target,"source"));
$("observationFile").addEventListener("change",e=>loadFile(e.target,"observation"));
$("investigationFile").addEventListener("change",e=>loadFile(e.target,"investigation"));
$("exportStudy").addEventListener("click",()=>action(()=>{
  const bundle=exportCalibrationInvestigation(source,markId,observations,variants());
  const blob=new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob);
  const link=el("a");link.href=url;link.download=`calibration-${markId}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}));
$("example").addEventListener("click",()=>action(()=>{
  revision++;setSource({title:"One source, two possible readings",provenance:"Authored analytic example; no physical demonstration or measured learning",
    source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},
    landmarks:[{id:"guide",label:"Guide mark",kind:"edge_offset_mm",edge:"left",sourcePx:{x:20,y:30},toleranceMm:1}]});
  observations=[createObservation(source,{id:"example-result",landmarkId:markId,label:"Authored result on a 200 × 160 mm sheet",
    evidenceClass:"authored-example",widthMm:200,heightMm:160,xMm:20,yMm:60,uncertaintyMm:.1})];
  studies.set(markId,[createCalibrationHypothesis(source,markId,{id:"example-reading",label:"Mark may have been read at x = 10 px",basis:"proposed-reading",
    reading:{...source.source,sourcePx:{x:10,y:30}}})]);
  readingId="example-reading";$("planRadius").value=.5;render();
}));
resetDraft();resetObservationDraft();render();
