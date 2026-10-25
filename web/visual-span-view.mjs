import {inspectVisualSpan} from '/src/visual-span.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function createVisualSpanView({host,isBusy,canSelect,onSelect}){
 const panel=el('section'),title=el('h3','Compare appearance across several sampled intervals'),note=el('p','Adjacent changes can look alike even when the final image returns to its earlier appearance. Choose two sampled endpoints to inspect both questions. This comparison uses whole-frame scan samples, not a region or retained full-resolution evidence.');
 const first=el('select'),last=el('select'),firstLabel=el('label','Earlier requested sample'),lastLabel=el('label','Later requested sample');first.id='span-first';last.id='span-last';firstLabel.append(first);lastLabel.append(last);
 const inspect=el('button','Compare sampled span');inspect.type='button';inspect.id='span-inspect';const out=el('div');out.id='span-results';panel.append(title,note,firstLabel,lastLabel,inspect,out);host.append(panel);
 let current=null;
 const clearResult=()=>out.replaceChildren();first.onchange=last.onchange=clearResult;
 function sync(){panel.hidden=!current;for(const n of [first,last,inspect])n.disabled=!current||isBusy();for(const n of out.querySelectorAll('button'))n.disabled=isBusy()||!canSelect();}
 inspect.onclick=()=>{
  if(!current||isBusy())return;clearResult();
  try{const r=inspectVisualSpan(current.plan,current.samples,{firstIndex:Number(first.value),lastIndex:Number(last.value)});
   out.append(el('p',r.boundary));
   out.append(el('p',`Endpoint comparison: ${r.endpoint.status}${r.endpoint.status==='compared'?`; raw mean channel change ${r.endpoint.meanAbsoluteChange*255} levels; adjusted ${r.endpoint.meanAdjustedChange*255} levels; presented separation ${r.endpoint.elapsedSeconds} seconds`:''}.`));
   out.append(el('p',`Adjacent intervals compared: ${r.adjacent.comparedCount} of ${r.adjacent.totalCount}. ${r.adjacent.complete?'Complete sampled raw-change sum: '+r.adjacent.totalRawChange*255+' levels.':'Complete sampled raw-change sum unavailable; known comparisons sum to '+r.adjacent.knownRawChange*255+' levels.'}`));
   for(const [label,frame] of [['Earlier',r.before],['Later',r.after]]){
    out.append(el('p',`${label}: requested ${frame.requestedSeconds} seconds; presented ${frame.presentedSeconds??'unavailable'} seconds; ${frame.status}.`));
    if(frame.status==='sampled'){const sample=current.samples[frame.index],canvas=el('canvas');canvas.width=sample.widthPx;canvas.height=sample.heightPx;canvas.getContext('2d').putImageData(new ImageData(sample.rgba,sample.widthPx,sample.heightPx),0,0);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${label} whole-frame scan preview, not retained original evidence`);const button=el('button',`Inspect ${label.toLowerCase()} original moment`);button.type='button';button.onclick=()=>{if(!isBusy()&&canSelect())onSelect(frame);};out.append(canvas,button);}
   }
   const list=el('ol');for(const interval of r.intervals)list.append(el('li',`Requested ${interval.before.requestedSeconds} → ${interval.after.requestedSeconds} seconds: ${interval.status}${interval.status==='compared'?'; raw '+interval.meanAbsoluteChange*255+' levels':''}`));out.append(list);
  }catch(e){out.append(el('p','Span comparison refused: '+e.message));}sync();
 };
 return {sync,receive(report){if(report===current){sync();return;}current=report;clearResult();for(const select of [first,last]){select.replaceChildren();if(current)current.plan.requestedTimes.forEach((time,index)=>{const option=el('option',`${index+1}: requested ${time} seconds`);option.value=String(index);select.append(option);});}if(current)last.value=String(current.plan.sampleCount-1);sync();},clear(){current=null;clearResult();sync();}};
}
