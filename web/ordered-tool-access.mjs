import {demonstration} from '/src/demo.mjs';
import {createToolStudy,analyzeToolAccess,EDGES} from '/src/tool-access.mjs';
import {createOrderedToolStudy,importOrderedToolStudy,inspectOrderedToolStudy,ORDERED_TOOL_SCHEMA} from '/src/ordered-tool-access.mjs';
const $=id=>document.getElementById(id);let state,dirty=false,epoch=0,inspection=null;
const say=t=>$('status').textContent=t;
function markDirty(){epoch++;dirty=true;$('save').disabled=true;$('summary').textContent='Inputs changed. Compare to replace the previous findings.';$('result').replaceChildren();$('chosen').textContent='';inspection=null;$('inspectStep').disabled=true;$('plot').getContext('2d').clearRect(0,0,$('plot').width,$('plot').height);$('approachDetail').textContent='Compare changed inputs before inspecting an approach.';}
function renderInputs(){
 const {widthMm,heightMm}=state.toolStudy.reference.target;
 $('source').textContent=`${state.toolStudy.source.title} · ${widthMm} × ${heightMm} mm`;
 $('tool').textContent=`${state.toolStudy.tool.label} · ${state.toolStudy.tool.basis}`;
 $('steps').replaceChildren();state.order.forEach((id,index)=>{
 const row=document.createElement('p'),label=document.createElement('label');label.textContent=`${index+1}. ${state.toolStudy.source.landmarks.find(m=>m.id===id).label} `;
 const select=document.createElement('select');select.setAttribute('aria-label',`Approach for ${id}`);for(const edge of EDGES){const o=document.createElement('option');o.value=edge;o.textContent=edge;select.append(o);}select.value=state.chosenEdges[index];select.onchange=()=>{state.chosenEdges[index]=select.value;markDirty();};label.append(select);row.append(label);
 for(const [text,delta] of [['Up',-1],['Down',1]]){const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',`${text} ${id}`);b.disabled=index+delta<0||index+delta>=state.order.length;b.onclick=()=>{const other=index+delta;[state.order[index],state.order[other]]=[state.order[other],state.order[index]];[state.chosenEdges[index],state.chosenEdges[other]]=[state.chosenEdges[other],state.chosenEdges[index]];markDirty();renderInputs();};row.append(b);}$('steps').append(row);
 });
}
function compare(){const accepted=importOrderedToolStudy(state),r=inspectOrderedToolStudy(accepted);state=accepted;dirty=false;$('save').disabled=false;
 $('summary').textContent=r.feasible?`Minimum ${r.minimumChanges} approach changes · ${r.optimalAssignmentCount} optimal complete assignments.`:'No complete compatible assignment for this declared tool and task.';
 $('chosen').textContent=r.chosen.compatible?`Your assignment: ${r.chosen.changes} changes; ${r.chosen.extraChanges} above the conditional minimum.`:`Your assignment has ${r.chosen.conflicts.length} incompatible mark approaches: ${r.chosen.conflicts.map(c=>c.id+' from '+c.edge).join('; ')}.`;
 $('result').replaceChildren();r.rows.forEach((row,i)=>{const li=document.createElement('li');li.textContent=`${row.label}: compatible ${row.compatibleEdges.join(', ')||'none'}; optimal choices ${row.optimalEdges.join(', ')||'none'}; coherent witness ${r.witness[i]||'unavailable'}.`;$('result').append(li);});inspection={result:r,access:analyzeToolAccess(state.toolStudy.source,state.toolStudy.reference.target.widthMm,state.toolStudy.reference.target.heightMm,state.toolStudy.tool)};$('inspectStep').replaceChildren();r.rows.forEach((row,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`${i+1}. ${row.label}`;$('inspectStep').append(o);});$('inspectStep').disabled=false;drawApproach();say('Recomputed from unchanged task targets and declared tool dimensions.');
}
function accept(raw){const next=raw.schema===ORDERED_TOOL_SCHEMA?importOrderedToolStudy(raw):createOrderedToolStudy(raw,raw.source.landmarks.map(m=>m.id));if(next.chosenEdges===null)next.chosenEdges=next.order.map(()=> 'left');state=next;renderInputs();compare();}
function example(){epoch++;accept(createToolStudy(demonstration,240,160,{label:'Authored edge-fed tool',basis:'Illustrative geometry, not measured equipment',evidenceClass:'authored-example',minDepthMm:0,maxDepthMm:100,halfWidthMm:0,edges:[...EDGES]}));}
$('file').onchange=async e=>{const ticket=++epoch,input=e.target,file=input.files[0];try{if(!file||file.size>512*1024)throw Error('Choose JSON within 512 KiB.');const raw=JSON.parse(await file.text());if(ticket!==epoch)return;accept(raw);}catch(error){if(ticket===epoch)say(error.message+' Previous accepted inputs retained.');}finally{if(input.files[0]===file)input.value='';}};
$('example').onclick=example;$('compare').onclick=()=>{epoch++;try{compare();}catch(e){say(e.message);}};
$('save').onclick=()=>{if(dirty)return;const raw=importOrderedToolStudy(state),url=URL.createObjectURL(new Blob([JSON.stringify(raw)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ordered-tool-study.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};example();

function drawApproach(){
 if(!inspection)return;
 const i=Number($('inspectStep').value),{result,access}=inspection,row=access.rows.find(r=>r.id===result.rows[i].id),edge=result.witness[i],approach=row.approaches.find(a=>a.edge===edge);
 const canvas=$('plot'),width=canvas.clientWidth||700,height=Math.max(260,Math.min(440,width*.66)),ratio=devicePixelRatio||1;
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.style.height=height+'px';const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
 const w=access.target.widthMm,h=access.target.heightMm,scale=Math.min((width-64)/w,(height-64)/h),ox=(width-w*scale)/2,oy=(height-h*scale)/2;
 ctx.fillStyle='#f6f8f2';ctx.fillRect(ox,oy,w*scale,h*scale);ctx.strokeStyle='#365a4a';ctx.strokeRect(ox,oy,w*scale,h*scale);
 if(approach){const half=state.toolStudy.tool.halfWidthMm,horizontal=edge==='left'||edge==='right';const x=horizontal?(edge==='left'?0:row.xMm):row.xMm-half,y=horizontal?row.yMm-half:(edge==='top'?0:row.yMm),rw=horizontal?approach.depthMm:2*half,rh=horizontal?2*half:approach.depthMm;
 ctx.fillStyle='#a6d4b788';ctx.fillRect(ox+x*scale,oy+y*scale,rw*scale,rh*scale);ctx.strokeStyle='#205b46';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ox+(edge==='left'?0:edge==='right'?w:row.xMm)*scale,oy+(edge==='top'?0:edge==='bottom'?h:row.yMm)*scale);ctx.lineTo(ox+row.xMm*scale,oy+row.yMm*scale);ctx.stroke();}
 for(const mark of access.rows){ctx.fillStyle=mark.id===row.id?'#b64a23':'#205f82';ctx.beginPath();ctx.arc(ox+mark.xMm*scale,oy+mark.yMm*scale,mark.id===row.id?6:4,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#18372f';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('top',ox+w*scale/2,oy-10);ctx.fillText('bottom',ox+w*scale/2,oy+h*scale+22);ctx.save();ctx.translate(ox-12,oy+h*scale/2);ctx.rotate(-Math.PI/2);ctx.fillText('left',0,0);ctx.restore();ctx.save();ctx.translate(ox+w*scale+18,oy+h*scale/2);ctx.rotate(Math.PI/2);ctx.fillText('right',0,0);ctx.restore();
 $('approachDetail').textContent=approach?`Step ${i+1}: ${row.label}, coherent witness from ${edge}. ${i===0?'Initial approach has no change charge.':result.witness[i-1]===edge?'Same edge as the preceding step.':'Changed from '+result.witness[i-1]+' at the preceding step.'} Insertion depth ${approach.depthMm.toFixed(2)} mm; minimum-depth margin ${approach.margins.minimumDepthMm.toFixed(2)}, throat margin ${approach.margins.maximumDepthMm.toFixed(2)}, side-support margins ${approach.margins.firstSideMm.toFixed(2)} / ${approach.margins.secondSideMm.toFixed(2)} mm. Selected target is orange. Positive margins indicate remaining nominal allowance.`:`Step ${i+1}: ${row.label}. No coherent complete assignment exists; unchanged targets are shown without an approach strip.`;
}
$('inspectStep').onchange=drawApproach;window.addEventListener('resize',drawApproach);
