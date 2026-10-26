import {renderTranslationComparison} from '/web/visual-translation-view.mjs';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const signed=n=>n>=0?`+${n}`:String(n);

/** One report-owned lazy view. The scanner owns and limits worker lifetime. */
export function createRegionalAppearanceView(before,after,{result,containedResult,state={},request,cancel,current,busy}={}){
  const element=node('section');element.className='regional-appearance';
  const details=node('details'),summary=node('summary','Compare shifts across eight fixed image regions');
  const status=node('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const output=node('div'),actions=node('div');actions.className='actions';
  const start=node('button','Compare eight regions'),stop=node('button','Cancel regional comparison');
  const complete=node('button','Search every contained placement'),windowed=node('button','Return to ±16 shifts');
  for(const button of [start,stop,complete,windowed]){button.type='button';button.dataset.regionalControl='true';}
  start.dataset.regionalAction='start';stop.dataset.regionalAction='cancel';complete.dataset.regionalAction='contained';windowed.dataset.regionalAction='window';actions.append(start,stop,complete,windowed);
  details.append(summary,node('p','Eight fixed regions cover the complete search interior. Compare their preferred image shifts without selecting points or regions by hand.'),status,actions,output);element.append(details);
  const values={window:result,contained:containedResult};result=containedResult=undefined;
  let profile=state.profile==='contained'&&values.contained?'contained':'window';
  let running=false,value=values[profile],initialized=false;
  const profiles=state.profiles??{window:{tiles:state.tiles??{}}};
  const tileViews=new Map();
  function sync(){
    const unavailable=running||!current()||busy();
    start.disabled=complete.disabled=windowed.disabled=unavailable;stop.disabled=!running;
    start.hidden=Boolean(value);stop.hidden=!running;
    complete.hidden=profile==='contained'||values.window?.status!=='compared';windowed.hidden=profile!=='contained';
    element.dataset.profile=profile;
  }
  function remember(){if(initialized)profiles[profile]={tiles:Object.fromEntries([...tileViews].map(([i,{d,getView}])=>{const v=getView();return [i,{open:d.open,expanded:v?.querySelector('details')?.open===true,page:Number(v?.dataset.page)||0}];}))};}
  function readyText(){return value?.status==='compared'?(profile==='contained'?'Complete-placement comparison ready. All eight regions and every exact alternative are retained.':'Regional comparison ready. All eight regions and every exact alternative are retained.'):'Regional comparison unavailable.';}
  function activate(next){remember();profile=next;value=values[profile];initialized=false;output.replaceChildren();tileViews.clear();status.textContent=readyText();populate();sync();}
  function draw(sample,which,account){
    const figure=node('figure'),canvas=node('canvas'),scale=3;canvas.width=sample.widthPx*scale;canvas.height=sample.heightPx*scale;
    const original=document.createElement('canvas');original.width=sample.widthPx;original.height=sample.heightPx;original.getContext('2d').putImageData(new ImageData(sample.rgba,sample.widthPx,sample.heightPx),0,0);
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(original,0,0,canvas.width,canvas.height);ctx.font='bold 24px system-ui';ctx.textBaseline='top';ctx.lineWidth=2;
    for(const tile of account.tiles){const c=tile.comparison,a=c.alternatives,unique=a.length===1,s=c.support;
      if(which==='later'&&!unique)continue;
      const dx=which==='later'?a[0].dx:0,dy=which==='later'?a[0].dy:0,x=(s.left+dx)*scale,y=(s.top+dy)*scale;
      const color=!unique?'#ffc96b':(a[0].searchBoundary||a[0].imageBoundary)?'#ffb0a6':'#78f0d3';ctx.strokeStyle=color;ctx.strokeRect(x+.5,y+.5,s.width*scale-1,s.height*scale-1);
      const label=`R${tile.index+1}`;
      const w=Math.min(s.width*scale-2,ctx.measureText(label).width+4);ctx.fillStyle='#10251f';ctx.fillRect(x+1,y+1,w,30);ctx.fillStyle=color;ctx.fillText(label,x+3,y+3,Math.max(1,w-4));
    }
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${which==='earlier'?'Earlier fixed reference regions; preferred shifts are listed by region below':'Later sample with regions placed by unique image-shift fits only'}. Detailed alternatives are listed below.`);
    figure.append(canvas,node('figcaption',`${which==='earlier'?'Earlier':'Later'} original sample, ${sample.widthPx} × ${sample.heightPx} pixels. Display enlargement adds no detail. ${which==='earlier'?`Labels match the eight regional summaries below. Amber means tied alternatives; pink means ${profile==='contained'?'the complete rectangle touches the image edge':'a search-edge fit'}.`:'Only unique appearance fits are drawn; overlapping boxes can occur. No physical point mapping is established.'}`));return figure;
  }
  function populate(){
    if(!details.open||!value||initialized)return;initialized=true;output.replaceChildren();tileViews.clear();
    if(value.status!=='compared'){output.append(node('p',value.reason||'Regional comparison is unavailable.'));return;}
    const shared=value.commonShifts;
    output.append(node('p',shared.length===0?'No integer shift is preferred by every region under its independently fitted brightness offset.':shared.length===1?`Every region includes the preferred shift (${signed(shared[0].dx)}, ${signed(shared[0].dy)}). Brightness offsets remain independently fitted.`:`${shared.length} shifts are preferred in every region; there is no unique shared image shift.`));
    output.append(node('p',profile==='contained'
      ?`Regional residual within ±16 shifts ${(value.baseline.independentRegionalMean*255).toFixed(2)} levels; over every contained placement ${(value.independentRegionalMean*255).toFixed(2)} levels on the same ${value.support.pixelCount} reference pixels. A larger search can find a lower residual without finding the same physical object.`
      :`Whole-interior residual ${(value.global.meanAdjustedChange*255).toFixed(2)} levels; independent regional residual ${(value.independentRegionalMean*255).toFixed(2)} levels on the same ${value.support.pixelCount} reference pixels. Independent regional fitting has more freedom; a lower residual alone does not establish accuracy.`));
    output.append(draw(before,'earlier',value),draw(after,'later',value));
    const list=node('ol');list.dataset.regionalTiles='true';
    for(const tile of value.tiles){const c=tile.comparison,s=c.support,a=c.alternatives,entry=node('li'),d=node('details');d.dataset.regionalTile=String(tile.index);
      const label=a.length===1?`preferred shift (${signed(a[0].dx)}, ${signed(a[0].dy)})${a[0].searchBoundary?'; search edge':a[0].imageBoundary?'; image edge':''}`:`${a.length} tied preferred shifts`;
      d.append(node('summary',`R${tile.index+1}: (${s.left}, ${s.top}) to (${s.left+s.width}, ${s.top+s.height}); ${label}`));
      let view=null;const saved=profiles[profile]?.tiles?.[tile.index];
      const open=()=>{if(!d.open||view)return;view=renderTranslationComparison({...c,boundary:profile==='contained'?c.boundary:'The same declared reference pixels are compared at every integer shift. This region fits its own additive brightness offset. Finite image appearance does not establish physical correspondence.'},{expanded:saved?.expanded,page:saved?.page,coverageDescription:profile==='contained'?`${c.candidateCount} complete destination rectangles use these same ${s.width} × ${s.height} reference pixels. Integer x shifts ${c.domain.minimumDx} to ${c.domain.maximumDx}; y shifts ${c.domain.minimumDy} to ${c.domain.maximumDy}. The reference rectangle is never clipped or wrapped. Every other fixed region is separately reported.`:`${c.candidateCount} shifts use these same ${s.width} × ${s.height} reference pixels. Other reference regions and outer borders do not enter this regional fit; every other fixed region remains separately reported.`});view.dataset.regionalTileComparison=String(tile.index);d.append(view);};
      d.addEventListener('toggle',open);entry.append(d);list.append(entry);tileViews.set(tile.index,{d,getView:()=>view});if(saved?.open){d.open=true;open();}
    }
    output.append(list,node('p',profile==='contained'
      ?`${value.work.containedCandidates.toLocaleString()} complete destination candidates; ${value.work.containedChannelComparisons.toLocaleString()} RGB channel comparisons, plus baseline comparison and histogram statistics. At most two complete-placement results are kept at once; older ones can be recomputed without losing original frames.`
      :`${value.work.regionalCandidates} regional shift candidates cover ${value.work.regionalReferencePixelCandidates.toLocaleString()} reference-pixel candidates, equal to one whole-interior search pass, plus separate region statistics. The global pass is retained separately.`),node('p',value.limitation));
  }
  const api={element,sync,
    pending(nextProfile='window'){running=true;status.textContent=nextProfile==='contained'?'Comparing every contained destination in the background. The existing regional result stays visible…':'Comparing all eight regions in the background…';sync();},
    receive(next,nextProfile='window'){running=false;values[nextProfile]=next;if(nextProfile==='contained'&&!values.window&&next.baseline)values.window=next.baseline;activate(nextProfile);},
    cancelled(message='Regional comparison cancelled.'){running=false;status.textContent=message;sync();},
    fail(message){running=false;status.textContent=`Regional comparison unavailable: ${message}`;sync();},
    releaseContained(){values.contained=undefined;if(profile==='contained')activate('window');status.textContent='The complete-placement result was released to bound memory. Original frames and the ±16 comparison are retained; search again to recompute.';sync();},
    getState(){remember();return {open:details.open,profile,profiles,tiles:profiles[profile]?.tiles??{}};}
  };
  const begin=()=>{if(running||value||!current()||busy())return;request(api,'window');};
  start.addEventListener('click',begin);stop.addEventListener('click',()=>cancel(api));
  complete.addEventListener('click',()=>{if(running||!current()||busy())return;if(values.contained)activate('contained');else request(api,'contained');});
  windowed.addEventListener('click',()=>{if(running||!current()||busy())return;activate('window');});
  details.addEventListener('toggle',()=>{if(!current())return;if(details.open){if(value)populate();else begin();}else if(running)cancel(api);});
  if(value)status.textContent=readyText();
  else status.textContent='Open this inspection to compare the fixed regional partition.';
  details.open=state.open===true;if(details.open&&value)populate();sync();return api;
}
