import {explainEvidenceConflicts} from '/src/evidence-conflicts.mjs';
export function renderEvidenceConflicts({demo,landmarkId,observations,summary,ruleNames,onInspect}){
 let panel=document.getElementById('evidenceConflicts');
 if(!panel){panel=document.createElement('section');panel.id='evidenceConflicts';panel.className='evidence-conflicts';summary.after(panel);}
 panel.replaceChildren();const result=explainEvidenceConflicts(demo,landmarkId,observations);
 panel.hidden=result.status!=='contradictory';if(panel.hidden)return;
 panel.dataset.minimumSize=result.minimumSize;panel.dataset.groupCount=result.groupCount;
 const heading=document.createElement('h4');heading.textContent='Why no retained interpretation fits';
 const intro=document.createElement('p');intro.textContent=`The smallest contradictory group contains ${result.minimumSize} observation${result.minimumSize===1?'':'s'}. There ${result.groupCount==='1'?'is 1 such group':`are ${result.groupCount} equally small groups`}. One complete example follows.`;
 panel.append(heading,intro);
 const list=document.createElement('ul');
 for(const observation of result.witness){
  const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=observation.label;button.addEventListener('click',()=>onInspect(observation.id));
  li.append(button,document.createTextNode(` · ${observation.evidenceClass==='authored-example'?'Authored example':'Reported measurement'} · ${observation.widthMm} × ${observation.heightMm} mm; observed (${observation.xMm}, ${observation.yMm}) mm ±${observation.uncertaintyMm} mm.`));list.append(li);
 }
 panel.append(list);
 const details=document.createElement('details'),caption=document.createElement('summary');caption.textContent='Inspect rule rejections and alternative-group participation';details.append(caption);
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
