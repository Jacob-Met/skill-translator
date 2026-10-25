import {inspectAssistanceTrace} from '/src/assistance-trace.mjs';
import {toDisplay} from '/src/geometry.mjs';
const ns='http://www.w3.org/2000/svg';
const el=(tag,text,parent)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;parent?.append(node);return node;};
const mm=n=>n===null?'Not available':`${n.toFixed(3)} mm`;
function svg(parent,tag,attrs,text){const node=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;parent.append(node);return node;}

export function renderAssistanceTrace(host,raw,trialIndex){
 host.replaceChildren();host.className='assistance-trace';
 el('h4','Retrace a mark’s revisions',host);
 el('p','Inspect the diagram edits retained before and after recorded target requests. Connecting lines show successive edits, not a measured physical movement.',host);
 const label=el('label','Task mark ',host),mark=el('select',undefined,label);mark.setAttribute('aria-label',`Revision mark for trial ${trialIndex+1}`);
 raw.source.landmarks.forEach(m=>{const o=el('option',m.label,mark);o.value=m.id;});
 const viewLabel=el('label',' Display ',host),view=el('select',undefined,viewLabel);view.setAttribute('aria-label',`Revision display for trial ${trialIndex+1}`);
 for(const [value,text]of [['standard','Standard'],['mirrored','Mirrored']]){const o=el('option',text,view);o.value=value;}
 const plot=document.createElementNS(ns,'svg');plot.setAttribute('viewBox','0 0 800 440');plot.setAttribute('role','img');plot.setAttribute('aria-label','Selected task mark diagram edits, target and recorded help boundary');plot.style.width='100%';plot.style.maxHeight='440px';host.append(plot);
 const status=el('p','',host);status.dataset.traceStatus='';status.setAttribute('role','status');
 const control=el('div',undefined,host),previous=el('button','Previous action',control),next=el('button','Next action',control);
 previous.type=next.type='button';const rangeLabel=el('label',' Retained action ',control),range=el('input',undefined,rangeLabel);range.type='range';range.min='0';range.step='1';range.setAttribute('aria-label',`Retained revision action for trial ${trialIndex+1}`);
 const detail=el('p','',host),help=el('p','',host),limits=el('p','',host);detail.dataset.traceDetail='';help.dataset.traceHelp='';let trace,index=0;
 function draw(){
  plot.replaceChildren();const entry=trace.entries[index];range.value=String(index);range.max=String(Math.max(0,trace.entries.length-1));range.disabled=!entry;previous.disabled=index===0;next.disabled=index>=trace.entries.length-1;
  if(!trace.submitted){status.textContent='Commit this trial before reviewing its revision trace.';detail.textContent='';help.textContent='';return;}
  const scale=Math.min(700/trace.widthMm,340/trace.heightMm),box={x:30,y:25,width:trace.widthMm*scale,height:trace.heightMm*scale};
  const plotWidth=box.width+60,plotHeight=box.height+80;plot.setAttribute('viewBox',`0 0 ${plotWidth} ${plotHeight}`);
  const display=p=>toDisplay(p,trace,box,view.value==='mirrored');
  svg(plot,'rect',{x:box.x,y:box.y,width:box.width,height:box.height,fill:'#e7eee8',stroke:'#89a79b'});
  const target=display(trace.target),tolerance=raw.source.landmarks.find(m=>m.id===trace.markId).toleranceMm;
  svg(plot,'circle',{cx:target.x,cy:target.y,r:Math.max(1,tolerance*scale),fill:'none',stroke:'#264d3d','stroke-width':2});
  svg(plot,'path',{d:`M${target.x-7} ${target.y}h14 M${target.x} ${target.y-7}v14`,stroke:'#264d3d','stroke-width':2});
  let previousPoint=null;
  trace.entries.slice(0,index+1).forEach(e=>{
   if(e.type!=='place')return;const p=display(e.point),color=e.requestsBefore?'#007f83':'#aa5a08';
   if(previousPoint)svg(plot,'line',{x1:previousPoint.x,y1:previousPoint.y,x2:p.x,y2:p.y,stroke:color,'stroke-width':2,'stroke-dasharray':'5 5'});
   svg(plot,'circle',{cx:p.x,cy:p.y,r:4,fill:color});previousPoint=p;
  });
  if(entry?.point){const p=display(entry.point);svg(plot,'circle',{cx:p.x,cy:p.y,r:8,fill:'none',stroke:'#172d25','stroke-width':3});}
  svg(plot,'text',{x:plotWidth/2,y:plotHeight-10,fill:'#d9e9e2','text-anchor':'middle'},`${trace.widthMm} × ${trace.heightMm} mm · ${view.value} view`);
  status.textContent=entry?`Retained action ${entry.actionIndex+1} · ${entry.type==='place'?'Placement revision':entry.type==='reveal'?'Targets requested':'Trial committed'}`:'No retained action.';
  detail.textContent=entry?.point?`Retained point: ${mm(entry.point.xMm)} across / ${mm(entry.point.yMm)} down. Error against source target: ${mm(entry.evaluation.errorMm)}. ${entry.movementMm===null?'':`Change from previous placement: ${mm(entry.movementMm)}.`}`:'No placement for this mark at this action.';
  help.textContent=entry?`${entry.requestsBefore} target request(s) before this action; ${entry.requestsAfter} after it. Brown: edits before the first recorded request. Teal: edits after a recorded request. Cross: original task target.`:'';
 }
 function install(){trace=inspectAssistanceTrace(raw,trialIndex,mark.value);index=0;limits.textContent=(trace.limitations??[]).join(' ');draw();}
 mark.addEventListener('change',install);view.addEventListener('change',draw);range.addEventListener('input',()=>{index=Number(range.value);draw();});previous.addEventListener('click',()=>{index=Math.max(0,index-1);draw();});next.addEventListener('click',()=>{index=Math.min(trace.entries.length-1,index+1);draw();});install();
}
