import {adapt,derive,GeometryError} from './geometry.mjs';
import {createPractice,importPractice} from './practice.mjs';
export const TOOL_ACCESS_SCHEMA='skill-translator-tool-access/v1';
export const EDGES=Object.freeze(['left','right','top','bottom']);
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const bounded=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10000;
export function validateTool(tool){
 fail(tool&&typeof tool.label==='string'&&tool.label.trim().length>0&&tool.label.length<=100,'Name the declared tool (1–100 characters)');
 fail(typeof tool.basis==='string'&&tool.basis.trim().length>0&&tool.basis.length<=1000,'Describe the basis for these tool dimensions');
 fail(['authored-example','reported-dimensions'].includes(tool.evidenceClass),'Choose authored example or reported dimensions');
 fail(bounded(tool.minDepthMm)&&bounded(tool.maxDepthMm)&&tool.minDepthMm<=tool.maxDepthMm,'Tool depth range must be ordered within 0–10,000 mm');
 fail(bounded(tool.halfWidthMm),'Supported lateral half-width must be within 0–10,000 mm');
 fail(Array.isArray(tool.edges)&&tool.edges.length<=4&&new Set(tool.edges).size===tool.edges.length&&tool.edges.every(e=>EDGES.includes(e)),'Available edges must be distinct physical edges');
 return {label:tool.label.trim(),basis:tool.basis.trim(),evidenceClass:tool.evidenceClass,minDepthMm:tool.minDepthMm,maxDepthMm:tool.maxDepthMm,halfWidthMm:tool.halfWidthMm,edges:EDGES.filter(e=>tool.edges.includes(e))};
}
export function analyzeToolAccess(source,widthMm,heightMm,input){
 const target=adapt(derive(source),widthMm,heightMm),tool=validateTool(input);
 const rows=target.landmarks.map(mark=>{
  const approaches=EDGES.map(edge=>{
   const horizontal=edge==='left'||edge==='right';
   const depthMm=edge==='left'?mark.xMm:edge==='right'?widthMm-mark.xMm:edge==='top'?mark.yMm:heightMm-mark.yMm;
   const alongMm=horizontal?mark.yMm:mark.xMm,spanMm=horizontal?heightMm:widthMm;
   const margins={minimumDepthMm:depthMm-tool.minDepthMm,maximumDepthMm:tool.maxDepthMm-depthMm,firstSideMm:alongMm-tool.halfWidthMm,secondSideMm:spanMm-alongMm-tool.halfWidthMm};
   const conflicts=Object.entries(margins).filter(([,n])=>n< -1e-9).map(([name])=>name);
   const available=tool.edges.includes(edge);
   return {edge,depthMm,alongMm,spanMm,margins,conflicts,available,compatible:available&&conflicts.length===0};
  });
  return {id:mark.id,label:mark.label,xMm:mark.xMm,yMm:mark.yMm,approaches,compatibleEdges:approaches.filter(a=>a.compatible).map(a=>a.edge)};
 });
 const covers=[];
 for(let mask=1;mask<16;mask++){
  const edges=EDGES.filter((_,i)=>mask&(1<<i));
  if(edges.some(e=>!tool.edges.includes(e)))continue;
  if(rows.every(r=>r.compatibleEdges.some(e=>edges.includes(e))))covers.push({mask,edges});
 }
 const minimalSetups=covers.filter(c=>!covers.some(other=>other.mask!==c.mask&&(other.mask&c.mask)===other.mask)).map(c=>({edges:c.edges,assignments:rows.map(r=>({id:r.id,edges:r.compatibleEdges.filter(e=>c.edges.includes(e))}))}));
 return {target,tool,rows,uncovered:rows.filter(r=>!r.compatibleEdges.length).map(r=>r.id),minimalSetups};
}
export function createToolStudy(source,widthMm,heightMm,tool){
 fail(new TextEncoder().encode(JSON.stringify(source)).length<=262144,'Source annotation must fit the maintained 256 KiB import limit');
 const analysis=analyzeToolAccess(source,widthMm,heightMm,tool),reference=createPractice(source,widthMm,heightMm).reference;
 return {schema:TOOL_ACCESS_SCHEMA,source:JSON.parse(JSON.stringify(source)),reference,tool:analysis.tool};
}
export function importToolStudy(bundle){
 fail(bundle?.schema===TOOL_ACCESS_SCHEMA,'Unsupported tool-access study');
 const {widthMm,heightMm}=bundle.reference?.target||{};
 const session=createPractice(bundle.source,widthMm,heightMm);
 importPractice(bundle.source,widthMm,heightMm,{...session,reference:bundle.reference});
 return createToolStudy(bundle.source,widthMm,heightMm,bundle.tool);
}

