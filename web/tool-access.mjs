import {demonstration} from '/src/demo.mjs';
import {analyzeToolAccess,createToolStudy,importToolStudy,EDGES} from '/src/tool-access.mjs';
import {createPractice} from '/src/practice.mjs';
const $=id=>document.getElementById(id);
let state,analysis,epoch=0,dirty=false;
const initialTool={label:'Authored edge-fed tool',basis:'Illustrative geometric dimensions; not measured equipment',evidenceClass:'authored-example',minDepthMm:0,maxDepthMm:40,halfWidthMm:12,edges:[...EDGES]};
const say=text=>{$('status').textContent=text;};
const fmt=n=>n.toFixed(2);
const marginLabels={minimumDepthMm:'Minimum insertion margin',maximumDepthMm:'Throat margin',firstSideMm:'First side support',secondSideMm:'Second side support'};
const numeric=id=>{if(!$(id).value.trim())throw Error('Supply '+id);return Number($(id).value);};
function draft(){return {label:$('toolName').value,basis:$('basis').value,evidenceClass:$('evidenceClass').value,minDepthMm:numeric('minDepth'),maxDepthMm:numeric('maxDepth'),halfWidthMm:numeric('halfWidth'),edges:EDGES.filter(e=>$(e).checked)};}
function setDirty(){epoch++;dirty=true;$('save').disabled=$('practice').disabled=true;say('Inputs changed. Compare the setup to replace the displayed accepted result.');}
function accept(next){state=next;analysis=analyzeToolAccess(state.source,state.reference.target.widthMm,state.reference.target.heightMm,state.tool);dirty=false;
 const t=state.tool;for(const [id,value]of Object.entries({width:state.reference.target.widthMm,height:state.reference.target.heightMm,toolName:t.label,basis:t.basis,evidenceClass:t.evidenceClass,minDepth:t.minDepthMm,maxDepth:t.maxDepthMm,halfWidth:t.halfWidthMm}))$(id).value=value;
 EDGES.forEach(e=>$(e).checked=t.edges.includes(e));$('sourceTitle').textContent=String(state.source.title||'Untitled source');$('provenance').textContent=String(state.source.provenance||'Authored annotation');$('unknowns').textContent='Source unknowns: '+(Array.isArray(state.source.unknowns)?state.source.unknowns.map(String).join(' · '):'not supplied');
 $('mark').replaceChildren();for(const r of analysis.rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.label;$('mark').append(o);}
 $('summary').textContent=analysis.uncovered.length?analysis.uncovered.length+' mark(s) have no compatible available edge: '+analysis.uncovered.join(', '):'Every mark has a compatible available approach under these declared dimensions.';
 $('setups').replaceChildren();for(const s of analysis.minimalSetups){const li=document.createElement('li');li.textContent=s.edges.join(' + ')+' — '+s.assignments.map(a=>a.id+': '+a.edges.join(' or ')).join('; ');$('setups').append(li);}if(!analysis.minimalSetups.length){const li=document.createElement('li');li.textContent='No complete setup in the offered edges. Inspect the failed margins before changing the tool or available edges.';$('setups').append(li);}
 $('matrix').replaceChildren();for(const r of analysis.rows){const tr=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=r.label;tr.append(name);for(const a of r.approaches){const td=document.createElement('td');td.dataset.fit=a.compatible?'yes':'no';td.textContent=!a.available?'Unavailable':a.compatible?'Compatible':a.conflicts.map(k=>marginLabels[k]+' '+fmt(a.margins[k])+' mm').join('; ');tr.append(td);}$('matrix').append(tr);}
 $('save').disabled=false;$('practice').disabled=false;draw();
}
function draw(){const r=analysis.rows.find(r=>r.id===$('mark').value),a=r.approaches.find(a=>a.edge===$('edge').value),w=analysis.target.widthMm,h=analysis.target.heightMm,half=state.tool.halfWidthMm;
 const canvas=$('plot'),logicalWidth=canvas.clientWidth||700,logicalHeight=Math.max(260,Math.min(440,logicalWidth*.66)),pixelRatio=window.devicePixelRatio||1;
 canvas.width=Math.round(logicalWidth*pixelRatio);canvas.height=Math.round(logicalHeight*pixelRatio);canvas.style.height=logicalHeight+'px';
 const ctx=canvas.getContext('2d');ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 const scale=Math.min((logicalWidth-64)/w,(logicalHeight-64)/h),ox=(logicalWidth-w*scale)/2,oy=(logicalHeight-h*scale)/2;
 ctx.clearRect(0,0,logicalWidth,logicalHeight);ctx.fillStyle='#f6f8f2';ctx.fillRect(ox,oy,w*scale,h*scale);ctx.strokeStyle='#365a4a';ctx.strokeRect(ox,oy,w*scale,h*scale);
 const horizontal=a.edge==='left'||a.edge==='right';const x=horizontal?(a.edge==='left'?0:r.xMm):r.xMm-half,y=horizontal?r.yMm-half:(a.edge==='top'?0:r.yMm),rw=horizontal?a.depthMm:2*half,rh=horizontal?2*half:a.depthMm;
 ctx.save();ctx.beginPath();ctx.rect(0,0,logicalWidth,logicalHeight);ctx.clip();ctx.fillStyle=a.compatible?'#a6d4b788':'#edb89988';ctx.fillRect(ox+x*scale,oy+y*scale,rw*scale,rh*scale);ctx.restore();
 for(const p of analysis.rows){ctx.fillStyle=p.id===r.id?'#b64a23':'#205f82';ctx.beginPath();ctx.arc(ox+p.xMm*scale,oy+p.yMm*scale,5,0,Math.PI*2);ctx.fill();ctx.font='13px system-ui';const labelWidth=ctx.measureText(p.id).width;ctx.fillText(p.id,Math.max(4,Math.min(ox+p.xMm*scale+8,logicalWidth-labelWidth-4)),Math.max(16,oy+p.yMm*scale-9));}
 $('detail').textContent=r.label+' from '+a.edge+': '+(!a.available?'edge unavailable':a.compatible?'compatible in the declared strip model':'geometric conflict')+'.\nDepth '+fmt(a.depthMm)+' mm; margins: minimum depth '+fmt(a.margins.minimumDepthMm)+', maximum depth '+fmt(a.margins.maximumDepthMm)+', first side '+fmt(a.margins.firstSideMm)+', second side '+fmt(a.margins.secondSideMm)+' mm. Negative margins are shortfalls. Targets and declared placement tolerances are unchanged.';
}
$('setup').addEventListener('input',setDirty);$('setup').addEventListener('change',setDirty);
$('setup').onsubmit=e=>{e.preventDefault();epoch++;try{accept(createToolStudy(state.source,Number($('width').value),Number($('height').value),draft()));say('Setup compared. Findings condition on declared geometry only.');}catch(e){say(e.message+' Previous accepted result retained.');}};
$('mark').onchange=draw;$('edge').onchange=draw;
let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(draw);});
async function read(file){if(!file||file.size>524288)throw Error('Choose a JSON file no larger than 512 KiB');return JSON.parse(await file.text());}
$('sourceFile').onchange=async e=>{const ticket=++epoch;try{const source=await read(e.target.files[0]);if(ticket!==epoch)return;accept(createToolStudy(source,Number($('width').value),Number($('height').value),draft()));say('Source accepted; transferred marks recomputed.');}catch(e){if(ticket===epoch)say(e.message+' Current study retained.');}};
$('studyFile').onchange=async e=>{const ticket=++epoch;try{const input=await read(e.target.files[0]);if(ticket!==epoch)return;accept(importToolStudy(input));say('Study reopened; all margins and setups recomputed.');}catch(e){if(ticket===epoch)say(e.message+' Current study retained.');}};
$('example').onclick=()=>{epoch++;accept(createToolStudy(demonstration,240,160,initialTool));say('Authored source and tool dimensions loaded. No measured physical result.');};
$('save').onclick=()=>{if(dirty)return;const accepted=importToolStudy(state),blob=new Blob([JSON.stringify(accepted,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='skill-tool-access.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Source and declared inputs exported; no derived verdict is stored.');};
$('practice').onclick=()=>{if(dirty)return;try{const {widthMm,heightMm}=state.reference.target;createPractice(state.source,widthMm,heightMm);sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify({demo:state.source,widthMm,heightMm,mirrored:false,showGoals:false}));location.assign('/practice');}catch(e){say(e.message);}};
accept(createToolStudy(demonstration,240,160,initialTool));say('Authored example. Supply your own dimensions to investigate a different tool.');

try{const saved=sessionStorage.getItem("skill-translator-tool-input/v1");if(saved){const input=JSON.parse(saved),next=createToolStudy(input.demo,input.widthMm,input.heightMm,initialTool);accept(next);sessionStorage.removeItem("skill-translator-tool-input/v1");say("Current Task Space source and workpiece received. Declare the tool dimensions.");}}catch(e){say("Task handoff refused: "+e.message+" Authored example retained.");}
