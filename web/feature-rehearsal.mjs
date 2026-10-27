import {reopenFeatureClearance} from '/src/feature-clearance.mjs';
import {JUDGMENT_SCHEMA,importJudgmentStudy,inspectPlacementJudgments} from '/src/rehearsal-judgment.mjs';
import {createFeatureRehearsal,importFeatureRehearsal,reviewFeatureRehearsal,exportFeatureRehearsal,featureRehearsalInput} from '/src/feature-rehearsal.mjs';
const $=id=>document.getElementById(id),el=(tag,value)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;return e;},fmt=n=>n===null?'Unobserved':Number(n.toFixed(3)).toString();
const comparisonKey='skill-translator-feature-rehearsal-comparison/v1',sessionKey='skill-translator-rehearsal-input/v1',returnKey='skill-translator-feature-rehearsal-return/v1';
let comparison=null,accepted=null,acceptedJudgments=null,epoch=0;
function requireMatchingJudgments(review,study){if(study!==null&&JSON.stringify(study.rehearsal)!==JSON.stringify(review.rehearsal))throw Error('Judgments do not match the accepted rehearsal');}
function status(message){const notice=accepted===null?'':acceptedJudgments===null?' No judgment study is attached to this review. “Save complete raw review inputs” excludes judgments.':' Choose “Export complete judgment study” to save the full study. “Save complete raw review inputs” excludes judgments.';$('featureRehearsalStatus').textContent=message+notice;}
function error(message=''){$('featureRehearsalError').textContent=message;}
function installComparison(raw){const next=reopenFeatureClearance(raw).bundle;comparison=next;accepted=null;acceptedJudgments=null;epoch++;$('saveFeatureRehearsalJudgments').disabled=true;$('featureRehearsalResults').hidden=true;$('featureRehearsalDiagramContent').replaceChildren();$('startFeatureRehearsal').disabled=false;status(`Retained source ${comparison.source.title||'annotations'} with ${comparison.workpieces.length} declared sizes. Import the matching raw rehearsal or start a fresh one.`);error();}
function install(raw,judgmentRaw=null){const next=importFeatureRehearsal(raw),nextJudgments=judgmentRaw===null?null:importJudgmentStudy(judgmentRaw);requireMatchingJudgments(next,nextJudgments);comparison=next.comparison;accepted=next;acceptedJudgments=nextJudgments;epoch++;$('startFeatureRehearsal').disabled=false;error();render();}
function renderJudgment(trial){
 const context=$('featureJudgmentContext');context.replaceChildren();
 if(acceptedJudgments===null){context.append(el('p','Prediction history is unavailable in this raw review.'));return;}
 const judgment=inspectPlacementJudgments(acceptedJudgments).find(j=>j.trialIndex===trial.index-1);
 if(!judgment){context.append(el('p','No prediction was recorded for this trial in the attached study.'));return;}
 const prediction={adequate:'Every mark is within tolerance',inadequate:'At least one mark is outside tolerance',uncertain:'I am uncertain'};
 context.append(el('p','Recorded center prediction: '+prediction[judgment.prediction]));
 if(judgment.reason)context.append(el('p','Your reason: '+judgment.reason));
 context.append(el('p','This prediction concerns original mark positions. Feature clearance is assessed separately.'));
 if(!judgment.submitted){context.append(el('p','Placement not committed. Center result and prediction agreement remain withheld.'));return;}
 context.append(el('p',judgment.actualAdequate===true?'Center result: Within all original center tolerances.':judgment.actualAdequate===false?'Center result: Outside original center tolerances.':'Center result: Unavailable.'));
 const agreement=judgment.prediction==='uncertain'?'Uncertainty retained; no agreement score.':judgment.agreement===true?'Your prediction agreed with the center result.':judgment.agreement===false?'Your prediction differed from the center result.':'Prediction agreement is unavailable.';
 context.append(el('p',agreement));
}
function renderFootprints(trial){
 const host=$('featureRehearsalDiagramContent');host.replaceChildren();
 if(trial.assessment===null){host.append(el('p','Commit this trial to view its declared features at the recorded centers.'));return;}
 const practice=trial.assessment.practice,radii=new Map(accepted.comparison.features.map(f=>[f.id,f.radiusMm]));
 const points=practice.results.map((result,index)=>({key:index+1,id:result.id,label:result.label,attempt:result.attempt,radius:radii.get(result.id)})),placed=points.filter(p=>p.attempt!==null);
 host.append(el('p',`Placed features: ${placed.length} of ${points.length}.`));
 if(placed.length===0)host.append(el('p','No placed features are available to draw.'));
 else{
  const left=Math.min(...placed.map(p=>p.attempt.xMm-p.radius)),right=Math.max(...placed.map(p=>p.attempt.xMm+p.radius)),top=Math.min(...placed.map(p=>p.attempt.yMm-p.radius)),bottom=Math.max(...placed.map(p=>p.attempt.yMm+p.radius));
  const span=Math.max(right-left,bottom-top,1),side=span*1.16,centerX=(left+right)/2,centerY=(top+bottom)/2;
  const svgElement=(tag,attributes={},text=null)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [name,value] of Object.entries(attributes))node.setAttribute(name,String(value));if(text!==null)node.textContent=text;return node;};
  const svg=svgElement('svg',{viewBox:[centerX-side/2,centerY-side/2,side,side].join(' '),preserveAspectRatio:'xMidYMid meet',role:'img','aria-labelledby':'featureFootprintsTitle featureFootprintsDescription'});
  svg.append(svgElement('title',{id:'featureFootprintsTitle'},'Declared circular features at committed centers'),svgElement('desc',{id:'featureFootprintsDescription'},'Declared circular footprints at recorded centers, shown at a uniform scale. Numbers identify entries in the following feature key. An asterisk marks a shared center. Dots and numbers are position annotations. The pair table supplies observed and required clearance.'));
  for(const point of placed)svg.append(svgElement('circle',{cx:point.attempt.xMm,cy:point.attempt.yMm,r:point.radius,class:'feature-footprint-circle','data-feature-id':point.id}));
  const centers=new Map();
  for(const point of placed){const key=JSON.stringify([point.attempt.xMm,point.attempt.yMm]);if(!centers.has(key))centers.set(key,[]);centers.get(key).push(point);}
  for(const group of centers.values()){
   const point=group[0];svg.append(svgElement('circle',{cx:point.attempt.xMm,cy:point.attempt.yMm,r:span*.008,class:'feature-footprint-center'}),svgElement('text',{x:point.attempt.xMm+span*.018,y:point.attempt.yMm-span*.018,'font-size':span*.05,class:'feature-footprint-id'},group.length===1?String(point.key):'*'));
  }
  host.append(svg,el('p','Circle outlines show declared feature sizes at recorded centers. Dots and numbers mark positions; match the feature key to the gap results below.'),el('p','The view fits this trial at one scale; apparent sizes can change between trials. Sheet edges are not shown. Small features or nearby labels may be hard to distinguish. Their recorded values remain in the key.'));
  for(const group of centers.values())if(group.length>1)host.append(el('p','* Shared center: '+group.map(p=>p.key+' · '+p.id).join(', ')+'. Coincident footprints may overlap completely; every feature is listed in the key.'));
 }
 const key=el('ol');key.className='feature-footprint-key';
 for(const point of points){
  const name=point.id+(point.label!==point.id?' — '+point.label:''),entry=el('li',point.attempt===null?name+': placement missing; no footprint drawn.':name+`: recorded center (${point.attempt.xMm}, ${point.attempt.yMm}) mm; declared radius ${point.radius} mm.`+(point.radius===0?' Zero radius; only the position marker is visible.':''));
  entry.value=point.key;key.append(entry);
 }
 host.append(key);
}
function render(){$('saveFeatureRehearsalJudgments').disabled=accepted===null||acceptedJudgments===null;const review=reviewFeatureRehearsal(accepted),trial=review.trials[review.selectedTrial-1];$('featureRehearsalResults').hidden=false;status('Review recomputed from original source, complete plan and raw placement/reveal events.');$('featureRehearsalTrial').replaceChildren();for(const t of review.trials){const o=el('option',`${t.index}: ${t.widthMm} × ${t.heightMm} mm · ${t.submitted?'Committed':t.started?'Uncommitted':'Not started'}`);o.value=t.index;$('featureRehearsalTrial').append(o);}$('featureRehearsalTrial').value=review.selectedTrial;
 const center=a=>!a?'Feedback withheld':!a.practice.complete?'Incomplete':a.practice.passed?'Within all original center tolerances':'Outside original center tolerances';
 const feature=a=>!a?'Feedback withheld':!a.complete?'Unobserved pairs remain':a.meetsAll?'All actual gaps meet':'Some actual gaps fail';
 $('featureRehearsalOverview').replaceChildren();for(const t of review.trials){const row=el('tr');for(const v of [`${t.index} · ${t.widthMm} × ${t.heightMm}`,center(t.assessment),feature(t.assessment),t.reveals.length?`${t.reveals.length} target request(s)`:'No target requests in this record'])row.append(el('td',v));$('featureRehearsalOverview').append(row);}
 $('featureRehearsalSummary').textContent=`Trial ${trial.index}: ${center(trial.assessment)}. ${feature(trial.assessment)}.`;$('featureRehearsalAssistance').textContent=trial.reveals.length?`${trial.reveals.length} target request(s) retained before commitment. Their prior placements are raw observations, not a new score.`:'No target request in this record; this does not establish absence of outside assistance.';
 renderJudgment(trial);
 renderFootprints(trial);
 $('featureRehearsalBeforeHelp').replaceChildren();for(const reveal of trial.reveals){const details=el('details'),summary=el('summary',`Before target request at action ${reveal.actionIndex}: ${reveal.priorAttempts.length} placements`);details.append(summary,el('pre',JSON.stringify(reveal.priorAttempts,null,2)));$('featureRehearsalBeforeHelp').append(details);}
 $('featureRehearsalPairs').replaceChildren();if(trial.assessment)for(const p of trial.assessment.pairs){const row=el('tr');for(const v of [`${p.from} / ${p.to}`,fmt(p.targetGapMm),fmt(p.minimumToleranceGapMm),fmt(p.observedGapMm),fmt(p.requiredGapMm),p.status==='incomplete'?'Unobserved: '+p.missing.join(', '):p.status==='meets'?'Meets declared gap':'Fails declared gap'])row.append(el('td',v));$('featureRehearsalPairs').append(row);}
}
async function read(input,limit,receive){const file=input.files[0],token=++epoch;try{if(!file)return;if(file.size>limit)throw Error('Selected JSON exceeds the displayed limit');const raw=JSON.parse(await file.text());if(token!==epoch)return;receive(raw);}catch(e){if(token===epoch)error('Input refused; accepted work retained. '+e.message);}finally{if(input.files[0]===file)input.value='';}}
$('rehearsalComparisonFile').addEventListener('change',e=>read(e.target,512*1024,installComparison));
$('featureRehearsalFile').addEventListener('change',e=>read(e.target,1024*1024,raw=>{if(!comparison)throw Error('Load matching feature declarations first');install(createFeatureRehearsal(comparison,raw,1));}));
$('featureRehearsalReviewFile').addEventListener('change',e=>read(e.target,2*1024*1024,install));
$('featureRehearsalTrial').addEventListener('change',()=>{try{const next=createFeatureRehearsal(accepted.comparison,accepted.rehearsal,Number($('featureRehearsalTrial').value));requireMatchingJudgments(next,acceptedJudgments);accepted=next;epoch++;error();render();}catch(e){error(e.message);}});
$('startFeatureRehearsal').addEventListener('click',()=>{try{const session=featureRehearsalInput(comparison),comparisonText=JSON.stringify(comparison),sessionText=JSON.stringify(session);sessionStorage.setItem(comparisonKey,comparisonText);sessionStorage.setItem(sessionKey,sessionText);sessionStorage.removeItem(returnKey);epoch++;location.assign('/rehearsal');}catch(e){error(e.message);}});
$('resumeFeatureRehearsal').addEventListener('click',()=>{try{const next=importFeatureRehearsal(accepted),study=acceptedJudgments===null?null:importJudgmentStudy(acceptedJudgments);requireMatchingJudgments(next,study);const comparisonText=JSON.stringify(next.comparison),sessionText=JSON.stringify(study===null?next.rehearsal:study);sessionStorage.setItem(comparisonKey,comparisonText);sessionStorage.setItem(sessionKey,sessionText);sessionStorage.removeItem(returnKey);epoch++;location.assign('/rehearsal');}catch(e){error(e.message);}});
$('saveFeatureRehearsal').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([exportFeatureRehearsal(accepted)],{type:'application/json'})),a=el('a');a.href=url;a.download='feature-transfer-rehearsal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('saveFeatureRehearsalJudgments').addEventListener('click',()=>{let url;try{if(accepted===null||acceptedJudgments===null)throw Error('No judgment study is attached to this review');const review=importFeatureRehearsal(accepted),study=importJudgmentStudy(acceptedJudgments);requireMatchingJudgments(review,study);const content=JSON.stringify(study);url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const link=el('a');link.href=url;link.download='skill-placement-judgments.json';link.click();status('Complete judgment study download requested.');}catch(e){error(e.message);}finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}});
try{const stored=sessionStorage.getItem(comparisonKey);if(stored)installComparison(JSON.parse(stored));const returned=sessionStorage.getItem(returnKey);if(returned){if(!comparison)throw Error('Load matching feature declarations for the returned rehearsal');const raw=JSON.parse(returned),study=raw?.schema===JUDGMENT_SCHEMA?importJudgmentStudy(raw):null;install(createFeatureRehearsal(comparison,study===null?raw:study.rehearsal,1),study);try{sessionStorage.removeItem(returnKey);}catch(e){error('Review received; the stored handoff could not be cleared. '+e.message);}}}catch(e){error('Handoff refused; accepted work retained. '+e.message);}
