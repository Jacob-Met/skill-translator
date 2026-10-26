import {importInstrumentTrace} from '/src/instrument-trace.mjs';
import {inspectTraceReading} from '/src/numeric-trace-readings.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const number=value=>value===''?NaN:Number(value);
/** Narrow producer intake inside the existing numeric row. Host owns source lifecycle. */
export function mountTraceReading(parent,{row,example,prefix,getContext,adoptContext,beginRead,isCurrent,finishRead,onChange,onRender,onMessage}){
 const box=el('section');box.className='trace-reading';box.append(el('h3','Use an existing instrument trace'));
 box.append(el('p','Open the source-bound instrument-trace.json saved by Scalar instrument trace. Original sample values, calibration and clock declarations stay attached. Measurement uncertainty must be declared separately.'));
 const producer=el('a','Open Scalar instrument trace in a new tab');producer.href='/instrument-trace';producer.target='_blank';producer.rel='noopener';box.append(producer);
 const label=el('label','Attach exported instrument trace'),file=el('input');file.type='file';file.accept='.json';file.id=prefix+'-trace-file';label.append(file);box.append(label);parent.append(box);
 file.onchange=async()=>{
  const selected=file.files[0];if(!selected)return;file.value='';const job=beginRead();
  try{
   if(selected.size>2*1024*1024)throw Error('Instrument trace exceeds2 MiB');const raw=JSON.parse(await selected.text());if(!isCurrent(job))return;
   const trace=importInstrumentTrace(example.source,raw),context=getContext(),quantity=context.quantity||trace.instrument.quantity,unit=context.unit||trace.instrument.unit;
   if(quantity!==trace.instrument.quantity||unit!==trace.instrument.unit)throw Error('Common quantity and unit must exactly match this trace: '+trace.instrument.quantity+' / '+trace.instrument.unit+'. No conversion is inferred.');
   const step=example.source.steps.find(s=>s.id===example.stepId),momentId=row.reading?.momentId??row.traceReading?.momentId??step.beforeMomentId;
   adoptContext({quantity,unit});row.reading=null;row.traceReading={trace,momentId,sampleIndex:null,uncertainty:{below:NaN,above:NaN,basis:''},timingBasis:''};
   finishRead(job);onRender();onMessage('Original trace attached. Declare measurement bounds and nominal timing basis; no manual numeric value needs copying.');
  }catch(error){if(isCurrent(job)){finishRead(job);onMessage('Trace refused; accepted row retained. '+error.message,true);}}
 };
 if(!row.traceReading)return {refresh(){}};
 const input=row.traceReading,trace=input.trace,step=example.source.steps.find(s=>s.id===example.stepId);
 box.append(el('p',`${trace.samples.length} original samples · ${trace.instrument.name} · ${trace.instrument.quantity} (${trace.instrument.unit}) · ${trace.evidenceClass}. Calibration account: ${trace.instrument.calibrationBasis}`));
 const originals=el('details');originals.append(el('summary','Inspect retained trace, original sample order and clock declarations'),el('pre',JSON.stringify(trace,null,2)));box.append(originals);
 const sourceFrame=el('label','Original frame for nominal time matching'),moments=el('select');moments.id=prefix+'-trace-moment';for(const id of [step.beforeMomentId,step.afterMomentId]){const o=el('option',example.source.moments.find(m=>m.id===id).label);o.value=id;moments.append(o);}moments.value=input.momentId;sourceFrame.append(moments);box.append(sourceFrame);
 const fields=[];
 function field(name,value,id,type,change){const l=el('label',name),i=el('input');i.type=type;i.id=prefix+'-'+id;i.value=Number.isNaN(value)?'':value??'';if(type==='number')i.step='any';else i.maxLength=1000;i.oninput=()=>{change(i.value);onChange();refresh();};l.append(i);box.append(l);fields.push(i);return i;}
 const index=field('Original sample number (1-based; blank = automatic unique exact match)',input.sampleIndex===null?'':input.sampleIndex+1,'trace-index','number',v=>input.sampleIndex=v===''?null:Number(v)-1);index.min='1';index.max=String(trace.samples.length);index.step='1';
 for(const side of ['below','above']){const i=field(`Declared measurement uncertainty ${side} the recorded value (${trace.instrument.unit})`,input.uncertainty[side],'trace-'+side,'number',v=>input.uncertainty[side]=number(v));i.min='0';}
 field('Basis for these measurement-error bounds',input.uncertainty.basis,'trace-uncertainty-basis','text',v=>input.uncertainty.basis=v);
 field('Basis for nominal frame/sample timing correspondence',input.timingBasis,'trace-timing-basis','text',v=>input.timingBasis=v);
 const remove=el('button','Detach trace and enter a manual reading');remove.type='button';remove.id=prefix+'-trace-remove';remove.onclick=()=>{row.traceReading=null;row.reading=null;onChange();onRender();};box.append(remove);
 const state=el('p');state.id=prefix+'-trace-status';state.setAttribute('role','status');box.append(state);
 moments.onchange=()=>{input.momentId=moments.value;onChange();refresh();};
 function refresh(){
  try{const r=inspectTraceReading(example,input,getContext());
   if(r.reading)state.textContent=`Original sample ${r.selectedIndex+1}: recorded value ${r.recordedValue} ${trace.instrument.unit} at instrument time ${r.originalInstrumentTimeSeconds}s; nominal original frame time ${r.frameTimeSeconds}s. Derived closed range [${r.reading.range[0]}, ${r.reading.range[1]}]. ${r.matchingIndexes.length>1?'Several samples share this nominal mapped time; the explicitly selected original index is retained.':''}`;
   else state.textContent=`No numeric reading: ${r.status}. Exact nominal matching sample numbers: ${r.matchingIndexes.map(i=>i+1).join(', ')||'none'}. No nearest sample or interpolation is used.`;
  }catch(error){state.textContent='Trace reading is not ready: '+error.message;}
 }
 refresh();return {refresh};
}
