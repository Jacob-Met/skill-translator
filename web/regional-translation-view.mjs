import {renderTranslationComparison} from '/web/visual-translation-view.mjs';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const signed=n=>n>=0?`+${n}`:String(n);

/** One report-owned lazy view. The scanner owns and limits worker lifetime. */
export function createRegionalAppearanceView(before,after,{result,state={},request,cancel,current,busy}={}){
  const element=node('section');element.className='regional-appearance';
  const details=node('details'),summary=node('summary','Compare shifts across eight fixed image regions');
  const status=node('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const output=node('div'),actions=node('div');actions.className='actions';
  const start=node('button','Compare eight regions'),stop=node('button','Cancel regional comparison');
  for(const button of [start,stop]){button.type='button';button.dataset.regionalControl='true';}
  start.dataset.regionalAction='start';stop.dataset.regionalAction='cancel';actions.append(start,stop);
  details.append(summary,node('p','Inspect whether different parts of these small images prefer the same shift. The complete common interior is split into four columns and two rows; no point or image region is selected by hand.'),status,actions,output);element.append(details);
  let running=false,value=result,initialized=false;
  const tileViews=new Map();
  function sync(){start.disabled=running||!current()||busy();stop.disabled=!running;start.hidden=Boolean(value);stop.hidden=!running;}
  function draw(sample,which,account){
    const figure=node('figure'),canvas=node('canvas'),scale=3;canvas.width=sample.widthPx*scale;canvas.height=sample.heightPx*scale;
    const original=document.createElement('canvas');original.width=sample.widthPx;original.height=sample.heightPx;original.getContext('2d').putImageData(new ImageData(sample.rgba,sample.widthPx,sample.heightPx),0,0);
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(original,0,0,canvas.width,canvas.height);ctx.font='bold 12px monospace';ctx.textBaseline='top';ctx.lineWidth=1;
    for(const tile of account.tiles){const c=tile.comparison,a=c.alternatives,unique=a.length===1,s=c.support;
      if(which==='later'&&!unique)continue;
      const dx=which==='later'?a[0].dx:0,dy=which==='later'?a[0].dy:0,x=(s.left+dx)*scale,y=(s.top+dy)*scale;
      const color=!unique?'#ffc96b':a[0].searchBoundary?'#ffb0a6':'#78f0d3';ctx.strokeStyle=color;ctx.strokeRect(x+.5,y+.5,s.width*scale-1,s.height*scale-1);
      const label=which==='later'?`R${tile.index+1}`:`R${tile.index+1} ${unique?`${signed(a[0].dx)},${signed(a[0].dy)}`:`${a.length} fits`}`;
      const w=Math.min(s.width*scale-2,ctx.measureText(label).width+4);ctx.fillStyle='#10251f';ctx.fillRect(x+1,y+1,w,16);ctx.fillStyle=color;ctx.fillText(label,x+3,y+3,Math.max(1,w-4));
    }
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${which==='earlier'?'Earlier reference regions and their preferred image shifts':'Later sample with regions placed by unique image-shift fits only'}. Detailed alternatives are listed below.`);
    figure.append(canvas,node('figcaption',`${which==='earlier'?'Earlier':'Later'} original sample, ${sample.widthPx} × ${sample.heightPx} pixels. Display enlargement adds no detail. ${which==='earlier'?'Labels are sample-pixel shifts; amber means tied alternatives, pink means a search-edge fit.':'Only unique appearance fits are drawn; overlapping boxes can occur. No physical point mapping is established.'}`));return figure;
  }
  function populate(){
    if(!details.open||!value||initialized)return;initialized=true;output.replaceChildren();tileViews.clear();
    if(value.status!=='compared'){output.append(node('p',value.reason||'Regional comparison is unavailable.'));return;}
    const shared=value.commonShifts;
    output.append(node('p',shared.length===0?'No integer shift is preferred by every region under its independently fitted brightness offset.':shared.length===1?`Every region includes the preferred shift (${signed(shared[0].dx)}, ${signed(shared[0].dy)}). Brightness offsets remain independently fitted.`:`${shared.length} shifts are preferred in every region; there is no unique shared image shift.`));
    output.append(node('p',`Whole-interior residual ${(value.global.meanAdjustedChange*255).toFixed(2)} levels; independent regional residual ${(value.independentRegionalMean*255).toFixed(2)} levels on the same ${value.support.pixelCount} reference pixels. Independent regional fitting has more freedom; a lower residual alone does not establish accuracy.`));
    output.append(draw(before,'earlier',value),draw(after,'later',value));
    const list=node('ol');list.dataset.regionalTiles='true';
    for(const tile of value.tiles){const c=tile.comparison,s=c.support,a=c.alternatives,entry=node('li'),d=node('details');d.dataset.regionalTile=String(tile.index);
      const label=a.length===1?`preferred shift (${signed(a[0].dx)}, ${signed(a[0].dy)})${a[0].searchBoundary?'; search edge':''}`:`${a.length} tied preferred shifts`;
      d.append(node('summary',`R${tile.index+1}: (${s.left}, ${s.top}) to (${s.left+s.width}, ${s.top+s.height}); ${label}`));
      let view=null;const saved=state.tiles?.[tile.index];
      const open=()=>{if(!d.open||view)return;view=renderTranslationComparison({...c,boundary:'The same declared reference pixels are compared at every integer shift. This region fits its own additive brightness offset. Finite image appearance does not establish physical correspondence.'},{expanded:saved?.expanded,page:saved?.page,coverageDescription:`${c.candidateCount} shifts use these same ${s.width} × ${s.height} reference pixels. Other reference regions and outer borders do not enter this regional fit; every other fixed region remains separately reported.`});view.dataset.regionalTileComparison=String(tile.index);d.append(view);};
      d.addEventListener('toggle',open);entry.append(d);list.append(entry);tileViews.set(tile.index,{d,getView:()=>view});if(saved?.open){d.open=true;open();}
    }
    output.append(list,node('p',`${value.work.regionalCandidates} regional shift candidates cover ${value.work.regionalReferencePixelCandidates.toLocaleString()} reference-pixel candidates, equal to one whole-interior search pass, plus separate region statistics. The global pass is retained separately.`),node('p',value.limitation));
  }
  const api={element,sync,
    pending(){running=true;status.textContent='Comparing all eight regions in the background…';sync();},
    receive(next){running=false;value=next;status.textContent=next.status==='compared'?'Regional comparison ready. All eight regions and every exact alternative are retained.':'Regional comparison unavailable.';initialized=false;populate();sync();},
    cancelled(message='Regional comparison cancelled.'){running=false;status.textContent=message;sync();},
    fail(message){running=false;status.textContent=`Regional comparison unavailable: ${message}`;sync();},
    getState(){return {open:details.open,tiles:Object.fromEntries([...tileViews].map(([i,{d,getView}])=>{const v=getView();return [i,{open:d.open,expanded:v?.querySelector('details')?.open===true,page:Number(v?.dataset.page)||0}];}))};}
  };
  const begin=()=>{if(running||value||!current()||busy())return;request(api);};
  start.addEventListener('click',begin);stop.addEventListener('click',()=>cancel(api));
  details.addEventListener('toggle',()=>{if(!current())return;if(details.open){if(value)populate();else begin();}else if(running)cancel(api);});
  if(value)status.textContent=value.status==='compared'?'Regional comparison ready. All eight regions and every exact alternative are retained.':'Regional comparison unavailable.';
  else status.textContent='Open this inspection to compare the fixed regional partition.';
  details.open=state.open===true;if(details.open&&value)populate();sync();return api;
}
