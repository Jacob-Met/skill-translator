import {inspectCueQuestions,inspectCueEffort,importCueQuestionPlan,CUE_QUESTION_PLAN} from '/src/cue-questions.mjs';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function createCueQuestionsView({anchor,getStudy,isLoading,onError,onChange=()=>{}}){
 const host=el('section');host.id='cue-question-planner';
 const intro=el('p','Compare categorical questions over retained demonstrations. Use equal question counts, or explicitly declare which cues can be inspected and their relative effort. No physical action is selected.');
 const enableLabel=el('label','Use declared cue availability and effort '),enable=el('input');enable.type='checkbox';enable.id='cue-effort-enabled';enableLabel.append(enable);
 const controls=el('fieldset');controls.id='cue-effort-controls';controls.hidden=true;
 const inspect=el('button','Compare next questions');inspect.id='inspect-cue-questions';
 const resetButton=el('button','Clear supplied readings');
 const results=el('div');results.id='cue-question-results';host.append(el('h2','Which categorical question distinguishes these examples?'),intro,enableLabel,controls,inspect,resetButton,results);anchor.after(host);
 let readings=[],plan=null;
 const clear=()=>results.replaceChildren();
 const changed=()=>{clear();onChange();};
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
  if(!getStudy()){enable.checked=false;onError('Open a demonstration comparison first.');return;}
  if(enable.checked&&!plan)plan={format:CUE_QUESTION_PLAN,cues:getStudy().cues.map(c=>({cueId:c.id,available:true,effort:1,basis:''}))};
  controls.hidden=!enable.checked;planControls();changed();
 };
 function acceptedPlan(){return enable.checked?importCueQuestionPlan(getStudy(),plan):null;}
 function render(){
  if(isLoading()){onError('Source import is pending; wait or edit to cancel it.');return;}
  try{
   const study=getStudy(),selected=acceptedPlan(),weighted=!!selected,report=weighted?inspectCueEffort(study,readings,selected):inspectCueQuestions(study,readings);clear();
   results.append(el('p',report.boundary),el('p',`State: ${report.status}. ${weighted?'Worst remaining declared effort':'Worst remaining question count'}: ${(weighted?report.worstCaseEffort:report.worstCaseQuestions)??'unresolved'}.`));
   if(weighted)results.append(el('p','Unavailable cues: '+(report.unavailableCueIds.map(id=>study.cues.find(c=>c.id===id).label).join(', ')||'none')));
   results.append(el('p','Compatible original examples: '+(report.compatibleExampleIndexes.map(i=>i+1).join(', ')||'none')));
   results.append(el('p','Retained decision labels: '+(report.retainedLabels.map(v=>v??'unknown').join(', ')||'none')));
   for(const r of readings)results.append(el('p',`${study.cues.find(c=>c.id===r.cueId).label}: supplied category ${r.value}`));
   for(const q of report.questions){
    const section=el('section'),name=study.cues.find(c=>c.id===q.cueId).label;section.dataset.cueId=q.cueId;
    section.append(el('h3',name),el('p',`Worst ${weighted?'declared effort':'question count'} including this one: ${(weighted?q.effort:q.cost)??'unresolved'}${report.bestFirstCueIds.includes(q.cueId)?' — tied minimum within the declared table':''}.`));
    for(const branch of q.outcomes)section.append(el('p',`${branch.kind==='other-category'?'An unrecorded category':`Category ${branch.answer}`}: examples ${branch.exampleIndexes.map(i=>i+1).join(', ')}; remaining ${weighted?'effort':'questions'} ${(weighted?branch.remainingEffort:branch.remainingQuestions)??'unresolved'}.`));
    const label=el('label',`Supply an actually inspected category for ${name}`),input=el('input');input.maxLength=160;label.append(input);
    const apply=el('button','Retain this reading');apply.onclick=()=>{if(isLoading()){onError('Source import is pending.');return;}try{const next=[...readings,{cueId:q.cueId,value:input.value}];inspectCueQuestions(getStudy(),next);readings=next;changed();render();}catch(e){onError(e.message);}};
    section.append(label,apply);results.append(section);
   }
   onError('');
  }catch(e){clear();onError(e.message);}
 }
 inspect.onclick=render;resetButton.onclick=()=>{readings=[];changed();};
 return {suspend:clear,reset(){readings=[];plan=null;enable.checked=false;controls.hidden=true;controls.replaceChildren();clear();},
  readings(){return structuredClone(readings);},plan:acceptedPlan,
  restore(next,nextPlan=null){if(!Array.isArray(next))throw Error('Retain an array of categorical readings');if(next.length)inspectCueQuestions(getStudy(),next);plan=nextPlan?importCueQuestionPlan(getStudy(),nextPlan):null;readings=structuredClone(next);enable.checked=!!plan;controls.hidden=!plan;planControls();clear();}};
}
