import {proposeSampledDwells} from '/src/path-dwell.mjs';

/** Additive consumer. Its caller owns source admission and invalidation. */
export function mountDwellProposals(host,getAccepted,inspectMoment){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const section=el('section');section.id='dwell-proposals';
 section.append(el('h3','Find low-displacement intervals'),el('p','Find candidate dwells among the selected original points without naming interval endpoints. Every pair of positions must fit the diameter. Motion between retained samples remains unknown.'));
 const controls=[];
 for(const [id,label,value] of [['dwell-diameter','Maximum nominal diameter (mm)','1'],['dwell-duration','Minimum selected duration (seconds)','1']]){
  const input=el('input');input.id=id;input.type='number';input.min='0';input.step='any';input.value=value;
  const wrapper=el('label',label+' ');wrapper.append(input);section.append(wrapper);controls.push(input);
 }
 const button=el('button','Find candidate intervals');button.type='button';button.id='dwell-propose';
 const status=el('p');status.id='dwell-status';status.setAttribute('role','status');
 const result=el('div');result.id='dwell-result';section.append(button,status,result);host.append(section);
 const clear=()=>{result.replaceChildren();status.textContent='';};
 for(const input of controls)input.addEventListener('input',()=>{clear();status.textContent='Settings changed. Find intervals again to recompute.';});
 button.addEventListener('click',()=>{
  clear();const source=getAccepted();if(!source)return;
  try{
   if(controls.some(c=>!c.value.trim()))throw Error('Supply both a nominal diameter and duration.');
   const proposal=proposeSampledDwells(source,...controls.map(c=>Number(c.value)));
   status.textContent=proposal.intervals.length?`${proposal.intervals.length} maximal candidate intervals. Overlapping alternatives are not separate repetition counts.`:'No selected interval meets both limits.';
   const list=el('ol');
   for(const interval of proposal.intervals){
    const item=el('li');item.dataset.start=interval.startIndex;item.dataset.end=interval.endIndex;
    item.append(el('p',`${interval.startSeconds}–${interval.endSeconds} s · ${interval.momentIds.length} selected points · ${interval.durationSeconds} s · diameter ${interval.diameterMm.toPrecision(6)} mm`));
    for(const id of interval.momentIds){
     const inspect=el('button',`Inspect ${id}${interval.diameterWitnessMomentIds.includes(id)?' · diameter witness':''}`);inspect.type='button';
     inspect.addEventListener('click',()=>{if(getAccepted()===source)inspectMoment(id);});item.append(inspect);
    }
    list.append(item);
   }
   result.append(list,el('p',proposal.boundary),el('p','Saving keeps the complete original account. These temporary proposals are recomputed after reopening.'));
  }catch(error){status.textContent=`Proposal unavailable: ${error.message}`;}
 });
 return {clear};
}
