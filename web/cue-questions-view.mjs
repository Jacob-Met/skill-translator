import {createCueBudgetPlan,importCueBudgetPlan,recordCueBudgetReading,inspectCueBudget,inspectCueEffortBudget,CUE_BUDGET_FORMAT,CUE_EFFORT_BUDGET_FORMAT} from '/src/cue-budget.mjs';
import {inspectCueReadingSupport} from '/src/cue-reading-support.mjs';
import {inspectCueQuestions,inspectCueEffort,importCueQuestionPlan,CUE_QUESTION_PLAN} from '/src/cue-questions.mjs';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function createCueQuestionsView({anchor,getStudy,isLoading,onError,onChange=()=>{}}){
 const host=el('section');host.id='cue-question-planner';
 const intro=el('p','Compare categorical questions over retained demonstrations. Use equal question counts, or explicitly declare which cues can be inspected and their relative effort. No physical action is selected.');
 const enableLabel=el('label','Use declared cue availability and effort '),enable=el('input');enable.type='checkbox';enable.id='cue-effort-enabled';enableLabel.append(enable);
 const controls=el('fieldset');controls.id='cue-effort-controls';controls.hidden=true;
 const budgetMode=el('input');budgetMode.type='checkbox';budgetMode.id='cue-budget-mode';const budgetToggle=el('label','Compare within a unit-count question budget ');budgetToggle.append(budgetMode);const budgetInput=el('input');budgetInput.id='cue-budget';budgetInput.type='number';budgetInput.min='0';budgetInput.max='8';budgetInput.step='1';budgetInput.value='0';const budgetLabel=el('label','Remaining categorical questions (0–8) ');budgetLabel.append(budgetInput);budgetLabel.hidden=true;
 const effortBudget=el('input');effortBudget.type='checkbox';effortBudget.id='cue-effort-budget';const effortBudgetLabel=el('label','Limit acquisition by remaining declared effort ');effortBudgetLabel.append(effortBudget);effortBudgetLabel.hidden=true;
 const budgetNote=el('p','Unit-count budget mode counts every retained question equally and considers all unread cues. Declared effort and availability are a separate mode and cannot be applied at the same time.');
 const budgetFile=el('input');budgetFile.type='file';budgetFile.accept='.json';budgetFile.id='cue-budget-plan-file';const budgetFileLabel=el('label','Open a source-only budget plan against these originals ');budgetFileLabel.append(budgetFile);const budgetNotice=el('p');budgetNotice.setAttribute('role','status');const budgetSave=el('button','Save source-only budget plan');budgetSave.id='save-cue-budget-plan';budgetSave.disabled=true;
 const inspect=el('button','Compare next questions');inspect.id='inspect-cue-questions';
 const resetButton=el('button','Clear supplied readings');
 const results=el('div');results.id='cue-question-results';host.append(el('h2','Which categorical question distinguishes these examples?'),intro,enableLabel,controls,effortBudgetLabel,budgetToggle,budgetLabel,budgetNote,budgetFileLabel,budgetSave,budgetNotice,inspect,resetButton,results);anchor.after(host);
 let readings=[],plan=null,readVersion=0,planLoading=false;
 const clear=()=>results.replaceChildren();
 const changed=()=>{readVersion++;if(planLoading)budgetNotice.textContent='Pending budget plan retired by newer input.';planLoading=false;clear();onChange();};
 const suspend=()=>{readVersion++;if(planLoading)budgetNotice.textContent='Pending budget plan retired by newer source work.';planLoading=false;clear();};
 const requireReady=()=>{if(planLoading)throw Error('Budget plan import is pending');};
 budgetMode.onchange=()=>{if(budgetMode.checked&&enable.checked){budgetMode.checked=false;onError('Turn off declared effort and availability before choosing the separate unit-count budget model.');return;}budgetControls();changed();};budgetInput.oninput=changed;
 function budgetControls(){const weighted=effortBudget.checked;budgetInput.max=weighted?'8000':'8';budgetLabel.firstChild.textContent=weighted?'Remaining declared effort (0–8000) ':'Remaining categorical questions (0–8) ';budgetLabel.hidden=!(budgetMode.checked||weighted);budgetSave.disabled=budgetLabel.hidden;effortBudgetLabel.hidden=!enable.checked;}
 effortBudget.onchange=()=>{if(effortBudget.checked&&!enable.checked){effortBudget.checked=false;onError('Enable declared availability and effort first.');return;}budgetControls();changed();};
 function acceptedBudgetPlan(){if(!budgetMode.checked&&!effortBudget.checked)return null;if(!budgetInput.value.trim())throw Error('Declare a remaining question budget');return createCueBudgetPlan(getStudy(),readings,Number(budgetInput.value),effortBudget.checked?acceptedPlan():null);}
 function retainReading(reading){const current=acceptedBudgetPlan();if(current){const next=recordCueBudgetReading(current,reading);readings=next.readings;budgetInput.value=next.budget;}else{const next=[...readings,reading];inspectCueQuestions(getStudy(),next);readings=next;}changed();render();}
 budgetFile.onchange=async()=>{const file=budgetFile.files[0];if(!file)return;budgetFile.value='';if(!getStudy()){onError('Open the complete original comparison first.');return;}if(isLoading()){onError('Source import is pending.');return;}changed();planLoading=true;const version=readVersion;budgetNotice.textContent='Budget plan import pending; accepted evidence remains retained.';try{if(file.size>48*1024*1024)throw Error('Keep the budget plan within 48 MB');const text=await file.text();if(version!==readVersion)return;const raw=JSON.parse(text),incoming=importCueBudgetPlan(raw.input??raw,getStudy());if(enable.checked&&JSON.stringify(incoming.questionPlan??null)!==JSON.stringify(acceptedPlan()))throw Error('The budget plan differs from the active declared effort or availability; preserve the matching profile or explicitly leave that mode first');if(version!==readVersion)return;readings=incoming.readings;budgetInput.value=incoming.budget;plan=incoming.questionPlan??null;enable.checked=!!plan;controls.hidden=!plan;effortBudget.checked=!!plan;budgetMode.checked=!plan;planControls();budgetControls();changed();budgetNotice.textContent='Budget plan matches the original cue study. Compare questions to recompute its findings.';onError('');}catch(e){if(version===readVersion){planLoading=false;budgetNotice.textContent='Budget plan refused; accepted evidence retained.';onError(e.message);}}};
 budgetSave.onclick=()=>{try{requireReady();if(isLoading())throw Error('Source import is pending');const accepted=acceptedBudgetPlan();if(!accepted)throw Error('Choose a budget mode first');const blob=new Blob([JSON.stringify(accepted)],{type:'application/json'});if(blob.size>48*1024*1024)throw Error('Budget plan exceeds 48 MB');const url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download='cue-budget-plan.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);onError('');}catch(e){onError(e.message);}};
 function planControls(){
  controls.replaceChildren(el('legend','Declared conditions for remaining questions'));
  controls.append(el('p','Use one consistent relative effort unit. Costs add; unavailable cues are excluded. These are your assumptions, not inferred learner limitations.'));
  if(!plan)return;
  for(const cue of plan.cues){
   const row=el('section'),name=getStudy().cues.find(c=>c.id===cue.cueId).label;
   row.dataset.cueId=cue.cueId;row.append(el('h3',name));
   const available=el('input');available.type='checkbox';available.checked=cue.available;available.dataset.field='available';
   const a=el('label','Available to inspect ');a.append(available);available.onchange=()=>{cue.available=available.checked;changed();};
   const effort=el('input');effort.type='number';effort.min='1';effort.max='1000';effort.step='1';effort.value=cue.effort;effort.dataset.field='effort';
   const e=el('label','Relative effort (integer 1–1000) ');e.append(effort);effort.oninput=()=>{cue.effort=Number(effort.value);changed();};
   const basis=el('input');basis.type='text';basis.maxLength=1000;basis.value=cue.basis;basis.dataset.field='basis';
   const b=el('label','Basis for availability and effort ');b.append(basis);basis.oninput=()=>{cue.basis=basis.value;changed();};row.append(a,e,b);controls.append(row);
  }
 }
 enable.onchange=()=>{
  if(enable.checked&&budgetMode.checked){enable.checked=false;onError('Turn off the unit-count question budget before choosing declared effort and availability.');return;}
  if(!getStudy()){enable.checked=false;onError('Open a demonstration comparison first.');return;}
  if(enable.checked&&!plan)plan={format:CUE_QUESTION_PLAN,cues:getStudy().cues.map(c=>({cueId:c.id,available:true,effort:1,basis:''}))};
  if(!enable.checked)effortBudget.checked=false;controls.hidden=!enable.checked;planControls();budgetControls();changed();
 };
 function acceptedPlan(){return enable.checked?importCueQuestionPlan(getStudy(),plan):null;}
 function render(){
  if(isLoading()||planLoading){onError('Source or budget-plan import is pending; wait or edit to cancel it.');return;}
  try{
   const study=getStudy(),selected=acceptedPlan(),budget=acceptedBudgetPlan(),weighted=!!selected,report=budget?(weighted?inspectCueEffortBudget(study,readings,budget.budget,selected):inspectCueBudget(study,readings,budget.budget)):weighted?inspectCueEffort(study,readings,selected):inspectCueQuestions(study,readings);clear();
   if(budget)results.append(el('p',report.boundary),el('p',`State: ${report.status}. Worst remaining retained labels within budget: ${report.worstRemainingLabels??'unresolved'}. Maximum ${weighted?'declared effort':'questions'} used for this guarantee: ${weighted?report.worstEffort:report.worstQuestionsUsed}.`),el('p',`Remaining ${weighted?'declared effort':'question'} budget: ${budget.budget}. Complete ${weighted?'declared-effort':'equal-count'} distinction requires ${(weighted?report.completePlanEffort:report.completePlanQuestions)??'an unresolved amount of'} ${weighted?'effort':'questions'}.${(weighted?report.worstEffort:report.worstQuestionsUsed)===0?' Stopping now matches the selected bound; no improving first question is identified.':''}`));
   if(budget)results.append(el('p',`You may stop without another question: ${report.retainedLabels.length?report.retainedLabels.map(v=>v??'unknown').join(', '):'no compatible retained label'} remains in the current reference account. The budget is a maximum, not a required number of questions.`));
   else results.append(el('p',report.boundary),el('p',`State: ${report.status}. ${weighted?'Worst remaining declared effort':'Worst remaining question count'}: ${(weighted?report.worstCaseEffort:report.worstCaseQuestions)??'unresolved'}.`));
   if(weighted)results.append(el('p','Unavailable cues: '+(report.unavailableCueIds.map(id=>study.cues.find(c=>c.id===id).label).join(', ')||'none')));
   results.append(el('p','Compatible original examples: '+(report.compatibleExampleIndexes.map(i=>i+1).join(', ')||'none')));
   results.append(el('p','Retained decision labels: '+(report.retainedLabels.map(v=>v??'unknown').join(', ')||'none')));
   for(const r of readings)results.append(el('p',`${study.cues.find(c=>c.id===r.cueId).label}: supplied category ${r.value}`));
   for(const q of report.questions){
    const section=el('section'),name=study.cues.find(c=>c.id===q.cueId).label;section.dataset.cueId=q.cueId;
    if(budget)section.append(el('h3',name),el('p',`Worst remaining retained labels after this question: ${q.worstRemainingLabels}. Maximum ${weighted?'declared effort':'questions'} used: ${weighted?q.worstEffort:q.worstQuestionsUsed}. This observation costs ${weighted?selected.cues.find(c=>c.cueId===q.cueId).effort:1} ${weighted?'declared effort':'question'}.${report.bestFirstCueIds.includes(q.cueId)?' Tied selected first question within the declared model.':''}`));
    else section.append(el('h3',name),el('p',`Worst ${weighted?'declared effort':'question count'} including this one: ${(weighted?q.effort:q.cost)??'unresolved'}${report.bestFirstCueIds.includes(q.cueId)?' — tied minimum within the declared table':''}.`));
    for(const branch of q.outcomes)section.append(el('p',`${branch.kind==='other-category'?'An unrecorded category':`Category ${branch.answer}`}: examples ${branch.exampleIndexes.map(i=>i+1).join(', ')}; ${budget?`retained-label bound ${branch.guaranteedLabelBound}; further ${weighted?'effort':'questions'} used ${weighted?branch.remainingEffort:branch.remainingQuestionsUsed}; next cues ${branch.nextCueIds.join(', ')||'none for this bound'}`:`remaining ${weighted?'effort':'questions'} ${(weighted?branch.remainingEffort:branch.remainingQuestions)??'unresolved'}`}.`));
    const label=el('label',`Supply an actually inspected category for ${name}`),input=el('input');input.maxLength=160;label.append(input);
    const apply=el('button','Retain this reading');apply.onclick=()=>{if(isLoading()){onError('Source import is pending.');return;}try{retainReading({cueId:q.cueId,value:input.value});}catch(e){onError(e.message);}};
    section.append(label,apply);results.append(section);
   }
   const support=inspectCueReadingSupport(study,readings);
   if(support.minimalUnsupportedGroups.length){
    const explanation=el('section');explanation.id='cue-reading-support';
    explanation.append(el('h3','Why these readings have no joint retained example'),el('p',support.boundary),el('p',`${support.minimalUnsupportedGroups.length} inclusion-minimal unsupported groups. Every supplied reading remains retained.`));
    for(const group of support.minimalUnsupportedGroups){
     const detail=el('details');detail.open=support.minimalUnsupportedGroups.length===1;
     detail.append(el('summary',group.cueIds.map(id=>study.cues.find(c=>c.id===id).label).join(' + ')));
     for(const row of group.exampleWitnesses)detail.append(el('p',`Original example ${row.index+1} is excluded by: ${row.exclusions.map(e=>`${study.cues.find(c=>c.id===e.cueId).label} — supplied “${e.suppliedValue}”, retained “${e.retainedValue}”`).join('; ')}.${row.unknownCueIds.length?' Unknown source categories do not exclude it: '+row.unknownCueIds.join(', ')+'.':''}`));
     for(const witness of group.removalWitnesses)detail.append(el('p',`Within this group, omitting ${study.cues.find(c=>c.id===witness.cueId).label} leaves compatible original examples ${witness.compatibleExampleIndexes.map(i=>i+1).join(', ')}. This is not a recommendation to discard the reading.`));
     explanation.append(detail);
    }
    results.append(explanation);
   }
   const unused=study.cues.filter(c=>!readings.some(r=>r.cueId===c.id));const affordableUnused=budget&&weighted?unused.filter(c=>{const d=selected.cues.find(d=>d.cueId===c.id);return d.available&&d.effort<=budget.budget;}):unused;
   if(!report.questions.length&&affordableUnused.length&&(!budget||budget.budget>0)){
    const extra=el('section');extra.id='cue-extra-reading';extra.append(el('h3','Retain another already inspected category'),el('p','You can challenge the remaining reference support with another category you have actually inspected. This records evidence; it does not recommend an unavailable observation or select an action.'+(budget?weighted?' Retaining it uses that cue’s declared effort.':' Retaining it uses one remaining question.':'')));
    const choose=el('select');choose.id='cue-extra-cue';for(const cue of affordableUnused){const option=el('option',cue.label);option.value=cue.id;choose.append(option);}const cueLabel=el('label','Declared cue ');cueLabel.append(choose);
    const input=el('input');input.id='cue-extra-value';input.maxLength=160;const valueLabel=el('label','Actually inspected category ');valueLabel.append(input);
    const retain=el('button','Retain additional reading');retain.id='cue-extra-retain';retain.onclick=()=>{if(isLoading()){onError('Source import is pending.');return;}try{retainReading({cueId:choose.value,value:input.value});}catch(e){onError(e.message);}};
    extra.append(cueLabel,valueLabel,retain);results.append(extra);
   }
   if(budget&&unused.length&&(budget.budget===0||!affordableUnused.length))results.append(el('p','No affordable available cue remains under this budget. Explicitly revise the declaration or leave budget mode before retaining another inspected category.'));
   onError('');
  }catch(e){clear();onError(e.message);}
 }
 inspect.onclick=render;resetButton.onclick=()=>{readings=[];changed();};
 return {suspend,reset(){suspend();readings=[];plan=null;enable.checked=false;controls.hidden=true;budgetMode.checked=false;effortBudget.checked=false;effortBudgetLabel.hidden=true;budgetInput.value='0';budgetLabel.hidden=true;budgetSave.disabled=true;budgetNotice.textContent='';controls.replaceChildren();budgetControls();clear();},
  readings(){requireReady();return structuredClone(readings);},plan(){requireReady();return acceptedPlan();},budgetPlan(){requireReady();return acceptedBudgetPlan();},
  restore(next,nextPlan=null,nextBudget=null){suspend();if(!Array.isArray(next))throw Error('Retain an array of categorical readings');if(next.length)inspectCueQuestions(getStudy(),next);const nextEffort=nextPlan?importCueQuestionPlan(getStudy(),nextPlan):null,nextReadings=structuredClone(next),admittedBudget=nextBudget?importCueBudgetPlan(nextBudget,getStudy()):null;if(admittedBudget&&JSON.stringify(admittedBudget.readings)!==JSON.stringify(nextReadings))throw Error('Budget readings differ from retained readings');if(admittedBudget&&nextEffort)throw Error('The budget plan is the sole authority for its effort declaration');plan=admittedBudget?.questionPlan??nextEffort;readings=nextReadings;budgetMode.checked=!!admittedBudget&&!plan;effortBudget.checked=!!admittedBudget&&!!plan;budgetInput.value=admittedBudget?.budget??0;budgetLabel.hidden=!admittedBudget;budgetSave.disabled=!admittedBudget;budgetNotice.textContent='';enable.checked=!!plan;controls.hidden=!plan;planControls();budgetControls();clear();}};
}
