/** Fixed schedule search on admitted retained row masks; caller supplies remaining budgets. */
export function fixedSchedule(rows,cueCount,maxAdditional){
 if(!Number.isInteger(cueCount)||cueCount<1||cueCount>8||!Number.isInteger(maxAdditional)||maxAdditional<0||maxAdditional>6||!Array.isArray(rows)||rows.length>6)throw Error('Bounded admitted schedule inputs required');
 for(const r of rows)if(!Array.isArray(r.values)||r.values.length!==cueCount||r.values.some(v=>v!==null&&typeof v!=='string')||!Number.isInteger(r.remaining)||r.remaining<0||r.remaining>2)throw Error('Admitted categorical row and remaining budget required');
 if(!rows.length)return {status:'outside-evidence',schedule:null};
 if(rows.some(r=>r.decision===null))return {status:'unknown-decision',schedule:null};
 const pairs=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(rows[i].decision!==rows[j].decision)pairs.push({left:i,right:j,requiredDistance:rows[i].remaining+rows[j].remaining+1,cues:Array.from({length:cueCount},(_,c)=>c).filter(c=>rows[i].values[c]!==null&&rows[j].values[c]!==null&&rows[i].values[c]!==rows[j].values[c])});
 let checked=0;
 for(let total=0;total<=maxAdditional;total++){
  let found=null;
  function visit(counts,left){if(found)return;if(counts.length===cueCount-1){const full=[...counts,left];checked++;if(pairs.every(p=>p.cues.reduce((s,c)=>s+full[c],0)>=p.requiredDistance))found=full;return;}for(let n=0;n<=left;n++)visit([...counts,n],left-n);}
  visit([],total);if(found)return {status:'fixed-schedule-found',schedule:found,minimumAdditional:total,checked,pairs:pairs.map(p=>({...p,distance:p.cues.reduce((s,c)=>s+found[c],0)}))};
 }
 return {status:'no-fixed-schedule-within-bound',schedule:null,maxAdditional,checked,pairs};
}
