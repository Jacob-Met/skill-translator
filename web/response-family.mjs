import {derive} from '../src/geometry.mjs';
import {RESPONSE_SCHEMA,createResponseObservation,validateResponseStudy,analyzeResponseStudy,exportResponseStudy} from '../src/response-family.mjs';
const $=id=>document.getElementById(id),copy=v=>JSON.parse(JSON.stringify(v));
let state=null,result=null,generation=0,dirty=false;
const status=text=>{$('status').textContent=text;};
const num=id=>$(id).valueAsNumber;
const fmt=x=>Number.isInteger(x)?String(x):x.toPrecision(6);
const span=r=>`${fmt(r.lower)} to ${fmt(r.upper)}`;
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function svg(tag,attrs,text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function plot(axis){const el=$(axis+'-plot'),a=result.axes[axis],l=state.coefficientLimit;el.hidden=false;el.replaceChildren();
 const px=v=>40+(v+l)/(2*l)*280,py=v=>235-(v+l)/(2*l)*200;
 el.append(svg('rect',{x:40,y:35,width:280,height:200,fill:'none',stroke:'#9ab3a8'}),svg('path',{d:`M40 135H320 M180 35V235`,stroke:'#c7d5cb',fill:'none'}));
 for(const v of [-l,0,l]){el.append(svg('text',{x:px(v),y:253,'text-anchor':'middle'},fmt(v)),svg('text',{x:34,y:py(v)+4,'text-anchor':'end'},fmt(v)));}
 el.append(svg('text',{x:180,y:275,'text-anchor':'middle'},'a · response to width change'),svg('text',{x:40,y:20},'b · response to height change'));
 if(!a.vertices.length){el.append(svg('text',{x:180,y:140,'text-anchor':'middle'},'No compatible coefficients'));return;}
 const points=a.vertices.map(v=>[px((v.width.lower+v.width.upper)/2),py((v.height.lower+v.height.upper)/2)]);
 if(points.length>2)el.append(svg('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:'#c3e5ce',stroke:'#1a684b','stroke-width':2}));
 else if(points.length===2)el.append(svg('line',{x1:points[0][0],y1:points[0][1],x2:points[1][0],y2:points[1][1],stroke:'#1a684b','stroke-width':3}));
 for(const p of points)el.append(svg('circle',{cx:p[0],cy:p[1],r:3,fill:'#15573d'}));
}
function render(){
 $('workspace').hidden=false;$('mark').disabled=false;$('mark').replaceChildren(...state.source.landmarks.map(m=>{const o=node('option',m.label);o.value=m.id;return o;}));$('mark').value=state.landmarkId;
 $('source-title').textContent=`${state.source.title||'Supplied source'} · ${state.source.provenance||'Authored annotation'} · fixed ${state.source.source.widthMm} × ${state.source.source.heightMm} mm source`;
 $('limit').value=state.coefficientLimit;$('target-width').value=state.target.widthMm;$('target-height').value=state.target.heightMm;
 $('rows').replaceChildren(...state.observations.map(row=>{const tr=node('tr');tr.append(node('td',`${row.label} · ${row.id} (${row.evidenceClass})`),node('td',`${row.widthMm} × ${row.heightMm} mm`),node('td',`(${row.xMm}, ${row.yMm}) ± (${row.xBoundMm}, ${row.yBoundMm}) mm`));const td=node('td'),button=node('button','Remove');button.type='button';button.onclick=()=>{if(dirty){status('Recompute changed model settings before removing an observation.');return;}accept({...state,observations:state.observations.filter(r=>r.id!==row.id)},'Observation removed; family recomputed.');};td.append(button);tr.append(td);return tr;}));
 $('summary').textContent=result.status==='incompatible'?'No complete affine family satisfies all retained coordinate bounds within the declared domain.':result.status==='unobserved'?'No additional observations: this is the declared coefficient domain only.':'A complete affine family is compatible with every supplied coordinate box. Compatibility is not validation of the physical relationship.';
 $('rank').textContent=`Independent workpiece-variation directions: ${result.variationRank} of 2. ${result.variationRank<2?'The supplied sizes do not independently vary both width and height.':'Both input directions vary; finite measurement bounds may still leave many coefficients.'}`;
 for(const axis of ['x','y']){plot(axis);const a=result.axes[axis];$(axis+'-detail').textContent=a.status==='incompatible'?`First empty intersection after observation ${a.firstContradiction}.`:`a: ${span(a.widthCoefficient)}; b: ${span(a.heightCoefficient)}. ${a.vertices.length} boundary vertices. Plot coordinates are rounded for display; constraint decisions use exact rational arithmetic.`;}
 $('prediction').textContent=result.status==='incompatible'?'No joint target range: at least one coordinate family is empty.':`At ${state.target.widthMm} × ${state.target.heightMm} mm: x ${span(result.axes.x.prediction)} mm; y ${span(result.axes.y.prediction)} mm.${Object.values(result.axes).some(a=>a.extendsBeyondSheet)?' Some compatible predictions extend beyond the target sheet; ranges have not been clipped.':''}`;
 $('limits').replaceChildren(...result.limitations.map(t=>node('li',t)));dirty=false;$('save').disabled=false;
}
function accept(candidate,message){const next=validateResponseStudy(candidate),analysis=analyzeResponseStudy(next);generation++;state=next;result=analysis;render();status(message);}
function newSource(source){derive(source);return {schema:RESPONSE_SCHEMA,source,landmarkId:source.landmarks[0].id,coefficientLimit:2,observations:[],target:{widthMm:source.source.widthMm,heightMm:source.source.heightMm}};}
$('source-file').onchange=async()=>{const token=++generation,file=$('source-file').files[0];if(!file)return;try{if(file.size>2_000_000)throw Error('Choose a JSON file no larger than 2 MB');const raw=JSON.parse(await file.text());if(token!==generation)return;accept(raw.schema===RESPONSE_SCHEMA?raw:newSource(raw),'Source and original declarations accepted; all findings recomputed.');}catch(e){if(token===generation)status(`Import refused: ${e.message}. Previous study retained.`);}finally{$('source-file').value='';}};
$('example').onclick=()=>{const source={title:'Authored mixed-response control',provenance:'Analytic authored example; no physical measurement',source:{widthMm:100,heightMm:80,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}]},landmarks:[{id:'mark',label:'Demonstrated mark',sourcePx:{x:20,y:30},kind:'fraction',toleranceMm:1}]};const s=newSource(source);s.target={widthMm:200,heightMm:160};s.observations=[{widthMm:200,heightMm:80,xMm:45,yMm:50},{widthMm:100,heightMm:160,xMm:60,yMm:70}].map((v,i)=>createResponseObservation(source,'mark',{id:`example-${i+1}`,label:`Authored independent size ${i+1}`,evidenceClass:'authored-example',xBoundMm:1,yBoundMm:1,...v}));accept(s,'Authored controls opened. These are not measured demonstrations.');};
$('mark').onchange=()=>{if(state)accept({...state,landmarkId:$('mark').value,observations:[]},'New source mark selected; previous observations cleared.');};
for(const id of ['limit','target-width','target-height'])$(id).oninput=()=>{generation++;dirty=true;$('save').disabled=true;for(const axis of ['x','y']){$(axis+'-plot').hidden=true;$(axis+'-detail').textContent='Recompute changed settings to inspect coefficients.';}$('summary').textContent='Settings changed. Recompute before using or saving the displayed family.';$('prediction').textContent='Previous target range withheld until recomputed.';};
$('compare').onclick=()=>{if(!state)return;try{accept({...state,coefficientLimit:num('limit'),target:{widthMm:num('target-width'),heightMm:num('target-height')}},'Family recomputed from original observations.');}catch(e){status(e.message);}};
$('observation').onsubmit=event=>{event.preventDefault();if(!state)return;try{if(dirty)throw Error('Recompute the changed model settings before adding an observation');let n=1;while(state.observations.some(r=>r.id===`observation-${n}`))n++;const row=createResponseObservation(state.source,state.landmarkId,{id:`observation-${n}`,label:$('row-label').value,evidenceClass:$('basis').value,widthMm:num('row-width'),heightMm:num('row-height'),xMm:num('row-x'),yMm:num('row-y'),xBoundMm:num('row-x-bound'),yBoundMm:num('row-y-bound')});accept({...state,observations:[...state.observations,row]},'Observation retained; complete family recomputed.');}catch(e){status(`Observation refused: ${e.message}`);}};
$('save').onclick=()=>{if(!state||dirty)return;const blob=new Blob([JSON.stringify(exportResponseStudy(state),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='skill-response-family.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Saved complete source and declarations. Reopening recomputes the family.');};

$('observation').addEventListener('input',()=>{generation++;});
