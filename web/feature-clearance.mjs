import {mountFeatureWidth} from '/web/feature-width.mjs';
import {mountFeaturePractice} from '/web/feature-practice.mjs';
import {derive} from '/src/geometry.mjs';
import {demonstration} from '/src/demo.mjs';
import {FEATURE_SCHEMA,FEATURE_ASSUMPTION,reopenFeatureClearance,featurePracticeInput} from '/src/feature-clearance.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const fmt=n=>n.toFixed(3);
let source=null,accepted=null,epoch=0;
const receiver=mountFeaturePractice({host:$('featurePractice'),getComparison:()=>!$('results').hidden?accepted?.bundle:null,getRevision:()=>epoch,installComparison:bundle=>install(reopenFeatureClearance(bundle),'Feature declarations restored from the complete practice review.')});
const widthReceiver=mountFeatureWidth({host:$('featureWidth'),getComparison:()=>!$('results').hidden?accepted?.bundle:null,getRevision:()=>epoch,installComparison:bundle=>install(reopenFeatureClearance(bundle),'Width-study comparison restored.')});
function error(message){$('error').hidden=!message;$('error').textContent=message;}
function markDirty(){epoch++;$('results').hidden=true;$('status').textContent='Inputs changed; compare again before saving or opening practice.';receiver.refresh();widthReceiver.refresh();}
function editor(demo,features=null,gap='',sizes=null,declared=false){
 source=structuredClone(demo);$('editor').hidden=false;$('sourceTitle').textContent=source.title||'Annotated task';$('provenance').textContent=source.provenance||'No provenance description supplied.';
 $('features').replaceChildren();for(const mark of source.landmarks){const label=el('label',`${mark.label} · feature radius (mm)`),input=el('input');input.type='number';input.min='0';input.max='10000';input.step='any';input.required=true;input.dataset.id=mark.id;input.value=features?.find(f=>f.id===mark.id)?.radiusMm??'';label.append(input);$('features').append(label);}
 $('gap').value=gap;$('sizes').value=(sizes||[{widthMm:source.source.widthMm,heightMm:source.source.heightMm}]).map(s=>`${s.widthMm},${s.heightMm}`).join('\n');$('assumption').checked=declared;
}
function install(result,message){accepted=result;epoch++;editor(result.bundle.source,result.bundle.features,result.bundle.requiredGapMm,result.bundle.workpieces,true);$('selected').replaceChildren();result.reports.forEach((r,i)=>{const option=el('option',`${r.widthMm} × ${r.heightMm} mm · nominal ${r.nominalMeets?'meets':'fails'} · tolerance envelope ${r.toleranceEnvelopeMeets?'meets':'fails'}`);option.value=i;$('selected').append(option);});error('');$('status').textContent=message;render();receiver.refresh();widthReceiver.refresh();}
function render(){
 const r=accepted.reports[Number($('selected').value)];$('results').hidden=false;
 const limiting=r.pairs.reduce((a,b)=>a.toleranceMarginMm<=b.toleranceMarginMm?a:b);
 $('summary').textContent=`${r.widthMm} × ${r.heightMm} mm; required gap ${fmt(r.requiredGapMm)} mm. ${r.pairs.filter(p=>!p.nominalMeets).length}/${r.pairs.length} pairs fail nominal gap; ${r.pairs.filter(p=>!p.toleranceEnvelopeMeets).length}/${r.pairs.length} pairs fail the full tolerance envelope. Limiting pair: ${limiting.from} / ${limiting.to}, envelope margin ${fmt(limiting.toleranceMarginMm)} mm.`;
 $('pairs').replaceChildren();for(const p of r.pairs){const row=el('tr');for(const value of [`${p.from} / ${p.to}`,fmt(p.distanceMm),fmt(p.nominalGapMm),fmt(p.minimumToleranceGapMm),!p.nominalMeets?'Nominal fails':p.toleranceEnvelopeMeets?'Both meet':'Nominal meets; envelope fails'])row.append(el('td',value));$('pairs').append(row);}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 const ext=Math.max(...r.marks.map(m=>m.radiusMm+m.toleranceMm)),pad=Math.max(r.widthMm,r.heightMm)*.04;
 const minX=Math.min(0,...r.marks.map(m=>m.xMm-ext))-pad,minY=Math.min(0,...r.marks.map(m=>m.yMm-ext))-pad;
 const maxX=Math.max(r.widthMm,...r.marks.map(m=>m.xMm+ext))+pad,maxY=Math.max(r.heightMm,...r.marks.map(m=>m.yMm+ext))+pad;
 svg.setAttribute('viewBox',`${minX} ${minY} ${maxX-minX} ${maxY-minY}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Circular feature footprints and dashed placement envelopes in physical millimetres. Pair distances and results are in the table.');
 const add=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;svg.append(n);};
 const stroke=Math.max(r.widthMm,r.heightMm)/400;
 add('rect',{x:0,y:0,width:r.widthMm,height:r.heightMm,fill:'#fff',stroke:'#789','stroke-width':stroke});
 for(const m of r.marks){add('circle',{cx:m.xMm,cy:m.yMm,r:m.radiusMm+m.toleranceMm,fill:'none',stroke:'#a96c16','stroke-width':stroke,'stroke-dasharray':`${stroke*3} ${stroke*2}`});add('circle',{cx:m.xMm,cy:m.yMm,r:m.radiusMm,fill:'#37adad55',stroke:'#146f73','stroke-width':stroke});add('circle',{cx:m.xMm,cy:m.yMm,r:stroke,fill:'#123'});add('text',{x:m.xMm+stroke*2,y:m.yMm-stroke*3,'font-size':stroke*8},m.id);}
 $('diagram').replaceChildren(svg);
}
async function read(file,limit){if(!file||file.size>limit)throw Error('Choose a JSON file within the displayed size limit');return JSON.parse(await file.text());}
function number(text){if(!String(text).trim())throw Error('Every numeric declaration must be supplied explicitly');const value=Number(text);if(!Number.isFinite(value))throw Error('Numeric declarations must be finite');return value;}
$('settings').addEventListener('input',markDirty);
$('settings').addEventListener('submit',event=>{event.preventDefault();epoch++;try{if(!$('assumption').checked)throw Error('Confirm the circular-feature assumption');const workpieces=$('sizes').value.trim().split('\n').map(line=>{const values=line.trim().split(/[\s,]+/);if(values.length!==2)throw Error('Each size needs exactly width,height');return{widthMm:number(values[0]),heightMm:number(values[1])};});const features=[...$('features').querySelectorAll('input')].map(input=>({id:input.dataset.id,radiusMm:number(input.value)}));install(reopenFeatureClearance({schema:FEATURE_SCHEMA,assumption:FEATURE_ASSUMPTION,source,features,requiredGapMm:number($('gap').value),workpieces}),'Comparison recomputed from the retained source and your explicit assumptions.');}catch(e){error('Comparison refused. '+e.message);}});
$('sourceFile').addEventListener('change',async event=>{const input=event.target,file=input.files[0],token=++epoch;try{const next=await read(file,256*1024);const d=derive(next);if(d.landmarks.length<2)throw Error('At least two marks are needed');if(token!==epoch)return;editor(next);accepted=null;$('results').hidden=true;receiver.refresh();widthReceiver.refresh();error('');$('status').textContent='Source retained. Supply every feature radius, required gap and workpiece sizes.';}catch(e){if(token===epoch)error('Source refused; previous accepted state retained. '+e.message);}finally{if(input.files[0]===file)input.value='';}});
$('bundleFile').addEventListener('change',async event=>{const input=event.target,file=input.files[0],token=++epoch;try{const next=reopenFeatureClearance(await read(file,512*1024));if(token!==epoch)return;install(next,'Saved source and declarations reopened. All gaps were recomputed.');}catch(e){if(token===epoch)error('Comparison refused; previous accepted state retained. '+e.message);}finally{if(input.files[0]===file)input.value='';}});
$('example').addEventListener('click',()=>install(reopenFeatureClearance({schema:FEATURE_SCHEMA,assumption:FEATURE_ASSUMPTION,source:demonstration,features:demonstration.landmarks.map(m=>({id:m.id,radiusMm:12})),requiredGapMm:8,workpieces:[{widthMm:240,heightMm:160},{widthMm:100,heightMm:80}]}),'Authored illustration with hypothetical 12 mm radii and 8 mm gap; no physical observation.'));
$('selected').addEventListener('change',()=>{epoch++;render();});
$('save').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(accepted.bundle,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='feature-clearance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('practice').addEventListener('click',()=>{try{const input=featurePracticeInput(accepted.bundle,Number($('selected').value));sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify(input));location.assign('/practice');}catch(e){error('Practice could not open. '+e.message);}});



$('openFeatureRehearsal').addEventListener('click',()=>{if($('results').hidden||!accepted)return;sessionStorage.setItem('skill-translator-feature-rehearsal-comparison/v1',JSON.stringify(accepted.bundle));sessionStorage.removeItem('skill-translator-feature-rehearsal-return/v1');location.assign('/feature-rehearsal');});
