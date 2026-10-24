export function renderPracticeEvidence(received){
  const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const host=document.createElement('div');host.className='practice-evidence';
  host.append(el('h4',`Computed geometric check: ${received.value}`),el('p',`Practice round ${received.session.round}; ${received.evaluation.placed}/${received.evaluation.total} marks placed. Retained after-state: ${received.momentId}.`));
  host.append(el('p',`Declared target: ${received.session.reference.target.widthMm} × ${received.session.reference.target.heightMm} mm.`));
  if(received.session.photoObservation){const photo=received.session.photoObservation;host.append(el('p',`Photo annotation class: ${photo.evidenceClass}. Retained image identity: ${photo.image.sha256}. ${photo.note} Image pixels are not independently reattached in this receiver.`));}
  const list=document.createElement('ul');
  for(const r of received.evaluation.results)list.append(el('li',`${r.label} (${r.id}): ${r.placed?`${r.evaluation.within?'within':'outside'} tolerance; error ${r.evaluation.errorMm.toFixed(3)} mm against ${r.evaluation.toleranceMm} mm; ${r.provenance}`:'missing placement'}`));
  host.append(list,el('p',received.boundary));return host;
}
