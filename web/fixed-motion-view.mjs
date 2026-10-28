import {sharedMotionInputs} from '/src/shared-motion-groups.mjs';
export const FIXED_MOTION_FORMAT='skill-translator.fixed-motion-inquiry/v1';
export function createFixedMotionView(host){
 const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const section=n('section'),title=n('h2','Test one declared orientation'),intro=n('p','Select corresponding points and two retained sources. This asks whether any shared translation fits every selected point at an explicitly declared proper orientation. Original least-squares groups and practice scores remain separate.');
 const from=n('select'),to=n('select'),points=n('fieldset'),legend=n('legend','Points included in this inquiry'),preset=n('select');
 for(const [value,label]of [['1,0','0°'],['1,1','90°'],['0,1','180°'],['1,-1','270°'],['custom','Custom exact orientation']]){const o=n('option',label);o.value=value;preset.append(o);}
 const a=n('input'),b=n('input');for(const e of [a,b]){e.type='number';e.step='1';e.min='-1000000';e.max='1000000';}a.value='1';b.value='0';
 const custom=n('div'),formula=n('p','Custom integer parameters: cosine = (a² − b²)/(a² + b²), sine = 2ab/(a² + b²). They declare an exact proper orientation, not an approximate fitted angle. Both cannot be zero.');
 const label=(text,control)=>{const l=n('label',text+' ');l.append(control);return l;};
 custom.append(label('a',a),label('b',b),formula);custom.hidden=true;
 const run=n('button','Test this orientation'),cancel=n('button','Cancel inquiry'),save=n('button','Save inquiry and original inputs'),status=n('p','Open original demonstrations to begin.'),output=n('div');
 run.id='fixedMotionRun';cancel.id='fixedMotionCancel';save.id='fixedMotionSave';status.id='fixedMotionStatus';output.id='fixedMotionResult';from.id='fixedMotionFrom';to.id='fixedMotionTo';preset.id='fixedMotionOrientation';points.id='fixedMotionPoints';
 status.setAttribute('role','status');output.setAttribute('aria-live','polite');
 section.append(title,intro,label('From original source',from),label('To original source',to),points,label('Declared orientation',preset),custom,run,cancel,save,status,output);host.append(section);
 let study=null,getOriginal=null,worker=null,generation=0,lastSelection=null;
 const pending=value=>{run.setAttribute('aria-disabled',String(value||!study));cancel.disabled=!value;section.setAttribute('aria-busy',String(value));};
 function stop(message){generation++;worker?.terminate();worker=null;pending(false);if(message)status.textContent=message;}
 function clearOutput(){output.replaceChildren();delete output.dataset.status;}
 function changed(){stop('Declaration changed. Test explicitly to compute a new certificate.');lastSelection=null;save.disabled=true;clearOutput();}
 function selection(){return {fromSourceId:from.value,toSourceId:to.value,ids:[...points.querySelectorAll('input:checked')].map(e=>e.value),orientation:{a:Number(a.value),b:Number(b.value)}};}
 function exact(v){return v.exact.numerator+'/'+v.exact.denominator;}
 const approx=v=>((v.lower+v.upper)/2).toPrecision(6);
 function show(r){
  output.replaceChildren();output.dataset.status=r.status;
  if(r.distanceInvariant?.status==='unavailable'){const p=n('p',r.distanceInvariant.reason);p.id='motionDistanceInvariant';p.dataset.status='unavailable';output.append(p);}
  else if(r.distanceInvariant){
   const inv=r.distanceInvariant,box=n('section');box.id='motionDistanceInvariant';box.dataset.excluded=String(inv.excluded);
   box.append(n('h3','Distance check independent of orientation'),n('p',inv.excluded?'At least one selected pair rules out every rigid translation/rotation under the declared per-point bound. Changing only the orientation cannot resolve this contradiction.':'No selected pair rules out rigid motion. This is inconclusive: a proper rotation/translation or jointly feasible placement has not been established.'));
   box.append(n('p',inv.pairCount+' selected pairs retained; each endpoint has the same '+inv.perPointBoundMm+' mm bound. Reflections also preserve pair distances, so this check cannot establish properness.'));
   const table=n('details');table.append(n('summary','Inspect every selected pair and exact comparison'));const list=n('ul'),rat=v=>v.numerator+'/'+v.denominator;
   for(const pair of inv.pairs)list.append(n('li',pair.ids.join(' ↔ ')+': '+(pair.excluded?'contradiction':'not excluded')+'. Original squared distances '+rat(pair.fromSquaredMm)+' and '+rat(pair.toSquaredMm)+' mm²; D='+rat(pair.D)+', D²−4AB='+rat(pair.squaredComparisonGap)+'.'));
   table.append(list);box.append(table,n('p',inv.limitation));output.append(box);
  }
  output.append(n('p','Declared cosine '+exact(r.orientation.cosine)+', sine '+exact(r.orientation.sine)+'. Exact closed residual bound: '+r.thresholdMm+' mm.'));
  if(r.status==='common-position'){
   output.append(n('p','A common translation is admitted: x ≈ '+approx(r.point.xMm)+' mm, y ≈ '+approx(r.point.yMm)+' mm. Every selected point meets the declared bound.'));
   const list=n('ul');for(const x of r.checks)list.append(n('li',x.observationId+': squared margin ≈ '+approx(x.squaredMargin)+' mm² (verified nonnegative).'));output.append(list);
   const details=n('details');details.append(n('summary','Inspect the exact translation and certificate'),n('p','Translation x = '+exact(r.point.xMm)+' mm; y = '+exact(r.point.yMm)+' mm.'));
   for(const x of r.checks)details.append(n('p',x.observationId+': exact squared margin '+exact(x.squaredMargin)+' mm².'));output.append(details);
  }else if(r.status==='incompatible'){
   output.append(n('p',r.distanceInvariant?.excluded?'No common translation exists at this declared orientation. The separate distance contradiction above also rules out other orientations under the same bound.':'No common translation exists at this declared orientation. Another orientation has not been ruled out.'));
   const proof=n('details');proof.append(n('summary','Inspect the fixed-orientation contradiction certificate'),n('p','Certificate support: '+r.certificate.support.map(x=>x.observationId+' (weight '+exact(x.weight)+')').join(', ')+'. Positive weighted squared-residual lower bound: '+exact(r.certificate.weightedSquaredResidualLowerBound)+' mm².'));output.append(proof);
  }else output.append(n('p','Unresolved: the bounded calculation produced no complete certificate.'));
  const fit=r.leastSquares.fit;output.append(n('p',fit?'Separate least-squares fit: largest residual '+Math.max(...fit.residuals.map(x=>x.errorMm)).toPrecision(6)+' mm. Its fitted angle is not this declaration.':'Separate least-squares orientation unavailable: '+r.leastSquares.unavailable));
  output.append(n('p','Fixed-orientation calculation alone: '+r.limitation));status.textContent='Completed for '+r.selectedIds.length+' points, '+r.fromSourceId+' → '+r.toSourceId+'. Work '+r.work+' / '+r.workLimit+'.';
 }
 run.onclick=()=>{
  if(!study||worker)return;
  const declared=selection();if(!a.value.trim()||!b.value.trim()){status.textContent='Declare both orientation parameters.';return;}
  stop();const ticket=generation;lastSelection=null;save.disabled=true;clearOutput();pending(true);status.textContent='Computing a bounded exact certificate. Cancel remains available.';
  try{
   worker=new Worker('/web/fixed-motion-worker.mjs',{type:'module'});
   worker.onmessage=event=>{if(ticket!==generation)return;stop();if(event.data.error){status.textContent='Inquiry refused: '+event.data.error;return;}lastSelection=declared;save.disabled=false;show(event.data.result);};
   worker.onerror=()=>{if(ticket!==generation)return;stop('Calculation unavailable; no certificate was accepted.');};
   worker.postMessage({study,selection:declared});
  }catch(error){stop('Calculation unavailable: '+error.message);}
 };
 cancel.onclick=()=>stop('Inquiry cancelled. No result was accepted.');
 for(const e of [from,to,a,b,points])e.addEventListener('input',changed);
 preset.onchange=()=>{custom.hidden=preset.value!=='custom';if(!custom.hidden){changed();return;}[a.value,b.value]=preset.value.split(',');changed();};
 save.onclick=async()=>{
  if(!study||!lastSelection)return;const ticket=generation,declared=lastSelection;
  try{const discovery=await getOriginal();if(ticket!==generation||declared!==lastSelection)return;
   const blob=new Blob([JSON.stringify({format:FIXED_MOTION_FORMAT,discovery,selection:declared},null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=n('a');link.href=url;link.download='skill-fixed-motion-inquiry.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){if(ticket===generation)status.textContent='Save unavailable: '+error.message;}
 };
 window.addEventListener('pagehide',()=>stop());
 pending(false);save.disabled=true;
 return {
  invalidate(){study=null;getOriginal=null;stop('Source input changed. Accept original demonstrations again before testing or saving an inquiry.');lastSelection=null;save.disabled=true;clearOutput();},
  update(raw,original){
   stop();study=raw;getOriginal=original;lastSelection=null;save.disabled=true;clearOutput();
   const input=sharedMotionInputs(raw);from.replaceChildren();to.replaceChildren();points.replaceChildren(legend);
   for(const row of input.rows)for(const select of [from,to]){const o=n('option',row.id);o.value=row.id;select.append(o);}to.selectedIndex=1;
   for(const id of input.referenceIds){const check=n('input');check.type='checkbox';check.value=id;check.checked=input.referenceIds.length<=12;points.append(label(id+' · '+(input.rows[0].points.get(id)?.label||id),check));}
   preset.value='1,0';a.value='1';b.value='0';custom.hidden=true;pending(false);status.textContent='Choose points and an orientation, then test explicitly.';
  },
  restore(s){
   if(!s||!Array.isArray(s.ids)||!s.orientation)throw Error('Saved inquiry needs original selection declarations.');
   from.value=s.fromSourceId;to.value=s.toSourceId;
   if(!from.value||!to.value)throw Error('Saved source selection is absent from original inputs.');
   for(const e of points.querySelectorAll('input'))e.checked=s.ids.includes(e.value);
   if(s.ids.some(id=>![...points.querySelectorAll('input')].some(e=>e.value===id)))throw Error('Saved point selection is absent from original inputs.');
   a.value=String(s.orientation.a);b.value=String(s.orientation.b);preset.value='custom';custom.hidden=false;changed();
  }
 };
}
