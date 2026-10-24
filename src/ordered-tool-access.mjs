import {analyzeToolAccess,importToolStudy,EDGES} from './tool-access.mjs';
import {GeometryError} from './geometry.mjs';
export const ORDERED_TOOL_SCHEMA='skill-translator.ordered-tool-access/v1';
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
export function createOrderedToolStudy(toolStudy,order,chosenEdges=null){
 const tool=importToolStudy(toolStudy),ids=tool.source.landmarks.map(m=>m.id);
 check(ids.length<=30,'Ordered comparison supports at most 30 marks.');
 check(Array.isArray(order)&&order.length===ids.length&&new Set(order).size===ids.length&&Array.from(order).every(id=>ids.includes(id)),'Declare each task mark exactly once in the intended order.');
 check(chosenEdges===null||(Array.isArray(chosenEdges)&&chosenEdges.length===ids.length&&Array.from(chosenEdges).every(e=>EDGES.includes(e))),'Choose one physical edge for each ordered mark.');
 return {schema:ORDERED_TOOL_SCHEMA,toolStudy:tool,order:[...order],chosenEdges:chosenEdges===null?null:[...chosenEdges]};
}
export function importOrderedToolStudy(raw){
 check(raw?.schema===ORDERED_TOOL_SCHEMA,'Open an ordered tool study.');
 check(new TextEncoder().encode(JSON.stringify(raw)).length<=512*1024,'Ordered tool study exceeds 512 KiB.');
 return createOrderedToolStudy(raw.toolStudy,raw.order,raw.chosenEdges);
}
export function inspectOrderedToolStudy(raw){
 const study=importOrderedToolStudy(raw),{widthMm,heightMm}=study.toolStudy.reference.target;
 const access=analyzeToolAccess(study.toolStudy.source,widthMm,heightMm,study.toolStudy.tool),byId=new Map(access.rows.map(r=>[r.id,r]));
 const rows=study.order.map(id=>byId.get(id)),n=rows.length;
 const available=rows.map(r=>EDGES.map(e=>r.compatibleEdges.includes(e)));
 const forward=Array.from({length:n},()=>Array(4).fill(Infinity)),backward=Array.from({length:n},()=>Array(4).fill(Infinity));
 const counts=Array.from({length:n},()=>Array(4).fill(0n));
 for(let e=0;e<4;e++)if(available[0][e]){forward[0][e]=0;counts[0][e]=1n;}
 for(let i=1;i<n;i++)for(let e=0;e<4;e++)if(available[i][e])for(let p=0;p<4;p++){
  if(!Number.isFinite(forward[i-1][p]))continue;
  const cost=forward[i-1][p]+Number(p!==e);
  if(cost<forward[i][e]){forward[i][e]=cost;counts[i][e]=counts[i-1][p];}
  else if(cost===forward[i][e])counts[i][e]+=counts[i-1][p];
 }
 for(let e=0;e<4;e++)if(available[n-1][e])backward[n-1][e]=0;
 for(let i=n-2;i>=0;i--)for(let e=0;e<4;e++)if(available[i][e])for(let next=0;next<4;next++)backward[i][e]=Math.min(backward[i][e],Number(e!==next)+backward[i+1][next]);
 const minimum=Math.min(...forward[n-1]),feasible=Number.isFinite(minimum);
 let total=0n;for(let e=0;e<4;e++)if(forward[n-1][e]===minimum&&feasible)total+=counts[n-1][e];
 const witness=[];let prefix=0,previous=null;
 if(feasible)for(let i=0;i<n;i++){
  const edge=EDGES.findIndex((_,e)=>available[i][e]&&prefix+Number(previous!==null&&previous!==e)+backward[i][e]===minimum);
  prefix+=Number(previous!==null&&previous!==edge);previous=edge;witness.push(EDGES[edge]);
 }
 const chosen=study.chosenEdges,conflicts=chosen?rows.flatMap((r,i)=>r.compatibleEdges.includes(chosen[i])?[]:[{index:i,id:r.id,edge:chosen[i]}]):[];
 const chosenChanges=chosen?chosen.reduce((v,e,i)=>v+Number(i>0&&e!==chosen[i-1]),0):null;
 return {feasible,minimumChanges:feasible?minimum:null,optimalAssignmentCount:total.toString(),witness,
  rows:rows.map((r,i)=>({id:r.id,label:r.label,compatibleEdges:r.compatibleEdges,optimalEdges:feasible?EDGES.filter((_,e)=>forward[i][e]+backward[i][e]===minimum):[]})),
  chosen:chosen?{compatible:conflicts.length===0,conflicts,changes:chosenChanges,extraChanges:conflicts.length===0&&feasible?chosenChanges-minimum:null}:null};
}
