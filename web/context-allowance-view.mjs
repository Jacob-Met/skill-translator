/** Optional hypothetical sensitivity; original context and result remain untouched. */
export function mountContextAllowance(after){
 const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const host=make('section');host.id='allowanceSection';host.hidden=true;
 const title=make('h2','How much hypothetical allowance would make this context consistent?');
 const boundary=make('p','This adds the same nonnegative amount to every squared radius. It does not add the same amount to each radius, estimate measurement accuracy, identify a faulty record, or recommend changing any bound. Your original context result and observations stay unchanged.');
 const button=make('button','Quantify hypothetical squared allowance');button.id='quantifyAllowance';button.type='button';
 const status=make('p');status.id='allowanceStatus';status.setAttribute('role','status');
 const output=make('div');output.id='allowanceResult';output.hidden=true;
 host.append(title,boundary,button,status,output);after.after(host);
 let account=null,worker=null,generation=0;
 function reset(){generation++;worker?.terminate();worker=null;account=null;host.hidden=true;output.hidden=true;output.replaceChildren();delete output.dataset.status;button.disabled=false;status.textContent='';}
 function ready(value){reset();account=structuredClone(value);host.hidden=false;}
 button.onclick=()=>{
  if(!account)return;generation++;worker?.terminate();const token=generation;output.hidden=true;output.replaceChildren();button.disabled=true;status.textContent='Checking a lower bound and a point against every selected original record…';
  const current=account,w=new Worker('/web/context-allowance-worker.mjs',{type:'module'});worker=w;
  w.onmessage=event=>{if(token!==generation)return;w.terminate();worker=null;button.disabled=false;
   if(event.data.error){status.textContent='Allowance computation refused: '+event.data.error;return;}
   const r=event.data.result;output.hidden=false;output.dataset.status=r.status;
   if(r.status!=='optimal'){status.textContent='Unresolved: no matching lower-bound and all-record feasible-point proof was completed.';output.append(make('p',r.reason));return;}
   const q=r.allowanceSquaredMm.exact,value=q.denominator==='1'?q.numerator:q.numerator+'/'+q.denominator;
   status.textContent='Exact conditional optimum verified; original bounds and original contradiction are unchanged.';
   output.append(make('p',`Minimum hypothetical allowance: ${value} mm² added to each squared radius. The allowance is max(0, the optimum squared residual); a negative optimum therefore requires zero additional allowance.`));
   output.append(make('p',`The weighted lower-bound certificate and the point checked against all ${r.checks.length} selected records agree exactly. This is an optimum for the supplied declaration only.`));
   const list=make('ul');for(const id of r.selectedIds){const row=current.observationEvidence.observations.find(o=>o.id===id);list.append(make('li',`${row.label} (${id}): original radius ${row.uncertaintyMm} mm; hypothetical radius √(${row.uncertaintyMm}² + ${value}) mm. Original record retained unchanged.`));}output.append(list);
   const details=make('details'),summary=make('summary','Exact optimum, supporting records and every record check'),pre=make('pre',JSON.stringify(r,null,2));details.append(summary,pre);output.append(details);
  };
  w.onerror=()=>{if(token!==generation)return;w.terminate();worker=null;button.disabled=false;status.textContent='Worker failed; no hypothetical allowance is claimed.';};w.postMessage(current);
 };
 window.addEventListener('pagehide',reset);return {reset,ready};
}
