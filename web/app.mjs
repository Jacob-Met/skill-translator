import {derive,adapt,toDisplay,fromDisplay,evaluate} from "/src/geometry.mjs";
import {demonstration} from "/src/demo.mjs";
import {compareInterpretations,proposeVariation} from "/src/hypotheses.mjs";

const $=id=>document.getElementById(id);
const ns="http://www.w3.org/2000/svg";
function svgEl(parent,tag,attrs={},content=""){
  const el=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attrs)) el.setAttribute(key,String(value));
  if(content)el.textContent=content;
  parent.append(el);return el;
}
const mm=x=>Number(x).toFixed(1)+" mm";
const rounded=x=>Number(x).toFixed(3);
let demo=demonstration,derived=derive(demo),target,selected=0,attempt=null,verdict=null;
let alternateChoice="fraction";
let box={x:80,y:50,width:560,height:320},dragging=false;

function error(message){$("error").textContent=message;$("error").hidden=!message;}
function mirrored(){return $("handed").value==="mirrored";}
function chosen(){return target.landmarks[selected];}
function ownRule(mark){return mark.kind==="fraction"?"fraction":mark.edge;}
function resetAlternativeChoice(){alternateChoice=ownRule(chosen())==="fraction"?"left":"fraction";}
function hypothesis(){try{return compareInterpretations(chosen(),derived.source,target.widthMm,target.heightMm,alternateChoice);}catch{return null;}}
function updateAlternatives(){
  const menu=$("alternateRule"),current=ownRule(chosen());
  const choices=["fraction","left","right","top","bottom"].filter(rule=>rule!==current);
  if(!choices.includes(alternateChoice))alternateChoice=choices[0];
  menu.replaceChildren();
  for(const rule of choices){
    const option=document.createElement("option");option.value=rule;
    option.textContent=rule==="fraction"?"Proportional position":"Fixed distance from "+rule+" edge";
    menu.append(option);
  }
  menu.value=alternateChoice;
  try{
    const c=compareInterpretations(chosen(),derived.source,target.widthMm,target.heightMm,alternateChoice);
    $("alternativeOutcome").textContent="Authored rule: "+mm(c.primary.xMm)+" right / "+mm(c.primary.yMm)+" down. Alternative: "+mm(c.rival.xMm)+" right / "+mm(c.rival.yMm)+" down. Predicted separation: "+mm(c.separationMm)+(c.distinguishableByMark?" — beyond twice the positional tolerance.":" — not beyond twice the positional tolerance.");
    const proposal=proposeVariation(chosen(),derived.source,alternateChoice);
    $("variationIdea").textContent="Hypothetical distinguishing demonstration: use a "+mm(proposal.widthMm)+" × "+mm(proposal.heightMm)+" sheet. Predicted separation: "+mm(proposal.separationMm)+". This suggests an informative observation; it does not determine the correct interpretation.";
  }catch(e){
    $("alternativeOutcome").textContent="This alternative cannot be placed on the selected sheet: "+e.message;
    $("variationIdea").textContent="Try a different alternative or workpiece size. Never replace a physical invariant silently.";
  }
}
function bounds(){
  const scale=Math.min(610/target.widthMm,300/target.heightMm);
  const width=target.widthMm*scale,height=target.heightMm*scale;
  return {x:(720-width)/2,y:(420-height)/2,width,height};
}
function resetAttempt(){
  const m=chosen();
  attempt={xMm:Math.max(0,Math.min(target.widthMm,m.xMm+Math.max(18,m.toleranceMm*3))),
           yMm:Math.max(0,Math.min(target.heightMm,m.yMm+Math.max(10,m.toleranceMm*2)))};
  verdict=null;
}
function ruleText(mark){
  if(mark.kind==="fraction")
    return "PROPORTIONAL · "+(mark.uv.u*100).toFixed(1)+"% across × "
      +(mark.uv.v*100).toFixed(1)+"% down";
  return "FIXED CLEARANCE · "+mm(mark.distanceMm)+" from physical "+mark.edge+" edge";
}
function updateInfo(){
  const mark=chosen();
  $("rule").textContent=ruleText(mark);
  $("why").textContent=mark.why||"An explicitly authored task relationship.";
  $("sourcePosition").textContent="x "+rounded(mark.sourcePx.x)+
    " px / y "+rounded(mark.sourcePx.y)+" px";
  $("sourceFraction").textContent="Derived location: "+(mark.uv.u*100).toFixed(2)+
    "% across, "+(mark.uv.v*100).toFixed(2)+"% down in a "+
    demo.source.widthMm+" × "+demo.source.heightMm+" mm source sheet.";
  $("targetPosition").textContent=mm(mark.xMm)+" right · "+mm(mark.yMm)+" down";
  $("targetTolerance").textContent="Allowed positional error: ±"+mm(mark.toleranceMm)+
    ". Mirroring affects the view only.";
  $("provenance").textContent=derived.provenance;
  $("demoLabel").textContent=(demo.title||"Custom annotation")+" · "+
    derived.landmarks.length+" source marks";
  const unknowns=Array.isArray(demo.unknowns)&&demo.unknowns.length?
    demo.unknowns:["No force, contact or physical outcome is established by planar marker positions."];
  $("unknowns").replaceChildren();
  for(const unknown of unknowns.slice(0,8)){
    const li=document.createElement("li");
    li.textContent=String(unknown).slice(0,350);$("unknowns").append(li);
  }
}
function markButtons(){
  const div=$("markChoices");div.replaceChildren();
  target.landmarks.forEach((mark,i)=>{
    const b=document.createElement("button");b.type="button";
    b.textContent=String(i+1).padStart(2,"0")+" / "+mark.label;
    if(i===selected)b.classList.add("is-selected");
    b.setAttribute("aria-pressed",String(i===selected));
    b.addEventListener("click",()=>{selected=i;resetAlternativeChoice();resetAttempt();paint();});
    div.append(b);
  });
}
function sourceDrawing(){
  const s=$("sourceSvg");s.replaceChildren();
  svgEl(s,"text",{x:24,y:32,class:"svg-label"},"OBSERVED PIXEL COORDINATES / AUTHORED");
  const corners=demo.source.corners;
  const pts=corners.map(p=>p.x+","+p.y).join(" ");
  svgEl(s,"polygon",{points:pts,class:"sheet"});
  for(const [a,b] of [[0,2],[1,3]]){
    svgEl(s,"line",{x1:corners[a].x,y1:corners[a].y,
      x2:corners[b].x,y2:corners[b].y,class:"sheet-grid"});
  }
  corners.forEach((p,i)=>{
    svgEl(s,"circle",{cx:p.x,cy:p.y,r:4.6,fill:"#233f37",stroke:"#faf5d6","stroke-width":2});
    svgEl(s,"text",{x:p.x+7,y:p.y-9,class:"svg-label"},"C"+(i+1));
  });
  derived.landmarks.forEach((mark,i)=>{
    const attrs={cx:mark.sourcePx.x,cy:mark.sourcePx.y,r:i===selected?13:10,
      class:"mark-ring"+(i===selected?" selected":"")};
    svgEl(s,"circle",attrs);
    svgEl(s,"text",{x:mark.sourcePx.x,y:mark.sourcePx.y,
      class:"mark-num"},String(i+1));
  });
  svgEl(s,"text",{x:24,y:373,class:"svg-label"},
    "TL · TR · BR · BL  →  NORMALIZED PLANAR COORDINATES");
}
function targetDrawing(){
  const s=$("targetSvg");s.replaceChildren();box=bounds();
  svgEl(s,"text",{x:22,y:29,class:"svg-label"},
    mirrored()?"MIRRORED WORKSPACE VIEW · PHYSICAL EDGES STAY NAMED":"STANDARD WORKSPACE VIEW");
  svgEl(s,"rect",{x:box.x,y:box.y,width:box.width,height:box.height,
    rx:3,class:"sheet-target"});
  for(const frac of [0.25,0.5,0.75]){
    svgEl(s,"line",{x1:box.x+box.width*frac,y1:box.y,
      x2:box.x+box.width*frac,y2:box.y+box.height,class:"sheet-grid"});
    svgEl(s,"line",{x1:box.x,y1:box.y+box.height*frac,
      x2:box.x+box.width,y2:box.y+box.height*frac,class:"sheet-grid"});
  }
  svgEl(s,"text",{x:360,y:box.y+box.height+24,class:"dim-label"},
    mm(target.widthMm)+" physical sheet width");
  const heightLabelX=box.x-23,heightLabelY=box.y+box.height/2;
  svgEl(s,"text",{x:heightLabelX,y:heightLabelY,class:"dim-label",
    transform:"rotate(-90 "+heightLabelX+" "+heightLabelY+")"},
    mm(target.heightMm)+" physical sheet height");
  for(const [i,mark] of target.landmarks.entries()){
    if(!$("showGoal").checked)continue;
    const p=toDisplay(mark,target,box,mirrored());
    const tol=mark.toleranceMm/target.widthMm*box.width;
    if(i===selected)svgEl(s,"circle",{cx:p.x,cy:p.y,r:tol,
      class:"goal-tolerance"});
    svgEl(s,"circle",{cx:p.x,cy:p.y,r:i===selected?8.5:5.5,
      class:"goal"+(i===selected?" selected":"")});
    if(i===selected)svgEl(s,"text",{x:p.x+14,y:p.y-14,
      class:"svg-target-label"},"TARGET "+(i+1));
  }
  if($("showGoal").checked){
    const c=hypothesis();
    if(c){
      const other=toDisplay(c.rival,target,box,mirrored());
      svgEl(s,"circle",{cx:other.x,cy:other.y,r:10,class:"alternative-goal"});
      svgEl(s,"text",{x:other.x+14,y:other.y+27,class:"alternative-text"},"OTHER RULE");
    }
  }
  if(attempt){
    const p=toDisplay(attempt,target,box,mirrored());
    svgEl(s,"line",{x1:p.x-17,y1:p.y,x2:p.x+17,y2:p.y,class:"attempt-cross"});
    svgEl(s,"line",{x1:p.x,y1:p.y-17,x2:p.x,y2:p.y+17,class:"attempt-cross"});
    svgEl(s,"circle",{cx:p.x,cy:p.y,r:8,class:"attempt"});
    svgEl(s,"text",{x:p.x+13,y:p.y+22,class:"svg-target-label"},"YOUR MARK");
  }
}
function feedback(){
  const el=$("evaluation");el.className="evaluation";
  if(!verdict){
    el.textContent="Select a relationship; click or drag the ring on the sheet, then evaluate.";
    return;
  }
  el.classList.add(verdict.within?"success":"failure");
  el.textContent=(verdict.within?"WITHIN TOLERANCE":"NEEDS ADJUSTMENT")+
    " · error "+mm(verdict.errorMm)+" vs allowed "+mm(verdict.toleranceMm)+
    ". Physical displacement: "+mm(verdict.dxMm)+" across / "+
    mm(verdict.dyMm)+" down.";
}
function paint(){markButtons();sourceDrawing();updateAlternatives();targetDrawing();updateInfo();feedback();}
function recompute(){
  try{
    const next=adapt(derived,Number($("widthMm").value),Number($("heightMm").value));
    target=next;selected=Math.min(selected,target.landmarks.length-1);
    resetAttempt();error("");paint();
  }catch(e){error(e.message);}
}
function svgPoint(ev){
  const s=$("targetSvg"),p=s.createSVGPoint();
  p.x=ev.clientX;p.y=ev.clientY;
  return p.matrixTransform(s.getScreenCTM().inverse());
}
function pointAttempt(ev){
  const p=svgPoint(ev);
  const mmPoint=fromDisplay(p,target,box,mirrored());
  attempt={xMm:Math.max(0,Math.min(target.widthMm,mmPoint.xMm)),
           yMm:Math.max(0,Math.min(target.heightMm,mmPoint.yMm))};
  verdict=null;targetDrawing();feedback();
}
$("targetSvg").addEventListener("pointerdown",e=>{
  if(!target)return;dragging=true;
  $("targetSvg").setPointerCapture(e.pointerId);
  pointAttempt(e);$("targetSvg").focus();
});
$("targetSvg").addEventListener("pointermove",e=>{if(dragging&&target)pointAttempt(e);});
$("targetSvg").addEventListener("pointerup",()=>{dragging=false;});
$("targetSvg").addEventListener("pointercancel",()=>{dragging=false;});
$("targetSvg").addEventListener("keydown",e=>{
  if(!target||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
  e.preventDefault();
  const step=e.shiftKey?5:1,flip=mirrored()?-1:1;
  if(e.key==="ArrowLeft")attempt.xMm-=step*flip;
  if(e.key==="ArrowRight")attempt.xMm+=step*flip;
  if(e.key==="ArrowUp")attempt.yMm-=step;
  if(e.key==="ArrowDown")attempt.yMm+=step;
  attempt.xMm=Math.max(0,Math.min(target.widthMm,attempt.xMm));
  attempt.yMm=Math.max(0,Math.min(target.heightMm,attempt.yMm));
  verdict=null;targetDrawing();feedback();
});
$("check").addEventListener("click",()=>{
  if(!target)return;
  verdict=evaluate(chosen(),attempt);feedback();
});
$("reset").addEventListener("click",()=>{if(target){resetAttempt();targetDrawing();feedback();}});
$("showGoal").addEventListener("change",targetDrawing);
$("alternateRule").addEventListener("change",e=>{
  alternateChoice=e.target.value;updateAlternatives();targetDrawing();
});
$("widthMm").addEventListener("change",recompute);
$("heightMm").addEventListener("change",recompute);
$("handed").addEventListener("change",()=>{if(target){targetDrawing();feedback();}});
$("demoFile").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>256*1024)throw Error("Annotated demonstration must be ≤256 KB");
    const parsed=JSON.parse(await file.text());
    const next=derive(parsed);
    const nextTarget=adapt(next,Number($("widthMm").value),Number($("heightMm").value));
    demo=parsed;derived=next;target=nextTarget;selected=0;
    resetAlternativeChoice();resetAttempt();error("");paint();
  }catch(err){error("Source rejected; previous demonstration preserved. "+err.message);}
});
$("export").addEventListener("click",()=>{
  if(!target)return;
  const receipt={
    schema:"skill-translator-task-space/v1",
    evidenceClass:"authored-planar-annotations-not-verified-physical-action",
    source:{title:demo.title||null,provenance:derived.provenance,
      source:demo.source,landmarks:demo.landmarks},
    target:{widthMm:target.widthMm,heightMm:target.heightMm,
      workspaceView:mirrored()?"mirrored":"standard"},
    selectedMark:chosen().id,
    inferredLandmarks:target.landmarks.map(m=>({
      id:m.id,kind:m.kind,edge:m.edge,sourcePixel:m.sourcePx,
      normalizedPosition:m.uv,distanceMm:m.distanceMm,
      targetMm:{x:m.xMm,y:m.yMm},toleranceMm:m.toleranceMm})),
    learnerAttempt:attempt,
    evaluation:verdict,
    competingInterpretation:hypothesis(),
    limits:Array.isArray(demo.unknowns)?demo.unknowns:[]
  };
  const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],
    {type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download="skill-task-space-evidence.json";
  link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
recompute();
