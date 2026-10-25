import test from 'node:test';
import assert from 'node:assert/strict';
import {receiveEdgeField,edgeFieldSupport,EDGE_FIELD_ENCODING} from '../src/sequence-edge-field.mjs';
function field(bytes,count){return {encoding:EDGE_FIELD_ENCODING,data:Buffer.from(bytes).toString('base64'),count};}
test('complete field canonical encoding, pixel count and unused bits are independently checked',()=>{
 const bytes=Uint8Array.of(255,1),roi=[12,30,3,3];assert.deepEqual(receiveEdgeField(field(bytes,9),roi),bytes);
 for(const raw of [field(bytes,8),field([255,255],16),{...field(bytes,9),data:' /8B'},{...field(bytes,9),data:'/wE'},field([255],8)])assert.throws(()=>receiveEdgeField(raw,roi));
 const full=new Uint8Array(131072).fill(255);assert.equal(receiveEdgeField(field(full,1048576),[0,0,1024,1024]).length,full.length);
});
test('bounded dominant-axis enumeration agrees with full integer support across 600 anisotropic fields',()=>{
 let controls=0;
 for(const [w,h] of [[11,97],[97,11],[63,71]]){
  const bytes=new Uint8Array(Math.ceil(w*h/8)).fill(255);
  for(let i=0;i<200;i++){
   const ax=(i*13)%w,ay=(i*7)%h,bx=(i*37+1)%w,by=(i*19+1)%h;if(ax===bx&&ay===by)continue;
   const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy,expected=[];
   for(let py=0;py<h;py++)for(let px=0;px<w;px++){const dot=(px-ax)*dx+(py-ay)*dy,cross=(px-ax)*dy-(py-ay)*dx;if(dot>=0&&dot<=l2&&cross*cross<=4*l2)expected.push(py*w+px);}
   const a={x:ax+71,y:ay+19},b={x:bx+71,y:by+19};assert.deepEqual(edgeFieldSupport(bytes,[71,19,w,h],a,b),expected);assert.deepEqual(edgeFieldSupport(bytes,[71,19,w,h],b,a),expected);controls++;
  }
 }
 assert.equal(controls,600);
});
test('support includes exact band equality, excludes extension and absent pixels',()=>{
 const w=200,h=9,bytes=new Uint8Array(Math.ceil(w*h/8));
 const points=[[50,4],[75,6],[75,7],[151,4],[100,2]];for(const[x,y]of points){const k=y*w+x;bytes[k>>3]|=1<<(k&7);}
 assert.deepEqual(edgeFieldSupport(bytes,[0,0,w,h],{x:50,y:4},{x:150,y:4}),[2*w+100,4*w+50,6*w+75]);
});
