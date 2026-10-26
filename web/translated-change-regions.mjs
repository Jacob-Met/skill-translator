const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const COLORS={every:'#00cfe8',some:'#ffbb45'};
/** Both panels retain their own original coordinates; no unique shift is invented. */
export function renderTranslatedChangeRegions(before,after,analysis,{expanded=false,page=0}={}){
 const host=element('div');host.className='translated-change-regions';host.dataset.page='0';
 const details=element('details');details.dataset.shiftRegions='';details.append(element('summary','Locate remaining change after image shift'));
 host.append(details);
 if(analysis?.status!=='analyzed'){
  details.append(element('p',`Remaining-change location unavailable: ${analysis?.reason||'no complete analysis was returned'}. This is not a zero-change result.`));
  if(expanded)details.open=true;return host;
 }
 for(const [name,frame,certainty]of [['everyReference','earlier','every'],['someReference','earlier','some'],['everyLater','later','every'],['someLater','later','some']])details.dataset[name]=String(analysis[frame][certainty].changedPixels);
 const explanation=element('p',`${analysis.alternativeCount} retained image-shift fit${analysis.alternativeCount===1?'':'s'}. Cyan: changed under every retained fit with complete support. Amber: changed under at least one evaluated fit. Missing support is not evidence of unchanged pixels. Boxes are component bounds in each original small image, not a unique correspondence or physical motion.`);
 details.append(explanation);
 const counts=element('p', ['earlier','later'].map(frame=>{const a=analysis[frame];return `${frame==='earlier'?'Earlier':'Later'}: every-fit ${a.every.changedPixels} pixels in ${a.every.regions.length} regions (${a.every.regions.filter(r=>!r.accepted).length} below the region-area rule); some-fit ${a.some.changedPixels} pixels in ${a.some.regions.length} regions (${a.some.regions.filter(r=>!r.accepted).length} below the rule).`;}).join(' '));
 details.append(counts,element('p',`Fixed profile: channel residual ≥${analysis.profile.channelThreshold} levels; ${analysis.profile.connectivity}-connected regions; minimum area ${analysis.profile.minArea} pixels. Excluded small regions remain in the counts and list, with dashed boxes.`));
 const content=element('div'),list=element('ul'),progress=element('p');progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');progress.style.overflowWrap='anywhere';
 const controls=element('div');controls.className='actions';const previous=element('button','Previous regions'),next=element('button','Next regions');previous.type=next.type='button';previous.dataset.residualPage='previous';next.dataset.residualPage='next';controls.append(previous,next);controls.hidden=true;
 details.append(content,progress,list,controls);
 const rows=[],totalRegions=['earlier','later'].reduce((sum,frame)=>sum+analysis[frame].every.regions.length+analysis[frame].some.regions.length,0);
 const pageSize=50,lastPage=Math.max(0,Math.ceil(totalRegions/pageSize)-1);let current=Number.isSafeInteger(page)?Math.max(0,Math.min(lastPage,page)):0,initialized=false;host.dataset.page=String(current);
 function draw(frame,sample){
  const figure=element('figure');figure.style.margin='0';figure.style.minWidth='0';
  const canvas=element('canvas');canvas.dataset.shiftFrame=frame;canvas.width=sample.widthPx;canvas.height=sample.heightPx;canvas.style.width='100%';canvas.style.height='auto';canvas.style.maxWidth='480px';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${frame} original small sample with every-fit cyan and some-fit amber change bounds`);
  const ctx=canvas.getContext('2d');ctx.putImageData(new ImageData(new Uint8ClampedArray(sample.rgba),sample.widthPx,sample.heightPx),0,0);
  for(const certainty of ['some','every'])for(const r of analysis[frame][certainty].regions){ctx.strokeStyle=COLORS[certainty];ctx.lineWidth=r.accepted?1.5:1;ctx.setLineDash(r.accepted?[]:[1,2]);const [x0,y0,x1,y1]=r.bbox;ctx.strokeRect(x0,y0,x1-x0,y1-y0);}
  const support=analysis[frame].fullyCompared;ctx.strokeStyle='#ffffff';ctx.lineWidth=.75;ctx.setLineDash([3,3]);ctx.strokeRect(support.left,support.top,support.width,support.height);ctx.setLineDash([]);
  const caption=element('figcaption',`${frame==='earlier'?'Earlier':'Later'} original sample, ${sample.widthPx} × ${sample.heightPx} pixels. White dashed complete-support rectangle: (${support.left}, ${support.top}), ${support.width} × ${support.height}; ${support.pixelCount} pixels. No unique mapping is chosen.`);caption.style.overflowWrap='anywhere';figure.append(canvas,caption);return figure;
 }
 function renderPage(){
  host.dataset.page=String(current);const offset=current*pageSize,end=Math.min(rows.length,offset+pageSize),items=[];
  for(let i=offset;i<end;i++){const {frame,certainty,region:r}=rows[i],[x0,y0,x1,y1]=r.bbox;const row=element('li',`${frame==='earlier'?'Earlier':'Later'} · ${certainty==='every'?'every retained fit':'at least one evaluated fit'} · ${r.id} · ${r.area} pixels · bounds x [${x0}, ${x1}), y [${y0}, ${y1}) · ${r.accepted?'accepted region':`excluded region (${r.reason||'below area rule'})`}${r.touchesBoundary?' · touches image boundary':''}`);row.dataset.shiftFrame=frame;row.dataset.shiftCertainty=certainty;row.dataset.shiftBbox=r.bbox.join(',');row.dataset.shiftRegionIndex=String(i);row.style.overflowWrap='anywhere';items.push(row);}
  list.replaceChildren(...items);progress.textContent=rows.length?`Showing regions ${offset+1}–${end} of ${rows.length}. Page ${current+1} of ${lastPage+1}. Every retained region, including excluded small regions, remains available.`:'No thresholded regions were found within the evaluated support; unobserved support remains unassessed.';
  previous.disabled=current===0;next.disabled=current===lastPage;controls.hidden=rows.length<=pageSize;
 }
 function initialize(){if(initialized)return;initialized=true;for(const frame of ['earlier','later'])for(const certainty of ['every','some'])for(const region of analysis[frame][certainty].regions)rows.push({frame,certainty,region});content.style.display='grid';content.style.gridTemplateColumns='repeat(auto-fit,minmax(min(100%,220px),1fr))';content.style.gap='1rem';content.append(draw('earlier',before),draw('later',after));renderPage();}
 previous.addEventListener('click',()=>{if(!initialized||current===0)return;current--;renderPage();});next.addEventListener('click',()=>{if(!initialized||current===lastPage)return;current++;renderPage();});
 details.addEventListener('toggle',()=>{if(details.open)initialize();});
 if(expanded){details.open=true;initialize();}
 return host;
}
