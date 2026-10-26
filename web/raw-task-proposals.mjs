import {createRawTask,inspectRawTask,exportRawTask,RAW_TASK_FORMAT,MAX_RAW_TASK_BYTES} from '../src/raw-task-proposals.mjs';
import {importRawRuleProposal,RAW_RULE_PROPOSAL_FORMAT} from '../src/raw-rule-proposals.mjs';
import {createPractice} from '../src/practice.mjs';
import {derive,adapt} from '../src/geometry.mjs';
import {createRawChallengeImage} from './raw-challenge-image.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
let result=null,generation=0,dirty=false,pending=false,markIndex=0,sourceIndex=-1;
const status=text=>{$('status').textContent=text;};
const current=()=>result?.findings[markIndex];
const selected=()=>{const f=current();return !f?null:sourceIndex<0?{annotation:f.account.referenceStudy.source,landmarkId:f.landmarkId,label:'Original reference'}:f.account.demonstrations[sourceIndex];};
const image=createRawChallengeImage(selected,status);
function availability(){const ready=!!result&&!dirty&&!pending;$('save').disabled=!ready;$('compare').disabled=!result||pending;$('accept').disabled=!ready||!result.proposedSource;$('practice').disabled=!ready||!result.proposedSource||!$('accept').checked;}
function invalidate(){generation++;pending=false;$('accept').checked=false;availability();}
function draw(){
 const map=$('task-map');map.replaceChildren();
 const add=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;map.append(n);};
 const target=result.account.target,scale=Math.min(590/target.widthMm,270/target.heightMm),left=(700-target.widthMm*scale)/2,top=(400-target.heightMm*scale)/2,p=m=>({x:left+m.xMm*scale,y:top+m.yMm*scale});
 add('rect',{x:left,y:top,width:target.widthMm*scale,height:target.heightMm*scale,fill:'#edf3ec',stroke:'#214e3d'});
 let original;try{original=adapt(derive(result.originalSource),target.widthMm,target.heightMm);}catch{}
 for(const mark of result.proposedTarget?.landmarks??original?.landmarks??[]){const point=p(mark),before=original?.landmarks.find(m=>m.id===mark.id),prior=before?p(before):null,supported=!!result.proposedTarget&&result.supported.includes(mark.id);
  if(prior){add('line',{x1:prior.x,y1:prior.y,x2:point.x,y2:point.y,stroke:'#9c7c24'});add('circle',{cx:prior.x,cy:prior.y,r:9,fill:'none',stroke:'#9c7c24','stroke-width':2});}
  if(supported)add('path',{d:`M ${point.x} ${point.y-6} l 6 6 l -6 6 l -6 -6 Z`,fill:'#207a63'});else add('rect',{x:point.x-5,y:point.y-5,width:10,height:10,fill:'#765611'});
  add('text',{x:point.x,y:point.y-17,'text-anchor':'middle',fill:'#17312f','font-size':14},mark.label);
 }
 add('text',{x:25,y:25,fill:'#17312f','font-size':14},`${target.widthMm} × ${target.heightMm} mm`);
}
function inspectSource(){image.release();image.draw();}
function details(){
 const f=current();if(!f)return;
 $('mark-status').textContent=`${f.label}: ${f.status}. ${f.proposal?'Proposed '+f.proposal:'No unique proposal; original '+f.originalRule+' rule remains'}. ${f.response.observations.length} retained readings.`;
 $('candidates').replaceChildren(...f.candidates.map(c=>{const block=node('div','');block.append(node('h3',c.rule+' · '+c.status));for(const r of c.readings){const o=f.response.observations.find(o=>o.id===r.observationId);block.append(node('p',`${o.label} · ${o.evidenceClass}: observed (${o.xMm}, ${o.yMm}) mm; x±${o.xBoundMm}, y±${o.yBoundMm}. ${r.predicted?`Prediction (${r.predicted.xMm}, ${r.predicted.yMm}); x ${r.xWithin?'within':'outside'}, y ${r.yWithin?'within':'outside'}.`:r.reason}`));}return block;}));
 $('inspection').replaceChildren(...[{label:'Original reference'},...f.account.demonstrations].map((row,index)=>{const option=node('option',row.label);option.value=index-1;return option;}));sourceIndex=-1;inspectSource();
}
function install(account){
 const next=inspectRawTask(account);$('accounts').value='';image.release();result=next;generation++;pending=false;dirty=false;markIndex=0;sourceIndex=-1;$('accept').checked=false;
 $('width').value=result.account.target.widthMm;$('height').value=result.account.target.heightMm;$('workspace').hidden=false;
 $('summary').textContent=`${result.supported.length} uniquely supported mark(s); ${result.unresolved.length} examined but unresolved; ${result.unexamined.length} unexamined. Every unresolved or unexamined mark keeps its original authored rule.`;
 $('mark-list').replaceChildren(...result.originalSource.landmarks.map(m=>{const f=result.findings.find(f=>f.landmarkId===m.id),box=node('div','');box.className='mark-row';box.append(node('h3',m.label),node('p',f?.proposal?`${f.originalRule} → ${f.proposal}`:`Unchanged ${m.kind==='fraction'?'fraction':m.edge} · ${f?.status??'unexamined'}`));const target=result.proposedTarget?.landmarks.find(t=>t.id===m.id);if(target)box.append(node('p',`(${target.xMm.toFixed(3)}, ${target.yMm.toFixed(3)}) mm`));return box;}));
 $('target-error').textContent=result.targetError?'No complete practice setup: '+result.targetError:!result.supported.length?'No unique supported proposal is available; no practice source is produced.':'';$('limits').textContent=result.limitation;
 $('mark').replaceChildren(...result.findings.map((f,i)=>{const option=node('option',f.label);option.value=i;return option;}));details();draw();availability();status('Complete task accepted. All proposals and task positions recomputed from retained raw sources.');
}
const dimensions=()=>({widthMm:$('width').valueAsNumber,heightMm:$('height').valueAsNumber});
$('accounts').onchange=async()=>{
 const token=++generation,files=[...$('accounts').files],target=dimensions();pending=true;$('accept').checked=false;availability();status('Reading replacement accounts; previous accepted task remains displayed.');
 try{if(files.length<1||files.length>12||files.reduce((sum,f)=>sum+f.size,0)>MAX_RAW_TASK_BYTES)throw Error('Choose 1–12 files totaling at most 2 MB.');
  const raw=await Promise.all(files.map(async file=>JSON.parse(await file.text())));if(token!==generation)return;
  if(raw.some(r=>r.format===RAW_TASK_FORMAT)){if(raw.length!==1)throw Error('Reopen a complete task by itself.');install(raw[0]);}
  else install(createRawTask(raw.map(r=>r.format===RAW_RULE_PROPOSAL_FORMAT?importRawRuleProposal(r).account:r),target));
 }catch(e){if(token===generation)status('Import refused; previous accepted task retained. '+e.message);}
 finally{if(token===generation){pending=false;availability();$('accounts').value='';}}
};
for(const id of ['width','height'])$(id).oninput=()=>{dirty=true;invalidate();status('Task size is a draft. Compare this task size before saving or practice.');};
$('compare').onclick=()=>{if(!result)return;invalidate();try{install({...result.account,target:dimensions()});}catch(e){status('Target refused; accepted task retained. '+e.message);availability();}};
$('mark').onchange=()=>{markIndex=Number($('mark').value);details();};
$('inspection').onchange=()=>{sourceIndex=Number($('inspection').value);inspectSource();};
$('accept').onchange=availability;
$('save').onclick=()=>{if(!result||dirty||pending)return;const raw=exportRawTask(result.account),url=URL.createObjectURL(new Blob([JSON.stringify(raw)],{type:'application/json'})),a=node('a','');a.href=url;a.download='skill-complete-demonstrated-task.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('practice').onclick=()=>{if(!result?.proposedSource||dirty||pending||!$('accept').checked)return;try{const demo=result.proposedSource,{widthMm,heightMm}=result.account.target;createPractice(demo,widthMm,heightMm);sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify({demo,widthMm,heightMm,mirrored:false,showGoals:true}));location.assign('/practice');}catch(e){status('Practice unavailable; complete accepted account retained. '+e.message);}};
window.addEventListener('pagehide',()=>{generation++;});
