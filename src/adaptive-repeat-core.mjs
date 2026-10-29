/** Caller-admitted categorical examples. One residual TOTAL error budget per row. */
export function adaptiveRepeatPolicy(rows,cueCount,maxAdditional,{maxWork=200000}={}){
 if(!Number.isInteger(cueCount)||cueCount<1||cueCount>8||!Number.isInteger(maxAdditional)||maxAdditional<0||maxAdditional>6||!Array.isArray(rows)||rows.length>6||!Number.isSafeInteger(maxWork)||maxWork<1||maxWork>200000)throw Error('Bounded adaptive repeat inputs required');
 for(const r of rows)if(!Array.isArray(r.values)||r.values.length!==cueCount||r.values.some(v=>v!==null&&(typeof v!=='string'||!v.length||v.length>1000))||!Number.isInteger(r.remaining)||r.remaining<0||r.remaining>2||(r.decision!==null&&(typeof r.decision!=='string'||!r.decision.length||r.decision.length>1000)))throw Error('Admitted rows with residual total budgets required');
 if(!rows.length)return {status:'outside-evidence',policy:null};
 if(rows.some(r=>r.decision===null))return {status:'unknown-decision',policy:null};
 const domains=Array.from({length:cueCount},(_,c)=>[...new Set(rows.map(r=>r.values[c]).filter(v=>v!==null))].sort());
 const memo=new Map();let work=0;
 function charge(){if(++work>maxWork)throw Error('Adaptive repeat work bound exceeded; no partial policy retained');}
 function solve(budgets,left){
  charge();const key=budgets.join(',')+':'+left;if(memo.has(key))return memo.get(key);
  const retained=budgets.flatMap((b,i)=>b>=0?[i]:[]),labels=[...new Set(retained.map(i=>rows[i].decision))];
  if(labels.length===1)return {depth:0,decision:labels[0],retained};
  if(left===0)return null;
  let best=null;
  for(let cue=0;cue<cueCount;cue++){
   const branches=[];let fits=true;
   // null is an internal outside-category token, never a literal string category.
   for(const answer of [...domains[cue],null]){
    charge();const next=budgets.map((b,i)=>Math.max(-1,b-(rows[i].values[cue]!==null&&rows[i].values[cue]!==answer?1:0)));
    if(!next.some(b=>b>=0)){branches.push({answer,other:answer===null,outsideEvidence:true});continue;}
    const tail=solve(next,left-1);if(!tail){fits=false;break;}
    branches.push({answer,other:answer===null,next:tail});
   }
   if(fits){const depth=1+Math.max(...branches.filter(b=>b.next).map(b=>b.next.depth));if(!best||depth<best.depth)best={cue,depth,branches};}
  }
  memo.set(key,best);return best;
 }
 const policy=solve(rows.map(r=>r.remaining),maxAdditional);
 return policy?{status:'adaptive-policy-found',minimumWorstAdditional:policy.depth,policy,work,domains}:{status:'no-adaptive-policy-within-bound',maxAdditional,policy:null,work,domains};
}
