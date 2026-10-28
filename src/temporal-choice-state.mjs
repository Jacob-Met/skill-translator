// Reconstructed proposal editing state; acceptance remains source-bound in the receiver.
const same=(a,b)=>a===b||(a&&b&&a.x===b.x&&a.y===b.y);
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function initialChoices(rows){
 return rows.map(r=>({momentId:r.momentId,origin:r.sourcePx?'native':'missing',sourcePx:r.sourcePx?{...r.sourcePx}:null,basis:'Supplied appearance proposal; semantic identity requires original-frame review.'}));
}
export function correctChoice(rows,choices,id,sourcePx,basis){
 check(rows.length===choices.length,'Choice count differs');
 const index=rows.findIndex(r=>r.momentId===id);check(index>=0,'Unknown original moment');
 check(typeof basis==='string'&&basis.trim()&&basis.length<=2000,'Explain the authored correction');
 check(sourcePx===null||(Number.isFinite(sourcePx.x)&&Number.isFinite(sourcePx.y)),'Finite original coordinates required');
 const result=structuredClone(choices);
 check(result.every((c,i)=>c.momentId===rows[i].momentId),'Original moment order differs');
 result[index]={momentId:id,origin:'manual',sourcePx:sourcePx?{...sourcePx}:null,basis:basis.trim()};
 for(let i=index+1;i<result.length;i++)if(result[i].origin!=='manual')result[i]={momentId:rows[i].momentId,origin:'missing',sourcePx:null,basis:'Dependent proposal retired after an earlier authored correction.'};
 return result;
}
export function validateChoices(rows,choices){
 check(Array.isArray(choices)&&rows.length===choices.length,'Choice count differs');let edited=false;
 return choices.map((c,i)=>{
  check(c?.momentId===rows[i].momentId,'Original moment order differs');
  check(['native','manual','missing'].includes(c.origin),'Unknown choice provenance');
  check(typeof c.basis==='string'&&c.basis.trim()&&c.basis.length<=2000,'Explain every choice');
  check(c.sourcePx===null||(Number.isFinite(c.sourcePx?.x)&&Number.isFinite(c.sourcePx?.y)),'Finite original coordinates required');
  if(c.origin==='native'){check(!edited,'Edited ancestor invalidates dependent native proposals');check(same(c.sourcePx,rows[i].sourcePx)&&c.sourcePx!==null,'Native proposal differs');}
  if(c.origin==='missing')check(c.sourcePx===null,'Missing choice must have no point');
  if(!same(c.sourcePx,rows[i].sourcePx))edited=true;
  return structuredClone(c);
 });
}
