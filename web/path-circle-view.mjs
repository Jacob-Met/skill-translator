import {inspectPathCircle} from '/src/path-circle.mjs';
import {calibrate,toImage} from '/src/geometry.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const mm=n=>n===null?'unresolved':`${Number(n.toPrecision(6))} mm`;
const ns='http://www.w3.org/2000/svg';
function shape(tag,attributes){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,v);return n;}
export function clearPathCircle(host){host.replaceChildren();delete host.dataset.status;}
export function showPathCircle(host,study,assets){
 const result=inspectPathCircle(study),{circle}=result;clearPathCircle(host);host.dataset.status=circle.status;
 host.append(el('h3','Inferred circular reference'),el('p',`${result.observedCount} observed of ${result.selectedCount} selected samples. ${circle.status==='resolved'?`Candidate center (${mm(circle.center.xMm)}, ${mm(circle.center.yMm)}); radius ${mm(circle.radiusMm)}. Fitted angular coverage ${circle.coverageDegrees.toFixed(1)}°. RMS radial residual ${mm(result.rmsResidualMm)}; largest ${mm(result.maxResidualMm)}.`:circle.status.replaceAll('-',' ')+'. A candidate requires four observed points, a noncollinear fit and at least 90° fitted angular coverage.'}`));
 if(circle.status==='insufficient-angular-support')host.append(el('p',`The rejected fit spans ${circle.coverageDegrees.toFixed(1)}° around its estimated center; the minimum support policy is 90°. No usable center or radius is proposed.`));
 host.append(el('p',`Largest held-out residual ${mm(result.maxHeldOutResidualMm)}; largest center change when one observation is withheld ${mm(result.maxHeldOutCenterShiftMm)}. ${result.heldOutResolvedCount} of ${result.observedCount} checks resolved. These are sensitivity checks on the same demonstration.`));
 for(const row of result.rows){
  const moment=study.sequence.moments.find(m=>m.id===row.momentId),sample=result.path.samples.find(s=>s.momentId===row.momentId),part=el('section');part.dataset.moment=row.momentId;
  part.append(el('h4',`${moment.label} · ${sample.presentedSeconds} s`),el('p',`Radial residual: ${mm(row.residualMm)}. Held-out residual: ${mm(row.heldOutResidualMm)}; center shift: ${mm(row.heldOutCenterShiftMm)} (${row.heldOutStatus.replaceAll('-',' ')}).`));
  const svg=shape('svg',{viewBox:`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`,role:'img','aria-label':`${moment.label}: original retained frame and circular reference hypothesis`});svg.classList.add('source-frame');
  svg.append(shape('image',{href:assets.get(moment.id)?.media.url??'',width:moment.image.widthPx,height:moment.image.heightPx}));
  if(circle.status==='resolved'&&moment.calibratedTask){
   const source=moment.calibratedTask.source,h=calibrate(source.corners),inside=p=>p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1;
   const uv=Array.from({length:129},(_,i)=>({u:(circle.center.xMm+circle.radiusMm*Math.cos(i*2*Math.PI/128))/source.widthMm,v:(circle.center.yMm+circle.radiusMm*Math.sin(i*2*Math.PI/128))/source.heightMm}));
   // Never extrapolate the projective mapping beyond the declared sheet.
   let d='',drawing=false;for(let i=1;i<uv.length;i++){if(inside(uv[i-1])&&inside(uv[i])){const a=toImage(h,uv[i-1].u,uv[i-1].v),b=toImage(h,uv[i].u,uv[i].v);d+=(drawing?'':`M${a.x},${a.y}`)+`L${b.x},${b.y}`;drawing=true;}else drawing=false;}
   svg.append(shape('path',{d,fill:'none',stroke:'#9a4b00','stroke-width':3,'stroke-dasharray':'7 5','data-inferred-circle':'true'}));
   const center={u:circle.center.xMm/source.widthMm,v:circle.center.yMm/source.heightMm};
   if(inside(center)){const p=toImage(h,center.u,center.v);svg.append(shape('path',{d:`M${p.x-6},${p.y}h12M${p.x},${p.y-6}v12`,stroke:'#9a4b00','stroke-width':2,'data-inferred-center':'true'}));}
  }
  if(sample.sourcePx)svg.append(shape('circle',{cx:sample.sourcePx.x,cy:sample.sourcePx.y,r:7,fill:'none',stroke:'#137b72','stroke-width':3,'data-original-point':'true'}));
  part.append(svg);host.append(part);
 }
 host.append(el('p','Dashed amber arcs show a 128-segment approximation of the inferred reference only within the declared sheet; the cross marks its center when visible. Green rings are original selected annotations. The circle is not an observed motion path.'),el('p',result.boundary));
 return result;
}
