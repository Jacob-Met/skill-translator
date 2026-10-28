import {freezeJointChallengePlan,createJointChallengeResult,analyzeJointChallenge,exportJointChallengeStudy,importJointChallengeStudy,MAX_JOINT_CHALLENGE_BYTES} from '/src/joint-challenge.mjs';
const names={fraction:'Proportional',left:'Left clearance',right:'Right clearance',top:'Top clearance',bottom:'Bottom clearance'};
const titles={'awaiting-results':'Frozen — awaiting outcomes','none-compatible':'No shared explanation survives','incomplete':'More outcomes are needed','insufficient-precision':'Reported precision is insufficient','one-joint-explanation':'One offered joint explanation remains','unresolved':'Several offered explanations remain'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const fmt=n=>Number(n.toFixed(5)).toLocaleString('en-US',{maximumFractionDigits:5});
export function mountJointChallenge({root,getInvestigation,restoreInvestigation,onActivity=()=>{}}){
 let plan=null,results=[],epoch=0,serial=0,trialSerial=0;
 const q={},field=(into,key,title,{type='text',value='',options,min,max}={})=>{
  const label=el('label',title),n=el(options?'select':'input');n.id='jc-'+key;q[key]=n;
  if(options)for(const [value,text]of options){const o=el('option',text);o.value=value;n.append(o);}
  else{n.type=type;n.value=value;n.required=true;if(type==='number'){n.step='any';if(min!==undefined)n.min=min;if(max!==undefined)n.max=max;}else n.maxLength=160;}
  label.append(n);into.append(label);return n;
 };
 const button=(into,key,text,fn)=>{const b=el('button',text);b.id='jc-'+key;b.type='button';if(fn)b.onclick=()=>action(fn);into.append(b);q[key]=b;return b;};
 const declaration=(into,key,text)=>{const label=el('label',undefined,'jc-check'),n=el('input');n.type='checkbox';n.id='jc-'+key;n.required=true;label.append(n,el('span',text));into.append(label);q[key]=n;return n;};
 root.classList.add('panel','joint-challenge');root.append(el('p','04 / NEW WORKPIECES','eyebrow'),el('h2','Keep one source reading when the workpiece changes.'),el('p','Freeze predictions for every selected mark before collecting outcomes. Every future workpiece must use the same retained source reading and one fixed rule per mark.'));
 const imports=el('div',undefined,'jc-toolbar'),openLabel=el('label','Open complete joint challenge'),file=el('input');file.type='file';file.accept='.json,application/json';file.id='jc-file';openLabel.append(file);imports.append(openLabel);q.file=file;
 button(imports,'export','Export complete challenge',()=>{if(!plan)throw Error('Freeze or open a plan first.');const text=JSON.stringify(exportJointChallengeStudy(plan,results)),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download='skill-translator-joint-challenge.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});root.append(imports);
 const error=el('p',undefined,'jc-error');error.id='jc-error';error.setAttribute('role','alert');error.hidden=true;const notice=el('p',undefined,'jc-notice');notice.id='jc-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');root.append(error,notice);
 const columns=el('div',undefined,'jc-columns'),planning=el('section',undefined,'jc-pane'),outcomes=el('section',undefined,'jc-pane');columns.append(planning,outcomes);root.append(columns);
 planning.append(el('h3','1. Freeze the future workpieces'),el('p','Use 1–6 distinct dimensions not present anywhere in the training observations. All selected marks need training under at least one shared reading.','small'));
 const planForm=el('form');planForm.id='jc-plan-form';const planFields=el('fieldset');q.planFields=planFields;planForm.append(planFields);planning.append(planForm);
 field(planFields,'plan-label','Challenge name',{value:'Future multi-mark challenge'});
 const drafts=el('div',undefined,'jc-drafts');drafts.id='jc-drafts';planFields.append(drafts);
 button(planFields,'add-trial','Add another workpiece',()=>addTrial());
 declaration(planFields,'prospective','I am declaring these workpieces before seeing their outcomes.');
 const freezeButton=el('button','Freeze predictions','primary');freezeButton.type='submit';freezeButton.id='jc-freeze';q.freeze=freezeButton;planFields.append(freezeButton,el('p','A validated new plan replaces the previous plan and its outcomes. Export first to keep another copy.','small'));
 outcomes.append(el('h3','2. Record each outcome'),el('p','Use the original mark identity and the planned workpiece. A radius above the planned limit stays visible and cannot eliminate an explanation.','small'));
 const resultForm=el('form');resultForm.id='jc-result-form';const resultFields=el('fieldset');q.resultFields=resultFields;resultForm.append(resultFields);outcomes.append(resultForm);
 field(resultFields,'trial','Frozen workpiece',{options:[]});field(resultFields,'mark','Original source mark',{options:[]});
 const sheet=el('p',undefined,'small');sheet.id='jc-sheet';resultFields.append(sheet);
 field(resultFields,'outcome-label','Acquisition or outcome name');
 field(resultFields,'class','Evidence origin',{options:[['reported-measurement','Reported measurement'],['authored-example','Authored example']]});
 const xy=el('div',undefined,'field-grid');resultFields.append(xy);
 field(xy,'x','Observed x · mm',{type:'number',min:0});field(xy,'y','Observed y · mm',{type:'number',min:0});
 field(resultFields,'radius','Reported radius · mm',{type:'number',value:'.1',min:0,max:1000});
 declaration(resultFields,'collected','I report that this outcome was collected after the plan was frozen.');
 const save=el('button','Save outcome for this mark','primary');save.type='submit';save.id='jc-save';resultFields.append(save);
 const stale=el('p',undefined,'jc-stale');stale.id='jc-stale';stale.hidden=true;root.append(stale);
 const summary=el('p',undefined,'jc-summary');summary.id='jc-summary';summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');root.append(summary);
 const count=el('p',undefined,'small');count.id='jc-counts';const switching=el('p',undefined,'jc-stale');switching.id='jc-switching';switching.hidden=true;root.append(count,switching);
 const slots=el('div',undefined,'jc-slots');slots.id='jc-slots';root.append(slots,el('h3','Retained predictions and outcome residuals'));
 const readings=el('div',undefined,'jc-readings');readings.id='jc-readings';root.append(readings,el('p','Finite explanation counts are not probabilities. Acquisition origin and prospective timing are reported declarations, not authenticated measurements. Conclusions apply to the retained source readings and rules; they do not establish expert intent or physical safety.','small boundary'));
 function invalidatePending(){epoch++;}
 function touch(){invalidatePending();onActivity();}
 function action(fn){touch();try{fn();showError('');}catch(e){showError(e.message);}}
 function showError(text){error.textContent=text;error.hidden=!text;}
 function number(input){if(!input.value.trim())throw Error('Complete every numerical field.');const n=Number(input.value);if(!Number.isFinite(n))throw Error('Use finite numerical values.');return n;}
 function nextId(prefix){const taken=new Set([...(plan?.investigation.observations??[]).map(o=>o.id),...results.map(r=>r.observation.id)]);let id;do{id=prefix+'-'+(++serial);}while(taken.has(id));return id;}
 function addTrial(t){
  if(drafts.children.length>=6)throw Error('A plan can contain at most six workpieces.');
  const id=t?.id??'future-'+(++trialSerial);if([...drafts.children].some(n=>n.dataset.trial===id))return addTrial();
  const box=el('div',undefined,'jc-trial-draft');box.dataset.trial=id;box.append(el('h4','Future workpiece '+(drafts.children.length+1)));
  const make=(name,title,value,type,min,max)=>{const label=el('label',title),n=el('input');n.name=name;n.id='jc-draft-'+id+'-'+name;n.type=type;n.value=value;n.required=true;if(type==='number'){n.step='any';n.min=min;n.max=max;}else n.maxLength=160;label.append(n);box.append(label);};
  make('label','Workpiece name',t?.label??'Future workpiece '+(trialSerial||1),'text');
  const source=getInvestigation()?.source.source,w=t?.widthMm??Math.min(10000,(source?.widthMm??100)*3+drafts.children.length*10),h=t?.heightMm??Math.min(10000,(source?.heightMm??80)*3+drafts.children.length*10);
  make('width','Width · mm',w,'number',1,10000);make('height','Height · mm',h,'number',1,10000);make('radius','Planned maximum radius · mm',t?.uncertaintyMm??.1,'number',0,1000);
  const remove=el('button','Remove this workpiece');remove.type='button';remove.onclick=()=>action(()=>{box.remove();q['add-trial'].disabled=false;});box.append(remove);drafts.append(box);q['add-trial'].disabled=drafts.children.length>=6;
 }
 function draftTrials(){return [...drafts.children].map(box=>({id:box.dataset.trial,label:box.querySelector('[name=label]').value,widthMm:number(box.querySelector('[name=width]')),heightMm:number(box.querySelector('[name=height]')),uncertaintyMm:number(box.querySelector('[name=radius]'))}));}
 function options(select,items){const old=select.value;select.replaceChildren(...items.map(({id,label})=>{const o=el('option',label);o.value=id;return o;}));if(items.some(x=>x.id===old))select.value=old;}
 function sheetHint(){const t=plan?.trials.find(t=>t.id===q.trial.value);sheet.textContent=t?fmt(t.widthMm)+' × '+fmt(t.heightMm)+' mm · planned radius at most '+fmt(t.uncertaintyMm)+' mm. Saving replaces an existing outcome in this exact slot.':'Freeze a plan to choose its workpieces.';}
 function setOutcomeDraft(trialId,landmarkId,focus=true){q.trial.value=trialId;q.mark.value=landmarkId;const r=results.find(r=>r.trialId===trialId&&r.observation.landmarkId===landmarkId)?.observation;q['outcome-label'].value=r?.label??'';q.x.value=r?.xMm??'';q.y.value=r?.yMm??'';q.radius.value=r?.uncertaintyMm??plan.trials.find(t=>t.id===trialId).uncertaintyMm;q.class.value=r?.evidenceClass??'reported-measurement';q.collected.checked=false;sheetHint();if(focus)q.x.focus();}
 function render(){
  q.planFields.disabled=!getInvestigation();q.resultFields.disabled=!plan;q.export.disabled=!plan;q.freeze.textContent=plan?'Freeze a replacement plan':'Freeze predictions';
  root.dataset.planId=plan?.id??'';stale.hidden=true;switching.hidden=true;
  if(!plan){summary.dataset.status='no-plan';summary.textContent='No frozen challenge yet.';count.textContent='The current shared-source investigation supplies the training. Open a complete challenge to restore its own training and outcomes.';slots.replaceChildren();readings.replaceChildren();sheetHint();return;}
  const a=analyzeJointChallenge(plan,results),markName=id=>plan.investigation.source.landmarks.find(m=>m.id===id)?.label||id;
  stale.hidden=JSON.stringify(getInvestigation())===JSON.stringify(plan.investigation);
  stale.textContent='Training now differs from this frozen plan. These outcomes still test the retained original investigation. Opening this challenge restores that investigation; it never refits to the edited training.';
  summary.dataset.status=a.status;summary.textContent=titles[a.status];
  count.textContent=plan.label+' · '+a.qualifiedCount+'/'+a.totalCount+' outcomes qualified · '+a.missingCount+' missing · '+a.impreciseCount+' above planned radius · '+a.viableReadingIds.length+' retained source readings · '+a.combinationCount.toLocaleString('en-US')+' finite rule combinations.';
  switching.hidden=!a.requiresSourceSwitching;switching.textContent='Each mark can fit under some source reading, but those readings conflict. No single retained reading explains all selected marks.';
  options(q.trial,plan.trials);options(q.mark,plan.investigation.landmarkIds.map(id=>({id,label:markName(id)+' · '+id})));sheetHint();
  slots.replaceChildren(...a.trials.flatMap(t=>t.slots.map(s=>{
   const card=el('article',undefined,'jc-slot');card.dataset.status=s.status;card.dataset.trial=t.id;card.dataset.mark=s.landmarkId;
   card.append(el('h4',markName(s.landmarkId)+' · '+t.label),el('p',fmt(t.widthMm)+' × '+fmt(t.heightMm)+' mm · planned radius '+fmt(t.uncertaintyMm)+' mm','small'));
   const o=s.observation;card.append(el('p',o?o.label+': ('+fmt(o.xMm)+', '+fmt(o.yMm)+') mm, radius '+fmt(o.uncertaintyMm)+' mm. '+(o.evidenceClass==='authored-example'?'Authored example.':'Reported measurement.'):'No outcome recorded.'));
   card.append(el('p',s.status==='missing'?'Missing':s.status==='qualified'?'Qualified for comparison':'Above planned radius — cannot eliminate','jc-slot-status'));
   const controls=el('div',undefined,'jc-slot-controls'),edit=el('button',o?'Edit this outcome':'Enter this outcome');edit.type='button';edit.onclick=()=>action(()=>setOutcomeDraft(t.id,s.landmarkId));controls.append(edit);
   if(o){const remove=el('button','Remove outcome');remove.type='button';remove.onclick=()=>action(()=>{const candidate=results.filter(r=>r.trialId!==t.id||r.observation.landmarkId!==s.landmarkId);exportJointChallengeStudy(plan,candidate);results=candidate;render();});controls.append(remove);}card.append(controls);return card;
  })));
  readings.replaceChildren(...a.readings.map(h=>{
   const detail=el('details',undefined,'jc-reading');detail.dataset.reading=h.id;detail.dataset.viable=String(h.viable);detail.append(el('summary',h.label+' · '+(h.viable?'retained':'excluded')+' · '+h.combinationCount.toLocaleString('en-US')+' combinations'));
   let populated=false;detail.ontoggle=()=>{if(!detail.open)return;touch();if(populated)return;populated=true;
    for(const m of h.marks){const box=el('section',undefined,'jc-rule-mark');box.append(el('h4',markName(m.landmarkId)));
     for(const c of m.candidates){const card=el('div',undefined,'jc-rule');card.append(el('strong',names[c.rule]+' · '+(c.status==='contradicted'?'eliminated by a qualified outcome':'retained possibility')));
      for(const r of c.residuals){const t=plan.trials.find(t=>t.id===r.trialId),basis=r.status==='missing'?'no outcome':r.status==='insufficient-precision'?'radius above plan; no elimination':(r.compatible?'within reported radius':'outside reported radius'),distance=r.errorMm===null?'':' · distance '+fmt(r.errorMm)+' mm';card.append(el('p',t.label+': ('+fmt(r.predicted.xMm)+', '+fmt(r.predicted.yMm)+') mm'+distance+' · '+basis,'small'));}box.append(card);
     }detail.append(box);
    }
   };return detail;
  }));
 }
 planForm.onsubmit=e=>{e.preventDefault();action(()=>{
  const investigation=getInvestigation();if(!investigation)throw Error('Open and train a shared-source investigation first.');
  const candidate=freezeJointChallengePlan(investigation,{id:nextId('joint-plan'),label:q['plan-label'].value,prospectiveDeclaration:q.prospective.checked,trials:draftTrials()});
  exportJointChallengeStudy(candidate,[]);analyzeJointChallenge(candidate,[]);plan=candidate;results=[];q.prospective.checked=false;q.collected.checked=false;render();notice.textContent='Predictions frozen from the complete current training. Record each new outcome against this retained plan.';
 });};
 resultForm.onsubmit=e=>{e.preventDefault();action(()=>{
  if(!plan)throw Error('Freeze a plan first.');const t=plan.trials.find(t=>t.id===q.trial.value);
  const row=createJointChallengeResult(plan,{trialId:t.id,collectedAfterPlan:q.collected.checked,observation:{id:nextId('outcome'),label:q['outcome-label'].value,landmarkId:q.mark.value,evidenceClass:q.class.value,widthMm:t.widthMm,heightMm:t.heightMm,xMm:number(q.x),yMm:number(q.y),uncertaintyMm:number(q.radius)}});
  const candidate=[...results.filter(r=>r.trialId!==t.id||r.observation.landmarkId!==q.mark.value),row];
  exportJointChallengeStudy(plan,candidate);analyzeJointChallenge(plan,candidate);results=candidate;q.collected.checked=false;render();notice.textContent='Complete proposed outcome collection accepted. The original plan and training remain fixed.';
 });};
 q.trial.onchange=()=>action(()=>setOutcomeDraft(q.trial.value,q.mark.value,false));q.mark.onchange=()=>action(()=>setOutcomeDraft(q.trial.value,q.mark.value,false));
 file.onchange=async()=>{
  const sourceFile=file.files?.[0];if(!sourceFile)return;touch();const own=epoch;let applying=false;
  try{
   if(sourceFile.size>MAX_JOINT_CHALLENGE_BYTES)throw Error('Complete challenge files must be at most4,000,000 UTF-8 bytes.');
   const text=await sourceFile.text();if(own!==epoch)return;
   const candidate=importJointChallengeStudy(text);analyzeJointChallenge(candidate.plan,candidate.results);exportJointChallengeStudy(candidate.plan,candidate.results);if(own!==epoch)return;
   applying=true;restoreInvestigation(candidate.plan.investigation);plan=candidate.plan;results=candidate.results;
   q['plan-label'].value=plan.label;drafts.replaceChildren();for(const t of plan.trials)addTrial(t);q.prospective.checked=false;q.collected.checked=false;render();showError('');
   notice.textContent='Complete challenge opened. Original training, source anchors and all outcomes were validated; predictions and conclusions were recomputed.';
  }catch(e){if(own===epoch||applying)showError('Challenge import refused: '+e.message);}
  finally{if(file.files?.[0]===sourceFile)file.value='';}
 };
 root.addEventListener('input',touch);addTrial();render();
 return {invalidatePending,trainingChanged(){invalidatePending();render();}};
}
