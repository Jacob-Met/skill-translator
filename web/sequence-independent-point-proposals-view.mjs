import {proposeSequenceIndependentPointChoices,reviewSequenceIndependentPointChoice} from '/src/sequence-independent-point-proposals.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function installIndependentPointProposals({getSource,getAssets,onChange,retireRigidProposals}){
 const generated=new Map();let pending=null;
 const rowFor=id=>[...$('samples').children].find(row=>row.dataset.moment===id);
 function retire(row){const old=generated.get(row),basis=row?.querySelector('.basis');if(old!==undefined&&basis?.value===old)basis.value='';generated.delete(row);}
 function clear(){for(const row of generated.keys())retire(row);pending=null;$('independent-point-proposals').replaceChildren();}
 const query=()=>({anchorMomentId:$('point-anchor-moment').value,anchorMarkId:$('point-anchor-mark').value,momentIds:[...$('samples').children].filter(row=>row.querySelector('.include').checked).map(row=>row.dataset.moment),deviationMm:Number($('point-pair-bound').value),maxStates:Number($('point-search-budget').value)});
 for(const id of['point-anchor-moment','point-anchor-mark','point-pair-bound','point-search-budget'])$(id).addEventListener('input',clear);
 $('samples').addEventListener('input',event=>{if(event.target.matches('.include,.mark'))clear();});$('point-propose').addEventListener('click',clear);
 function picture(moment,selectedId){
  const figure=el('figure'),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${moment.label}: selected point in orange, auxiliary points in teal; original local IDs`);
  const image=document.createElementNS(ns,'image');for(const[k,v]of Object.entries({href:getAssets().get(moment.id)?.media.url??'',width:moment.image.widthPx,height:moment.image.heightPx}))image.setAttribute(k,v);svg.append(image);
  for(const mark of moment.calibratedTask.landmarks){const selected=mark.id===selectedId,radius=Math.max(moment.image.widthPx,moment.image.heightPx)/65,circle=document.createElementNS(ns,'circle'),text=document.createElementNS(ns,'text');for(const[k,v]of Object.entries({cx:mark.sourcePx.x,cy:mark.sourcePx.y,r:radius,fill:'none',stroke:selected?'#c84820':'#137b72','stroke-width':selected?4:2}))circle.setAttribute(k,v);for(const[k,v]of Object.entries({x:mark.sourcePx.x+radius,y:mark.sourcePx.y-radius,fill:selected?'#9d3214':'#0b5851','font-size':radius*1.3}))text.setAttribute(k,v);text.textContent=mark.id;svg.append(circle,text);}
  figure.append(el('figcaption',`${moment.label} · ${moment.origin.mediaTimeSeconds} s`),svg);return figure;
 }
 $('independent-point-propose').addEventListener('click',()=>{
  clear();retireRigidProposals();onChange();const source=getSource();if(!source)return;
  try{
   if(!$('point-pair-bound').value.trim()||!$('point-search-budget').value.trim())throw Error('Supply the auxiliary pair-distance discrepancy and search-state budget.');
   const input=query(),report=proposeSequenceIndependentPointChoices(source,input),anchor=source.moments.find(m=>m.id===input.anchorMomentId);pending={source,key:JSON.stringify(input)};
   const target=$('independent-point-proposals');target.append(el('p','Conditional hypothesis: the selected point is exempt from every pair-distance constraint. All other original points must remain pair-distance compatible. This does not identify a physical independent point or a rigid body. Each frame uses one shared search budget across all candidate omissions.'));
   for(const row of report.rows){
    if(row.status==='anchor')continue;const moment=source.moments.find(m=>m.id===row.momentId),card=el('article');card.dataset.moment=row.momentId;card.append(el('h3',moment.label));
    if(!row.markId){card.append(el('p',`No point choice offered: ${row.status.replaceAll('-',' ')}. Original manual or missing-point choices remain available.`));if(row.report)card.append(el('p',`Search states: ${row.report.states} of ${input.maxStates}. ${row.report.complete?'Possible selected IDs: '+(row.report.possibleObservationIds.join(', ')||'none'):'Search incomplete; found witnesses cannot establish a forced identity.'}`));target.append(card);continue;}
    const pictures=el('div');pictures.className='grid';pictures.append(picture(anchor,input.anchorMarkId),picture(moment,row.markId));card.append(pictures,el('p',`${input.anchorMarkId} → ${row.markId} is shared by all ${row.report.completeMappingCount} complete conditional assignments. Search used ${row.report.states} of ${input.maxStates} states.`),el('p',row.report.completeMappingCount>1?'Auxiliary point identities remain ambiguous. No complete rigid mapping is offered.':'Auxiliary correspondence is unique under this hypothesis. The selected pair was not constrained by distance; no complete rigid mapping is offered.'));
    const confirm=el('input');confirm.type='checkbox';confirm.className='independent-point-confirm';const label=el('label');label.append(confirm,document.createTextNode(' I reviewed the selected-point exemption, the auxiliary pair-distance assumption, and this selected pair as the same task point.'));const use=el('button','Use reviewed conditional point choice');use.type='button';use.disabled=true;const feedback=el('p');feedback.setAttribute('role','status');
    confirm.addEventListener('input',()=>{use.disabled=!confirm.checked;if(!confirm.checked){retire(rowFor(row.momentId));feedback.textContent='Conditional review withdrawn; unchanged generated basis retired.';onChange();}});
    use.addEventListener('click',()=>{try{
     if(!pending||getSource()!==source||pending.key!==JSON.stringify(query()))throw Error('Original source or query changed; test the hypothesis again.');
     const choice=reviewSequenceIndependentPointChoice(source,input,row.momentId,{independentPointModelConfirmed:confirm.checked,semanticCorrespondenceConfirmed:confirm.checked});
     retireRigidProposals();
     for(const sample of[choice.anchor,choice.sample]){const row=rowFor(sample.momentId),select=row.querySelector('.mark'),basis=row.querySelector('.basis');const preserveAnchor=sample.momentId===input.anchorMomentId&&select.value===sample.markId&&basis.value&&(!generated.has(row)||basis.value!==generated.get(row));select.value=sample.markId;select.dispatchEvent(new Event('change'));if(!preserveAnchor){basis.value=sample.basis;generated.set(row,sample.basis);}}
     onChange();feedback.textContent='Converted to ordinary editable point choices. The separate fixed-plane declaration and final sample inspection remain required.';
    }catch(error){feedback.textContent=error.message;}});
    card.append(label,use,feedback);target.append(card);
   }
  }catch(error){$('independent-point-proposals').append(el('p',`Conditional proposal unavailable: ${error.message}`));}
 });
 return {reset:clear,accept(){generated.clear();pending=null;$('independent-point-proposals').replaceChildren();}};
}
