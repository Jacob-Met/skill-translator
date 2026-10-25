import {inspectPathAxisPrediction} from '/src/path-axis-prediction.mjs';
import {calibrate,toImage} from '/src/geometry.mjs';
import {createPathComparison,inspectPathCouplingAlternatives} from '/src/path-comparison.mjs';
import {readSampledPathBundle} from '/web/sampled-path-input.mjs';
import {readPathComparisonBundle,makePathComparisonBundle} from '/web/path-comparison-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const ns='http://www.w3.org/2000/svg',svg=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
let axisPrediction=null;
let sources=[null,null],accepted=null,findings=null,alternatives=null,activeCoupling=[],revision=0,selected=0;
const status=s=>{$('status').textContent=s;};
const mm=v=>`${v!==0&&Math.abs(v)<.0005?v.toExponential(4):v.toFixed(3)} mm`;
function invalidate(){axisPrediction=null;revision++;accepted=null;findings=null;alternatives=null;activeCoupling=[];$('result').hidden=true;status('Inputs changed. Compare again to inspect their ordered samples.');}
function names(){for(let i=0;i<2;i++)$(i?'second-name':'first-name').textContent=sources[i]?`${sources[i].study.sequence.title} · ${sources[i].study.label} · ${sources[i].study.samples.length} selected samples`:'Not opened';}
function show(study,analysis=inspectPathCouplingAlternatives(study)){
 axisPrediction=null;$('axis-prediction-result').replaceChildren();accepted=study;alternatives=analysis;findings=analysis.original;selected=0;$('result').hidden=false;
 $('limits').textContent=findings.boundary;$('evidence').textContent=JSON.stringify(study,null,2);
 $('alternative-summary').textContent=`${BigInt(analysis.optimalCouplings).toLocaleString()} computed pairings tie for this minimum. ${analysis.pairs.length} paired sample combinations occur; ${analysis.pairs.filter(p=>p.requiredInEveryOptimalCoupling).length} occur in every minimizing pairing.`;
 $('alternative-limits').textContent=analysis.boundary;
 $('alternative-first').replaceChildren();findings.paths[0].samples.forEach((sample,index)=>{const option=el('option',`A${index+1}: ${sample.momentLabel} · ${sample.presentedSeconds} s`);option.value=String(index);$('alternative-first').append(option);});
 renderAlternativeChoices();renderCoupling(findings.coupling);status('Ordered samples compared. Both original sources remain unchanged.');
}
function renderCoupling(coupling,chosen=null){
 activeCoupling=coupling;selected=chosen?coupling.findIndex(p=>p.firstIndex===chosen.firstIndex&&p.secondIndex===chosen.secondIndex):0;
 $('summary').textContent=`Minimum largest paired separation: ${mm(findings.distanceMm)}. ${coupling.length} paired samples cover both complete selected paths in order.`;
 $('witness-kind').textContent=chosen?`One complete minimizing pairing through A${chosen.firstIndex+1} ↔ B${chosen.secondIndex+1}. Other possible pairs cannot necessarily be combined with this choice.`:'The original deterministic minimizing pairing is shown.';
 $('coupling').replaceChildren();coupling.forEach((pair,index)=>{const row=el('tr'),cell=el('td'),button=el('button',`${pair.firstIndex+1} ↔ ${pair.secondIndex+1}${pair.bottleneck?' · bottleneck':''}`);button.type='button';button.addEventListener('click',()=>{selected=index;draw();});cell.append(button);row.append(cell,el('td',`${pair.firstPresentedSeconds} s`),el('td',`${pair.secondPresentedSeconds} s`),el('td',mm(pair.distanceMm)));$('coupling').append(row);});draw();
}
function renderAlternativeChoices(){
 if(!accepted||!alternatives)return;
 const firstIndex=Number($('alternative-first').value),current=accepted;const possible=alternatives.pairs.filter(p=>p.firstIndex===firstIndex);
 $('alternative-partners').replaceChildren();
 for(const pair of possible){
  const sample=findings.paths[1].samples[pair.secondIndex],button=el('button',`B${pair.secondIndex+1} · ${sample.presentedSeconds} s${pair.requiredInEveryOptimalCoupling?' · required in every pairing':''}`);button.type='button';button.dataset.first=String(firstIndex);button.dataset.second=String(pair.secondIndex);button.title=`${sample.momentLabel}. ${pair.couplingsThrough} minimizing pairings contain this pair.`;
  button.addEventListener('click',()=>{if(accepted!==current)return;try{const result=inspectPathCouplingAlternatives(current,pair);renderCoupling(result.selectedCoupling,pair);status(`Inspecting a complete minimizing pairing through A${pair.firstIndex+1} and B${pair.secondIndex+1}. Original sources and minimum are unchanged.`);}catch(error){status(error.message);}});$('alternative-partners').append(button);
 }
}
$('alternative-first').addEventListener('change',renderAlternativeChoices);
$('default-coupling').addEventListener('click',()=>{if(accepted&&findings){renderCoupling(findings.coupling);status('Original deterministic pairing restored. The sources and minimum are unchanged.');}});
function draw(){
 const pair=activeCoupling[selected];[...$('coupling').children].forEach((r,i)=>{r.dataset.selected=String(i===selected);r.querySelector('button').setAttribute('aria-pressed',String(i===selected));});
 $('frames').replaceChildren();
 [pair.firstIndex,pair.secondIndex].forEach((index,side)=>{
  const sample=findings.paths[side].samples[index],figure=el('figure'),view=svg('svg',{viewBox:`0 0 ${sample.image.widthPx} ${sample.image.heightPx}`,role:'img','aria-label':`${side?'Second':'First'} original frame, ${sample.momentLabel}; declared point marked`});
  view.append(svg('image',{href:sources[side].assets.get(sample.momentId).media.url,width:sample.image.widthPx,height:sample.image.heightPx}),svg('circle',{cx:sample.sourcePx.x,cy:sample.sourcePx.y,r:Math.max(sample.image.widthPx,sample.image.heightPx)/45,fill:'none',stroke:side?'#c54b40':'#14756a','stroke-width':3}));
  if(axisPrediction?.axis.status==='resolved'){
   const moment=accepted.paths[side].sequence.moments.find(m=>m.id===sample.momentId),source=moment.calibratedTask.source,h=calibrate(source.corners),[a,b]=axisPrediction.axis.endpoints.map(p=>toImage(h,p.xMm/source.widthMm,p.yMm/source.heightMm));
   view.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#9a4b00','stroke-width':3,'stroke-dasharray':'9 6'}));
  }
  figure.append(view,el('figcaption',`${side?'Second':'First'}: ${sample.momentLabel} · original presented time ${sample.presentedSeconds} s · ${sample.markLabel}`),el('p',sample.basis));
  const details=el('details');details.append(el('summary','Inspect retained image identity and coordinates'),el('pre',JSON.stringify({image:sample.image,sourcePx:sample.sourcePx,position:sample.position},null,2)));figure.append(details);$('frames').append(figure);
 });
 const all=findings.paths.flatMap(path=>path.samples.map(s=>s.position)),minX=Math.min(...all.map(p=>p.xMm)),minY=Math.min(...all.map(p=>p.yMm));
 const span=Math.max(1,...all.map(p=>p.xMm-minX),...all.map(p=>p.yMm-minY)),scale=340/span,pos=p=>[50+(p.xMm-minX)*scale,40+(p.yMm-minY)*scale],view=svg('svg',{viewBox:'0 0 470 430',role:'img','aria-label':'Both ordered sampled paths in the declared common coordinates; selected coupling shown'});
 findings.paths.forEach((path,side)=>{const points=path.samples.map(s=>pos(s.position));view.append(svg('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:side?'#b43c35':'#14685d','stroke-width':3,'stroke-dasharray':side?'7 4':'none'}));const groups=new Map();points.forEach((p,i)=>{view.append(svg('circle',{cx:p[0],cy:p[1],r:4,fill:side?'#b43c35':'#14685d'}));const key=p.map(v=>v.toFixed(2)).join(',');if(!groups.has(key))groups.set(key,{p,indices:[]});groups.get(key).indices.push(i+1);});for(const {p,indices}of groups.values()){const label=svg('text',{x:p[0]+5,y:p[1]+(side?17:-7),fill:side?'#922c26':'#124d44','font-size':12});label.textContent=indices.map(i=>`${side?'B':'A'}${i}`).join(', ');view.append(label);}});
 const a=pos(findings.paths[0].samples[pair.firstIndex].position),b=pos(findings.paths[1].samples[pair.secondIndex].position);view.append(svg('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#674bb1','stroke-width':4,'stroke-dasharray':'3 3'}));
 $('diagram').replaceChildren(view,el('p',`A: first path (solid teal). B: second path (dashed red). Selected pair: ${mm(pair.distanceMm)}. Lines join samples for inspection; they do not establish intervening motion. The view fits the selected extent at equal x/y scale; +y follows the declared reference.`));
}
for(const [id,index]of [['first',0],['second',1]])$(id).addEventListener('change',async()=>{
 const token=++revision,file=$(id).files[0];$(id).value='';if(!file)return;let received;
 status('Reading replacement source. Previous accepted work is retained until it passes admission.');
 try{received=await readSampledPathBundle(file);if(!received.study)throw Error('Save a declared sampled-path account first. A sequence alone does not declare point correspondences.');if(token!==revision){releaseSequenceAssets(received.assets);return;}
  if(sources[index])releaseSequenceAssets(sources[index].assets);sources[index]=received;received=null;
  invalidate();$('confirm').checked=false;$('basis').value='';names();status('Sampled path opened with original PNG frames. Declare the cross-demonstration interpretation before comparing.');
 }catch(error){if(received)releaseSequenceAssets(received.assets);if(token===revision)status(`Input refused: ${error.message} Previous accepted work is unchanged.`);}
});
$('saved').addEventListener('change',async()=>{
 const token=++revision,file=$('saved').files[0];$('saved').value='';if(!file)return;let received;
 status('Reading saved comparison. Previous accepted work is retained until both sources pass admission.');
 try{received=await readPathComparisonBundle(file);const result=inspectPathCouplingAlternatives(received.study);if(token!==revision){for(const s of received.sources)releaseSequenceAssets(s.assets);return;}
  for(const s of sources)if(s)releaseSequenceAssets(s.assets);sources=received.sources;$('basis').value=received.study.declaration.basis;$('confirm').checked=true;names();show(received.study,result);received=null;
 }catch(error){if(received)for(const s of received.sources)releaseSequenceAssets(s.assets);if(token===revision)status(`Input refused: ${error.message} Previous accepted work is unchanged.`);}
});
$('editor').addEventListener('input',invalidate);
$('editor').addEventListener('submit',event=>{event.preventDefault();revision++;try{if(sources.some(s=>!s))throw Error('Open both declared sampled paths first.');show(createPathComparison(...sources.map(s=>s.study),{samePointAndCoordinates:$('confirm').checked,basis:$('basis').value}));}catch(error){accepted=null;findings=null;alternatives=null;activeCoupling=[];$('result').hidden=true;status(error.message);}});
$('save').addEventListener('click',async()=>{if(!accepted)return;const token=revision,study=accepted,current=sources;try{const blob=await makePathComparisonBundle(study,current);if(token!==revision||study!==accepted){status('Inputs changed during saving. No older comparison was downloaded.');return;}const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='demonstrated-path-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){if(token===revision)status(`Cannot save: ${error.message}`);}});
addEventListener('pagehide',()=>{
 revision++;for(const s of sources)if(s)releaseSequenceAssets(s.assets);sources=[null,null];accepted=null;findings=null;alternatives=null;activeCoupling=[];selected=0;
 $('result').hidden=true;$('frames').replaceChildren();$('coupling').replaceChildren();$('diagram').replaceChildren();$('evidence').textContent='';
 $('alternative-first').replaceChildren();$('alternative-partners').replaceChildren();$('alternative-summary').textContent='';$('alternative-limits').textContent='';$('witness-kind').textContent='';
 $('confirm').checked=false;$('basis').value='';names();status('Reopen the original source accounts or your saved comparison after returning to this page.');
});


$('predict-axis').addEventListener('click',()=>{if(!accepted)return;try{
 axisPrediction=inspectPathAxisPrediction(accepted);const r=axisPrediction,target=$('axis-prediction-result');target.replaceChildren();
 target.append(el('p',r.axis.status==='resolved'?`First-source fitted RMS residual: ${mm(r.training.rmsResidualMm)}. Second-source RMS residual: ${mm(r.rmsResidualMm)}; maximum: ${mm(r.maxResidualMm)}.`:`First-source direction ${r.axis.status.replaceAll('-',' ')}. No axis prediction is available.`));
 for(const row of r.rows)target.append(el('p',`${row.momentId} · second-source presented time ${row.presentedSeconds} s · signed perpendicular residual ${row.residualMm===null?'unresolved':mm(row.residualMm)}.`));
 target.append(el('p','Dashed amber segments on the original frame pair show the first-source fitted axis over its training extent. The mathematical reference line is unbounded. Choose any pairing row to inspect its original pixels.'),el('p',r.boundary));draw();status('Second path inspected against the unchanged first-source axis. Neither source nor the ordered comparison changed.');
}catch(error){axisPrediction=null;$('axis-prediction-result').replaceChildren();draw();status(error.message);}});
