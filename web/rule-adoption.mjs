import {demonstration} from "/src/demo.mjs";
import {createObservation,importEvidence} from "/src/evidence.mjs";
import {createPractice} from "/src/practice.mjs";
import {reviewRuleChoices,createRuleAdoption,compareAdoptionTargets,exportRuleAdoption,importRuleAdoption} from "/src/rule-adoption.mjs";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let demo=structuredClone(demonstration),observations=[],selected=new Map(),adoption=null,comparison=null,readVersion=0;
const ruleName={fraction:"Proportional position",left:"Fixed distance from left",right:"Fixed distance from right",top:"Fixed distance from top",bottom:"Fixed distance from bottom"};
function svg(name,attrs={},text){const e=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function clear(){ $("error").textContent="";$("status").textContent=""; }
function invalidate(){ $("acknowledge").checked=false;adoption=null;comparison=null; }
function draw(){
  const map=$("targetMap");map.replaceChildren();$("targetChanges").replaceChildren();$("originalFailure").textContent="";
  if(!comparison){map.append(svg("text",{x:30,y:60,class:"empty-map"},"Choose a supported rule to compare targets."));return;}
  const c=comparison,scale=Math.min(540/c.widthMm,280/c.heightMm),w=c.widthMm*scale,h=c.heightMm*scale;
  const left=(640-w)/2,top=(410-h)/2,point=p=>({x:left+p.xMm*scale,y:top+p.yMm*scale});
  map.append(svg("rect",{x:left,y:top,width:w,height:h,class:"sheet"}));
  map.append(svg("text",{x:30,y:28},`${c.widthMm} × ${c.heightMm} mm`));
  for(const mark of c.marks){const after=point(mark.after);if(mark.before){const before=point(mark.before);map.append(svg("line",{x1:before.x,y1:before.y,x2:after.x,y2:after.y,class:"change-line"}));map.append(svg("circle",{cx:before.x,cy:before.y,r:7,class:"original-target"}));}
    map.append(svg("path",{d:`M ${after.x} ${after.y-6} l 6 6 l -6 6 l -6 -6 Z`,class:"adopted-target"}));
    map.append(svg("text",{x:after.x+10,y:after.y-12},mark.label));
    const row=document.createElement("div");row.className="change-row";row.textContent=mark.label;
    const detail=document.createElement("span");detail.textContent=`${mark.before?`Original (${mark.before.xMm.toFixed(1)}, ${mark.before.yMm.toFixed(1)}) → `:"Original complete setup cannot fit. "}Proposed (${mark.after.xMm.toFixed(1)}, ${mark.after.yMm.toFixed(1)}) mm${mark.movementMm===null?"":` · ${mark.movementMm.toFixed(1)} mm change`}`;
    row.append(detail);$("targetChanges").append(row);
  }
  if(c.originalError)$("originalFailure").textContent="Original setup cannot fit this target: "+c.originalError+". The proposed setup was evaluated independently.";
}
function updateDecision(){
  adoption=null;comparison=null;$("error").textContent="";
  if(selected.size)try{
    const a=createRuleAdoption(demo,observations,[...selected].map(([landmarkId,rule])=>({landmarkId,rule})));
    const c=compareAdoptionTargets(a,Number($("widthMm").value),Number($("heightMm").value));adoption=a;comparison=c;
  }catch(error){$("error").textContent=error.message;}
  $("saveDecision").disabled=!adoption;$("saveNewSource").disabled=!adoption;
  $("practiceChosen").disabled=!adoption||!$("acknowledge").checked;
  if(adoption){const ambiguous=adoption.decisions.filter(d=>d.compatibleRules.length>1).length;
    $("decisionSummary").textContent=`${adoption.decisions.length} explicit choice(s), ${adoption.decisions.filter(d=>d.changed).length} changed rule(s). ${ambiguous?`${ambiguous} choice(s) retain unresolved alternatives.`:"Each chosen rule is the sole survivor in the five-rule family for its retained observations."}`;
    $("decisionLimits").textContent=adoption.limitation;
  }else{$("decisionSummary").textContent="Choose at least one tested rule and a valid target to preview a new practice source.";$("decisionLimits").textContent="";}
  draw();
}
function render(){
  const reviews=reviewRuleChoices(demo,observations);$("sourceTitle").textContent=demo.title||"Imported source";
  $("sourceProvenance").textContent=demo.provenance||"Original source attribution not supplied";
  $("evidenceMeta").textContent=`${observations.length} retained observation(s): ${observations.filter(o=>o.evidenceClass==="reported-measurement").length} reported measurement(s), ${observations.filter(o=>o.evidenceClass==="authored-example").length} authored example(s).`;
  $("ruleChoices").replaceChildren();
  for(const review of reviews){
    const row=document.createElement("div");row.className="rule-row";const description=document.createElement("div"),title=document.createElement("strong");title.textContent=review.label;description.append(title);
    const summary=document.createElement("p");summary.textContent=`Original: ${ruleName[review.originalRule]}. `+
      (review.status==="no-evidence"?"No observations for this mark.":review.status==="none-compatible"?"Every tested rule is contradicted.":`${review.compatibleRules.length} compatible rule(s).`);
    summary.className=review.status==="none-compatible"?"conflict":review.compatibleRules.length>1?"uncertain":"";description.append(summary);
    const counts=document.createElement("p");counts.className="counts";counts.textContent=`${review.reportedCount} reported · ${review.authoredCount} authored. ${review.compatibleRules.length>1&&review.observedCount?"A choice will not resolve these alternatives.":""}`;description.append(counts);
    const select=document.createElement("select");select.dataset.mark=review.landmarkId;select.setAttribute("aria-label","Rule choice for "+review.label);
    const keep=document.createElement("option");keep.value="";keep.textContent="Keep original annotation (no new decision)";select.append(keep);
    for(const candidate of review.candidates){const option=document.createElement("option");option.value=candidate.rule;option.textContent=ruleName[candidate.rule]+" · "+candidate.status;option.disabled=candidate.status!=="compatible";select.append(option);}
    select.value=selected.get(review.landmarkId)||"";select.addEventListener("change",()=>{clear();if(select.value)selected.set(review.landmarkId,select.value);else selected.delete(review.landmarkId);invalidate();updateDecision();});
    row.append(description,select);$("ruleChoices").append(row);
  }
  updateDecision();
}
function install(source,rows,choices=[]){reviewRuleChoices(source,rows);demo=structuredClone(source);observations=structuredClone(rows);selected=new Map(choices.map(c=>[c.landmarkId,c.rule]));readVersion++;invalidate();render();}
async function openFile(event,receive){
  clear();const file=event.target.files?.[0],version=++readVersion;event.target.value="";if(!file)return;
  try{if(file.size>1_000_000)throw Error("Choose a JSON file no larger than 1 MB");const value=JSON.parse(await file.text());if(version!==readVersion)return;receive(value);}
  catch(error){if(version===readVersion)$("error").textContent="File refused; current source and decisions retained. "+error.message;}
}
$("sourceFile").addEventListener("change",event=>openFile(event,value=>{install(value,[]);$("status").textContent="Original source opened. Import its matching observations to test choices.";}));
$("evidenceFile").addEventListener("change",event=>openFile(event,value=>{const rows=importEvidence(demo,value);install(demo,rows);$("status").textContent="Source-matched observations opened; make a fresh explicit choice.";}));
$("decisionFile").addEventListener("change",event=>openFile(event,value=>{
  const a=importRuleAdoption(value),setup=value.practiceSetup;
  if(setup){
    if(typeof setup.mirrored!=="boolean"||typeof setup.showGoals!=="boolean")throw Error("Invalid saved practice display settings");
    compareAdoptionTargets(a,setup.widthMm,setup.heightMm);
    $("widthMm").value=setup.widthMm;$("heightMm").value=setup.heightMm;
    $("mirror").checked=setup.mirrored;$("showGoals").checked=setup.showGoals;
  }
  install(a.originalDemo,a.observations,a.decisions.map(d=>({landmarkId:d.landmarkId,rule:d.chosenRule})));
  $("status").textContent="Decision reopened. Support and proposed targets have been recomputed from retained inputs.";
}));
for(const id of["widthMm","heightMm"])$(id).addEventListener("input",()=>{clear();invalidate();updateDecision();});
$("acknowledge").addEventListener("change",()=>{$("practiceChosen").disabled=!adoption||!$("acknowledge").checked;});
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("saveDecision").addEventListener("click",()=>{if(adoption)download("skill-rule-decision.json",{...exportRuleAdoption(adoption),practiceSetup:{widthMm:comparison.widthMm,heightMm:comparison.heightMm,mirrored:$("mirror").checked,showGoals:$("showGoals").checked}});});
$("saveNewSource").addEventListener("click",()=>{if(adoption)download("skill-chosen-rule-source.json",adoption.adoptedDemo);});
$("saveOriginal").addEventListener("click",()=>download("skill-original-source.json",demo));
$("practiceChosen").addEventListener("click",()=>{clear();if(!adoption||!$("acknowledge").checked)return;try{
  const input={demo:adoption.adoptedDemo,widthMm:Number($("widthMm").value),heightMm:Number($("heightMm").value),mirrored:$("mirror").checked,showGoals:$("showGoals").checked};
  createPractice(input.demo,input.widthMm,input.heightMm);sessionStorage.setItem("skill-translator-practice-input/v1",JSON.stringify(input));location.assign("/practice");
}catch(error){$("error").textContent="Practice could not open; save the decision bundle to retain it. "+error.message;}});
function example(ambiguous){
  clear();const source={title:"Authored fixed-clearance challenge",provenance:"Independent analytic authored observations; no physical execution or learning result.",
    source:{widthMm:200,heightMm:100,corners:[{x:0,y:0},{x:400,y:0},{x:400,y:200},{x:0,y:200}]},landmarks:[
      {id:"guide",label:"Guide mark",kind:"fraction",sourcePx:{x:40,y:100},toleranceMm:2,why:"Original authored proportional interpretation"},
      {id:"center",label:"Center mark",kind:"fraction",sourcePx:{x:200,y:100},toleranceMm:2}]};
  const row=createObservation(source,{id:"authored-check",landmarkId:"guide",label:"Analytically specified second workpiece",
    evidenceClass:"authored-example",widthMm:ambiguous?200:400,heightMm:ambiguous?100:150,xMm:20,yMm:ambiguous?50:75,uncertaintyMm:.01});
  $("widthMm").value=400;$("heightMm").value=150;install(source,[row]);
  $("status").textContent=ambiguous?"Authored unchanged-size observation: five rules remain compatible. An explicit choice retains that ambiguity.":"Authored changed-size observation: only fixed-left clearance agrees. Choose it to inspect the actual practice target change.";
}
$("exampleUnique").addEventListener("click",()=>example(false));$("exampleAmbiguous").addEventListener("click",()=>example(true));
let startupError="";
try{const saved=sessionStorage.getItem("skill-translator-rule-input/v1");if(saved){
  const input=JSON.parse(saved),rows=importEvidence(input.demo,input.observationEvidence);reviewRuleChoices(input.demo,rows);
  demo=input.demo;observations=rows;$("widthMm").value=input.widthMm;$("heightMm").value=input.heightMm;
  $("mirror").checked=!!input.mirrored;$("showGoals").checked=input.showGoals!==false;
}}catch(error){startupError="Previous rule-choice setup could not be reopened: "+error.message;}
render();if(startupError)$("error").textContent=startupError;
