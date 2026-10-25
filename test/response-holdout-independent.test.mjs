import test from 'node:test';
import assert from 'node:assert/strict';
import {RESPONSE_SCHEMA,createResponseObservation} from '../src/response-family.mjs';
import {analyzeResponseHoldouts} from '../src/response-holdout.mjs';

// Independent pair-of-boundaries LP oracle, deliberately not polygon clipping.
function extrema(rows, axis, target) {
 const constraints=[[1,0,2],[-1,0,2],[0,1,2],[0,-1,2]];
 for(const r of rows){const a=r.widthMm-100,b=r.heightMm-100,c=r[axis+'Mm']-50,d=r[axis+'BoundMm'];constraints.push([a,b,c+d],[-a,-b,-c+d]);}
 const points=[];
 for(let i=0;i<constraints.length;i++)for(let j=i+1;j<constraints.length;j++){
  const [a,b,c]=constraints[i],[d,e,f]=constraints[j],det=a*e-b*d;
  if(!det)continue;
  const x=(c*e-b*f)/det,y=(a*f-c*d)/det;
  if(constraints.every(([u,v,w])=>u*x+v*y<=w+1e-9))points.push(50+(target.widthMm-100)*x+(target.heightMm-100)*y);
 }
 return points.length?[Math.min(...points),Math.max(...points)]:null;
}
const source={title:'Independent boundary oracle',provenance:'Authored mathematical software controls',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'point',label:'Point',sourcePx:{x:50,y:50},kind:'fraction',toleranceMm:1}]};
test('fresh bounded and contradictory observations agree with independent boundary-intersection oracle',()=>{
 let checked=0,excluded=0,incompatible=0;
 for(let seed=0;seed<60;seed++){
  const rows=[[110,100],[100,110],[110,110],[90,110]].map(([widthMm,heightMm],i)=>createResponseObservation(source,'point',{id:`r-${i}`,label:'Independent control',evidenceClass:'authored-example',widthMm,heightMm,xMm:50+(widthMm-100)*0.5+(heightMm-100)*0.25+(seed%3===0&&i===2?5:0),yMm:50-(widthMm-100)*0.25+(heightMm-100)*0.5+(seed%5===0&&i===3?7:0),xBoundMm:seed%4,yBoundMm:(seed+i)%3}));
  const result=analyzeResponseHoldouts({schema:RESPONSE_SCHEMA,source,landmarkId:'point',coefficientLimit:2,target:{widthMm:120,heightMm:120},observations:rows});
  result.rows.forEach((row,i)=>{
   const ranges=['x','y'].map(axis=>extrema(rows.filter((_,j)=>i!==j),axis,rows[i]));
   if(ranges.some(x=>x===null)){assert.equal(row.status,'remainder-incompatible');incompatible++;return;}
   const states=ranges.map(([lo,hi],j)=>{const axis=['x','y'][j],o=rows[i],ol=o[axis+'Mm']-o[axis+'BoundMm'],oh=o[axis+'Mm']+o[axis+'BoundMm'];assert.ok(Math.abs(row.axes[axis].prediction.lower-lo)<1e-9);assert.ok(Math.abs(row.axes[axis].prediction.upper-hi)<1e-9);return hi<ol-1e-9||lo>oh+1e-9?'excluded':lo>=ol-1e-9&&hi<=oh+1e-9?'contained':'overlaps';});
   const expected=states.includes('excluded')?'excluded':states.every(x=>x==='contained')?'contained':'overlaps';assert.equal(row.status,expected);checked++;if(expected==='excluded')excluded++;
  });
 }
 assert.ok(checked>100);assert.ok(excluded>0);assert.ok(incompatible>0);
});
