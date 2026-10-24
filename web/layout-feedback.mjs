import {explainLayout} from '/src/layout-feedback.mjs';
const mm=n=>n.toFixed(1)+' mm';
export function renderLayoutFeedback(host,demo,widthMm,heightMm,attempts,reviewed){
  host.replaceChildren();host.hidden=!reviewed;if(!reviewed)return;
  const f=explainLayout(demo,widthMm,heightMm,attempts);
  const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;host.append(e);return e;};
  add('h3','Spacing and orientation');
  add('p',f.partial?'Partial set: relationships describe only the '+f.placed+' placed marks.':'Relationships describe all '+f.placed+' placed marks.');
  if(f.rigid){const r=f.rigid;
    add('p','Fitted orientation: '+r.angleDegrees.toFixed(1)+'° '+(r.angleDegrees>=0?'clockwise':'(counterclockwise)')+' in physical sheet coordinates. Centroid displacement: '+mm(r.centroidDxMm)+' right / '+mm(r.centroidDyMm)+' down.');
    add('p','Removing this fitted rotation and translation mathematically leaves '+mm(r.remainingRmsMm)+' RMS error. '+(r.wouldMeetAll?'Every hypothetical mark would be on the sheet and within tolerance.':'This does not establish a complete within-tolerance layout.'));
  }else add('p',f.unavailable);
  add('p',f.incompatiblePairs+' pair(s) have a spacing error larger than their two positional tolerances combined. Smaller spacing errors alone do not establish correct placement or orientation.');
  if(f.pairs.length){
    const details=add('details',''),summary=document.createElement('summary');summary.textContent='Inspect '+f.pairs.length+' pair distances';details.append(summary);
    const list=document.createElement('ul');details.append(list);
    for(const p of f.pairs){const item=document.createElement('li');item.textContent=p.labels.join(' / ')+': intended '+mm(p.intendedMm)+', observed '+mm(p.observedMm)+', difference '+mm(p.differenceMm)+(p.incompatible?' — incompatible with both positional tolerances.':'.');list.append(item);}
  }
  add('p','Descriptive fit only. Reflection and scaling are excluded. Two points cannot distinguish reflection from rotation. No placement or actual verdict is changed; this does not identify a physical cause.');
}
