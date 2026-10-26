import {proposeSequencePointChoices,reviewSequencePointChoice} from '/src/sequence-point-proposals.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function installPointProposals({getSource,getAssets,onChange}){
 const generated=new Map();let pending=null;
 const rowFor=id=>[...$('samples').children].find(row=>row.dataset.moment===id);
 function retire(row){const basis=row.querySelector('.basis'),old=generated.get(row);if(old!==undefined&&basis.value===old)basis.value='';generated.delete(row);}
 function clear(){for(const row of generated.keys())retire(row);pending=null;$('point-proposals').replaceChildren();}
 function query(){return {anchorMomentId:$('point-anchor-moment').value,anchorMarkId:$('point-anchor-mark').value,momentIds:[...$('samples').children].filter(row=>row.querySelector('.include').checked).map(row=>row.dataset.moment),deviationMm:Number($('point-pair-bound').value),maxStates:Number($('point-search-budget').value)};}
 function populateMarks(){const moment=getSource()?.moments.find(m=>m.id===$('point-anchor-moment').value);$('point-anchor-mark').replaceChildren();for(const mark of moment?.calibratedTask?.landmarks??[]){const option=el('option',`${mark.label} (${mark.id})`);option.value=mark.id;$('point-anchor-mark').append(option);}}
 function reset(){clear();$('point-anchor-moment').replaceChildren();for(const moment of getSource()?.moments??[]){const option=el('option',`${moment.label} · ${moment.origin.mediaTimeSeconds} s`);option.value=moment.id;$('point-anchor-moment').append(option);}populateMarks();$('point-pair-bound').value='1';$('point-search-budget').value='20000';}
 for(const id of ['point-anchor-moment','point-anchor-mark','point-pair-bound','point-search-budget'])$(id).addEventListener('input',()=>{clear();if(id==='point-anchor-moment')populateMarks();});
 $('samples').addEventListener('input',event=>{if(event.target.matches('.include,.mark'))clear();});
 function picture(moment,pairs,side){
  const figure=el('figure'),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`Original ${moment.label}; all proposed point pairs numbered`);
  const image=document.createElementNS(ns,'image');for(const[k,v]of Object.entries({href:getAssets().get(moment.id)?.media.url??'',width:moment.image.widthPx,height:moment.image.heightPx}))image.setAttribute(k,v);svg.append(image);
  pairs.forEach((pair,i)=>{const mark=moment.calibratedTask.landmarks.find(m=>m.id===pair[side]),radius=Math.max(moment.image.widthPx,moment.image.heightPx)/55,circle=document.createElementNS(ns,'circle'),text=document.createElementNS(ns,'text');for(const[k,v]of Object.entries({cx:mark.sourcePx.x,cy:mark.sourcePx.y,r:radius,fill:'none',stroke:'#e54d34','stroke-width':3}))circle.setAttribute(k,v);for(const[k,v]of Object.entries({x:mark.sourcePx.x+radius,y:mark.sourcePx.y-radius,fill:'#b32310','font-size':radius*1.5}))text.setAttribute(k,v);text.textContent=String(i+1);svg.append(circle,text);});
  figure.append(el('figcaption',`${moment.label} · ${moment.origin.mediaTimeSeconds} s`),svg);return figure;
 }
 $('point-propose').addEventListener('click',()=>{
  clear();onChange();const source=getSource();if(!source)return;
  try{
   if(!$('point-pair-bound').value.trim()||!$('point-search-budget').value.trim())throw Error('Supply the discrepancy and complete-search budget.');
   const input=query(),report=proposeSequencePointChoices(source,input);pending={source,input,key:JSON.stringify(input)};
   const target=$('point-proposals'),anchor=source.moments.find(m=>m.id===input.anchorMomentId),count=report.rows.filter(r=>r.status==='unique').length;
   target.append(el('p',`${count} selected non-anchor frames have a complete unique geometric mapping. Each offered mapping requires its own task-point review. The common reference declaration is unchanged.`));
   for(const row of report.rows){
    if(row.status==='anchor')continue;
    const moment=source.moments.find(m=>m.id===row.momentId),card=el('article');card.dataset.moment=row.momentId;card.append(el('h3',moment.label));
    if(row.status!=='unique'){card.append(el('p',`No point choice offered: ${row.status.replaceAll('-',' ')}. Keep or edit the ordinary point/missing-observation field yourself.`));target.append(card);continue;}
    const pairs=row.report.witnessMappings[0],views=el('div');views.className='grid';views.append(picture(anchor,pairs,'referenceId'),picture(moment,pairs,'observationId'));card.append(views);
    const list=el('ol');for(const pair of pairs)list.append(el('li',`${pair.referenceId} → ${pair.observationId}`));card.append(list,el('p',`Selected anchor ${input.anchorMarkId} proposes local mark ${row.markId}. Pair-distance agreement does not establish task identity or a common coordinate frame.`));
    const confirm=el('input');confirm.type='checkbox';confirm.className='point-semantic-confirm';const label=el('label');label.append(confirm,document.createTextNode(' I reviewed this complete mapping as the same task points.'));const use=el('button','Use reviewed point choice');use.type='button';use.disabled=true;const feedback=el('p');feedback.setAttribute('role','status');
    confirm.addEventListener('input',()=>{use.disabled=!confirm.checked;if(!confirm.checked){retire(rowFor(row.momentId));feedback.textContent='Review withdrawn; an unchanged generated basis has been retired.';onChange();}});
    use.addEventListener('click',()=>{
     try{
      if(!pending||getSource()!==source||pending.key!==JSON.stringify(query()))throw Error('Proposal premises changed; propose again.');
      const choice=reviewSequencePointChoice(source,input,row.momentId,{semanticCorrespondenceConfirmed:confirm.checked});
      for(const sample of [choice.anchor,choice.sample]){
       const row=rowFor(sample.momentId),select=row.querySelector('.mark'),basis=row.querySelector('.basis');
       const preserveAnchor=sample.momentId===input.anchorMomentId&&select.value===sample.markId&&basis.value&&!generated.has(row);
       select.value=sample.markId;select.dispatchEvent(new Event('change'));
       if(!preserveAnchor){basis.value=sample.basis;generated.set(row,sample.basis);}
      }
      onChange();feedback.textContent='Converted to editable authored point choices. Inspect and accept the selected samples in the ordinary form below.';
     }catch(error){feedback.textContent=error.message;}
    });
    card.append(label,use,feedback);target.append(card);
   }
  }catch(error){$('point-proposals').append(el('p',`Proposal unavailable: ${error.message}`));}
 });
 return {reset,accept(){generated.clear();pending=null;$('point-proposals').replaceChildren();}};
}
