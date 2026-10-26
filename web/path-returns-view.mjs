import {proposePathReturns} from '/src/path-returns.mjs';

// Mounted with each accepted account; parent invalidation hides the result.
export function mountPathReturns(container, study, inspectOriginal) {
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const section=make('section'), heading=make('h3','Find sampled departure and return intervals');
  const explanation=make('p','Propose original intervals that leave a declared radius around a sampled point and later re-enter it. This finds spatial candidates to inspect; repeated task actions are not inferred.');
  const label=make('label','Return radius (mm) '), input=make('input');
  input.type='number';input.min='0';input.step='any';input.value='1';label.append(input);
  const button=make('button','Find return candidates');button.type='button';
  const status=make('p');status.setAttribute('role','status');const results=make('div');
  input.addEventListener('input',()=>{results.replaceChildren();status.textContent='Radius changed. Find candidates again to recompute.';});
  button.addEventListener('click',()=>{
    results.replaceChildren();
    try {
      if(!input.value.trim())throw Error('Supply a return radius.');
      const report=proposePathReturns(study,Number(input.value));
      status.textContent=`${report.proposals.length} overlapping candidate intervals. These are alternatives, not a count of task cycles.`;
      const list=make('ol');
      for(const proposal of report.proposals){
        const item=make('li',`${proposal.fromMomentId} → ${proposal.toMomentId}: ${proposal.elapsedSeconds} s between sampled endpoints; endpoint separation ${proposal.endpointDistanceMm.toPrecision(5)} mm; farthest witnessed departure ${proposal.farthest.distanceMm.toPrecision(5)} mm. `);
        for(const [title,id]of [['Inspect original start',proposal.fromMomentId],['Inspect farthest original sample',proposal.farthest.momentId],['Inspect original return',proposal.toMomentId]]){
          const inspect=make('button',title);inspect.type='button';inspect.addEventListener('click',()=>inspectOriginal(id));item.append(inspect);
        }
        list.append(item);
      }
      results.append(list,make('p',report.boundary));
    } catch(error){status.textContent=`Return proposals unavailable: ${error.message}`;}
  });
  section.append(heading,explanation,label,button,status,results);container.append(section);
  return section;
}
