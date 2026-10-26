/** Least-squares proper rotation from target to attempt. No reflection or scale. */
export function fitProperPointPattern(pairs){
  if(!Array.isArray(pairs)||pairs.length<2||pairs.length>30)throw Error('Fit 2–30 paired nominal points.');
  const ids=new Set();
  for(const p of pairs){
    if(!p||typeof p.id!=='string'||ids.has(p.id)||!['target','attempt'].every(k=>p[k]&&['xMm','yMm'].every(a=>typeof p[k][a]==='number'&&Number.isFinite(p[k][a]))))throw Error('Supply distinct identities and finite paired nominal coordinates.');
    ids.add(p.id);
  }
  const n=pairs.length,mean=key=>({x:pairs.reduce((s,r)=>s+r[key].xMm,0)/n,y:pairs.reduce((s,r)=>s+r[key].yMm,0)/n});
  const intended=mean('target'),observed=mean('attempt');
  let dot=0,cross=0,targetSpread=0,observedSpread=0;
  for(const r of pairs){
    const x=r.target.xMm-intended.x,y=r.target.yMm-intended.y;
    const u=r.attempt.xMm-observed.x,v=r.attempt.yMm-observed.y;
    dot+=x*u+y*v;cross+=x*v-y*u;targetSpread+=x*x+y*y;observedSpread+=u*u+v*v;
  }
  const unavailable='The observed configuration does not determine a unique fitted orientation.';
  if(![dot,cross,targetSpread,observedSpread,intended.x,intended.y,observed.x,observed.y].every(Number.isFinite))throw Error('The nominal fit exceeds finite calculation capacity.');
  if(targetSpread<1e-12||observedSpread<1e-12||Math.hypot(dot,cross)<=1e-12*Math.sqrt(targetSpread*observedSpread))
    return {fit:null,unavailable};
  const angle=Math.atan2(cross,dot),c=Math.cos(angle),s=Math.sin(angle);
  const residuals=pairs.map(r=>{
    const u=r.attempt.xMm-observed.x,v=r.attempt.yMm-observed.y;
    const xMm=intended.x+c*u+s*v,yMm=intended.y-s*u+c*v;
    return {id:r.id,xMm,yMm,errorMm:Math.hypot(xMm-r.target.xMm,yMm-r.target.yMm)};
  });
  const fit={angleDegrees:angle*180/Math.PI,centroidDxMm:observed.x-intended.x,centroidDyMm:observed.y-intended.y,
    remainingRmsMm:Math.sqrt(residuals.reduce((s,r)=>s+r.errorMm*r.errorMm,0)/n),residuals};
  if(!Number.isFinite(fit.remainingRmsMm))throw Error('The nominal fit exceeds finite calculation capacity.');
  return {fit,unavailable:null};
}
