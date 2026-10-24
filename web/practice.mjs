import {derive,adapt,toDisplay,fromDisplay} from "/src/geometry.mjs";
import {demonstration} from "/src/demo.mjs";
import {createPractice,evaluatePractice,placePractice,retryPractice,importPractice} from "/src/practice.mjs";
const $=id=>document.getElementById(id),ns="http://www.w3.org/2000/svg";
const mm=n=>n.toFixed(1)+" mm";
let demo=structuredClone(demonstration),widthMm=320,heightMm=190,session,target,selected,reviewed=false;
let box={x:80,y:70,width:640,height:360};
function error(message){$("practiceError").hidden=!message;$("practiceError").textContent=message;}
function svg(parent,tag,attrs={},text=""){
  const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));
  if(text)e.textContent=text;parent.append(e);return e;
}
function download(name,value){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function install(nextDemo,w,h){
  const next=createPractice(nextDemo,w,h),nextTarget=adapt(derive(nextDemo),w,h);
  demo=nextDemo;widthMm=w;heightMm=h;session=next;target=nextTarget;selected=target.landmarks[0].id;reviewed=false;
  $("practiceWidth").value=w;$("practiceHeight").value=h;error("");render();
}
function mirrored(){return $("practiceView").value==="mirrored";}
function draw(){
  const s=$("practiceSvg");s.replaceChildren();
  const scale=Math.min(640/widthMm,350/heightMm),w=widthMm*scale,h=heightMm*scale;
  box={x:(800-w)/2,y:(500-h)/2,width:w,height:h};
  svg(s,"text",{x:24,y:29,class:"svg-label"},mirrored()?"MIRRORED VIEW / PHYSICAL COORDINATES UNCHANGED":"PHYSICAL SHEET / SELECT A MARK, THEN PLACE IT");
  svg(s,"rect",{x:box.x,y:box.y,width:w,height:h,class:"sheet-target",rx:3});
  for(const frac of [.25,.5,.75]){
    svg(s,"line",{x1:box.x+w*frac,y1:box.y,x2:box.x+w*frac,y2:box.y+h,class:"sheet-grid"});
    svg(s,"line",{x1:box.x,y1:box.y+h*frac,x2:box.x+w,y2:box.y+h*frac,class:"sheet-grid"});
  }
  target.landmarks.forEach((mark,i)=>{
    const p=toDisplay(mark,target,box,mirrored());
    if($("practiceGoals").checked){
      svg(s,"circle",{cx:p.x,cy:p.y,r:mark.toleranceMm*scale,class:"practice-tolerance"});
      svg(s,"circle",{cx:p.x,cy:p.y,r:6,class:"practice-goal"+(mark.id===selected?" selected":""),"data-mark":mark.id});
      svg(s,"text",{x:p.x+12,y:p.y-12,class:"svg-target-label"},"TARGET "+(i+1));
    }
    const placed=session.attempts.find(a=>a.id===mark.id);
    if(placed){const q=toDisplay(placed,target,box,mirrored());
      svg(s,"circle",{cx:q.x,cy:q.y,r:11,class:"placed-point"+(mark.id===selected?" selected":""),"data-mark":mark.id});
      svg(s,"text",{x:q.x,y:q.y,class:"placement-number"},String(i+1));}
  });
  svg(s,"text",{x:400,y:box.y+h+30,class:"dim-label"},mm(widthMm)+" × "+mm(heightMm));
}
function render(){
  const result=evaluatePractice(demo,widthMm,heightMm,session.attempts);
  $("roundLabel").textContent="ROUND "+String(session.round).padStart(2,"0");
  $("placementCount").textContent=result.placed+" of "+result.total+" marks placed";
  $("setupLabel").textContent=(demo.title||"Imported source")+" · "+widthMm+" × "+heightMm+" mm · "+target.landmarks.length+" task marks";
  const list=$("practiceMarks");list.replaceChildren();
  target.landmarks.forEach((mark,i)=>{
    const b=document.createElement("button");b.type="button";b.dataset.id=mark.id;b.setAttribute("aria-pressed",String(mark.id===selected));
    const n=document.createElement("span");n.className="mark-number";n.textContent=String(i+1).padStart(2,"0");
    const name=document.createElement("span");name.textContent=mark.label;
    const progress=document.createElement("span");progress.className="mark-progress";
    progress.textContent=session.attempts.some(a=>a.id===mark.id)?"Placement retained":"Not placed";name.append(progress);b.append(n,name);
    b.addEventListener("click",()=>{selected=mark.id;render();});list.append(b);
  });
  const mark=target.landmarks.find(m=>m.id===selected),placed=session.attempts.find(a=>a.id===selected);
  $("selectedLabel").textContent=mark.label;
  $("selectedTarget").textContent=$("practiceGoals").checked?"Target: "+mm(mark.xMm)+" right / "+mm(mark.yMm)+" down. Tolerance: "+mm(mark.toleranceMm)+".":
    "Target hidden. Tolerance: "+mm(mark.toleranceMm)+". Review after you place the complete set.";
  $("placementX").value=placed?Number(placed.xMm.toFixed(4)):"";
  $("placementY").value=placed?Number(placed.yMm.toFixed(4)):"";
  $("placementX").max=widthMm;$("placementY").max=heightMm;
  draw();
  const summary=$("taskOutcome");summary.dataset.state=!reviewed?"in-progress":!result.complete?"incomplete":result.passed?"passed":"needs-adjustment";
  summary.textContent=!reviewed?"Place your marks, then review the actual complete attempt.":
    !result.complete?"Incomplete attempt: "+result.missing.length+" mark(s) still need a placement.":
    result.passed?"All "+result.total+" actual placements are within their declared tolerances.":
    "The complete attempt needs adjustment. RMS positional error: "+mm(result.rmsErrorMm)+". Inspect each placement below.";
  const diagnostic=$("shiftDiagnostic");diagnostic.replaceChildren();diagnostic.hidden=!reviewed||!result.translation;
  if(!diagnostic.hidden){
    const t=result.translation,title=document.createElement("strong");title.textContent="Shared displacement component";
    const text=document.createElement("span");text.textContent=mm(t.dxMm)+" across / "+mm(t.dyMm)+" down. Removing this common translation mathematically would leave "+mm(t.remainingRmsMm)+" RMS local error. "+
      (t.partial?"This diagnosis uses a partial set. ":t.wouldMeetAll?"That hypothetical shift would put every mark within tolerance. ":"A common shift would not resolve the complete task. ")+
      "Your actual placements and result remain unchanged; this does not identify a physical cause.";diagnostic.append(title,text);
  }
  const cards=$("placementResults");cards.replaceChildren();
  for(const r of result.results){
    const card=document.createElement("article");card.className="placement-result";card.dataset.id=r.id;
    card.dataset.state=!r.placed?"missing":!reviewed?"placed":r.evaluation.within?"within":"outside";
    const title=document.createElement("h3");title.textContent=r.label;
    const location=document.createElement("p");location.textContent=r.placed?"Your mark: "+mm(r.attempt.xMm)+" right / "+mm(r.attempt.yMm)+" down.":"No placement yet.";
    const verdict=document.createElement("p");verdict.className="result-verdict";
    verdict.textContent=!r.placed?"MISSING":!reviewed?"RETAINED · REVIEW WHEN READY":r.evaluation.within?"WITHIN TOLERANCE":"NEEDS ADJUSTMENT";
    const residual=document.createElement("p");residual.textContent=reviewed&&r.placed?"Error "+mm(r.evaluation.errorMm)+" / tolerance "+mm(r.evaluation.toleranceMm):"";
    card.append(title,location,verdict,residual);cards.append(card);
  }
  $("roundHistory").hidden=!session.history.length;const history=$("historyRows");history.replaceChildren();
  for(const round of session.history){
    const evaluated=evaluatePractice(demo,widthMm,heightMm,round.attempts),row=document.createElement("div");row.className="history-round";
    const name=document.createElement("strong");name.textContent="Round "+round.round;
    const status=document.createElement("span");status.textContent=evaluated.placed+"/"+evaluated.total+" placed · "+
      (!evaluated.complete?"Incomplete":evaluated.passed?"Within all tolerances":"Needs adjustment")+
      (evaluated.rmsErrorMm===null?"":" · RMS "+mm(evaluated.rmsErrorMm));
    row.append(name,status);history.append(row);
  }
}
function place(point){
  try{session=placePractice(demo,widthMm,heightMm,session,selected,point);reviewed=false;error("");render();}
  catch(e){error("Placement refused; earlier marks retained. "+e.message);}
}
$("placementForm").addEventListener("submit",e=>{e.preventDefault();
  if(!$("placementX").value.trim()||!$("placementY").value.trim()){error("Enter both placement coordinates.");return;}
  place({xMm:Number($("placementX").value),yMm:Number($("placementY").value)});
});
$("practiceSvg").addEventListener("pointerdown",e=>{
  const s=$("practiceSvg"),p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const physical=fromDisplay(p.matrixTransform(s.getScreenCTM().inverse()),target,box,mirrored());
  place({xMm:Math.max(0,Math.min(widthMm,physical.xMm)),yMm:Math.max(0,Math.min(heightMm,physical.yMm))});s.focus();
});
$("practiceSvg").addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();
  const old=session.attempts.find(a=>a.id===selected)||{xMm:widthMm/2,yMm:heightMm/2};
  const point={xMm:old.xMm,yMm:old.yMm},step=e.shiftKey?5:1,flip=mirrored()?-1:1;
  if(e.key==="ArrowLeft")point.xMm-=step*flip;if(e.key==="ArrowRight")point.xMm+=step*flip;
  if(e.key==="ArrowUp")point.yMm-=step;if(e.key==="ArrowDown")point.yMm+=step;
  point.xMm=Math.max(0,Math.min(widthMm,point.xMm));point.yMm=Math.max(0,Math.min(heightMm,point.yMm));place(point);
});
$("nextMark").addEventListener("click",()=>{const next=target.landmarks.find(m=>!session.attempts.some(a=>a.id===m.id));
  selected=next?next.id:target.landmarks[(target.landmarks.findIndex(m=>m.id===selected)+1)%target.landmarks.length].id;render();});
$("reviewTask").addEventListener("click",()=>{reviewed=true;render();});
$("retryTask").addEventListener("click",()=>{try{session=retryPractice(demo,widthMm,heightMm,session);selected=target.landmarks[0].id;reviewed=false;error("");render();}catch(e){error(e.message);}});
$("practiceGoals").addEventListener("change",render);$("practiceView").addEventListener("change",render);
$("setupForm").addEventListener("submit",e=>{e.preventDefault();try{install(demo,Number($("practiceWidth").value),Number($("practiceHeight").value));}catch(e){error("Setup refused; current session retained. "+e.message);}});
$("practiceSource").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;
  try{if(file.size>256*1024)throw Error("Source annotations must be ≤256 KB");const next=JSON.parse(await file.text());
    install(next,Number($("practiceWidth").value),Number($("practiceHeight").value));$("practiceStatus").textContent="Source imported; a new practice session has started.";
  }catch(err){error("Source refused; current session retained. "+err.message);}e.target.value="";
});
$("savePractice").addEventListener("click",()=>download("skill-practice-session.json",importPractice(demo,widthMm,heightMm,session)));
$("savePracticeSource").addEventListener("click",()=>download("skill-practice-source.json",demo));
$("inspectCalibration").addEventListener("click",()=>{
  try{
    sessionStorage.setItem("skill-translator-practice-resume/v1",JSON.stringify({demo,widthMm,heightMm,session:importPractice(demo,widthMm,heightMm,session),selected,reviewed,mirrored:mirrored(),showGoals:$("practiceGoals").checked}));
    sessionStorage.setItem("skill-translator-sensitivity-input/v1",JSON.stringify({demo,widthMm,heightMm,landmarkId:selected}));
    location.href="/sensitivity";
  }catch(e){error("Could not preserve the practice session for analysis. "+e.message);}
});
$("openPractice").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;
  try{if(file.size>256*1024)throw Error("Practice session must be ≤256 KB");const next=importPractice(demo,widthMm,heightMm,JSON.parse(await file.text()));
    session=next;selected=target.landmarks[0].id;reviewed=false;error("");render();$("practiceStatus").textContent="Session reopened. Review recomputes outcomes from the saved placements.";
  }catch(err){error("Session refused; current placements retained. "+err.message);}e.target.value="";
});
let startupError="";
try{
  const saved=sessionStorage.getItem("skill-translator-practice-input/v1");
  if(saved){const input=JSON.parse(saved);createPractice(input.demo,input.widthMm,input.heightMm);
    demo=input.demo;widthMm=input.widthMm;heightMm=input.heightMm;
    $("practiceView").value=input.mirrored?"mirrored":"standard";$("practiceGoals").checked=input.showGoals!==false;
  }
}catch(e){startupError="Previous setup was unavailable; the authored example is shown. "+e.message;}
install(demo,widthMm,heightMm);if(startupError)error(startupError);
if(new URL(location.href).searchParams.get("resume")==="calibration"){
  try{
    const saved=JSON.parse(sessionStorage.getItem("skill-translator-practice-resume/v1"));
    if(!saved)throw Error("No retained practice session was found");
    const restored=importPractice(saved.demo,saved.widthMm,saved.heightMm,saved.session);
    install(saved.demo,saved.widthMm,saved.heightMm);session=restored;
    selected=target.landmarks.some(m=>m.id===saved.selected)?saved.selected:target.landmarks[0].id;
    reviewed=saved.reviewed===true;$("practiceView").value=saved.mirrored?"mirrored":"standard";$("practiceGoals").checked=saved.showGoals!==false;
    render();$("practiceStatus").textContent="Your practice placements and rounds were retained while you inspected calibration.";
  }catch(e){error("Retained practice could not be reopened. "+e.message);}
}
