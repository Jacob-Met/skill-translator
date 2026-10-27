import {sharedMotionInputs} from '/src/shared-motion-groups.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const number=value=>value===null||value===undefined?'—':value.toFixed(3);
const point=value=>value?'('+number(value.xMm)+', '+number(value.yMm)+')':'Missing';
const labels={supported:'Within fitted threshold','outside-fit-threshold':'Outside fitted threshold',incomplete:'Incomplete',unresolved:'Unresolved orientation','no-assessable-groups':'No assessable groups'};
const counts=c=>c.supported+' within fitted threshold; '+c.outsideFitThreshold+' outside; '+c.incomplete+' incomplete; '+c.unresolved+' unresolved';
function row(values){const tr=node('tr');for(const value of values)tr.append(node('td',value));return tr;}
function table(headers,caption){
 const wrap=node('div');wrap.className='motion-table';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',caption);const t=node('table'),head=node('thead'),tr=node('tr'),body=node('tbody');
 t.append(node('caption',caption));for(const h of headers)tr.append(node('th',h));head.append(tr);t.append(head,body);wrap.append(t);return {wrap,body};
}
export function renderSharedMotionPractice(record,report){
 $('motionPracticeSave').disabled=!record;$('motionPracticeRecompute').disabled=!record;
 $('motionPracticeResults').hidden=!record;$('motionPracticeFits').replaceChildren();$('motionPracticeWitnesses').replaceChildren();$('motionPracticePointScores').replaceChildren();
 if(!record){
  $('motionPracticeTolerance').value='';$('motionPracticeBasis').value='';$('motionPracticeRound').replaceChildren();$('motionPracticeGroup').replaceChildren();
  $('motionPracticeSummary').textContent='Open an actual session exported from the first original source to compare every inferred group.';
  $('motionPracticeStatus').textContent='No actual practice session has been supplied.';return;
 }
 const {widthMm,heightMm}=record.session.reference.target;
 const sourcePoints=new Map(sharedMotionInputs(record.study).rows.map(row=>[row.id,row.points]));
 $('motionPracticeTolerance').value=String(record.fitToleranceMm);$('motionPracticeBasis').value=record.basis;
 $('motionPracticeSummary').textContent=report.inference.groups.length+' inferred groups × '+report.sourceIds.length+' original sources × '+report.rounds.length+' retained rounds = '+report.counts.total+' comparisons. '+counts(report.counts)+'. Actual workpiece: '+widthMm+' × '+heightMm+' mm.';
 if(!report.counts.total)$('motionPracticeSummary').textContent+=' '+(report.inference.reason||'No multi-point group passed the original fitted-motion test.');
 $('motionPracticeStatus').textContent='Showing recomputed results for a '+record.fitToleranceMm+' mm fitted-residual tolerance, with '+report.numericalSlackMm+' mm numerical slack. Basis: '+record.basis;
 const roundSelect=$('motionPracticeRound'),groupSelect=$('motionPracticeGroup'),previousRound=roundSelect.value,previousGroup=groupSelect.value;
 roundSelect.replaceChildren();groupSelect.replaceChildren();
 for(const actual of report.rounds){const o=node('option','Round '+actual.round+' · '+labels[actual.status]);o.value=String(actual.round);roundSelect.append(o);}
 roundSelect.value=report.rounds.some(r=>String(r.round)===previousRound)?previousRound:String(record.session.round);
 for(const [i,group] of report.inference.groups.entries()){const o=node('option','Group '+(i+1)+' · '+group.ids.join(' / '));o.value=JSON.stringify(group.ids);groupSelect.append(o);}
 if([...groupSelect.options].some(o=>o.value===previousGroup))groupSelect.value=previousGroup;groupSelect.disabled=!report.inference.groups.length;
 const render=()=>{
  const actual=report.rounds.find(r=>String(r.round)===roundSelect.value),group=report.inference.groups.find(g=>JSON.stringify(g.ids)===groupSelect.value);
  $('motionPracticeRoundSummary').textContent='Round '+actual.round+': '+counts(actual.counts)+'. All '+actual.comparisons.length+' group/source comparisons are retained; the selectors only change inspection.';
  const p=actual.positional;
  $('motionPracticePositional').textContent='Original positional criteria: '+p.placed+'/'+p.total+' marks placed · '+(!p.complete?'incomplete':p.passed?'within all declared point tolerances':'outside one or more declared point tolerances')+'. These scores are unchanged by the fitted group comparison.';
  $('motionPracticePointScores').replaceChildren(...p.results.map(r=>row([r.id,point(r.target),point(r.attempt),r.evaluation?number(r.evaluation.errorMm):'—',r.evaluation?number(r.evaluation.toleranceMm):'—',!r.placed?'Missing':r.evaluation.within?'Within point tolerance':'Outside point tolerance'])));
  const observation=actual.actual.photoObservation;
  $('motionPracticeProvenance').textContent=observation?'Photo annotation record retained: '+observation.evidenceClass+' · image SHA256 '+observation.image.sha256+'. Manually detached marks: '+(actual.actual.detachedPhotoMarks?.join(', ')||'none')+'. The Practice export contains image identity, calibration and annotations; learner image pixels are not embedded.':'Actual manual placements retained for this round; no learner photo annotation record is attached.';
  $('motionPracticeFits').replaceChildren();$('motionPracticeWitnesses').replaceChildren();
  if(!group)return;
  for(const comparison of actual.comparisons.filter(c=>JSON.stringify(c.groupIds)===JSON.stringify(group.ids))){
   const fit=comparison.fit;
   const tr=row([comparison.sourceId,labels[comparison.status],fit?number(fit.angleDegrees)+'°':'—',fit?point({xMm:fit.centroidDxMm,yMm:fit.centroidDyMm}):'—',fit?number(fit.remainingRmsMm):'—',number(comparison.maxResidualMm)]);
   tr.dataset.sourceId=comparison.sourceId;tr.dataset.status=comparison.status;tr.dataset.maxResidualMm=String(comparison.maxResidualMm??'');$('motionPracticeFits').append(tr);
   const detail=node('details'),summary=node('summary',comparison.sourceId+' · '+labels[comparison.status]+' · all point residuals');detail.append(summary);
   if(!fit)detail.append(node('p',comparison.status==='incomplete'?'Missing actual marks: '+(comparison.missingAttemptIds.join(', ')||'none')+'. Missing original marks: '+(comparison.missingSourceIds.join(', ')||'none')+'. A partial point set never substitutes for this group.':comparison.unavailable));
   if(comparison.witness)detail.append(node('p','Largest-residual witness: '+comparison.witness.id+' · '+number(comparison.witness.errorMm)+' mm. Original '+point(comparison.witness.target)+'; actual '+point(comparison.witness.attempt)+'; aligned actual '+point(comparison.witness.alignedAttempt)+'.'));
   const source=record.study.demonstrations.find(s=>s.id===comparison.sourceId),t=table(['Reference mark','Original mark','Original (mm)','Actual (mm)','Aligned actual (mm)','Residual (mm)'],'Each actual point is aligned to this original source by the fitted proper rotation and translation.');
   for(const id of group.ids){
    const pair=comparison.pairs.find(p=>p.id===id),residual=fit?.residuals.find(p=>p.id===id);
    const originalId=source.spatialMapping?source.spatialMapping.pairs.find(p=>p.referenceId===id)?.observationId:id;
    t.body.append(row([id,originalId||'Missing',point(sourcePoints.get(comparison.sourceId)?.get(id)),point(actual.actual.attempts.find(p=>p.id===id)),point(residual),number(residual?.errorMm)]));
   }
   detail.append(t.wrap);$('motionPracticeWitnesses').append(detail);
  }
 };
 roundSelect.onchange=render;groupSelect.onchange=render;render();
}
