import {demonstration} from '/src/demo.mjs';
import {analyzeSensitivity,exportSensitivity,importSensitivity,sensitivitySettings} from '/src/sensitivity.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const keys=['cornerPx','landmarkPx','sourceWidthMm','sourceHeightMm','targetWidthMm','targetHeightMm'];
const fmt=n=>Math.abs(n)>0&&Math.abs(n)<.001?n.toExponential(2):n.toFixed(3).replace(/\.?0+$/,'')||'0';
let demo=structuredClone(demonstration),landmarkId=demo.landmarks[0].id,widthMm=320,heightMm=190;
let settings=sensitivitySettings({cornerPx:1,landmarkPx:1}),analysis,intent=0;
function error(text){$('sensitivityError').hidden=!text;$('sensitivityError').textContent=text;}
function svg(parent,tag,attrs,text=''){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;parent.append(e);return e;}
function plot(){
 const s=$('sensitivityPlot');s.replaceChildren();
 const extent=1.22*Math.max(.05,analysis.nominal.toleranceMm,...analysis.valid.flatMap(p=>[Math.abs(p.dxMm),Math.abs(p.dyMm)]));
 const scale=190/extent,cx=350,cy=250;
 for(const q of [-1,-.5,0,.5,1]){
  svg(s,'line',{x1:cx-190,y1:cy+q*190,x2:cx+190,y2:cy+q*190,class:q===0?'sensitivity-axis':'sensitivity-grid'});
  svg(s,'line',{x1:cx+q*190,y1:cy-190,x2:cx+q*190,y2:cy+190,class:q===0?'sensitivity-axis':'sensitivity-grid'});
  svg(s,'text',{x:cx+q*190,y:cy+215,class:'sensitivity-tick'},fmt(q*extent));
  if(q)svg(s,'text',{x:cx-216,y:cy+q*190+4,class:'sensitivity-tick'},fmt(q*extent));
 }
 svg(s,'circle',{cx,cy,r:analysis.nominal.toleranceMm*scale,class:'sensitivity-tolerance'});
 for(const p of [...analysis.valid.filter(p=>p.kind==='combined'),...analysis.valid.filter(p=>p.kind==='individual')]){
  const circle=svg(s,'circle',{cx:cx+p.dxMm*scale,cy:cy+p.dyMm*scale,r:p.kind==='individual'?4:2.8,class:'sensitivity-'+p.kind});
  svg(circle,'title',{},p.id+': '+fmt(p.dxMm)+' mm right, '+fmt(p.dyMm)+' mm down');
 }
 svg(s,'line',{x1:cx-7,y1:cy,x2:cx+7,y2:cy,class:'sensitivity-origin'});svg(s,'line',{x1:cx,y1:cy-7,x2:cx,y2:cy+7,class:'sensitivity-origin'});
 svg(s,'text',{x:cx,y:505,class:'sensitivity-tick'},'Millimetres right of the accepted target');
 svg(s,'text',{x:22,y:30,class:'sensitivity-axis-label'},'Vertical displacement: millimetres down');
}
function sourceGeometry(){
 const s=$('sourceGeometry');s.replaceChildren();const points=demo.source.corners,mark=demo.landmarks.find(m=>m.id===landmarkId);
 const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));
 const spanX=Math.max(...points.map(p=>p.x))-minX,spanY=Math.max(...points.map(p=>p.y))-minY,scale=Math.min(260/spanX,160/spanY);
 const project=p=>({x:(320-spanX*scale)/2+(p.x-minX)*scale,y:(220-spanY*scale)/2+(p.y-minY)*scale});
 svg(s,'polygon',{points:points.map(p=>{const q=project(p);return q.x+','+q.y;}).join(' '),class:'annotation-sheet'});
 points.forEach((p,i)=>{const q=project(p);svg(s,'circle',{cx:q.x,cy:q.y,r:4,class:'annotation-corner'});svg(s,'text',{x:q.x+8,y:q.y+13,class:'annotation-number'},String(i+1));});
 const p=project(mark.sourcePx);svg(s,'circle',{cx:p.x,cy:p.y,r:6,class:'annotation-dot'});
 $('geometryCaption').textContent=demo.source.widthMm+' × '+demo.source.heightMm+' mm source. Geometry shown here; original image pixels stay in the capture/workbench view.';
}
function render(){
 $('sourceIdentity').textContent=(demo.title||'Accepted source')+' · '+(demo.provenance||'Authored annotation')+' · practice sheet '+widthMm+' × '+heightMm+' mm'+(demo.source.image?' · source image '+demo.source.image.sha256:'');
 $('sensitivityLabel').textContent=analysis.label.toUpperCase();
 $('maxShift').textContent=fmt(analysis.maxSampledShiftMm)+' mm';$('maxShift').dataset.value=String(analysis.maxSampledShiftMm);
 $('taskTolerance').textContent=fmt(analysis.nominal.toleranceMm)+' mm';
 $('toleranceMeaning').textContent=analysis.exceedsDeclaredTolerance?'At least one sampled change moves the target beyond the declared placement tolerance. Recheck the sensitive inputs before relying on that precision.':'No sampled movement exceeds the declared tolerance. Unsampled or unmodeled changes can still move the mark further.';
 $('scenarioCount').textContent=analysis.validScenarios+' valid predictions / '+analysis.totalScenarios+' scenarios · '+analysis.invalidScenarios+' refused';
 $('refusedScenarios').hidden=!analysis.invalidScenarios;const reasons=$('refusalReasons');reasons.replaceChildren();
 for(const r of analysis.reasons){const li=document.createElement('li');li.textContent=r.count+' × '+r.reason;reasons.append(li);}
 const influences=$('inputInfluences');influences.replaceChildren();
 if(!analysis.influences.length)influences.textContent='All perturbations are zero. Enter a hypothetical change to compare inputs.';
 for(const influence of analysis.influences){const row=document.createElement('div');row.className='influence-row';const label=document.createElement('span');label.textContent=influence.label;const value=document.createElement('strong');value.textContent=(influence.maxIndividualShiftMm===null?'No valid case':fmt(influence.maxIndividualShiftMm)+' mm')+(influence.invalidIndividualCases?' · '+influence.invalidIndividualCases+' refused':'');row.append(label,value);influences.append(row);}
 plot();sourceGeometry();document.body.dataset.status='ready';
}
function install(nextDemo,id,w,h,assumptions){
 const result=analyzeSensitivity(nextDemo,id,w,h,assumptions);
 demo=nextDemo;landmarkId=id;widthMm=w;heightMm=h;settings=result.settings;analysis=result;
 const select=$('sensitivityMark');select.replaceChildren();for(const mark of demo.landmarks){const option=document.createElement('option');option.value=mark.id;option.textContent=mark.label;select.append(option);}select.value=id;
 for(const key of keys)$(key).value=settings[key];$('saveSensitivity').disabled=false;$('assumptionStatus').textContent='Showing the applied assumptions.';error('');render();
}
$('sensitivityForm').addEventListener('input',()=>{intent++;$('saveSensitivity').disabled=true;$('assumptionStatus').textContent='Assumptions changed. Run them to update the experiment before saving.';});
$('sensitivityForm').addEventListener('submit',e=>{e.preventDefault();intent++;try{install(demo,$('sensitivityMark').value,widthMm,heightMm,Object.fromEntries(keys.map(k=>[k,Number($(k).value)])));}catch(err){error('Changes refused; the previous experiment remains visible. '+err.message);}});
$('saveSensitivity').addEventListener('click',()=>{try{const bundle=exportSensitivity(demo,landmarkId,widthMm,heightMm,settings);const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='skill-calibration-sensitivity.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);$('sensitivityFileStatus').textContent='Saved the exact source, selected mark, dimensions and assumptions.';}catch(err){error(err.message);}});
$('openSensitivity').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const generation=++intent;try{if(file.size>512*1024)throw Error('Sensitivity session must be ≤512 KB');const bundle=JSON.parse(await file.text());if(generation!==intent)return;const next=importSensitivity(bundle);install(next.demo,next.landmarkId,next.widthMm,next.heightMm,next.settings);$('sensitivityFileStatus').textContent='Reopened and recomputed the experiment from its saved source and assumptions.';}catch(err){if(generation===intent)error('Session refused; the previous experiment remains visible. '+err.message);}finally{e.target.value='';}});
let startupError='';
try{const raw=sessionStorage.getItem('skill-translator-sensitivity-input/v1');if(raw){const input=JSON.parse(raw);analyzeSensitivity(input.demo,input.landmarkId,input.widthMm,input.heightMm,settings);demo=input.demo;landmarkId=input.landmarkId;widthMm=input.widthMm;heightMm=input.heightMm;}if(sessionStorage.getItem('skill-translator-practice-resume/v1'))$('returnPractice').href='/practice?resume=calibration';}catch(err){startupError='Saved setup unavailable; the authored example is shown. '+err.message;}
install(demo,landmarkId,widthMm,heightMm,settings);if(startupError)error(startupError);
