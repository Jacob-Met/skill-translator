import {importPractice} from '/src/practice.mjs';
import {createCornerAngle,importCornerAngle,reviewCornerRounds} from '/src/corner-angle.mjs';
const $=id=>document.getElementById(id);let context=null,accepted=null,epoch=0;
const mm=n=>n===null?'Unavailable':`${n.toFixed(4)} mm`,point=p=>p?`${mm(p.xMm)} across / ${mm(p.yMm)} down`:'Missing';
function options(node,rows,selected){node.replaceChildren();for(const [value,label]of rows){const o=document.createElement('option');o.value=value;o.textContent=label;node.append(o);}node.value=String(selected);}
function populate(source,session,rule=null,selectedRound=session.round){
 const marks=source.landmarks.map(m=>[m.id,m.label]);for(const [id,index]of [['from',0],['to',2],['vertex',1]])options($(id),marks,rule?.[id]??marks[index][0]);
 options($('round'),Array.from({length:session.round},(_,i)=>[String(i+1),`Round ${i+1}`]),selectedRound);
 $('label').value=rule?.label??'Corner angle';$('basis').value=rule?.basis??'';$('tolerance').value=rule?.toleranceDegrees??1;
 const size=session.reference.target;$('source-title').textContent=`${source.title||'Retained source'} · ${size.widthMm} × ${size.heightMm} mm`;$('workspace').hidden=false;
}
function dirty(){epoch++;$('results').hidden=true;$('save').disabled=true;$('status').textContent='Criterion or round changed. Inspect before reading or saving new findings.';}
for(const id of ['from','to','vertex','round','label','basis','tolerance'])$(id).addEventListener('input',dirty);
for(const id of ['source-file','session-file'])$(id).addEventListener('change',()=>{epoch++;});
async function read(file,limit){if(!file)throw Error('Select the required JSON file');if(file.size>limit)throw Error('File exceeds its stated size limit');return JSON.parse(await file.text());}
$('load').addEventListener('click',async()=>{const token=++epoch;try{const [source,raw]=await Promise.all([read($('source-file').files[0],256*1024),read($('session-file').files[0],1024*1024)]);if(token!==epoch)return;if(source.landmarks?.length<3)throw Error('A corner requires at least three source marks');const size=raw.reference?.target;if(!size)throw Error('Open a retained practice session');const session=importPractice(source,size.widthMm,size.heightMm,raw);context={source,session};accepted=null;populate(source,session);$('results').hidden=true;$('save').disabled=true;$('error').textContent='';$('status').textContent='Original source and complete practice history accepted. Declare a corner relationship.';}catch(e){if(token===epoch)$('error').textContent=`Input refused; previous accepted review retained. ${e.message}`;}});
$('reopen').addEventListener('change',async()=>{const token=++epoch;try{const next=importCornerAngle(await read($('reopen').files[0],2*1024*1024));if(token!==epoch)return;context={source:next.source,session:next.session};accepted=next;populate(next.source,next.session,next.rule,next.selectedRound);render();$('error').textContent='';$('status').textContent='Raw review reopened; source, rounds and declared criterion revalidated.';}catch(e){if(token===epoch)$('error').textContent=`Review refused; previous accepted review retained. ${e.message}`;}finally{if(token===epoch)$('reopen').value='';}});
$('criterion').addEventListener('submit',event=>{event.preventDefault();epoch++;try{if(!context)throw Error('Open source and practice first');const rule={from:$('from').value,to:$('to').value,vertex:$('vertex').value,label:$('label').value,basis:$('basis').value,toleranceDegrees:Number($('tolerance').value)};const next=createCornerAngle(context.source,context.session,rule,Number($('round').value));accepted=next;render();$('error').textContent='';$('status').textContent='Declared corner inspected; original placements and point criteria are unchanged.';}catch(e){$('error').textContent=e.message;}});
function svg(parent,tag,attrs,text){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;parent.append(node);return node;}
const deg=n=>n===null?'Unavailable':`${n.toFixed(4)}°`;
function render(){
 const result=reviewCornerRounds(accepted).find(r=>r.round===accepted.selectedRound),practice=result.practice;
 $('point-score').textContent=`Original complete-task point score: ${!practice.complete?'incomplete':practice.passed?'within every original tolerance':'outside one or more original tolerances'}. ${practice.placed}/${practice.total} marks retained.`;
 $('corner-score').textContent=`Declared corner relationship: ${result.status}.`;
 $('measurement').textContent=result.differenceDegrees===null?`No angular comparison: ${result.missing.length?'missing '+result.missing.join(', '):!result.reference.resolved?'reference corner has an unresolved arm':'retained corner has an unresolved arm'}.`:`Reference directed angle ${deg(result.reference.degrees)}; retained ${deg(result.observed.degrees)}; circular difference ${deg(result.differenceDegrees)} against allowed ±${deg(accepted.rule.toleranceDegrees)}.`;
 $('arms').textContent=result.observed?.resolved?`Retained first arm ${mm(result.observed.firstLength)}; second arm ${mm(result.observed.secondLength)}. Arm length is reported separately and is not constrained by this angle criterion.`:'Retained arm lengths do not define a resolved corner.';
 $('guard').textContent=`Numerical arm-length guard: ${result.lengthGuard} mm; comparison guard: ${result.angleGuardDegrees} degrees. These are computational conventions, not physical measurement uncertainty.`;
 $('boundary').textContent='Positive angles turn clockwise in across/down coordinates. Differences follow the shorter signed turn; at exactly half a turn the displayed difference is −180°. This declared angle does not establish contact, fit, a correction movement or physical skill.';
 $('coordinates').replaceChildren();result.corner.forEach((row,i)=>{const tr=document.createElement('tr');for(const value of [`${['First arm','Vertex','Second arm'][i]} · ${row.label}`,point(row.target),point(row.attempt)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('coordinates').append(tr);});
 draw(result);$('results').hidden=false;$('save').disabled=false;
}
function draw(result){
 const plot=$('corner-plot'),{widthMm:w,heightMm:h}=accepted.session.reference.target;plot.replaceChildren();const pad=Math.max(w,h)*.07,unit=Math.max(w,h)/180;plot.setAttribute('viewBox',`${-pad} ${-pad} ${w+2*pad} ${h+2*pad}`);
 svg(plot,'rect',{x:0,y:0,width:w,height:h,fill:'#eef3ed',stroke:'#638374','stroke-width':unit/2});
 for(const [key,measurement,color,dashed]of [['target',result.reference,'#216a9c',true],['attempt',result.observed,'#ad5000',false]]){
  const [a,v,b]=result.corner.map(row=>row[key]);
  if(v)for(const p of [a,b])if(p)svg(plot,'line',{x1:v.xMm,y1:v.yMm,x2:p.xMm,y2:p.yMm,stroke:color,'stroke-width':unit,'stroke-dasharray':dashed?`${4*unit} ${3*unit}`:''});
  if(a&&v&&b&&measurement?.resolved){const radius=Math.min(measurement.firstLength,measurement.secondLength)*.28,ax=(a.xMm-v.xMm)/measurement.firstLength,ay=(a.yMm-v.yMm)/measurement.firstLength,bx=(b.xMm-v.xMm)/measurement.secondLength,by=(b.yMm-v.yMm)/measurement.secondLength;svg(plot,'path',{d:`M${v.xMm+ax*radius},${v.yMm+ay*radius} A${radius},${radius} 0 0 ${measurement.degrees>=0?1:0} ${v.xMm+bx*radius},${v.yMm+by*radius}`,fill:'none',stroke:color,'stroke-width':unit,'stroke-dasharray':dashed?`${2*unit} ${2*unit}`:''});}
  [a,v,b].forEach((p,i)=>{if(!p)return;svg(plot,i===1?'rect':'circle',i===1?{x:p.xMm-unit*2,y:p.yMm-unit*2,width:unit*4,height:unit*4,fill:color}:{cx:p.xMm,cy:p.yMm,r:unit*2,fill:color});});
 }
}
$('save').addEventListener('click',()=>{if(!accepted||$('save').disabled)return;const blob=new Blob([JSON.stringify(importCornerAngle(accepted))],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='skill-corner-angle.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
