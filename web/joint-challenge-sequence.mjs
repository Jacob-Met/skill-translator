import {
  startJointChallengeSequence, freezeNextJointChallengeRound, activeJointChallengeSequenceRequest,
  recordJointChallengeSequenceResult, analyzeJointChallengeSequence, importJointChallengeSequence,
  analyzeJointChallengeSequenceConflicts,
  serializeJointChallengeSequence, jointChallengeSequenceContextMatches, MAX_JOINT_CHALLENGE_SEQUENCE_BYTES
} from '/src/joint-challenge-sequence.mjs';

const names = {fraction:'Proportional', left:'Left clearance', right:'Right clearance', top:'Top clearance', bottom:'Bottom clearance'};
const titles = {'awaiting-results':'Awaiting reported outcomes', 'none-compatible':'No original joint explanation remains', incomplete:'Some outcomes are still missing', 'insufficient-precision':'Some reported radii exceed the plan', 'one-joint-explanation':'One original joint explanation remains', unresolved:'Several original joint explanations remain'};
const el = (tag, text, cls) => { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; if(cls)node.className=cls; return node; };
const count = value => value.toLocaleString('en-US');
const fmt = value => String(value);

export function mountJointChallengeSequence({root, getInitial, getInvestigation, onActivity=()=>{}}) {
  let sequence=null, activeRequest=null, epoch=0, serial=0;
  const q={},populateDetails=new WeakMap();
  root.classList.add('jcs-continuation'); root.id='jointChallengeSequence';
  root.append(el('p','05 / CONTINUE THE INQUIRY','eyebrow'),el('h3','Carry the actual outcomes into the next workpiece.'),el('p','Retain the initial challenge, then freeze one later workpiece at a time. Predictions use the original explanations still compatible with the outcomes already reported. Original training stays fixed.'));
  const toolbar=el('div',undefined,'jc-toolbar');
  function button(parent,id,text,fn) { const b=el('button',text); b.type='button'; b.id='jcs-'+id; b.onclick=()=>action(fn); parent.append(b); q[id]=b; return b; }
  button(toolbar,'start','Retain the current challenge as the initial course',()=>{
    const initial=getInitial(); if(!initial)throw Error('Freeze or open a joint challenge above first.');
    const candidate=startJointChallengeSequence(initial); analyzeJointChallengeSequenceConflicts(candidate);
    sequence=candidate; resetDrafts(); render(); notice.textContent='Initial source, training, workpieces and reported outcomes retained. Choose the next workpiece below.';
  });
  button(toolbar,'export','Export complete sequence',()=>{
    if(!sequence)throw Error('Retain or open a sequence first.');
    const text=serializeJointChallengeSequence(sequence),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),anchor=el('a');
    anchor.href=url; anchor.download='skill-translator-joint-sequence.json'; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const fileLabel=el('label','Open complete sequence'),file=el('input'); file.type='file'; file.accept='.json,application/json'; file.id='jcs-file'; fileLabel.append(file); toolbar.append(fileLabel); root.append(toolbar,el('p','Starting a replacement sequence uses the current challenge above. Export the retained sequence first to keep another copy.','small'));
  const error=el('p',undefined,'jc-error'); error.id='jcs-error'; error.hidden=true; error.setAttribute('role','alert');
  const notice=el('p',undefined,'jc-notice'); notice.id='jcs-notice'; notice.setAttribute('role','status'); notice.setAttribute('aria-live','polite');
  const context=el('p',undefined,'jc-stale'); context.id='jcs-context'; context.hidden=true;
  const summary=el('p',undefined,'jc-summary'); summary.id='jcs-summary'; summary.setAttribute('role','status'); summary.setAttribute('aria-live','polite');
  const counts=el('p',undefined,'small'); counts.id='jcs-counts'; root.append(error,notice,context,summary,counts);
  const conflicts=el('section',undefined,'jc-conflicts');conflicts.id='jcs-conflicts';root.append(conflicts);
  const columns=el('div',undefined,'jc-columns'),planning=el('section',undefined,'jc-pane'),outcomes=el('section',undefined,'jc-pane'); columns.append(planning,outcomes); root.append(columns);
  function field(parent,id,title,{value='',type='text',options,min,max}={}) {
    const label=el('label',title),input=el(options?'select':'input'); input.id='jcs-'+id; q[id]=input;
    if(options)for(const [value,text]of options){const option=el('option',text);option.value=value;input.append(option);}
    else { input.type=type; input.value=value; input.required=true; if(type==='number'){input.step='any';if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;}else input.maxLength=160; }
    label.append(input);parent.append(label);return input;
  }
  function declaration(parent,id,text) {
    const label=el('label',undefined,'jc-check'),input=el('input');input.type='checkbox';input.id='jcs-'+id;input.required=true;q[id]=input;label.append(input,el('span',text));parent.append(label);
  }
  planning.append(el('h4','1. Freeze one later workpiece'),el('p','Use distinct dimensions absent from every original training and planned workpiece. At most six workpieces can belong to the complete sequence.','small'));
  const planForm=el('form'),planFields=el('fieldset');planForm.id='jcs-plan-form';planForm.append(planFields);planning.append(planForm);q.planFields=planFields;
  field(planFields,'label','Later workpiece name',{value:'Next workpiece'});
  const dimensions=el('div',undefined,'field-grid');planFields.append(dimensions);
  field(dimensions,'width','Width · mm',{value:'300',type:'number',min:1,max:10000});field(dimensions,'height','Height · mm',{value:'240',type:'number',min:1,max:10000});
  field(planFields,'radius','Planned maximum radius · mm',{value:'.1',type:'number',min:0,max:1000});
  declaration(planFields,'prospective','I am declaring this workpiece before seeing its outcomes.');
  declaration(planFields,'seal','Seal the currently reported prior evidence. Missing or imprecise outcomes stay visible; I cannot silently change them in a later round.');
  const freezeButton=el('button','Freeze the next workpiece','primary');freezeButton.id='jcs-freeze';freezeButton.type='submit';planFields.append(freezeButton);
  const budget=el('p',undefined,'small');budget.id='jcs-budget';planning.append(budget);
  outcomes.append(el('h4','2. Receive the current round'),el('p','Only the latest round can receive or correct an outcome. Its request and complete prior-source prefix remain fixed.','small'));
  const resultForm=el('form'),resultFields=el('fieldset');resultForm.id='jcs-result-form';resultForm.append(resultFields);outcomes.append(resultForm);q.resultFields=resultFields;
  const requestText=el('p',undefined,'small');requestText.id='jcs-request';resultFields.append(requestText);
  field(resultFields,'mark','Original source mark',{options:[]});field(resultFields,'outcome-label','Acquisition or outcome name');
  field(resultFields,'class','Evidence origin',{options:[['reported-measurement','Reported measurement'],['authored-example','Authored example']]});
  const coordinates=el('div',undefined,'field-grid');resultFields.append(coordinates);
  field(coordinates,'x','Observed x · mm',{type:'number',min:0});field(coordinates,'y','Observed y · mm',{type:'number',min:0});
  field(resultFields,'actual-radius','Reported radius · mm',{value:'.1',type:'number',min:0,max:1000});
  declaration(resultFields,'collected','I report collecting this outcome after this exact round was frozen.');
  const receive=el('button','Save this current-round outcome','primary');receive.id='jcs-save';receive.type='submit';resultFields.append(receive,el('p','Saving replaces the current round’s existing outcome for this exact mark. Export first to keep an earlier account.','small'));
  const history=el('div',undefined,'jcs-history');history.id='jcs-history';root.append(el('h4','Retained course and frozen predictions'),history,el('p','Every round uses one shared original source reading and one fixed rule per mark. Counts describe finite declared possibilities, not probabilities. Timing and measurement origin are reported declarations. This inquiry does not establish expert intent, physical safety or authenticated acquisition.','small boundary'));

  function touch(){epoch++;onActivity();}
  function showError(text){error.textContent=text;error.hidden=!text;}
  function action(fn){touch();try{fn();showError('');}catch(e){showError(e.message);}}
  function numeric(input){if(!input.value.trim())throw Error('Complete every numerical field.');const value=Number(input.value);if(!Number.isFinite(value))throw Error('Use finite numerical values.');return value;}
  function nextIds(){
    const rounds=new Set([sequence.initial.plan.id,...sequence.rounds.map(round=>round.id)]),trials=new Set([...sequence.initial.plan.trials,...sequence.rounds.map(round=>round.trial)].map(trial=>trial.id));
    let id,trial;do{id='sequence-round-'+(++serial);trial='sequence-workpiece-'+serial;}while(rounds.has(id)||trials.has(trial));return{id,trial};
  }
  function observationId(){const used=new Set([...sequence.initial.plan.investigation.observations,...sequence.initial.results.map(result=>result.observation),...sequence.rounds.flatMap(round=>round.results.map(result=>result.observation))].map(observation=>observation.id));let id;do{id='sequence-outcome-'+(++serial);}while(used.has(id));return id;}
  function markName(id){return sequence?.initial.plan.investigation.source.landmarks.find(mark=>mark.id===id)?.label??id;}
  function updateContext(){
    const initial=getInitial();q.start.disabled=!initial;q.start.textContent=sequence?'Start a replacement sequence from the current challenge':'Retain the current challenge as the initial course';
    context.hidden=!sequence||jointChallengeSequenceContextMatches(sequence,initial,getInvestigation());
    context.textContent='The current challenge or training above differs from this retained initial course. This sequence continues from its own original source, training and reported outcomes; it does not refit to the edited parent.';
  }
  function resetDrafts(){
    const last=sequence?.rounds.at(-1)?.trial??sequence?.initial.plan.trials.at(-1);
    if(last){q.width.value=String(Math.min(10000,last.widthMm*1.5));q.height.value=String(Math.min(10000,last.heightMm*1.5));}
    q.label.value='Next workpiece';q.radius.value='.1';q.prospective.checked=false;q.seal.checked=false;q.collected.checked=false;q['outcome-label'].value='';q.x.value='';q.y.value='';q['actual-radius'].value=sequence?.rounds.at(-1)?.trial.uncertaintyMm??.1;
  }
  function setOutcomeDraft(markId,focus=true){
    const round=sequence?.rounds.at(-1);if(!round)return;q.mark.value=markId;
    const result=round.results.find(result=>result.observation.landmarkId===markId)?.observation;
    q['outcome-label'].value=result?.label??'';q.x.value=result?.xMm??'';q.y.value=result?.yMm??'';q['actual-radius'].value=result?.uncertaintyMm??round.trial.uncertaintyMm;q.class.value=result?.evidenceClass??'reported-measurement';q.collected.checked=false;if(focus)q.x.focus();
  }
  function disclosure(title,builder,{open=false,id}={}){
    const detail=el('details',undefined,'jcs-round'),heading=el('summary',title);if(id)detail.dataset.round=id;detail.append(heading);let populated=false;
    const populate=()=>{if(populated)return;populated=true;builder(detail);};
    populateDetails.set(detail,populate);
    detail.ontoggle=()=>{if(detail.open)populate();};heading.addEventListener('click',touch);heading.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')touch();});
    if(open){populate();detail.open=true;}return detail;
  }
  function slotCards(trial,slots,editable=false){
    const cards=el('div',undefined,'jc-slots');cards.dataset.workpiece=trial.id;cards.tabIndex=-1;cards.setAttribute('aria-label','Original outcomes for '+trial.label+' ['+trial.id+']');
    for(const slot of slots){const card=el('article',undefined,'jc-slot');card.dataset.status=slot.status;card.dataset.mark=slot.landmarkId;const row=slot.observation;
      card.append(el('h4',markName(slot.landmarkId)+' · '+trial.label),el('p',fmt(trial.widthMm)+' × '+fmt(trial.heightMm)+' mm · planned radius '+fmt(trial.uncertaintyMm)+' mm','small'));
      card.append(el('p',row?row.label+' ['+row.id+']: ('+fmt(row.xMm)+', '+fmt(row.yMm)+') mm · radius '+fmt(row.uncertaintyMm)+' mm. '+(row.evidenceClass==='authored-example'?'Authored example.':'Reported measurement.'):'No outcome recorded.'),el('p',slot.status==='qualified'?'Qualified for comparison':slot.status==='missing'?'Missing — cannot eliminate':'Above planned radius — cannot eliminate','jc-slot-status'));
      if(editable){const edit=el('button',row?'Edit this current outcome':'Enter this current outcome');edit.type='button';edit.onclick=()=>action(()=>setOutcomeDraft(slot.landmarkId));card.append(edit);}cards.append(card);
    }return cards;
  }
  function predictionsInto(parent,round){
    parent.append(el('h4','Predictions frozen before this round’s outcomes'),el('p',count(round.before.combinationCount)+' combinations across '+round.before.viableReadingIds.length+' original source readings. These predictions use only the sealed prior evidence, even after this round receives outcomes.','small'));
    for(const reading of round.predictions){
      parent.append(disclosure(reading.label+' ['+reading.id+'] · '+count(reading.combinationCount)+' prior-compatible combinations',detail=>{
        for(const mark of reading.marks){const section=el('section',undefined,'jc-rule-mark');section.append(el('strong',markName(mark.landmarkId)+' ['+mark.landmarkId+']'));
          const list=el('ul');for(const candidate of mark.candidates)list.append(el('li',(names[candidate.rule]??candidate.rule)+': ('+fmt(candidate.predicted.xMm)+', '+fmt(candidate.predicted.yMm)+') mm'));section.append(list);detail.append(section);}
      },{open:round.predictions.length===1}));
    }
  }
  function inspectWorkpiece(location){
    const detail=history.children[location.roundIndex];
    if(location.origin!=='initial'&&detail?.dataset.round!==location.roundId)throw Error('The original retained round differs from this diagnostic.');
    if(!detail)throw Error('The original retained round is unavailable.');
    populateDetails.get(detail)();detail.open=true;
    const cards=[...detail.querySelectorAll('[data-workpiece]')].find(node=>node.dataset.workpiece===location.trialId);
    if(!cards)throw Error('The original retained workpiece is unavailable.');
    cards.focus();cards.scrollIntoView({block:'start'});
  }
  function renderConflicts(diagnostic){
    const openGroups=new Set([...conflicts.querySelectorAll('[data-conflict-group]')].filter(node=>node.open).map(node=>node.dataset.conflictGroup));
    conflicts.hidden=false;conflicts.dataset.groups=String(diagnostic.minimalGroups.length);conflicts.dataset.subsets=String(diagnostic.evaluatedNonemptySubsets);
    conflicts.dataset.state=diagnostic.analysis.qualifiedCount?'evaluated':'untested';
    conflicts.replaceChildren(el('h4','Conflicts across the retained workpieces'),el('p','Retrospective inspection of the original training-supported explanations. Earlier predictions keep their own prior-source prefixes. A group contains every supplied selected-mark outcome on its workpieces.','small'));
    conflicts.append(el('p',count(diagnostic.baselineCombinationCount)+' original combinations · '+count(diagnostic.analysis.combinationCount)+' explain all qualified outcomes · '+diagnostic.evaluatedNonemptySubsets+' workpiece subsets checked.'));
    const locations=new Map(diagnostic.workpieces.map(item=>[item.trialId,item]));
    const original=new Map(diagnostic.analysis.trials.flatMap(trial=>trial.slots.filter(slot=>slot.observation).map(slot=>[slot.observation.id,{trial,slot}])));
    const locationName=location=>location.origin==='initial'?'Initial course · retained':('Round '+location.roundIndex+' · '+(location.sealed?'sealed':'current'));
    if(!diagnostic.minimalGroups.length){
      conflicts.append(el('p',diagnostic.analysis.qualifiedCount?'No contradictory workpiece group was found among the qualified outcomes.':'No qualified outcomes can constrain these workpiece groups yet.'));
    }else{
      conflicts.append(el('p',diagnostic.minimalGroups.length+' inclusion-minimal contradictory '+(diagnostic.minimalGroups.length===1?'group.':'groups.')+' Each group rules out every original explanation, while each immediate smaller group still has one.'));
      const groups=el('div',undefined,'jc-conflict-groups');
      for(const [index,group]of diagnostic.minimalGroups.entries()){
        const key=JSON.stringify(group.trialIds),title='Group '+(index+1)+' · '+group.trialIds.map(id=>locations.get(id).label+' ['+id+']').join(' + ');
        const detail=disclosure(title,body=>{
          body.append(el('p',group.qualifiedObservationIds.length+' qualified outcomes · '+group.missingSlots.length+' missing slots · '+group.impreciseObservationIds.length+' above planned radius. Only qualified outcomes can eliminate an explanation.','small'));
          const pieces=el('section');pieces.append(el('h4','Inspect the original workpieces'));const list=el('ul');
          for(const id of group.trialIds){const location=locations.get(id),item=el('li',locationName(location)+' · '+location.label+' ['+id+']. '),inspect=el('button','Open original outcomes');inspect.type='button';inspect.dataset.jcsInspect=id;inspect.onclick=()=>action(()=>inspectWorkpiece(location));item.append(inspect);list.append(item);}
          pieces.append(list);body.append(pieces);
          const minimality=el('section');minimality.append(el('h4','Why the group is minimal'),el('p','These smaller-group checks explain minimality. They do not change or remove any retained source.','small'));const removals=el('ul');
          for(const support of group.singleRemovalSupport){const location=locations.get(support.removedTrialId);removals.append(el('li','The group without '+location.label+' ['+location.trialId+'] retains '+count(support.combinationCount)+' combinations across '+support.viableReadingIds.length+' original source readings.'));}
          minimality.append(removals);body.append(minimality);
          const reasons=el('section');reasons.append(el('h4','Original outcomes that rule out each reading'));
          for(const reading of group.readingEliminations){const section=el('section',undefined,'jc-conflict-reading');section.append(el('strong',reading.readingLabel+' ['+reading.readingId+']'));
            for(const mark of reading.blockedMarks){section.append(el('p',markName(mark.landmarkId)+' ['+mark.landmarkId+']: every original candidate rule is ruled out.'));const rules=el('ul');
              for(const rule of mark.rules){const item=el('li',(names[rule.rule]??rule.rule)+': ');const witnesses=rule.rejectingObservationIds.map(id=>{const {trial,slot}=original.get(id),row=slot.observation;return row.label+' ['+id+'] on '+trial.label+' ['+trial.id+'] at ('+fmt(row.xMm)+', '+fmt(row.yMm)+') mm, radius '+fmt(row.uncertaintyMm)+' mm';});item.append(document.createTextNode(witnesses.join('; ')));rules.append(item);}
              section.append(rules);
            }reasons.append(section);
          }body.append(reasons);
        },{open:openGroups.has(key)});detail.className='jc-conflict-group';detail.dataset.conflictGroup=key;groups.append(detail);
      }conflicts.append(groups);
    }
    conflicts.append(el('p','Missing or above-radius outcomes remain visible and cannot eliminate explanations. These conditional groups do not identify faulty observations or recommend discarding evidence. Counts are finite possibilities, not probabilities.','small'));
    conflicts.append(disclosure('All subset counts and original observation links',body=>{body.append(el('pre',JSON.stringify({workpieces:diagnostic.workpieces,subsets:diagnostic.subsets,minimalGroups:diagnostic.minimalGroups},null,2)));}));
  }
  function render(){
    updateContext();q.export.disabled=!sequence;root.dataset.roundCount=String(sequence?.rounds.length??0);
    if(!sequence){activeRequest=null;q.planFields.disabled=true;q.resultFields.disabled=true;summary.dataset.status='no-sequence';summary.textContent='No retained sequence yet.';counts.textContent='Retain the current joint challenge above or open a complete source-only sequence.';budget.textContent='The six-workpiece limit includes the initial challenge.';requestText.textContent='Freeze a later round to receive its outcomes.';history.replaceChildren();conflicts.replaceChildren();conflicts.hidden=true;return;}
    const analysis=analyzeJointChallengeSequence(sequence),latest=sequence.rounds.at(-1);
    activeRequest=latest?activeJointChallengeSequenceRequest(sequence):null;
    root.dataset.combinations=String(analysis.current.combinationCount);summary.dataset.status=analysis.current.status;summary.textContent=titles[analysis.current.status];
    counts.textContent=count(analysis.current.combinationCount)+' finite combinations · '+analysis.current.viableReadingIds.length+' original readings · '+analysis.current.qualifiedCount+'/'+analysis.current.totalCount+' outcomes qualified · '+analysis.current.missingCount+' missing · '+analysis.current.impreciseCount+' above planned radius.';
    budget.textContent=analysis.workpieceCount+' of 6 workpieces retained · '+analysis.remainingWorkpieces+' remaining.'+(analysis.current.combinationCount===0?' No new round can be frozen while the retained evidence contradicts every original explanation.':'');
    q.planFields.disabled=analysis.remainingWorkpieces===0||analysis.current.combinationCount===0;q.resultFields.disabled=!latest;
    const selected=q.mark.value;q.mark.replaceChildren(...sequence.initial.plan.investigation.landmarkIds.map(id=>{const option=el('option',markName(id)+' · '+id);option.value=id;return option;}));if([...q.mark.options].some(option=>option.value===selected))q.mark.value=selected;
    requestText.textContent=latest?latest.label+' ['+latest.id+'] · '+fmt(latest.trial.widthMm)+' × '+fmt(latest.trial.heightMm)+' mm · planned radius '+fmt(latest.trial.uncertaintyMm)+' mm. The complete original prior-source prefix is fixed.':'Freeze one later workpiece to receive its outcomes.';
    const expanded=new Set([...history.children].flatMap((node,index)=>node.open?[index===0?'initial-course':'later:'+node.dataset.round]:[]));
    const initial=disclosure('Initial course · '+analysis.initial.label+' · '+count(analysis.initial.combinationCount)+' combinations after its reported outcomes',detail=>{
      detail.append(el('p',sequence.initial.plan.investigation.observations.length+' original training observations remain training. The '+sequence.initial.results.length+' initial-course outcomes remain separately reported evidence.','small'));
      for(const trial of analysis.initial.trials)detail.append(slotCards(trial,trial.slots));
    },{open:expanded.has('initial-course'),id:'initial'});
    const cards=analysis.rounds.map((round,index)=>disclosure('Round '+(index+1)+' · '+round.label+' · '+count(round.before.combinationCount)+' before → '+count(round.after.combinationCount)+' after',detail=>{
      detail.append(el('p',(round.sealed?'Sealed prior round.':'Current round; its outcome slots can still be corrected.')+' Prior evidence: '+round.before.qualifiedCount+' qualified, '+round.before.missingCount+' missing, '+round.before.impreciseCount+' above planned radius.','small'));
      detail.append(slotCards(round.trial,round.slots,!round.sealed));predictionsInto(detail,round);
    },{open:expanded.has('later:'+round.id)||!round.sealed,id:round.id}));history.replaceChildren(initial,...cards);renderConflicts(analyzeJointChallengeSequenceConflicts(sequence));
  }
  planForm.onsubmit=event=>{event.preventDefault();action(()=>{
    if(!sequence)throw Error('Retain the initial course first.');const ids=nextIds();
    const candidate=freezeNextJointChallengeRound(sequence,{id:ids.id,label:q.label.value,prospectiveDeclaration:q.prospective.checked,sealPriorDeclaration:q.seal.checked,trial:{id:ids.trial,label:q.label.value,widthMm:numeric(q.width),heightMm:numeric(q.height),uncertaintyMm:numeric(q.radius)}});
    analyzeJointChallengeSequenceConflicts(candidate);sequence=candidate;resetDrafts();render();notice.textContent='New workpiece frozen against the complete currently reported prior evidence. Export this source-only request before collecting its outcomes.';
  });};
  resultForm.onsubmit=event=>{event.preventDefault();action(()=>{
    if(!sequence||!activeRequest)throw Error('Freeze a later round first.');const trial=sequence.rounds.at(-1).trial;
    const candidate=recordJointChallengeSequenceResult(sequence,activeRequest,{trialId:trial.id,collectedAfterPlan:q.collected.checked,observation:{id:observationId(),label:q['outcome-label'].value,landmarkId:q.mark.value,evidenceClass:q.class.value,widthMm:trial.widthMm,heightMm:trial.heightMm,xMm:numeric(q.x),yMm:numeric(q.y),uncertaintyMm:numeric(q['actual-radius'])}});
    analyzeJointChallengeSequenceConflicts(candidate);sequence=candidate;q.collected.checked=false;render();notice.textContent='Current-round outcome accepted. Every earlier source record and frozen prediction remains unchanged.';
  });};
  q.mark.onchange=()=>action(()=>setOutcomeDraft(q.mark.value,false));
  file.onchange=async()=>{
    const selected=file.files?.[0];if(!selected)return;touch();const own=epoch;
    try{if(selected.size>MAX_JOINT_CHALLENGE_SEQUENCE_BYTES)throw Error('Complete sequence exceeds 4,000,000 UTF-8 bytes.');const text=await selected.text();if(own!==epoch)return;
      const candidate=importJointChallengeSequence(text);analyzeJointChallengeSequenceConflicts(candidate);serializeJointChallengeSequence(candidate);if(own!==epoch)return;
      sequence=candidate;resetDrafts();render();showError('');notice.textContent='Complete sequence reopened. Original training, sealed prefixes, requests and outcomes were checked; each round’s predictions were recomputed from its own prior evidence.';
    }catch(e){if(own===epoch)showError('Sequence import refused: '+e.message);}
    finally{if(file.files?.[0]===selected)file.value='';}
  };
  root.addEventListener('input',touch);render();
  return {parentActivity(){epoch++;},parentChanged(){epoch++;updateContext();}};
}
