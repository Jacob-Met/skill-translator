import {derive,adapt,toDisplay} from '/src/geometry.mjs';
import {demonstration} from '/src/demo.mjs';
import {createContactStudy,importContactStudy,saveContactPatch,removeContactPatch,retargetContactStudy,inspectContactStudy} from '/src/contact-footprint.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg',mm=n=>(Math.abs(n)<1e-10?'0':Number(n.toFixed(3)))+' mm';
let study=createContactStudy(demonstration,demonstration.landmarks[0].id,320,190),selectedId=null,editingId=null,targetDirty=false,patchDirty=false,generation=0;
const mirrored=()=>$('view').value==='mirrored';
const statusName=s=>s==='inside'?'Inside the declared workpiece boundary':s==='overhang'?'Extends beyond the declared workpiece boundary':'At an edge within numerical precision';
function error(text=''){$('footprintError').textContent=text;$('footprintError').hidden=!text;}
function el(parent,tag,text){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;}
function svg(tag,attrs,text=''){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));e.textContent=text;$('footprintSvg').append(e);return e;}
function shapeFields(){const circle=$('patchKind').value==='circle';for(const id of ['widthLabel','heightLabel'])$(id).hidden=circle;$('radiusLabel').hidden=!circle;for(const id of ['patchWidth','patchHeight'])$(id).disabled=circle;$('patchRadius').disabled=!circle;}
function fillSetup(){
 $('markId').replaceChildren();for(const m of study.source.landmarks){const o=el($('markId'),'option',m.label);o.value=m.id;}$('markId').value=study.markId;$('targetWidth').value=study.widthMm;$('targetHeight').value=study.heightMm;
}
function fillPatch(p=null){
 editingId=p?.id??null;
 const fields={patchLabel:p?.label??'Declared contact patch',patchKind:p?.kind??'rectangle',patchWidth:p?.widthMm??50,patchHeight:p?.heightMm??10,patchRadius:p?.radiusMm??10,patchAngle:p?.angleDeg??0,anchorX:p?.anchorMm.x??0,anchorY:p?.anchorMm.y??0,patchEvidence:p?.evidenceKind??'authored',patchProvenance:p?.provenance??''};
 for(const[id,v]of Object.entries(fields))$(id).value=v;patchDirty=false;shapeFields();
}
function readPatch(){return {label:$('patchLabel').value.trim(),kind:$('patchKind').value,widthMm:Number($('patchWidth').value),heightMm:Number($('patchHeight').value),radiusMm:Number($('patchRadius').value),angleDeg:Number($('patchAngle').value),anchorMm:{x:Number($('anchorX').value),y:Number($('anchorY').value)},evidenceKind:$('patchEvidence').value,provenance:$('patchProvenance').value.trim()};}
function draw(report){
 $('footprintSvg').replaceChildren();const target=adapt(derive(study.source),study.widthMm,study.heightMm),ext=report.extrema;
 const patchMin=mirrored()?study.widthMm-ext.maxX:ext.minX,patchMax=mirrored()?study.widthMm-ext.minX:ext.maxX;
 const minX=Math.min(0,patchMin),maxX=Math.max(study.widthMm,patchMax),minY=Math.min(0,ext.minY),maxY=Math.max(study.heightMm,ext.maxY);
 const scale=Math.min(740/(maxX-minX),420/(maxY-minY));
 const left=(900-(maxX-minX)*scale)/2,top=(560-(maxY-minY)*scale)/2;
 const box={x:left-minX*scale,y:top-minY*scale,width:study.widthMm*scale,height:study.heightMm*scale};
 const point=p=>toDisplay({xMm:p.x,yMm:p.y},target,box,mirrored());
 svg('rect',{x:box.x,y:box.y,width:box.width,height:box.height,class:'footprint-paper'});
 if(report.corners){const points=report.corners.map(p=>{const q=point(p);return q.x+','+q.y;}).join(' ');svg('polygon',{points,class:'footprint-outline'});svg('polygon',{points,class:'footprint-shape','data-shape':'rectangle'});}
 else{const c=point(report.center),attrs={cx:c.x,cy:c.y,r:report.patch.radiusMm*scale};svg('circle',{...attrs,class:'footprint-outline'});svg('circle',{...attrs,class:'footprint-shape','data-shape':'circle'});}
 const center=point(report.center),goal=point({x:report.mark.xMm,y:report.mark.yMm});
 svg('line',{x1:center.x,y1:center.y,x2:goal.x,y2:goal.y,class:'footprint-registration'});
 svg('circle',{cx:center.x,cy:center.y,r:4,class:'footprint-center'});
 svg('line',{x1:goal.x-9,y1:goal.y,x2:goal.x+9,y2:goal.y,class:'footprint-target'});svg('line',{x1:goal.x,y1:goal.y-9,x2:goal.x,y2:goal.y+9,class:'footprint-target'});
 svg('text',{x:450,y:585,class:'footprint-dimension'},`${study.widthMm} × ${study.heightMm} mm workpiece · drawing fits the complete declared extent`);
 $('footprintSvg').dataset.markX=report.mark.xMm;$('footprintSvg').dataset.markY=report.mark.yMm;
}
function render(){
 const reports=inspectContactStudy(study),report=reports.find(r=>r.id===selectedId),dirty=targetDirty||patchDirty;
 const target=adapt(derive(study.source),study.widthMm,study.heightMm),mark=target.landmarks.find(m=>m.id===study.markId);
 $('sourceLabel').textContent=(study.source.title||'Imported task')+' · '+(study.source.provenance||'Authored annotation');
 $('targetLabel').textContent=`${mark.label} · ${mm(mark.xMm)} from left / ${mm(mark.yMm)} from top`;
 $('patchFormTitle').textContent=editingId?'Revise selected declaration':'Add a patch alternative';$('savePatch').textContent=editingId?'Save declaration changes':'Retain this alternative';
 $('saveStudy').disabled=dirty;$('savePatch').disabled=targetDirty;$('removePatch').disabled=!selectedId||dirty;$('newPatch').disabled=dirty;$('authoredExample').disabled=dirty;
 $('draftStatus').textContent=dirty?'Uncommitted '+(targetDirty&&patchDirty?'setup and patch':targetDirty?'setup':'patch')+' edits. Apply or discard them before inspecting or exporting.':'Showing retained declarations. Signed clearances are conditional geometric results.';
 $('comparisonView').hidden=dirty||!report;$('emptyStudy').hidden=!!report||dirty;
 $('patchAlternatives').replaceChildren();for(const r of reports){const b=el($('patchAlternatives'),'button','');b.type='button';b.dataset.patch=r.id;b.disabled=dirty;b.setAttribute('aria-pressed',String(r.id===selectedId));el(b,'strong',r.patch.label);el(b,'span',`${r.patch.evidenceKind==='authored'?'Authored':'Reported'} · ${r.patch.angleDeg}° · ${r.state==='overhang'?'Overhang':r.state==='inside'?'Inside boundary':'Numerical boundary'} · minimum ${mm(r.minimumClearanceMm)}`);b.addEventListener('click',()=>{generation++;selectedId=r.id;fillPatch(study.patches.find(p=>p.id===selectedId));error();render();});}
 if(!report)return;
 draw(report);$('comparisonStatus').textContent=statusName(report.state)+'.';$('comparisonStatus').dataset.state=report.state;
 $('geometryDetails').textContent=`Registration remains at the task point. Patch center: ${mm(report.center.x)} from left / ${mm(report.center.y)} from top. Positive clearance lies inward; negative clearance is overhang. ${report.patch.evidenceKind==='authored'?'Authored geometry':'Reported dimensions'}: ${report.patch.provenance}`;
 $('edgeClearances').replaceChildren();for(const[edge,distance]of Object.entries(report.clearancesMm)){const row=el($('edgeClearances'),'div','');row.dataset.edge=edge;row.dataset.value=distance;row.dataset.sign=distance<0?'negative':'nonnegative';el(row,'strong',edge.toUpperCase());el(row,'span',mm(distance));}
 $('unknowns').replaceChildren();for(const text of report.unknowns)el($('unknowns'),'li',text);
}
function install(raw){study=importContactStudy(raw);generation++;selectedId=study.patches[0]?.id??null;targetDirty=false;fillSetup();fillPatch(study.patches.find(p=>p.id===selectedId));error();render();}
async function openFile(input,limit,receive){const file=input.files?.[0];if(!file)return;const ticket=++generation;try{if(file.size>limit)throw Error('Selected file exceeds the admitted size limit.');const text=await file.text();if(ticket!==generation)return;const next=receive(JSON.parse(text));if(ticket!==generation)return;install(next);$('fileStatus').textContent='Source-bound declarations reopened; all extent and clearance results were recomputed.';}catch(e){if(ticket===generation)error('Replacement refused; accepted study retained. '+e.message);}finally{input.value='';}}
function nextId(state=study){for(let i=1;i<=9;i++){const id='patch-'+i;if(!state.patches.some(p=>p.id===id))return id;}}
$('targetForm').addEventListener('submit',e=>{e.preventDefault();try{const next=retargetContactStudy(study,$('markId').value,Number($('targetWidth').value),Number($('targetHeight').value));study=next;generation++;targetDirty=false;fillSetup();error();render();}catch(e){error('Setup refused; accepted study retained. '+e.message);}});
for(const id of ['markId','targetWidth','targetHeight'])$(id).addEventListener('input',()=>{generation++;targetDirty=true;render();});
$('cancelTarget').addEventListener('click',()=>{generation++;targetDirty=false;fillSetup();error();render();});
$('patchForm').addEventListener('input',()=>{generation++;patchDirty=true;shapeFields();render();});
$('patchForm').addEventListener('submit',e=>{e.preventDefault();try{if(targetDirty)throw Error('Apply the task setup first.');const id=editingId??nextId();const next=saveContactPatch(study,id,readPatch());study=next;generation++;selectedId=id;fillPatch(study.patches.find(p=>p.id===id));error();render();}catch(e){error('Declaration refused; accepted alternatives retained. '+e.message);}});
$('quarterTurn').addEventListener('click',()=>{$('patchAngle').value=((Number($('patchAngle').value)+90)%360+360)%360;generation++;patchDirty=true;render();});
$('cancelPatch').addEventListener('click',()=>{generation++;fillPatch(study.patches.find(p=>p.id===selectedId));error();render();});
$('newPatch').addEventListener('click',()=>{generation++;fillPatch();error();render();$('patchLabel').focus();});
$('removePatch').addEventListener('click',()=>{try{study=removeContactPatch(study,selectedId);generation++;selectedId=study.patches[0]?.id??null;fillPatch(study.patches.find(p=>p.id===selectedId));error();render();}catch(e){error(e.message);}});
$('view').addEventListener('change',render);
$('authoredExample').addEventListener('click',()=>{try{let next=study,firstId;for(const angle of [0,90]){const id=nextId(next);firstId??=id;next=saveContactPatch(next,id,{label:`Authored 50 × 10 · ${angle}°`,kind:'rectangle',widthMm:50,heightMm:10,anchorMm:{x:0,y:0},angleDeg:angle,evidenceKind:'authored',provenance:'Analytic rectangle control; not a measured tool or physical outcome.'});}study=next;generation++;selectedId=firstId;fillPatch(study.patches.find(p=>p.id===selectedId));error();render();}catch(e){error(e.message);}});
$('sourceFile').addEventListener('change',()=>openFile($('sourceFile'),256*1024,raw=>createContactStudy(raw,raw.landmarks?.[0]?.id,raw.source?.widthMm,raw.source?.heightMm)));
$('studyFile').addEventListener('change',()=>openFile($('studyFile'),512*1024,importContactStudy));
$('saveStudy').addEventListener('click',()=>{try{if(targetDirty||patchDirty)throw Error('Apply or discard draft changes before export.');const text=JSON.stringify(importContactStudy(study),null,2),blob=new Blob([text],{type:'application/json'});if(blob.size>512*1024)throw Error('Export exceeds 512 KiB.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='skill-contact-patches.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e.message);}});
fillSetup();fillPatch();render();
