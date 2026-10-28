import {renderAppearancePairResult} from '/web/appearance-pair-view.mjs';
const element=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function renderAppearanceTripletResult(container,result,{onPage}={}){
 container.replaceChildren();if(!result)return;
 const outer=container;container=element('section');container.className='appearance-pair-result';outer.append(container);const join=result.join;
 container.append(element('h2',join.count?'Pairwise minima can compose':'No additive combination of pairwise minima'),element('p',join.count+' compatible '+(join.count===1?'triple':'triples')+' among '+join.checkedCombinations+' checked adjacent-pair '+(join.checkedCombinations===1?'combination':'combinations')+'.'),element('p',result.boundary));
 const summary=element('p','Participating alternatives: '+join.participatingIndexes.map((a,i)=>['A → B','B → C','A → C'][i]+': '+a.length+' / '+result.comparisons[i].comparison.alternatives.length).join('; '));container.append(summary);
 const table=element('table'),thead=element('thead'),tr=element('tr');for(const title of ['A → B alternative','B → C alternative','A → C alternative'])tr.append(element('th',title));thead.append(tr);table.append(thead);const body=element('tbody');
 for(const triple of join.page.triples){const row=element('tr');triple.forEach((index,p)=>{const a=result.comparisons[p].comparison.alternatives[index];row.append(element('td',(index+1)+': ('+a.dx+', '+a.dy+')'));});body.append(row);}table.append(body);container.append(table);
 if(join.count){container.append(element('p','Showing triples '+(join.page.offset+1)+'–'+(join.page.offset+join.page.triples.length)+' of '+join.count+'. Every triple is available through these pages.'));const nav=element('div');for(const [label,offset,disabled] of [['Previous combinations',Math.max(0,join.page.offset-join.page.limit),join.page.offset===0],['Next combinations',join.page.offset+join.page.limit,join.page.offset+join.page.limit>=join.count]]){const button=element('button',label);button.type='button';button.disabled=disabled;button.addEventListener('click',()=>onPage?.(offset,join.page.limit));nav.append(button);}container.append(nav);}
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
