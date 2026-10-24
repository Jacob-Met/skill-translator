import {JUDGMENT_SCHEMA,createJudgmentStudy,importJudgmentStudy,replaceJudgmentRehearsal,recordPlacementJudgment,inspectPlacementJudgments} from '/src/rehearsal-judgment.mjs';
import {derive,adapt,toDisplay,fromDisplay} from '/src/geometry.mjs';
import {demonstration} from '/src/demo.mjs';
import {createRehearsal,importRehearsal,inspectRehearsal,placeRehearsal,revealRehearsal,submitRehearsal,advanceRehearsal} from '/src/transfer-rehearsal.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg',mm=n=>Number(n.toFixed(2))+' mm';
let session=createRehearsal(demonstration,[{widthMm:320,heightMm:190},{widthMm:220,heightMm:180},{widthMm:380,heightMm:150}]);
let judgmentStudy=createJudgmentStudy(session),judgmentFindings=[];
let selected=session.source.landmarks[0].id,showTargets=false,generation=0,state,target,box;
const mirrored=()=>$('view').value==='mirrored';
function error(message=''){$('rehearsalError').textContent=message;$('rehearsalError').hidden=!message;}
function element(parent,tag,text){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;}
function svg(tag,attrs,text=''){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));e.textContent=text;$('rehearsalSheet').append(e);return e;}
function draw(trial){
 $('rehearsalSheet').replaceChildren();const scale=Math.min(640/trial.widthMm,380/trial.heightMm),w=trial.widthMm*scale,h=trial.heightMm*scale;
 box={x:(800-w)/2,y:(520-h)/2,width:w,height:h};
 svg('rect',{x:box.x,y:box.y,width:w,height:h,class:'rehearsal-paper'});
 for(const n of [.25,.5,.75]){svg('line',{x1:box.x+w*n,y1:box.y,x2:box.x+w*n,y2:box.y+h,class:'rehearsal-grid'});svg('line',{x1:box.x,y1:box.y+h*n,x2:box.x+w,y2:box.y+h*n,class:'rehearsal-grid'});}
 target.landmarks.forEach((mark,i)=>{
  if(showTargets||trial.submitted){const p=toDisplay(mark,target,box,mirrored());svg('circle',{cx:p.x,cy:p.y,r:Math.max(2,mark.toleranceMm*scale),class:'rehearsal-goal','data-goal':mark.id});svg('circle',{cx:p.x,cy:p.y,r:3,class:'rehearsal-goal-center'});}
  const placed=trial.attempts.find(p=>p.id===mark.id);if(!placed)return;
  const p=toDisplay(placed,target,box,mirrored());svg('circle',{cx:p.x,cy:p.y,r:12,class:'rehearsal-attempt'+(selected===mark.id?' selected':''),'data-placement':mark.id});svg('text',{x:p.x,y:p.y,class:'rehearsal-number'},String(i+1));
 });
 svg('text',{x:400,y:box.y+h+30,class:'rehearsal-dimension'},`${trial.widthMm} × ${trial.heightMm} mm`);
}
function retain(next){judgmentStudy=replaceJudgmentRehearsal(judgmentStudy,next);session=judgmentStudy.rehearsal;}
function currentJudgment(){return judgmentFindings.find(j=>j.trialIndex===state.index);}
function render(){
 judgmentFindings=inspectPlacementJudgments(judgmentStudy);
 state=inspectRehearsal(session);const trial=state.trials[state.index];target=adapt(derive(session.source),trial.widthMm,trial.heightMm);
 if(!target.landmarks.some(m=>m.id===selected))selected=target.landmarks[0].id;
 $('sourceLabel').textContent=(session.source.title||'Source annotations')+' · '+session.source.provenance;
 $('trialTitle').textContent=`Sheet ${state.index+1} / ${session.plan.length} · ${trial.widthMm} × ${trial.heightMm} mm`;
 $('trialStrip').replaceChildren();state.trials.forEach((t,i)=>{const li=element($('trialStrip'),'li','');li.className=i===state.index?'current':t.submitted?'done':'';if(i===state.index)li.setAttribute('aria-current','step');element(li,'strong',`SHEET ${i+1}`);element(li,'span',`${t.widthMm} × ${t.heightMm} mm`);element(li,'span',t.submitted?'Committed':i===state.index?'Current':'Later');});
 $('markChoice').replaceChildren();target.landmarks.forEach((m,i)=>{const o=element($('markChoice'),'option',`${i+1}. ${m.label}`);o.value=m.id;});$('markChoice').value=selected;
 const mark=target.landmarks.find(m=>m.id===selected),placed=trial.attempts.find(p=>p.id===selected);
 // Meanings remain inspectable throughout; exact adapted coordinates are withheld until help or review.
 $('markMeaning').textContent=(session.source.landmarks.find(m=>m.id===selected).why||'Relationship supplied by the source author.')+' Tolerance: '+mm(mark.toleranceMm)+'.';
 $('placeX').value=placed?Number(placed.xMm.toFixed(4)):'';$('placeY').value=placed?Number(placed.yMm.toFixed(4)):'';
 $('placeX').max=trial.widthMm;$('placeY').max=trial.heightMm;
 for(const id of ['placeX','placeY','placeMark','submitTrial','requestTargets'])$(id).disabled=trial.submitted;
 $('requestTargets').hidden=showTargets||trial.submitted;$('hideTargets').hidden=!showTargets||trial.submitted;
 $('nextTrial').hidden=!trial.submitted||state.index===session.plan.length-1;
 $('goalReadout').textContent=showTargets||trial.submitted?`${trial.submitted?'Review target':'Requested target'}: ${mm(mark.xMm)} from left, ${mm(mark.yMm)} from top.`:'Adapted targets are hidden. Place first, or request help.';
 $('assistanceRecord').textContent=trial.reveals.length?`${trial.reveals.length} target request(s) recorded before commitment.`:'No targets requested on this sheet in this record. Source explanations remain available; outside help is not measured.';
 $('trialStatus').textContent=trial.submitted?(trial.result.complete?(trial.result.passed?'Every committed mark is within its declared tolerance.':'Some committed marks are outside tolerance.'): `Committed partial result: ${trial.result.missing.length} mark(s) missing.`):`${trial.attempts.length} / ${target.landmarks.length} placements retained. Review appears after commitment.`;
 const judgment=currentJudgment();
 if(judgment){$('judgmentChoice').value=judgment.prediction;$('judgmentReason').value=judgment.reason;}
 for(const id of ['placeX','placeY','placeMark'])$(id).disabled=trial.submitted||!!judgment;
 $('recordJudgment').disabled=trial.submitted||!!judgment||trial.attempts.length!==target.landmarks.length;
 $('judgmentChoice').disabled=trial.submitted||!!judgment;$('judgmentReason').disabled=trial.submitted||!!judgment;
 $('judgmentStatus').textContent=judgment?`First judgment: ${judgment.prediction}. Targets requested before judgment: ${judgment.targetsRequestedBeforeJudgment}. `+(trial.submitted?(judgment.prediction==='uncertain'?'Uncertainty retained; no agreement score.':judgment.agreement?'Judgment agrees with the geometric result.':'Judgment differs from the geometric result.'):'Placements are frozen; commit to compare.'):trial.submitted?'No pre-feedback judgment recorded.':'Optional: place every mark, then judge this layout before feedback. Recording freezes these placements.';
 $('judgmentHistory').replaceChildren();
 for(const j of judgmentFindings){const row=element($('judgmentHistory'),'p',`Sheet ${j.trialIndex+1}: ${j.prediction} · ${j.submitted?(j.actualAdequate?'within all tolerances':'outside tolerance'):'not committed'} · ${j.targetsRequestedBeforeJudgment} earlier target requests. ${j.reason}`);}
 draw(trial);
 $('trialReview').hidden=!trial.submitted;$('resultRows').replaceChildren();
 if(trial.submitted)for(const r of trial.result.results){const row=element($('resultRows'),'div','');element(row,'strong',r.label);element(row,'span',!r.placed?'Missing placement':`${r.evaluation.within?'Within tolerance':'Outside tolerance'} · error ${mm(r.evaluation.errorMm)}`);}
 $('beforeHelp').textContent=trial.reveals.length?'Before the first target request, '+trial.reveals[0].priorAttempts.length+' mark(s) had placements. Their exact coordinates remain in the exported action record.':'No pre-commit target reveal was recorded. This does not establish absence of outside assistance.';
 $('sessionReview').hidden=!state.complete;$('sessionRows').replaceChildren();
 if(state.complete)for(const [i,t]of state.trials.entries()){const row=element($('sessionRows'),'div','');element(row,'strong',`Sheet ${i+1} · ${t.widthMm} × ${t.heightMm} mm`);element(row,'span',`${t.reveals.length?'Targets requested':'No targets requested in record'} · ${!t.result.complete?'Incomplete':t.result.passed?'Within all tolerances':'Outside tolerance'}${t.result.rmsErrorMm===null?'':' · RMS '+mm(t.result.rmsErrorMm)}`);}
}
function change(operation){try{const next=operation(session);generation++;retain(next);error();render();}catch(e){error(e.message);}}
function install(next){judgmentStudy=next?.schema===JUDGMENT_SCHEMA?importJudgmentStudy(next):createJudgmentStudy(importRehearsal(next));session=judgmentStudy.rehearsal;$('judgmentChoice').value='uncertain';$('judgmentReason').value='';generation++;selected=session.source.landmarks[0].id;showTargets=false;$('planSizes').value=session.plan.map(p=>`${p.widthMm},${p.heightMm}`).join('\n');error();render();}
function parsePlan(){return $('planSizes').value.trim().split('\n').map(line=>{const parts=line.trim().split(/[,x×]/i).map(s=>s.trim());if(parts.length!==2||parts.some(p=>p===''))throw Error('Use width,height on each line.');return {widthMm:Number(parts[0]),heightMm:Number(parts[1])};});}
function place(point){change(s=>placeRehearsal(s,selected,point));}
function download(){const content=JSON.stringify(importRehearsal(session),null,2),url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='skill-transfer-rehearsal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function openFile(input,limit,receive){const file=input.files?.[0];if(!file)return;const ticket=++generation;try{if(file.size>limit)throw Error('Selected file exceeds the size limit.');const text=await file.text();if(ticket!==generation)return;const next=receive(JSON.parse(text));if(ticket!==generation)return;install(next);$('fileStatus').textContent='Accepted file reopened. Results are recomputed from source, plan and actions.';}catch(e){if(ticket===generation)error('File refused; accepted work retained. '+e.message);}finally{input.value='';}}
document.querySelector('#planForm').addEventListener('submit',e=>{e.preventDefault();try{install(createRehearsal(session.source,parsePlan()));}catch(e){error('Plan refused; accepted work retained. '+e.message);}});
for(const id of ['planSizes','placeX','placeY'])$(id).addEventListener('input',()=>generation++);
document.querySelector('#placementForm').addEventListener('submit',e=>{e.preventDefault();if(!$('placeX').value.trim()||!$('placeY').value.trim())return;place({xMm:Number($('placeX').value),yMm:Number($('placeY').value)});});
$('markChoice').addEventListener('change',()=>{selected=$('markChoice').value;render();});$('view').addEventListener('change',render);
$('requestTargets').addEventListener('click',()=>{try{const next=revealRehearsal(session);retain(next);generation++;showTargets=true;error();render();}catch(e){error(e.message);}});
$('hideTargets').addEventListener('click',()=>{showTargets=false;render();});
$('submitTrial').addEventListener('click',()=>change(submitRehearsal));
$('nextTrial').addEventListener('click',()=>{try{const next=advanceRehearsal(session);retain(next);generation++;showTargets=false;$('judgmentChoice').value='uncertain';$('judgmentReason').value='';selected=session.source.landmarks[0].id;error();render();}catch(e){error(e.message);}});
$('saveRehearsal').addEventListener('click',()=>{try{download();}catch(e){error(e.message);}});
$('sourceFile').addEventListener('change',()=>openFile($('sourceFile'),256*1024,raw=>createRehearsal(raw,parsePlan())));
$('openRehearsal').addEventListener('change',()=>openFile($('openRehearsal'),1200*1024,raw=>raw?.schema===JUDGMENT_SCHEMA?importJudgmentStudy(raw):importRehearsal(raw)));
$('rehearsalSheet').addEventListener('pointerdown',e=>{if(state.trials[state.index].submitted||currentJudgment())return;const s=$('rehearsalSheet'),p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=fromDisplay(p.matrixTransform(s.getScreenCTM().inverse()),target,box,mirrored());if(q.xMm<0||q.yMm<0||q.xMm>target.widthMm||q.yMm>target.heightMm)return;place(q);s.focus();});
$('rehearsalSheet').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||state.trials[state.index].submitted||currentJudgment())return;e.preventDefault();const trial=state.trials[state.index],p={...(trial.attempts.find(p=>p.id===selected)||{xMm:trial.widthMm/2,yMm:trial.heightMm/2})},step=e.shiftKey?5:1,flip=mirrored()?-1:1;if(e.key==='ArrowLeft')p.xMm-=step*flip;if(e.key==='ArrowRight')p.xMm+=step*flip;if(e.key==='ArrowUp')p.yMm-=step;if(e.key==='ArrowDown')p.yMm+=step;place({xMm:Math.max(0,Math.min(trial.widthMm,p.xMm)),yMm:Math.max(0,Math.min(trial.heightMm,p.yMm))});});
$('reviewFeatureRehearsal').addEventListener('click',()=>{try{sessionStorage.setItem('skill-translator-feature-rehearsal-return/v1',JSON.stringify(importRehearsal(session)));location.assign('/feature-rehearsal');}catch(e){error(e.message);}});
try{const raw=sessionStorage.getItem('skill-translator-rehearsal-input/v1');if(raw){install(JSON.parse(raw));sessionStorage.removeItem('skill-translator-rehearsal-input/v1');}}catch(e){error('Incoming rehearsal refused; accepted work retained. '+e.message);}
render();


$('recordJudgment').addEventListener('click',()=>{try{judgmentStudy=recordPlacementJudgment(judgmentStudy,$('judgmentChoice').value,$('judgmentReason').value);generation++;error();render();}catch(e){error(e.message);}});
for(const id of ['judgmentChoice','judgmentReason'])$(id).addEventListener('input',()=>generation++);
$('saveJudgments').addEventListener('click',()=>{try{const content=JSON.stringify(importJudgmentStudy(judgmentStudy));const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='skill-placement-judgments.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e.message);}});
