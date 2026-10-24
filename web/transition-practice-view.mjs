const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const number=n=>Number(n.toFixed(3)).toString();
const vector=p=>`(${number(p.dxMm)}, ${number(p.dyMm)}) mm`;
const svg=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,value);return n;};
function diagram(pair,width,height){
 const graph=svg('svg',{viewBox:'0 0 640 360',role:'img','aria-label':`${pair.pair.label}: original and learner before/after endpoints; straight connectors show differences, not paths`});
 const scale=Math.min(560/width,280/height),ox=(640-width*scale)/2,oy=(360-height*scale)/2;
 const xy=p=>({x:ox+p.xMm*scale,y:oy+p.yMm*scale});
 graph.append(svg('rect',{x:ox,y:oy,width:width*scale,height:height*scale,fill:'none',stroke:'#9eb5a1'}));
 for(const [before,after,color,dash] of [[pair.pair.before,pair.pair.after,'#8a681c','7 5'],[pair.before.attempt,pair.after.attempt,'#165e50','']]){
  if(before&&after){const a=xy(before),b=xy(after);graph.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:color,'stroke-width':3,'stroke-dasharray':dash}));}
  for(const [point,last] of [[before,false],[after,true]])if(point){const p=xy(point);graph.append(svg('circle',{cx:p.x,cy:p.y,r:last?8:5,fill:last?color:'#fff',stroke:color,'stroke-width':3}));}
 }
 return graph;
}
function sourceDetail(row){
 if(row.provenance.kind==='missing')return 'No current-round placement';
 const p=row.provenance;
 return p.kind==='manual placement'?'Manual coordinate placement':`${p.kind}; ${p.evidenceClass}; image SHA-256 ${p.image.sha256}. ${p.note} Pixels are not reattached here.`;
}
export function renderTransitionFindings(report){
 const host=el('div');if(!report.findings)return host;const f=report.findings;
 const summary=el('div');summary.className='finding-summary';summary.append(el('strong',`Mapped final endpoints: ${f.endpoint}. Endpoint change: ${f.change}.`),el('p',`Your retained prediction: endpoints ${report.prediction.endpoint}; change ${report.prediction.change}. These compare separate geometric criteria, not physical action quality.`));host.append(summary);
 host.append(el('p',`Current practice rounds: before ${f.rounds.before}, after ${f.rounds.after}. ${f.unpaired.before.length} before and ${f.unpaired.after.length} after source marks are unpaired and excluded from this comparison.`));
 for(const p of f.pairs){
  const card=el('article');card.className='transition-pair';card.dataset.pairId=p.pair.id;
  card.append(el('h3',p.pair.label),diagram(p,report.source.widthMm,report.source.heightMm),el('p','Ochre dashed: demonstrated endpoints. Green: learner endpoints. Small hollow circles: before; large circles: after. Connectors are not observed trajectories.'));
  const dl=el('dl');const row=(label,value)=>dl.append(el('dt',label),el('dd',value));
  row('Demonstrated change',vector(p.pair));row('Learner change',p.observedChange?vector(p.observedChange):'Unknown: a mapped before or after placement is missing');
  row('Endpoint-change criterion',p.change?`${p.change.within?'Satisfied':'Unsatisfied'}: error ${number(p.change.errorMm)} mm against ${p.criterion.toleranceMm} mm`:'Unknown');row('Authored change basis',p.criterion.basis);
  row('Final endpoint criterion',p.after.evaluation?`${p.after.evaluation.within?'Satisfied':'Unsatisfied'}: error ${number(p.after.evaluation.errorMm)} mm against original ${p.after.evaluation.toleranceMm} mm`:'Unknown: after placement missing');
  row('Starting endpoint observation',p.before.evaluation?`Error ${number(p.before.evaluation.errorMm)} mm against original ${p.before.evaluation.toleranceMm} mm`:'Before placement missing');
  card.append(dl,el('p','Before evidence: '+sourceDetail(p.before)),el('p','After evidence: '+sourceDetail(p.after)));host.append(card);
 }
 host.append(el('p',report.limits));return host;
}
