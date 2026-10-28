import {renderAppearancePairResult} from '/web/appearance-pair-view.mjs';
const element=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function renderAppearanceTripletResult(container,result,{onPage,onCostPage}={}){
 const costOpen=container.querySelector('.appearance-additive-optima')?.open===true;
 container.replaceChildren();if(!result)return;
 const outer=container;container=element('section');container.className='appearance-pair-result';outer.append(container);const join=result.join;
 container.append(element('h2',join.count?'Pairwise minima can compose':'No additive combination of pairwise minima'),element('p',join.count+' compatible '+(join.count===1?'triple':'triples')+' among '+join.checkedCombinations+' checked adjacent-pair '+(join.checkedCombinations===1?'combination':'combinations')+'.'),element('p',result.boundary));
 const summary=element('p','Participating alternatives: '+join.participatingIndexes.map((a,i)=>['A → B','B → C','A → C'][i]+': '+a.length+' / '+result.comparisons[i].comparison.alternatives.length).join('; '));container.append(summary);
 const table=element('table'),thead=element('thead'),tr=element('tr');for(const title of ['A → B alternative','B → C alternative','A → C alternative'])tr.append(element('th',title));thead.append(tr);table.append(thead);const body=element('tbody');
 for(const triple of join.page.triples){const row=element('tr');triple.forEach((index,p)=>{const a=result.comparisons[p].comparison.alternatives[index];row.append(element('td',(index+1)+': ('+a.dx+', '+a.dy+')'));});body.append(row);}table.append(body);container.append(table);
 if(join.count){container.append(element('p','Showing triples '+(join.page.offset+1)+'–'+(join.page.offset+join.page.triples.length)+' of '+join.count+'. Every triple is available through these pages.'));const nav=element('div');for(const [label,offset,disabled] of [['Previous combinations',Math.max(0,join.page.offset-join.page.limit),join.page.offset===0],['Next combinations',join.page.offset+join.page.limit,join.page.offset+join.page.limit>=join.count]]){const button=element('button',label);button.type='button';button.disabled=disabled;button.addEventListener('click',()=>onPage?.(offset,join.page.limit));nav.append(button);}container.append(nav);}
 if(result.additiveCost)renderAdditiveCost(container,result.additiveCost,onCostPage,costOpen);
 container.append(element('h3','Inspect each pair'),element('p','Residuals below are mean RGB differences after the fitted image shift and brightness offset, in 8-bit channel levels. Open a pair for every retained alternative, search boundary, source identity and setting.'));
 result.comparisons.forEach((comparison,i)=>{
  const report=comparison.comparison,count=report.alternatives.length;
  const edgeCount=report.alternatives.filter(alternative=>alternative.searchBoundary).length;
  const residual=Number.isFinite(report.meanAdjustedChange)?(report.meanAdjustedChange*255).toFixed(2)+' levels':'unavailable';
  const details=element('details');details.className='appearance-triplet-pair-details';
  details.append(element('summary',['A → B','B → C','A → C'][i]+' · residual '+residual+' · '+count+' '+(count===1?'minimum':'minima')+' · '+edgeCount+' at the search boundary'));
  const view=element('div');renderAppearancePairResult(view,comparison);details.append(view);container.append(details);
 });
}

function formatLevels(mean){const levels=mean*255;return levels>0&&levels<0.001?'<0.001':levels.toFixed(3);}
function renderAdditiveCost(container,cost,onPage,open){
 const section=element('section');section.className='appearance-additive-cost';section.append(element('h3','Lowest residual with additive shifts'));
 section.append(element('p','Mean residual '+formatLevels(cost.meanResidual)+' channel levels; excess above the independent pair minima '+formatLevels(cost.meanExcess)+' levels. '+cost.count+' least-sum '+(cost.count===1?'account':'accounts')+'.'));
 section.append(element('p',cost.simultaneousPairwiseMinima?'Zero excess: at least one combination attains all three separate pair minima.':'Positive excess: requiring additive shifts increases the best finite summed residual. This does not mean that physical motion is inconsistent.'));
 section.append(element('p',cost.boundary));
 const exact=element('details');exact.append(element('summary','Exact costs and bounded work'),element('p','Independent integer lower bound '+cost.independentLowerBound+'; optimum integer sum '+cost.optimalIntegerResidual+'; excess '+cost.excessIntegerResidual+'; normalization denominator '+cost.denominator+'. '+cost.work.pairVisits+' bounded pair visits in two complete algebra passes per page. Page changes reuse the three image profiles; they do not resample images.'));section.append(exact);
 const details=element('details');details.className='appearance-additive-optima';details.open=open;details.append(element('summary','Inspect all '+cost.count+' least-sum shift '+(cost.count===1?'account':'accounts')));
 const table=element('table'),head=element('tr');for(const name of ['A → B','B → C','A → C'])head.append(element('th',name));const thead=element('thead');thead.append(head);table.append(thead);const tbody=element('tbody');
 for(const account of cost.page.accounts){const row=element('tr');for(const c of account)row.append(element('td','('+c.dx+', '+c.dy+'); integer residual '+c.absoluteResidual+'; brightness '+c.uniformBrightnessShift+'; '+(c.searchBoundary?'search boundary':'inside search')));tbody.append(row);}table.append(tbody);details.append(table,element('p','Accounts '+(cost.page.offset+1)+'–'+(cost.page.offset+cost.page.triples.length)+' of '+cost.count+'. Every exact optimum is retained.'));
 for(const [label,offset,disabled]of [['Previous optimum accounts',Math.max(0,cost.page.offset-cost.page.limit),cost.page.offset===0],['Next optimum accounts',cost.page.offset+cost.page.limit,cost.page.offset+cost.page.limit>=cost.count]]){const button=element('button',label);button.type='button';button.disabled=disabled;button.onclick=()=>onPage?.(offset,cost.page.limit);details.append(button);}section.append(details);container.append(section);
}
