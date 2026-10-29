export function inspect({rows,cues,readings=[],maxErrors,basis},limit=200000){
 const fail=s=>{throw Error(s)};
 if(!Number.isInteger(maxErrors)||maxErrors<0||maxErrors>2||typeof basis!=='string'||!basis.trim())fail('Explicit error budget 0..2 and basis required');
 if(!Array.isArray(cues)||cues.length<1||cues.length>8||new Set(cues).size!==cues.length||cues.some(c=>typeof c!=='string'||!c))fail('Invalid cues');
 if(!Array.isArray(rows)||rows.length<2||rows.length>6||rows.some(r=>!Array.isArray(r.values)||r.values.length!==cues.length||r.values.some(v=>v!==null&&(typeof v!=='string'||!v))||(r.decision!==null&&(typeof r.decision!=='string'||!r.decision))))fail('Invalid rows');
 if(!Array.isArray(readings)||new Set(readings.map(r=>r.cue)).size!==readings.length||readings.some(r=>!cues.includes(r.cue)||typeof r.value!=='string'||!r.value))fail('Invalid readings');
 if(!Number.isInteger(limit)||limit<1||limit>2000000)fail('Invalid work limit');
 const domains=cues.map((_,j)=>[...new Set(rows.map(r=>r.values[j]).filter(v=>v!==null)),null]);
 let work=0;const memo=new Map(),clip=x=>Math.min(maxErrors+1,x);
 const costs=rows.map(r=>readings.filter(a=>r.values[cues.indexOf(a.cue)]!==null&&r.values[cues.indexOf(a.cue)]!==a.value).length).map(clip);
 const used=readings.reduce((m,a)=>m|(1<<cues.indexOf(a.cue)),0);
 function solve(cost,mask){
  if(++work>limit)fail('Work limit exceeded; no partial conclusion');
  const key=cost.join(',')+':'+mask;if(memo.has(key))return memo.get(key);
  const indexes=rows.flatMap((_,i)=>cost[i]<=maxErrors?[i]:[]),labels=[...new Set(indexes.map(i=>rows[i].decision))];
  const out={indexes,labels,worstQuestions:null,bestFirstCueIds:[],questions:[]};
  if(!indexes.length)out.status='outside-retained-evidence';
  else if(labels.includes(null))out.status='unknown-decision';
  else if(labels.length===1){out.status='determined';out.worstQuestions=0;}
  else {
   out.status='unresolved';
   for(let j=0;j<cues.length;j++)if(!(mask&(1<<j))){
    const branches=domains[j].map(answer=>{
     const next=cost.map((c,i)=>clip(c+(rows[i].values[j]!==null&&rows[i].values[j]!==answer?1:0)));
     const child=solve(next,mask|(1<<j));
     return {answer,kind:answer===null?'other-category':'category',indexes:child.indexes,worstQuestions:child.worstQuestions,status:child.status};
    });
    const live=branches.filter(b=>b.indexes.length);
    const worst=live.length&&live.every(b=>b.worstQuestions!==null)?1+Math.max(...live.map(b=>b.worstQuestions)):null;
    out.questions.push({cue:cues[j],worstQuestions:worst,branches});
    if(worst!==null&&(out.worstQuestions===null||worst<out.worstQuestions)){out.worstQuestions=worst;out.bestFirstCueIds=[cues[j]];}
    else if(worst!==null&&worst===out.worstQuestions)out.bestFirstCueIds.push(cues[j]);
   }
   if(out.worstQuestions!==null)out.status='conditionally-resolvable';
  }
  memo.set(key,out);return out;
 }
 const result=solve(costs,used);
 return {...result,maxErrors,basis,work,disagreements:rows.map((r,i)=>({index:i,withinBudget:costs[i]<=maxErrors,cues:readings.filter(a=>r.values[cues.indexOf(a.cue)]!==null&&r.values[cues.indexOf(a.cue)]!==a.value).map(a=>a.cue),unknownCues:readings.filter(a=>r.values[cues.indexOf(a.cue)]===null).map(a=>a.cue)}))};
}

export function certificate(rows,prior,E){
 const out=[];
 for(let a=0;a<rows.length;a++)for(let b=a+1;b<rows.length;b++){
  if(rows[a].decision===null||rows[b].decision===null||rows[a].decision===rows[b].decision)continue;
  const costs=[a,b].map(i=>prior.reduce((s,v,j)=>s+(v!==undefined&&rows[i].values[j]!==null&&rows[i].values[j]!==v?1:0),0));
  let left=E-costs[0],right=E-costs[1];if(left<0||right<0)continue;
  const answers=[...prior];let valid=true;
  for(let j=0;j<rows[a].values.length;j++)if(prior[j]===undefined){const x=rows[a].values[j],y=rows[b].values[j];
   if(x===null||y===null||x===y)answers[j]=x??y??'OTHER';
   else if(right>0){answers[j]=x;right--;}else if(left>0){answers[j]=y;left--;}else{valid=false;break;}
  }
  if(valid)out.push({rows:[a,b],answers,mismatches:[a,b].map(i=>answers.flatMap((v,j)=>rows[i].values[j]!==null&&rows[i].values[j]!==v?[j]:[]))});
 }
 return out;
}
