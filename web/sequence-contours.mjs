import {readSequenceBundle,makeSequenceBundle,releaseSequenceAssets} from './sequence-input.mjs';
import {receiveSequenceContours,inspectContourSourcePng} from '../src/sequence-contours.mjs';
import {receiveEdgeField} from '../src/sequence-edge-field.mjs';
const $=id=>document.getElementById(id),format='skill-translator.sequence-contour-study/v1';
let source=null,report=null,epoch=0,pending=false;
const say=text=>{$('status').textContent=text;};
function draw(){
  $('work').hidden=!report;if(!report)return;
  const e=report.edgeReport,m=source.sequence.moments.find(m=>m.id===e.momentId),c=report.coverage;
  $('source-label').textContent=`${m.label} · original frame at ${m.origin.mediaTimeSeconds} seconds`;
  $('coverage').textContent=`OpenCV ${report.method.opencvVersion}: ${report.chains.length} native walks visit ${c.visitedEdgePixels} of ${c.edgePixels} edge pixels. ${c.omittedEdgePixels} edge pixels are not visited by any walk.`;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${m.image.widthPx} ${m.image.heightPx}`);svg.setAttribute('width','100%');svg.setAttribute('aria-label','Original PNG with auxiliary native contour walk');
  const add=(tag,attributes)=>{const node=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attributes))node.setAttribute(k,v);svg.append(node);return node;};
  add('image',{href:source.assets.get(m.id).media.url,width:m.image.widthPx,height:m.image.heightPx});
  const [x,y,w,h]=e.roi;
  function overlay(field,color){const bytes=receiveEdgeField(field,e.roi),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),im=ctx.createImageData(w,h);for(let k=0;k<w*h;k++)if(bytes[k>>3]&(1<<(k&7)))im.data.set([...color,255],k*4);ctx.putImageData(im,0,0);add('image',{x,y,width:w,height:h,href:canvas.toDataURL()});}
  if($('pixels').checked)overlay(e.field,[0,234,255]);
  if($('missing').checked)overlay({encoding:'roi-row-major-lsb0/v1',data:c.omittedField,count:c.omittedEdgePixels},[255,145,0]);
  const chain=report.chains.find(c=>String(c.id)===$('chain').value);
  if($('chain').value==='all'){for(const walk of report.chains)add('polyline',{points:walk.points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#d700df','stroke-width':2});$('detail').textContent='All native pixel walks are displayed. Their overlap and nesting are preserved; no walk is identified as a physical boundary.';}else if(chain){add('polyline',{points:chain.points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#d700df','stroke-width':3});$('detail').textContent=`Walk ${chain.id}: ${chain.points.length} original-pixel vertices. Native parent ${chain.hierarchy[3]===-1?'none':chain.hierarchy[3]}. This image hierarchy does not identify a physical part.`;}else $('detail').textContent='No native walk in this field.';
  $('frame').replaceChildren(svg);
}
function adoptReport(next){report=next;const all=document.createElement('option');all.value='all';all.textContent='All native walks';$('chain').replaceChildren(all,...next.chains.map(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`Walk ${c.id} · ${c.points.length} vertices`;return o;}));draw();}
async function receiveReport(staged,raw){
 const accepted=receiveSequenceContours(staged.sequence,raw);
 const bytes=new Uint8Array(await staged.assets.get(accepted.edgeReport.momentId).file.arrayBuffer());
 inspectContourSourcePng(bytes);return accepted;
}
async function openSource(file){const ticket=++epoch;pending=true;$('save').disabled=true;let staged;
 try{if(!file||file.size>60*1024*1024)throw Error('Choose a bounded source study');const raw=JSON.parse(await file.text());if(ticket!==epoch)return;const own=raw.format===format;staged=await readSequenceBundle(new Blob([JSON.stringify(own?raw.source:raw)]));const accepted=own?await receiveReport(staged,raw.report):null;if(ticket!==epoch){releaseSequenceAssets(staged.assets);return;}if(source)releaseSequenceAssets(source.assets);source=staged;staged=null;report=null;if(accepted)adoptReport(accepted);else draw();say(accepted?'Saved source and contour report reopened.':'Original PNG sequence accepted. Load its native contour report.');}
 catch(error){if(staged)releaseSequenceAssets(staged.assets);if(ticket===epoch)say(error.message);}
 finally{if(ticket===epoch){pending=false;$('save').disabled=!report;}}
}
$('source').addEventListener('change',()=>openSource($('source').files[0]));
$('report').addEventListener('change',async()=>{if(!source||pending){say('Accept an original sequence first.');return;}const ticket=++epoch;pending=true;$('save').disabled=true;try{const file=$('report').files[0];if(!file||file.size>8*1024*1024)throw Error('Choose a contour report up to 8 MiB');const raw=JSON.parse(await file.text());if(ticket!==epoch)return;const accepted=await receiveReport(source,raw);if(ticket!==epoch)return;adoptReport(accepted);say('Contour report accepted against original source.');}catch(error){if(ticket===epoch)say(error.message);}finally{if(ticket===epoch){pending=false;$('save').disabled=!report;}}});
for(const id of ['chain','pixels','missing'])$(id).addEventListener('change',draw);
$('save').addEventListener('click',async()=>{if(!source||!report||pending)return;const ticket=epoch,accepted=report;try{const original=JSON.parse(await(await makeSequenceBundle(source.sequence,source.assets)).text());if(ticket!==epoch)return;const blob=new Blob([JSON.stringify({format,source:original,report:accepted})],{type:'application/json'});if(blob.size>60*1024*1024)throw Error('Study exceeds 60 MiB');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='source-contours.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Saved original PNGs and complete report; no physical labels added.');}catch(error){if(ticket===epoch)say(error.message);}});
addEventListener('pagehide',()=>{epoch++;if(source)releaseSequenceAssets(source.assets);});
