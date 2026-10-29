const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function renderCueOriginalExamples(host,study,sources){
 host.replaceChildren();
 sources.forEach((bundle,i)=>{
  const example=study.comparison.examples[i],sequence=example.source,step=sequence.steps.find(s=>s.id===example.stepId),row=study.rows[i],article=node('article');
  article.append(node('h2','Retained example '+(i+1)),node('h3',step.title),node('p','Declared decision: '+(row.decision??'Unknown')),node('p','Decision basis: '+(row.basis||'Not supplied')),node('p','Original source: '+sequence.clip.name));
  study.cues.forEach((cue,j)=>article.append(node('p',cue.label+': '+(row.values[j]??'Unknown')+' · '+cue.basis)));
  for(const [id,asset] of bundle.assets){
   const moment=sequence.moments.find(m=>m.id===id),role=id===step.beforeMomentId?'Before selected interval':id===step.afterMomentId?'After selected interval':'Context frame outside selected endpoints';
   const fig=node('figure'),img=node('img');fig.dataset.exampleIndex=String(i);fig.dataset.momentId=id;fig.dataset.frameSha256=moment.image.sha256;fig.tabIndex=-1;img.src=asset.media.url;img.alt=role+': '+moment.label;img.width=240;
   fig.append(node('figcaption',role+' · '+moment.origin.mediaTimeSeconds+(moment.origin.mediaTimeSeconds===1?' second · ':' seconds · ')+moment.label),img);article.append(fig);
  }
  host.append(article);
 });
}

/** Locate only an exact retained source anchor; never derive or substitute image bytes. */
export function focusCueOriginalFrame(host,anchor){
 if(anchor?.kind!=='source-inspection')throw Error('Only retained source inspections have a frame to locate');
 const matches=[...host.querySelectorAll('figure')].filter(f=>f.dataset.exampleIndex===String(anchor.exampleIndex)&&f.dataset.momentId===anchor.momentId&&f.dataset.frameSha256===anchor.frameSha256);
 if(matches.length!==1)throw Error('Exact retained source frame is not available');
 for(const f of host.querySelectorAll('figure[data-reading-focus]')){delete f.dataset.readingFocus;f.style.outline='';}
 const target=matches[0];target.dataset.readingFocus='true';target.style.outline='3px solid #155e75';target.scrollIntoView({block:'center'});target.focus({preventScroll:true});return target;
}
