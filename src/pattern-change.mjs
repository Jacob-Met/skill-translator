// Complete relationships of the admitted nominal endpoints, not a motion model.
import {stateChangeEvidence} from './sequence-change.mjs';
import {rational,sub,mul,cmp} from '../vendor/chronos/exact-halfplanes.mjs';

const point=p=>[rational(p.xMm),rational(p.yMm)];
function orientation(a,b,c){
  const ab=[sub(b[0],a[0]),sub(b[1],a[1])],ac=[sub(c[0],a[0]),sub(c[1],a[1])];
  return cmp(sub(mul(ab[0],ac[1]),mul(ab[1],ac[0])),rational(0));
}
export function inspectPatternChange(input){
  const evidence=stateChangeEvidence(input);
  // Stable identities make witnesses independent of correspondence insertion order.
  const points=[...evidence.pairs].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const pairs=[],triangles=[];
  const exact=points.map(p=>({before:point(p.before),after:point(p.after)}));
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i],b=points[j];
    const beforeMm=Math.hypot(b.before.xMm-a.before.xMm,b.before.yMm-a.before.yMm);
    const afterMm=Math.hypot(b.after.xMm-a.after.xMm,b.after.yMm-a.after.yMm);
    pairs.push({ids:[a.id,b.id],labels:[a.label,b.label],beforeMm,afterMm,changeMm:afterMm-beforeMm});
    for(let k=j+1;k<points.length;k++){
      const before=orientation(exact[i].before,exact[j].before,exact[k].before);
      const after=orientation(exact[i].after,exact[j].after,exact[k].after);
      triangles.push({ids:[a.id,b.id,points[k].id],labels:[a.label,b.label,points[k].label],before,after,
        finding:before===0||after===0?'degenerate':before===after?'same-side':'reversed'});
    }
  }
  const rankedPairs=[...pairs].sort((a,b)=>Math.abs(b.changeMm)-Math.abs(a.changeMm)||pairs.indexOf(a)-pairs.indexOf(b));
  return {pairedPoints:points.length,unpaired:evidence.unpaired,pairs,rankedPairs,triangles,
    reversed:triangles.filter(t=>t.finding==='reversed'),degenerate:triangles.filter(t=>t.finding==='degenerate'),
    largestSeparationChangeMm:rankedPairs.length?Math.abs(rankedPairs[0].changeMm):null,
    boundary:'Complete only for the declared point correspondences. Distances use nominal calibrated endpoints; tiny differences can arise from calibration arithmetic. Triangle sides are exact for those computed binary64 coordinates, not uncertainty bounds on the image. A nominal reversal rules out a single planar translation and proper rotation of these computed points only. Near-collinear signs can reverse from calibration arithmetic alone; no visible or physical reversal is established. It does not identify reflection, deformation, mistaken correspondence or calibration as a physical cause. No path, contact, force, success tolerance or necessary task relationship is inferred.'};
}
