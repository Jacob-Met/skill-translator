import {inspectPathAxis} from '/src/path-axis.mjs';
import {calibrate,toImage} from '/src/geometry.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const mm=n=>n===null?'unresolved':`${Number(n.toPrecision(6))} mm`;
export function showPathAxis(host,study,assets){
 const result=inspectPathAxis(study);host.replaceChildren();
 host.append(el('h3','Inferred straight reference axis'),el('p',`${result.observedCount} observed of ${result.selectedCount} selected samples. ${result.axis.status==='resolved'?`RMS perpendicular residual ${mm(result.rmsResidualMm)}; largest ${mm(result.maxResidualMm)}. Largest held-out residual ${mm(result.maxHeldOutResidualMm)} (${result.heldOutResolvedCount} of ${result.observedCount} checks resolved).`:result.axis.status.replaceAll('-',' ')+'. At least three observed samples with a distinguishable direction are needed.'}`));
 for(const row of result.rows){
  const moment=study.sequence.moments.find(m=>m.id===row.momentId),part=el('section');
  part.append(el('h4',moment.label),el('p',`Perpendicular residual: ${mm(row.residualMm)}. Held-out prediction: ${mm(row.heldOutResidualMm)} (${row.heldOutStatus.replaceAll('-',' ')}).`));
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('source-frame');svg.setAttribute('viewBox',`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${moment.label}: original frame with inferred axis hypothesis`);
  const image=document.createElementNS(ns,'image');image.setAttribute('href',assets.get(moment.id)?.media.url??'');image.setAttribute('width',moment.image.widthPx);image.setAttribute('height',moment.image.heightPx);svg.append(image);
  if(result.axis.status==='resolved'&&moment.calibratedTask){
   const source=moment.calibratedTask.source,h=calibrate(source.corners),[a,b]=result.axis.endpoints.map(p=>toImage(h,p.xMm/source.widthMm,p.yMm/source.heightMm));
   const line=document.createElementNS(ns,'line');for(const[k,v]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#9a4b00','stroke-width':3,'stroke-dasharray':'9 6'}))line.setAttribute(k,v);svg.append(line);
   const sample=result.path.samples.find(s=>s.momentId===row.momentId);
   if(sample.sourcePx){const circle=document.createElementNS(ns,'circle');for(const[k,v]of Object.entries({cx:sample.sourcePx.x,cy:sample.sourcePx.y,r:7,fill:'none',stroke:'#137b72','stroke-width':3}))circle.setAttribute(k,v);svg.append(circle);}
  }
  part.append(svg);host.append(part);
 }
 host.append(el('p','Dashed amber segment shows the inferred axis over the observed projected extent; green rings retain original selected point annotations.'),el('p',result.boundary));
}
