import {showPathCircle,clearPathCircle} from '/web/path-circle-view.mjs';
import {showPathAxis} from '/web/path-axis-view.mjs';
import {proposePathSummary} from '/src/path-summary.mjs';
import {mountPathReturns} from '/web/path-returns-view.mjs';
import {createSequencePath,importSequencePath,inspectSequencePath} from '/src/sequence-path.mjs';
import {readSampledPathBundle,makeSampledPathBundle} from '/web/sampled-path-input.mjs';
import {releaseSequenceAssets,makeSequenceBundle} from '/web/sequence-input.mjs';
const $=id=>document.getElementById(id),el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;return n;};
let source=null,accepted=null,revision=0,assets=new Map();
const status=message=>{$('status').textContent=message;};
function invalidate(){revision++;accepted=null;clearPathCircle($('circle-result'));$('result').hidden=true;status('Declarations changed. Inspect selected samples to recompute.');}
function sourceForm(sequence,study=null){
 source=sequence;accepted=null;clearPathCircle($('circle-result'));$('result').hidden=true;$('editor').hidden=false;$('source-name').textContent=sequence.title;
 $('point-label').value=study?.label??'';$('reference-label').value=study?.reference.label??'';$('reference-basis').value=study?.reference.basis??'';$('reference-confirm').checked=study?.reference.samePlaneAndCorners??false;
 $('samples').replaceChildren();
 for(const moment of sequence.moments){
  const supplied=study?.samples.find(s=>s.momentId===moment.id),row=el('fieldset');row.dataset.moment=moment.id;
  const legend=el('legend',`${moment.label} · ${moment.origin.mediaTimeSeconds} s`);row.append(legend);
  const include=el('input');include.type='checkbox';include.className='include';include.checked=Boolean(supplied);
  const includeLabel=el('label');includeLabel.append(include,document.createTextNode(' Include this retained moment'));row.append(includeLabel);
  const choice=el('select');choice.className='mark';const missing=el('option','Missing observation');missing.value='';choice.append(missing);
  for(const mark of moment.calibratedTask?.landmarks??[]){const option=el('option',`${mark.label} (${mark.id})`);option.value=mark.id;choice.append(option);}choice.value=supplied?.markId??'';
  const choiceLabel=el('label','Explicit point correspondence ');choiceLabel.append(choice);row.append(choiceLabel);
  const basis=el('textarea');basis.className='basis';basis.maxLength=1200;basis.value=supplied?.basis??'';const basisLabel=el('label','Basis for this match or missing observation ');basisLabel.append(basis);row.append(basisLabel);
  const ns='http://www.w3.org/2000/svg',view=document.createElementNS(ns,'svg');view.classList.add('source-frame');view.setAttribute('viewBox',`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`);view.setAttribute('role','img');view.setAttribute('aria-label',`Original retained frame: ${moment.label}; selected source mark overlay`);
  const image=document.createElementNS(ns,'image');image.setAttribute('href',assets.get(moment.id)?.media.url??'');image.setAttribute('width',moment.image.widthPx);image.setAttribute('height',moment.image.heightPx);view.append(image);
  const highlight=()=>{view.querySelector('circle')?.remove();const mark=moment.calibratedTask?.landmarks.find(m=>m.id===choice.value);if(!mark)return;const circle=document.createElementNS(ns,'circle');for(const[k,v]of Object.entries({cx:mark.sourcePx.x,cy:mark.sourcePx.y,r:Math.max(moment.image.widthPx,moment.image.heightPx)/50,fill:'none',stroke:'#137b72','stroke-width':3}))circle.setAttribute(k,v);view.append(circle);};highlight();choice.addEventListener('change',highlight);row.append(view);
  const details=el('details');details.append(el('summary','Inspect original moment account'),el('pre',JSON.stringify(moment,null,2)));row.append(details);$('samples').append(row);
 }
}
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const mm=x=>x===null?'Unavailable':`${x!==0&&Math.abs(x)<.0005?x.toExponential(6):x.toFixed(3)} mm`;
function show(study){
 $('result').querySelector('[data-path-returns]')?.remove();
 const returnSection=mountPathReturns($('result'),study,id=>{
  if(accepted!==study)return;
  const row=[...$('samples').children].find(r=>r.dataset.moment===id);
  row?.scrollIntoView({block:'center'});row?.querySelector('.mark').focus({preventScroll:true});
 });
 returnSection.dataset.pathReturns='true';
 const findings=inspectSequencePath(study);accepted=study;clearPathCircle($('circle-result'));$('axis-result').replaceChildren();$('compact-result').replaceChildren();$('compact-status').textContent='';$('result').hidden=false;
 $('summary').textContent=`Endpoint distance: ${mm(findings.endpointDistanceMm)}. Complete sampled-path sum: ${mm(findings.sampledPathDistanceMm)}. Observed adjacent chords: ${findings.observedSegmentCount} of ${findings.segments.length}; their covered sum is ${mm(findings.coveredChordDistanceMm)}.`;
 $('segments').replaceChildren();
 for(const s of findings.segments){const row=el('tr');for(const value of [`${s.fromMomentId} → ${s.toMomentId}`,`${s.elapsedSeconds} s`,s.distanceMm===null?'Missing observation':mm(s.distanceMm),s.delta?`${mm(s.delta.xMm)}, ${mm(s.delta.yMm)}`:'Unavailable'])row.append(el('td',value));$('segments').append(row);}
 $('turns').replaceChildren(el('h3','Turns between sampled chords'),el('p',`A turn is unresolved when either adjacent chord is at or below ${findings.numericalLengthGuardMm.toExponential(3)} mm (64 machine-epsilon steps at the declared coordinate scale). Raw chord values remain in the retained calculation; this is a numerical convention, not physical uncertainty.`));
 for(const t of findings.turns)$('turns').append(el('p',`${t.momentId}: ${t.angleDegrees===null?t.status.replaceAll('-',' '):`${t.angleDegrees.toFixed(2)}°`}`));
 $('limits').textContent=findings.boundary;$('evidence').textContent=JSON.stringify(study,null,2);draw(findings);status('Selected source-bound samples inspected. Raw evidence is unchanged.');
}
function draw(findings){
 const points=findings.samples.filter(s=>s.position),ns='http://www.w3.org/2000/svg';$('diagram').replaceChildren();if(!points.length){$('diagram').append(el('p','No matched positions to draw.'));return;}
 const xs=points.map(s=>s.position.xMm),ys=points.map(s=>s.position.yMm),minX=Math.min(...xs),minY=Math.min(...ys),span=Math.max(Math.max(...xs)-minX,Math.max(...ys)-minY,1),scale=360/span;
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 480 440');svg.setAttribute('role','img');svg.setAttribute('aria-label','Sampled chords in common planar coordinates; gaps remain disconnected');
 const pos=p=>({x:60+(p.xMm-minX)*scale,y:40+(p.yMm-minY)*scale});
 const byId=new Map(findings.samples.map(s=>[s.momentId,s]));
 for(const s of findings.segments)if(s.delta){const a=pos(byId.get(s.fromMomentId).position),b=pos(byId.get(s.toMomentId).position),line=document.createElementNS(ns,'line');for(const [k,v]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#287e75','stroke-width':3}))line.setAttribute(k,v);svg.append(line);}
 const labels=new Map();
 for(const [i,s]of findings.samples.entries())if(s.position){const p=pos(s.position),key=`${p.x.toFixed(2)},${p.y.toFixed(2)}`;if(!labels.has(key))labels.set(key,{p,indices:[],titles:[]});const entry=labels.get(key);entry.indices.push(i+1);entry.titles.push(`${i+1}: ${s.momentLabel}, ${s.presentedSeconds} seconds`);const circle=document.createElementNS(ns,'circle');for(const[k,v]of Object.entries({cx:p.x,cy:p.y,r:5,fill:'#153e50'}))circle.setAttribute(k,v);svg.append(circle);}
 for(const {p,indices,titles}of labels.values()){const label=document.createElementNS(ns,'text');label.setAttribute('x',p.x<240?p.x+8:p.x-8);label.setAttribute('y',p.y-8);label.setAttribute('text-anchor',p.x<240?'start':'end');label.setAttribute('fill','#153e50');label.textContent=indices.join(', ');const title=document.createElementNS(ns,'title');title.textContent=titles.join('; ');label.append(title);svg.append(label);}

 $('diagram').append(svg,el('p','Equal scale on x and y. Labels give selected sample order; colocated drawing labels are grouped without changing coordinates. +y follows the declared sheet coordinates.'));
}
$('editor').addEventListener('input',invalidate);
$('editor').addEventListener('submit',event=>{event.preventDefault();revision++;try{const samples=[...$('samples').children].filter(row=>row.querySelector('.include').checked).map(row=>({momentId:row.dataset.moment,markId:row.querySelector('.mark').value||null,basis:row.querySelector('.basis').value}));show(importSequencePath(createSequencePath(source,{label:$('point-label').value,reference:{label:$('reference-label').value,basis:$('reference-basis').value,samePlaneAndCorners:$('reference-confirm').checked},samples})));}catch(error){accepted=null;clearPathCircle($('circle-result'));$('result').hidden=true;status(error.message);}});
$('input').addEventListener('change',async()=>{const token=++revision,file=$('input').files[0];$('input').value='';if(!file)return;let received;status('Reading new input; existing accepted evidence is retained until admission.');try{received=await readSampledPathBundle(file);if(token!==revision){releaseSequenceAssets(received.assets);return;}releaseSequenceAssets(assets);assets=received.assets;sourceForm(received.sequence,received.study);if(received.study)show(received.study);else status('Original sequence opened with verified PNG frames. Declare the reference and select matched or missing samples.');}catch(error){if(received)releaseSequenceAssets(received.assets);if(token===revision)status(`Input refused: ${error.message}. Previous accepted evidence is unchanged.`);}});
async function save(original){if(!accepted)return;const token=revision,current=accepted;try{const blob=original?await makeSequenceBundle(current.sequence,assets):await makeSampledPathBundle(current,assets);if(token!==revision||accepted!==current){status('Declarations changed while saving. No older account was downloaded.');return;}download(blob,original?'original-demonstration.json':'sampled-path.json');}catch(error){if(token===revision)status(`Cannot save: ${error.message}`);}}
$('save').addEventListener('click',()=>save(false));
$('source-save').addEventListener('click',()=>save(true));
addEventListener('pagehide',()=>{revision++;releaseSequenceAssets(assets);assets=new Map();});


$('compact-bound').addEventListener('input',()=>{$('compact-result').replaceChildren();$('compact-status').textContent='Discrepancy changed. Propose again to recompute.';});
$('compact-propose').addEventListener('click',()=>{
 if(!accepted)return;
 $('compact-result').replaceChildren();
 try{
  const bound=$('compact-bound').value.trim();if(!bound)throw Error('Supply a maximum nominal sample deviation.');
  const proposalSource=accepted,proposal=proposePathSummary(proposalSource,Number(bound)),findings=inspectSequencePath(proposalSource);
  $('compact-status').textContent=`Proposed ${proposal.retainedIndices.length} of ${proposal.originalSampleCount} original samples; ${proposal.omittedIndices.length} omitted from this explanation only. Maximum omitted deviation: ${mm(proposal.maximumOmittedDeviationMm)}.`;
  const residuals=new Map(proposal.intervals.flatMap(span=>span.residuals.map(r=>[r.sampleIndex,r.deviationMm])));
  const list=el('ol');
  findings.samples.forEach((sample,i)=>{
   const item=el('li'),retained=proposal.retainedIndices.includes(i);
   item.dataset.retained=String(retained);
   item.append(el('span',`${i+1}. ${sample.momentLabel} · ${sample.presentedSeconds} s · ${!sample.position?'Missing observation — retained gap':retained?'Retained original frame':`Omitted from proposal; deviation ${mm(residuals.get(i))}`} `));
   const inspect=el('button','Inspect original frame');inspect.type='button';
   inspect.addEventListener('click',()=>{if(accepted!==proposalSource)return;const row=[...$('samples').children].find(r=>r.dataset.moment===sample.momentId);row.scrollIntoView({block:'center'});row.querySelector('.mark').focus({preventScroll:true});});
   item.append(inspect);list.append(item);
  });
  $('compact-result').append(list,el('p',proposal.boundary));
 }catch(error){$('compact-status').textContent=`Proposal unavailable: ${error.message}`;}
});

$('infer-axis').addEventListener('click',()=>{if(!accepted)return;try{showPathAxis($('axis-result'),accepted,assets);status('Straight-axis hypothesis recomputed from original selected points; no source or criterion changed.');}catch(error){$('axis-result').replaceChildren();status(error.message);}});



$('infer-circle').addEventListener('click',()=>{if(!accepted)return;try{showPathCircle($('circle-result'),accepted,assets);status('Circular reference recomputed from original selected samples. Inspect residuals and held-out sensitivity; this is not a physical rotation claim.');}catch(error){clearPathCircle($('circle-result'));status(error.message);}});
