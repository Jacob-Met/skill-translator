import {selectEvidenceConflictAlternative} from '/src/evidence-conflict-alternatives.mjs';
import {explainEvidenceConflicts} from '/src/evidence-conflicts.mjs';
export function renderEvidenceConflicts({demo,landmarkId,observations,summary,ruleNames,onInspect,groupIndex='0'}){
 let panel=document.getElementById('evidenceConflicts');
 if(!panel){panel=document.createElement('section');panel.id='evidenceConflicts';panel.className='evidence-conflicts';summary.after(panel);}
 const expanded=panel.querySelector('details')?.open||false;
 const base=explainEvidenceConflicts(demo,landmarkId,observations);
 const result=base.status==='contradictory'?selectEvidenceConflictAlternative(demo,landmarkId,observations,groupIndex):base;
 panel.replaceChildren();
 panel.hidden=result.status!=='contradictory';if(panel.hidden)return;
 panel.dataset.minimumSize=result.minimumSize;panel.dataset.groupCount=result.groupCount;panel.dataset.groupIndex=result.groupIndex;
 const heading=document.createElement('h4');heading.textContent='Why no retained interpretation fits';
 const intro=document.createElement('p');intro.textContent=`The smallest contradictory group contains ${result.minimumSize} observation${result.minimumSize===1?'':'s'}. There ${result.groupCount==='1'?'is 1 such group':`are ${result.groupCount} equally small groups`}. Every smallest group is accessible below.`;
 panel.append(heading,intro);
 const navigation=document.createElement('form'),previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('label'),input=document.createElement('input'),jump=document.createElement('button'),message=document.createElement('p');
 const index=BigInt(result.groupIndex),total=BigInt(result.groupCount);
 previous.type=next.type='button';jump.type='submit';previous.textContent='Previous group';next.textContent='Next group';jump.textContent='Inspect group';previous.disabled=index===0n;next.disabled=index+1n===total;
 previous.dataset.groupControl='previous';next.dataset.groupControl='next';input.dataset.groupControl='number';
 input.type='text';input.inputMode='numeric';input.value=String(index+1n);input.maxLength=20;input.size=8;input.setAttribute('aria-label','Group number');label.append(document.createTextNode(`Group of ${total}: `),input);message.setAttribute('role','status');
 const show=(rank,focus)=>{renderEvidenceConflicts({demo,landmarkId,observations,summary,ruleNames,onInspect,groupIndex:String(rank)});const control=panel.querySelector(`[data-group-control="${focus}"]`);(control&&!control.disabled?control:panel.querySelector('[data-group-control="number"]'))?.focus();};
 previous.onclick=()=>show(index-1n,'previous');next.onclick=()=>show(index+1n,'next');
 navigation.onsubmit=event=>{event.preventDefault();if(!/^[1-9][0-9]{0,19}$/.test(input.value)||BigInt(input.value)>total){message.textContent=`Choose a whole-number group from 1 to ${total}. The displayed group is unchanged.`;return;}show(BigInt(input.value)-1n,'number');};
 navigation.append(previous,label,jump,next,message);panel.append(navigation);
 const list=document.createElement('ul');
 for(const observation of result.witness){
  const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=observation.label;button.addEventListener('click',()=>onInspect(observation.id));
  li.append(button,document.createTextNode(` · ${observation.evidenceClass==='authored-example'?'Authored example':'Reported measurement'} · ${observation.widthMm} × ${observation.heightMm} mm; observed (${observation.xMm}, ${observation.yMm}) mm ±${observation.uncertaintyMm} mm.`));list.append(li);
 }
 panel.append(list);
 const details=document.createElement('details'),caption=document.createElement('summary');details.open=expanded;caption.textContent='Inspect rule rejections and alternative-group participation';details.append(caption);
 const rejections=document.createElement('ul');
 for(const item of result.ruleWitnesses){
  const li=document.createElement('li');li.textContent=ruleNames[item.rule]+': '+item.observations.map(r=>{
   const o=result.witness.find(o=>o.id===r.observationId);
   return `${o.label} — ${r.reason||`residual ${r.errorMm.toFixed(3)} mm, declared radius ${o.uncertaintyMm} mm`}`;
  }).join('; ');rejections.append(li);
 }
 details.append(rejections);
 const participation=document.createElement('ul');
 for(const item of result.participation){const li=document.createElement('li'),o=observations.find(o=>o.id===item.observationId);li.textContent=`${o.label}: in ${item.groupCount} of ${result.groupCount} smallest groups${item.inEverySmallestGroup?' (every smallest group)':''}.`;participation.append(li);}
 details.append(participation);panel.append(details);
 const limits=document.createElement('p');limits.textContent=result.limitations.join(' ');panel.append(limits);
}
