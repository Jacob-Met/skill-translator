import {createObservation} from '/src/evidence.mjs';
import {createCalibrationHypothesis,exportCalibrationInvestigation,importCalibrationInvestigation,analyzeCalibrationEvidence} from '/src/calibration-evidence.mjs';
import {CHALLENGE_PLAN_SCHEMA,freezeChallengePlan,importChallengePlan,createChallengeResult,analyzeCalibrationChallenge,exportChallengeStudy,importChallengeStudy} from '/src/calibration-challenge.mjs';
const $=id=>document.getElementById(id),names={fraction:'Proportional position',left:'Left clearance',right:'Right clearance',top:'Top clearance',bottom:'Bottom clearance'};
const colors=['#8edcc7','#efb576','#b7d4ff','#e7a9e7','#f3a49d'];
let training=null,plan=null,results=[],draft=[],revision=0,serial=0;
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const fmt=x=>Number(x.toFixed(4)).toLocaleString('en-US',{maximumFractionDigits:4});
function error(message){$('error').textContent=message;$('error').hidden=!message;}
function act(fn){try{fn();error('');}catch(e){error(e.message);}}
function id(prefix){const used=new Set([...(training?.observations??[]).map(o=>o.id),...results.map(r=>r.observation.id),...draft.map(t=>t.id)]);let value;do{value=prefix+'-'+(++serial);}while(used.has(value));return value;}
function number(key){if(!$(key).value.trim())throw Error('Complete every numeric field.');return Number($(key).value);}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function resetResult(){for(const key of ['resultX','resultY','resultLabel'])$(key).value='';$('collectedAfter').checked=false;}
function adoptTraining(candidate,trials=[]){
 const next=importCalibrationInvestigation(candidate);
 analyzeCalibrationEvidence(next.source,next.landmarkId,next.observations,next.hypotheses);
 training=next;plan=null;results=[];draft=trials;revision++;$('prospective').checked=false;resetResult();render();
}
function select(nodeId,items){const select=$(nodeId),old=select.value;select.replaceChildren(...items.map(i=>{const o=node('option',i.label);o.value=i.id;return o;}));if(items.some(i=>i.id===old))select.value=old;}
function resultDimensions(){const t=plan?.trials.find(t=>t.id===$('resultTrial').value);$('resultDimensions').textContent=t?`${fmt(t.widthMm)} × ${fmt(t.heightMm)} mm; frozen radius ${fmt(t.uncertaintyMm)} mm.`:'';if(t){$('resultX').max=t.widthMm;$('resultY').max=t.heightMm;}}
function draw(analysis){
 const svg=$('predictionDrawing');svg.replaceChildren();const t=analysis.trials.find(t=>t.id===$('plotTrial').value)||analysis.trials[0];
 if(!t)return;
 const scale=Math.min(420/t.widthMm,215/t.heightMm),w=t.widthMm*scale,h=t.heightMm*scale,x=(520-w)/2,y=(270-h)/2;
 const make=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;svg.append(n);};
 make('rect',{x,y,width:w,height:h,fill:'#162123',stroke:'#48615f'});
 analysis.explanations.forEach((e,i)=>{const p=e.predictions.find(p=>p.trialId===t.id),px=x+p.xMm*scale,py=y+p.yMm*scale;make('circle',{cx:px,cy:py,r:5,fill:colors[i%colors.length]});make('text',{x:px+7,y:py-6,fill:colors[i%colors.length]},String(i+1));});
 if(t.observation){const o=t.observation,px=x+o.xMm*scale,py=y+o.yMm*scale;make('circle',{cx:px,cy:py,r:o.uncertaintyMm*scale,fill:'none',stroke:'#edf0e8','stroke-dasharray':'3 3'});make('path',{d:`M ${px-7} ${py} h 14 M ${px} ${py-7} v 14`,stroke:'#edf0e8','stroke-width':2});}
 $('plotCaption').textContent=`${t.label}: ${fmt(t.widthMm)} × ${fmt(t.heightMm)} mm. Numbered points are frozen predictions; white cross/circle is the separate result and achieved radius. ${t.status}.`;
}
function render(){
 $('sourceTitle').textContent=training?.source.title||'Choose a training investigation';
 $('sourceSummary').textContent=training?`${training.observations.length} retained training observations; ${training.hypotheses.length+1} original/alternative source readings. Source mark: ${training.landmarkId}.`:'No observations or source readings have been invented.';
 $('planning').hidden=Boolean(plan);$('frozenPlan').hidden=!plan;$('planningFields').disabled=!training;
 $('savePlan').disabled=!plan;$('saveStudy').disabled=!plan;$('comparison').hidden=!plan;
 $('planState').dataset.state=plan?'frozen':'unplanned';$('planState').textContent=plan?'FROZEN — source, workpieces, precision and predictions retained.':training?'Draft only. No challenge values accepted before freezing.':'Open a training investigation to begin.';
 $('draftTrials').replaceChildren(...draft.map(t=>{const box=node('div',undefined,'record');box.append(node('strong',t.label),node('p',`${t.widthMm} × ${t.heightMm} mm · radius ${t.uncertaintyMm} mm`));const remove=node('button','Remove');remove.type='button';remove.onclick=()=>act(()=>{revision++;draft=draft.filter(x=>x.id!==t.id);render();});box.append(remove);return box;}));
 $('resultRecords').replaceChildren(...results.map(r=>{const box=node('div',undefined,'record'),t=plan.trials.find(t=>t.id===r.trialId),o=r.observation;box.append(node('strong',o.label),node('p',`${t.label}: (${fmt(o.xMm)}, ${fmt(o.yMm)}) mm · radius ${fmt(o.uncertaintyMm)} mm · ${o.evidenceClass}`));if(o.uncertaintyMm>t.uncertaintyMm)box.append(node('p','Insufficient precision: retained, not used to pass or contradict predictions.','precision-note'));return box;}));
 if(!plan){$('resultFields').disabled=true;$('resultAvailability').textContent='Freeze a plan before entering challenge results.';$('ruleCards').replaceChildren();$('summary').textContent='No frozen predictions yet.';$('summary').dataset.status='unplanned';select('resultTrial',[]);return;}
 $('frozenTitle').textContent=plan.label;$('frozenTrials').replaceChildren(...plan.trials.map(t=>{const box=node('div',undefined,'record');box.append(node('strong',t.label),node('p',`${fmt(t.widthMm)} × ${fmt(t.heightMm)} mm · planned radius ${fmt(t.uncertaintyMm)} mm`));return box;}));
 const remaining=plan.trials.filter(t=>!results.some(r=>r.trialId===t.id));select('resultTrial',remaining);$('resultFields').disabled=!remaining.length;$('resultAvailability').textContent=remaining.length?`${remaining.length} planned workpieces still await a result.`:'Every planned result is retained. Export this study before starting another plan.';resultDimensions();
 const a=analyzeCalibrationChallenge(plan,results);$('summary').dataset.status=a.status;$('summary').textContent=`${a.status.toUpperCase().replaceAll('-',' ')} · ${a.qualifiedCount}/${a.trials.length} qualified; ${a.missingCount} missing; ${a.insufficientPrecisionCount} insufficient precision. Collection order remains user-declared.`;
 $('ruleCards').replaceChildren(...a.rules.map(r=>{const card=node('div',undefined,'rule-card '+r.status);card.append(node('h3',names[r.rule]),node('p',r.status.replaceAll('-',' ')));if(r.requiresSwitching)card.append(node('p','Explaining each result would require switching source readings; no coherent explanation survives.'));return card;}));
 select('plotTrial',plan.trials);draw(a);
 const head=node('tr');for(const label of ['Explanation',...plan.trials.map(t=>t.label),'All challenges'])head.append(node('th',label));$('predictionHead').replaceChildren(head);
 $('predictionRows').replaceChildren(...a.explanations.map((e,i)=>{const tr=node('tr');tr.append(node('td',`${i+1}. ${names[e.rule]} / ${e.hypothesisId}`));for(const r of e.residuals){const td=node('td',`(${fmt(r.predicted.xMm)}, ${fmt(r.predicted.yMm)}) mm`);td.append(node('small',r.compatible===null?r.status:`${r.compatible?'compatible':'contradicted'} · error ${fmt(r.errorMm)} mm`));tr.append(td);}tr.append(node('td',e.status));return tr;}));
}
$('trialForm').onsubmit=e=>{e.preventDefault();act(()=>{
 if(!training||plan)throw Error('Open training before drafting workpieces.');
 const candidate={id:id('trial'),label:$('trialLabel').value,widthMm:number('planWidth'),heightMm:number('planHeight'),uncertaintyMm:number('planRadius')};
 // Validate a prospective candidate without retaining predictions or admitting results.
 freezeChallengePlan(training,{id:'draft-validation',label:$('planLabel').value,prospectiveDeclaration:true,trials:[...draft,candidate]});
 revision++;draft=[...draft,candidate];render();
});};
$('freeze').onclick=()=>act(()=>{const next=freezeChallengePlan(training,{id:id('plan'),label:$('planLabel').value,prospectiveDeclaration:$('prospective').checked,trials:draft});revision++;plan=next;results=[];resetResult();render();$('notice').textContent='Plan frozen. Save it before obtaining the new results.';});
$('resultForm').onsubmit=e=>{e.preventDefault();act(()=>{
 if(!plan)throw Error('Freeze a plan first.');
 const next=createChallengeResult(plan,{trialId:$('resultTrial').value,id:id('result'),label:$('resultLabel').value,evidenceClass:$('resultClass').value,collectedAfterPlan:$('collectedAfter').checked,xMm:number('resultX'),yMm:number('resultY'),uncertaintyMm:number('resultRadius')});
 analyzeCalibrationChallenge(plan,[...results,next]);revision++;results=[...results,next];resetResult();render();
});};
$('resultTrial').onchange=()=>{revision++;resetResult();resultDimensions();};
$('plotTrial').onchange=()=>act(()=>draw(analyzeCalibrationChallenge(plan,results)));
$('newPlan').onclick=()=>act(()=>{revision++;plan=null;results=[];draft=[];$('prospective').checked=false;resetResult();render();$('notice').textContent='New draft using the retained training only; previous results have left this tab.';});
$('savePlan').onclick=()=>act(()=>download(importChallengePlan(plan),'skill-translator-frozen-plan.json'));
$('saveStudy').onclick=()=>act(()=>download(exportChallengeStudy(plan,results),'skill-translator-challenge-study.json'));
async function load(input,kind){const file=input.files[0];if(!file)return;const ticket=++revision;try{
 if(file.size>4*1024*1024)throw Error('Use a JSON file no larger than 4 MB.');
 const text=await file.text();if(ticket!==revision)return;const raw=JSON.parse(text);
 if(kind==='training'){const next=importCalibrationInvestigation(raw);if(ticket!==revision)return;adoptTraining(next);}
 else{const next=raw.schema===CHALLENGE_PLAN_SCHEMA?{plan:importChallengePlan(raw),results:[]}:importChallengeStudy(raw);analyzeCalibrationChallenge(next.plan,next.results);if(ticket!==revision)return;training=next.plan.investigation;plan=importChallengePlan(next.plan);results=next.results;draft=[];revision++;resetResult();render();}
 error('');$('notice').textContent='Opened validated inputs; findings recomputed. Collection timing is not authenticated.';
 }catch(e){if(ticket===revision)error('Import refused: '+e.message);}finally{if(input.files[0]===file)input.value='';}}
$('trainingFile').onchange=e=>load(e.target,'training');$('challengeFile').onchange=e=>load(e.target,'challenge');
document.addEventListener('input',()=>{revision++;});
$('example').onclick=()=>act(()=>{
 const source={title:'Authored prospective geometry challenge',provenance:'Analytic example only; no physical measurement or expert-intent evidence',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'guide',label:'Guide',kind:'edge_offset_mm',edge:'left',sourcePx:{x:20,y:30},toleranceMm:1}]};
 const observation=createObservation(source,{id:'authored-training',landmarkId:'guide',label:'Authored 200 × 160 mm training workpiece',evidenceClass:'authored-example',widthMm:200,heightMm:160,xMm:20,yMm:60,uncertaintyMm:.1});
 const hypothesis=createCalibrationHypothesis(source,'guide',{id:'alternative',label:'Proposed source x = 10 px',basis:'proposed-reading',reading:{...source.source,sourcePx:{x:10,y:30}}});
 adoptTraining(exportCalibrationInvestigation(source,'guide',[observation],[hypothesis]),[{id:'new-sheet',label:'Authored 300 × 240 mm workpiece',widthMm:300,heightMm:240,uncertaintyMm:.1},{id:'later-sheet',label:'Authored 400 × 320 mm workpiece',widthMm:400,heightMm:320,uncertaintyMm:.1}]);
 $('resultClass').value='authored-example';$('notice').textContent='Authored training and two draft workpieces loaded. No challenge outcomes were generated or prefilled.';
});
render();
try{const saved=sessionStorage.getItem('skill-translator.challenge-training');if(saved){const candidate=importCalibrationInvestigation(JSON.parse(saved));adoptTraining(candidate);sessionStorage.removeItem('skill-translator.challenge-training');$('notice').textContent='Received the exploratory training investigation. Choose and freeze new workpieces before entering results.';}}catch(e){error('Training handoff refused: '+e.message);}
