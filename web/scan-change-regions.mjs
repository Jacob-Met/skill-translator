import {locateScanChanges} from '/src/scan-change-regions.mjs';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};

export function renderChangeRegions(before,after) {
  const details=el('details');
  details.append(el('summary','Locate changed appearance in these samples'));
  let rendered=false;
  details.addEventListener('toggle',()=>{
    if(!details.open||rendered)return;
    rendered=true;
    const built=renderChangeRegionsNow(before,after);
    // Preserve the original focused summary for keyboard users.
    details.append(...Array.from(built.childNodes).slice(1));
  });
  return details;
}

function renderChangeRegionsNow(before,after) {
  const details=el('details');
  details.append(el('summary','Locate changed appearance in these samples'));
  let result;
  try {result=locateScanChanges(before,after);}
  catch(error){details.append(el('p','Region analysis unavailable: '+error.message));return details;}
  if(result.status!=='analyzed'){
    details.append(el('p','Region analysis unavailable: '+result.reason));return details;
  }
  const accepted=result.regions.filter(r=>r.accepted);
  const excluded=result.regions.filter(r=>!r.accepted);
  details.append(el('p',accepted.length+' connected regions of at least 4 sampled pixels; '+
    excluded.length+' smaller regions retained as excluded. '+result.changedPixels+
    ' pixels meet the adjusted 16-channel-level threshold.'));
  const pair=el('div');
  pair.style.display='grid';pair.style.gridTemplateColumns='repeat(2, minmax(0, 1fr))';pair.style.gap='8px';
  details.append(pair);
  for(const [label,sample] of [['Earlier',before],['Later',after]]){
    const figure=el('figure'),canvas=el('canvas');
    figure.style.margin='0';
    canvas.width=sample.widthPx;canvas.height=sample.heightPx;
    canvas.style.width='100%';canvas.style.imageRendering='pixelated';
    const ctx=canvas.getContext('2d');
    ctx.putImageData(new ImageData(sample.rgba,sample.widthPx,sample.heightPx),0,0);
    ctx.strokeStyle='#ff00ff';ctx.lineWidth=1;
    for(const r of accepted){const [x0,y0,x1,y1]=r.bbox;ctx.strokeRect(x0+.5,y0+.5,Math.max(0,x1-x0-1),Math.max(0,y1-y0-1));}
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',label+' sampled frame with changed-region boxes; coordinates listed below.');
    figure.append(canvas,el('figcaption',label+' · presented '+sample.presentedSeconds.toFixed(3)+' s'));
    pair.append(figure);
  }
  details.append(el('p','Boxes locate changed appearance, not objects, actions, contact or completion. A moving object may leave two regions. Camera motion can dominate; uniform adjustment can hide a real global change. No original-resolution detail is recovered.'));
  const list=el('ul');
  for(const r of result.regions)list.append(el('li',r.id+': '+r.area+' sampled pixels; bounds ['+
    r.bbox.join(', ')+'] (left, top, right exclusive, bottom exclusive). '+
    (r.accepted?'Included.':'Excluded: '+r.reason+'.')+
    (r.touchesBoundary?' Touches sample boundary.':'')));
  details.append(list);
  return details;
}
