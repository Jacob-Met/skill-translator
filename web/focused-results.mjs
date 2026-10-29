import {appendFocusedResult,compareFocusedResult,importFocusedReview,fullTaskRetest} from '/src/focused-review.mjs';
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const fmt=n=>n===null?'unavailable':n.toFixed(2);
export function mountFocusedResults({host,getStudy,setStudy,getRevision,error}){
  host.innerHTML=`<h2>Bring a focused attempt back</h2><p>Export the focused source and its practice session from Complete Task. Attach them here to inspect a separate drill alongside the original full task.</p>
    <p class="input-note">Matching source geometry does not prove that this drill followed these original rounds. You declare the association. Assistance, chronology and physical conditions are not verified. A subset pass cannot complete unpracticed original marks.</p>
    <form id="attachDrill"><label>Focused source JSON<input id="drillSource" type="file" accept=".json,application/json" required></label><label>Focused practice session JSON<input id="drillSession" type="file" accept=".json,application/json" required></label><label>Label this separate attempt<input id="drillLabel" maxlength="160" required></label><button type="submit">Retain focused results</button></form>
    <p id="drillStatus" role="status"></p><div id="drillResults"></div><button id="fullTaskRetest">Open a fresh full-task retest</button><p class="input-note">Save this review before leaving. The full-task retest restores every original mark, starts empty and hides targets. It does not reuse either original or focused placements.</p>`;
  const find=id=>host.querySelector('#'+id);let generation=0,inspection=null,inspectionContext='';
  const signed=n=>n===0?'0.00':`${n>0?'+':''}${n.toFixed(2)}`;
  function showInspection(study,moveFocus=false){
    host.querySelector('[data-placement-inspection]')?.remove();
    for(const button of host.querySelectorAll('[data-inspect-mark]'))button.setAttribute('aria-expanded','false');
    if(!inspection)return;
    const entry=study.drills.find(d=>d.id===inspection.drillId);
    if(!entry){inspection=null;return;}
    const report=compareFocusedResult(study,entry.id),mark=report.marks.find(m=>m.id===inspection.markId);
    if(!mark){inspection=null;return;}
    const card=[...host.querySelectorAll('[data-drill-id]')].find(n=>n.dataset.drillId===entry.id);
    const trigger=[...card.querySelectorAll('[data-inspect-mark]')].find(n=>n.dataset.inspectMark===mark.id);
    trigger.setAttribute('aria-expanded','true');
    const panel=node('div');panel.dataset.placementInspection='';panel.className='placement-inspection';panel.id='focused-placement-inspection';
    const heading=node('h4',`${mark.label} · ${mark.id} — retained placements`);heading.tabIndex=-1;panel.append(heading);
    const dimensions=study.review.session.reference.target;
    panel.append(node('p',`${entry.label} · physical sheet ${dimensions.widthMm} × ${dimensions.heightMm} mm.`),node('p','Offset = placement − target, in physical-sheet millimetres. +x is right and +y is down in the standard sheet view; a mirrored practice view does not change these stored coordinates.'));
    const sides=node('div');sides.className='placement-inspection-sides';
    for(const [title,result,inScope]of [[`Original attempt · round ${entry.originalRound}`,mark.original,true],[`Focused attempt · round ${entry.drillRound}`,mark.drill,mark.inDrill]]){
      const side=node('div');side.append(node('h5',title));
      if(!inScope)side.append(node('p','This mark was not part of this focused task.'));
      else{
        const list=node('dl'),add=(name,value)=>list.append(node('dt',name),node('dd',value));
        add('Target · x / y mm',`${fmt(result.target.xMm)} / ${fmt(result.target.yMm)}`);
        if(!result.placed)side.append(node('p',title.startsWith('Original')?'No placement retained in this original round.':'No placement retained in this focused round.'));
        else{
          const e=result.evaluation;
          add('Actual placement · x / y mm',`${fmt(result.attempt.xMm)} / ${fmt(result.attempt.yMm)}`);
          add('Horizontal offset · dx mm',signed(e.dxMm));add('Vertical offset · dy mm',signed(e.dyMm));
          add('Distance from target · mm',fmt(e.errorMm));add('Tolerance · mm',fmt(e.toleranceMm));
          add('Recorded placement result',e.within?'Within tolerance':'Outside tolerance');
        }
        side.append(list);
      }
      sides.append(side);
    }
    panel.append(sides,node('p','These are retained geometric results. Direction or distance differences do not establish a cause, chronology or learning.'));
    const back=node('button','Return to this mark’s result');back.type='button';back.addEventListener('click',()=>{inspection=null;panel.remove();trigger.setAttribute('aria-expanded','false');trigger.focus();});panel.append(back);card.append(panel);
    if(moveFocus)heading.focus();
  }
  async function read(file,limit){if(!file||file.size>limit)throw Error('Focused source is limited to 256 KiB; session to 2 MiB.');return JSON.parse(await file.text());}
  for(const id of ['drillSource','drillSession','drillLabel'])find(id).addEventListener('input',()=>generation++);
  find('attachDrill').addEventListener('submit',async e=>{e.preventDefault();const token=++generation,revision=getRevision(),label=find('drillLabel').value;try{
    const [demo,session]=await Promise.all([read(find('drillSource').files[0],256*1024),read(find('drillSession').files[0],2*1024*1024)]);
    if(token!==generation||revision!==getRevision())return;
    const next=appendFocusedResult(getStudy(),demo,session,label);setStudy(next);find('drillStatus').textContent='Separate raw drill retained; original rounds are unchanged.';error('');
  }catch(err){if(token===generation&&revision===getRevision())error('Focused result refused; current review retained. '+err.message);}});
  find('fullTaskRetest').addEventListener('click',()=>{try{const input=fullTaskRetest(getStudy());sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify(input));location.assign('/practice');}catch(err){error(err.message);}});
  function refresh(){
    const study=importFocusedReview(getStudy()),results=find('drillResults');
    const active=document.activeElement;
    const activeRound=host.contains(active)&&active.dataset?.roundField?{drillId:active.closest('[data-drill-id]').dataset.drillId,field:active.dataset.roundField}:null;
    const activeRemoval=host.contains(active)&&active.dataset?.removeDrill;
    const focusedInspection=!!active?.closest?.('[data-placement-inspection]'),previousInspection=inspection;
    const activeMark=host.contains(active)&&active.dataset?.inspectMark?{drillId:active.closest('[data-drill-id]').dataset.drillId,markId:active.dataset.inspectMark}:null;
    const context=JSON.stringify({demo:study.review.demo,session:study.review.session,baselineRound:study.review.baselineRound,comparisonRound:study.review.comparisonRound,drills:study.drills});
    if(context!==inspectionContext)inspection=null;inspectionContext=context;
    results.replaceChildren();find('drillStatus').textContent=`${study.drills.length}/8 separate drill sessions retained.`;
    for(const entry of study.drills){
      const r=compareFocusedResult(study,entry.id),card=node('article');card.className='mark-card';card.dataset.drillId=entry.id;card.append(node('h3',entry.label));
      const controls=node('div');controls.className='round-select';
      for(const [field,title,max]of [['originalRound','Original round',study.review.session.round],['drillRound','Drill round',entry.session.round]]){
        const label=node('label',title),select=node('select');select.setAttribute('aria-label',`${title} for ${entry.label}`);select.dataset.roundField=field;
        for(let i=1;i<=max;i++){const option=node('option',String(i));option.value=i;select.append(option);}select.value=entry[field];
        select.addEventListener('change',()=>{try{const next=importFocusedReview(getStudy());next.drills.find(d=>d.id===entry.id)[field]=Number(select.value);setStudy(importFocusedReview(next));error('');}catch(err){select.value=String(entry[field]);error('Round selection refused; accepted review retained. '+err.message);}});label.append(select);controls.append(label);
      }card.append(controls);
      card.append(node('p',`${r.focused.placed}/${r.focused.total} focused marks placed; ${r.focused.complete?(r.focused.passed?'focused task within every tolerance':'focused task outside a tolerance'):'focused task incomplete'}. ${r.unpracticedIds.length} original marks are outside this drill.`));
      const summary=node('p',`${r.commonMarks.length} marks placed in both selected rounds. Paired RMS ${fmt(r.beforeRmsMm)} → ${fmt(r.afterRmsMm)} mm; change ${fmt(r.changeRmsMm)} mm. This is a cross-session description, not a verified chronological change.`);summary.className='drill-comparison';card.append(summary);
      const wrap=node('div');wrap.className='table-wrap';const table=node('table'),head=node('tr');for(const label of ['Original mark','Original error · mm','Drill error · mm','Scope'])head.append(node('th',label));const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');
      for(const mark of r.marks){const row=node('tr'),name=node('td',mark.label),inspect=node('button','Inspect placements');inspect.type='button';inspect.dataset.inspectMark=mark.id;inspect.setAttribute('aria-label',`Inspect placements for ${mark.label} (${mark.id}) in ${entry.label}`);inspect.setAttribute('aria-expanded','false');inspect.setAttribute('aria-controls','focused-placement-inspection');inspect.addEventListener('click',()=>{inspection={drillId:entry.id,markId:mark.id};showInspection(importFocusedReview(getStudy()),true);});name.append(inspect);row.append(name);for(const text of [mark.original.placed?fmt(mark.original.evaluation.errorMm):'Missing',mark.drill?.placed?fmt(mark.drill.evaluation.errorMm):mark.inDrill?'Missing':'Not practiced',mark.inDrill?'Selected for drill':'Outside drill'])row.append(node('td',text));body.append(row);}table.append(body);wrap.append(table);card.append(wrap);
      const remove=node('button','Remove this attached drill');remove.type='button';remove.dataset.removeDrill=entry.id;remove.addEventListener('click',()=>{try{const next=importFocusedReview(getStudy());next.drills=next.drills.filter(d=>d.id!==entry.id);setStudy(next);error('');}catch(err){error('Removal refused; accepted review retained. '+err.message);}});card.append(remove);results.append(card);
    }
    showInspection(study);
    if(activeRound){const card=[...host.querySelectorAll('[data-drill-id]')].find(n=>n.dataset.drillId===activeRound.drillId);[...card?.querySelectorAll('select')||[]].find(n=>n.dataset.roundField===activeRound.field)?.focus();}
    else if(activeRemoval){find('attachDrill').querySelector('button').focus();}
    else if(activeMark){const card=[...host.querySelectorAll('[data-drill-id]')].find(n=>n.dataset.drillId===activeMark.drillId);[...card?.querySelectorAll('[data-inspect-mark]')||[]].find(n=>n.dataset.inspectMark===activeMark.markId)?.focus();}
    else if(focusedInspection&&previousInspection){
      const card=[...host.querySelectorAll('[data-drill-id]')].find(n=>n.dataset.drillId===previousInspection.drillId);
      const replacement=inspection?host.querySelector('[data-placement-inspection] h4'):[...card?.querySelectorAll('[data-inspect-mark]')||[]].find(n=>n.dataset.inspectMark===previousInspection.markId);
      replacement?.focus();
    }
  }
  return {refresh};
}
