import {inspectCueQuestions} from '/src/cue-questions.mjs';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function createCueQuestionsView({anchor,getStudy,isLoading,onError}){
 const host=el('section'),heading=el('h2','Which categorical question distinguishes these examples?');host.id='cue-question-planner';
 const intro=el('p','Compare the worst remaining number of categorical questions over the retained declarations. Each question counts equally. This does not measure effort or tell you which physical action to perform.');
 const inspect=el('button','Compare next questions');inspect.id='inspect-cue-questions';
 const resetButton=el('button','Clear supplied readings');
 const results=el('div');results.id='cue-question-results';host.append(heading,intro,inspect,resetButton,results);anchor.after(host);
 let readings=[];
 function clear(){results.replaceChildren();}
 function render(){
  if(isLoading()){onError('Source import is pending; wait or edit to cancel it.');return;}
  try{
   const study=getStudy(),report=inspectCueQuestions(study,readings);clear();
   results.append(el('p',report.boundary),el('p',`State: ${report.status}. Worst remaining question count: ${report.worstCaseQuestions??'unresolved'}.`));
   results.append(el('p','Compatible original examples: '+(report.compatibleExampleIndexes.map(i=>i+1).join(', ')||'none')));
   results.append(el('p','Retained decision labels: '+(report.retainedLabels.map(v=>v??'unknown').join(', ')||'none')));
   for(const r of readings)results.append(el('p',`${study.cues.find(c=>c.id===r.cueId).label}: supplied category ${r.value}`));
   for(const q of report.questions){
    const section=el('section'),name=study.cues.find(c=>c.id===q.cueId).label;
    section.append(el('h3',name),el('p',`Worst question count including this one: ${q.cost??'unresolved'}${report.bestFirstCueIds.includes(q.cueId)?' — tied minimum within the declared table':''}.`));
    for(const branch of q.outcomes)section.append(el('p',`${branch.kind==='other-category'?'An unrecorded category':`Category ${branch.answer}`}: examples ${branch.exampleIndexes.map(i=>i+1).join(', ')}; remaining questions ${branch.remainingQuestions??'unresolved'}.`));
    const label=el('label',`Supply an actually inspected category for ${name}`),input=el('input');input.maxLength=160;label.append(input);
    const apply=el('button','Retain this reading');apply.onclick=()=>{if(isLoading()){onError('Source import is pending.');return;}try{const next=[...readings,{cueId:q.cueId,value:input.value}];inspectCueQuestions(getStudy(),next);readings=next;render();}catch(e){onError(e.message);}};
    section.append(label,apply);results.append(section);
   }
   onError('');
  }catch(e){clear();onError(e.message);}
 }
 inspect.onclick=render;resetButton.onclick=()=>{readings=[];clear();};
 return {reset(){readings=[];clear();},readings(){return structuredClone(readings);},restore(next){if(!Array.isArray(next))throw Error('Retain an array of categorical readings');if(next.length)inspectCueQuestions(getStudy(),next);readings=structuredClone(next);clear();}};
}
