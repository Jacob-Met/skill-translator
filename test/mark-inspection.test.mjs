import test from 'node:test';
import assert from 'node:assert/strict';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {reviseCaptureMark} from '../src/capture-editing.mjs';
import {inspectSourceMark,adoptSourceComponent,inspectionRelation,reproduceSourceInspection} from '../src/mark-inspection.mjs';
const image={name:'authored.png',sha256:'a'.repeat(64),widthPx:320,heightPx:240,mimeType:'image/png',pixelCoordinates:'browser-oriented'};
const crop={x:50,y:30,width:64,height:64};
const settings={method:'local-contrast',polarity:'dark',threshold:24,radius:16,minArea:4,maxArea:500};
function fixture(){return appendCaptureMark(createCapture(image,[{x:0,y:0},{x:320,y:0},{x:320,y:240},{x:0,y:240}],160,120),{label:'Registration cross',kind:'edge_offset_mm',edge:'left',sourcePx:{x:80,y:60},toleranceMm:3,why:'Human supplied physical meaning'});}
function raster({bright=false,contrast=100,edge=false}={}){
 const width=64,height=64,data=new Uint8ClampedArray(width*height*4),cx=edge?2:32,cy=32;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const cross=(x>=cx-7&&x<cx+7&&y>=cy-2&&y<cy+2)||(x>=cx-2&&x<cx+2&&y>=cy-7&&y<cy+7);
  const value=Math.round(Math.max(0,Math.min(255,(bright?220-1.3*x:100+1.3*x)+(cross?(bright?contrast:-contrast):0))));
  const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }return {width,height,data};
}
test('maintained extractor recovers analytic cross support in original source coordinates',()=>{
 const demo=fixture(),r=inspectSourceMark(demo,'authored-1',image,raster(),crop,settings),c=r.candidates[0];
 assert.equal(r.candidates.length,1);assert.equal(c.area,96);assert.deepEqual(c.sourcePx,{x:82,y:62});
 assert.ok(Math.hypot(c.physicalMm.x-41,c.physicalMm.y-31)<1e-12);assert.deepEqual(c.bboxPx,[75,55,89,69]);assert.equal(c.eligible,true);
 assert.equal(r.mask.length,4096);assert.equal(demo.landmarks[0].sourcePx.x,80);
});
test('bright polarity on reversed gradient yields same position and support',()=>{
 const c=inspectSourceMark(fixture(),'authored-1',image,raster({bright:true}),crop,{...settings,polarity:'bright'}).candidates[0];
 assert.deepEqual(c.sourcePx,{x:82,y:62});assert.equal(c.area,96);
});
test('low contrast is missing evidence; truncated components are retained but refused',()=>{
 assert.equal(inspectSourceMark(fixture(),'authored-1',image,raster({contrast:15}),crop,settings).candidates.length,0);
 const demo=fixture(),before=structuredClone(demo),pixels=raster({edge:true}),r=inspectSourceMark(demo,'authored-1',image,pixels,crop,settings);
 assert.equal(r.candidates[0].proposalReason,'truncated-at-crop-boundary');assert.equal(r.candidates[0].eligible,false);
 assert.throws(()=>adoptSourceComponent(demo,'authored-1',image,pixels,crop,settings,r.candidates[0].id),/truncated/);assert.deepEqual(demo,before);
});
test('adoption recomputes pixels, preserves source/rules and retains explicit historical choice',()=>{
 const demo=fixture(),before=structuredClone(demo),next=adoptSourceComponent(demo,'authored-1',image,raster(),crop,settings,'component-1');
 const mark=next.landmarks[0],saved=mark.pixelInspections[0];
 assert.deepEqual(mark.sourcePx,{x:82,y:62});assert.equal(mark.kind,'edge_offset_mm');assert.equal(mark.edge,'left');assert.equal(mark.why,demo.landmarks[0].why);
 assert.deepEqual(saved.priorPoint,{x:80,y:60});assert.equal(saved.area,96);assert.equal(saved.sourceImage.sha256,image.sha256);
 assert.deepEqual(next.source,demo.source);assert.deepEqual(demo,before);assert.equal(inspectionRelation(next,'authored-1').status,'recorded');
 assert.equal(reproduceSourceInspection(next,'authored-1',image,raster()).status,'reproduced');
});
test('manual coordinate changes keep history but cannot claim current pixel support',()=>{
 const next=adoptSourceComponent(fixture(),'authored-1',image,raster(),crop,settings,'component-1');
 const revised=reviseCaptureMark(next,'authored-1',{label:'Manual revision',kind:'fraction',toleranceMm:3,sourcePx:{x:83,y:62}});
 assert.equal(revised.landmarks[0].pixelInspections.length,1);assert.equal(inspectionRelation(revised,'authored-1').status,'changed');
 assert.throws(()=>reproduceSourceInspection(revised,'authored-1',image,raster()),/differs/);
});
test('saved measurements and upstream pins must reproduce, not merely look plausible',()=>{
 const next=adoptSourceComponent(fixture(),'authored-1',image,raster(),crop,settings,'component-1');
 for(const mutate of [r=>r.area++,r=>r.meanIntensity++,r=>r.bboxPx[0]++,r=>r.selectedComponent='component-2',r=>r.upstream.sha256='f'.repeat(64)]){
  const copy=structuredClone(next);mutate(copy.landmarks[0].pixelInspections[0]);assert.throws(()=>reproduceSourceInspection(copy,'authored-1',image,raster()));
 }
 assert.throws(()=>reproduceSourceInspection(next,'authored-1',image,raster({contrast:15})),/do not reproduce/);
});
test('every upstream attribution field must match the exact maintained source pin',()=>{
 const next=adoptSourceComponent(fixture(),'authored-1',image,raster(),crop,settings,'component-1');
 for(const field of ['repository','path','blobSha1','commit','sha256']){
  const changed=structuredClone(next);changed.landmarks[0].pixelInspections[0].upstream[field]='unrelated';
  assert.throws(()=>reproduceSourceInspection(changed,'authored-1',image,raster()),/unsupported source pin/);
 }
});
test('wrong image, outside crop, malformed settings and alpha are refused',()=>{
 const demo=fixture();assert.throws(()=>inspectSourceMark(demo,'authored-1',{...image,sha256:'b'.repeat(64)},raster(),crop,settings),/does not match/);
 for(const value of [{...crop,x:-1},{...crop,width:513},{...crop,height:15},{...crop,x:300}])assert.throws(()=>inspectSourceMark(demo,'authored-1',image,raster(),value,settings));
 assert.throws(()=>inspectSourceMark(demo,'missing',image,raster(),crop,settings),/existing/);
 assert.throws(()=>inspectSourceMark(demo,'authored-1',image,raster(),crop,{...settings,threshold:NaN}));
 const alpha=raster();alpha.data[3]=0;assert.throws(()=>inspectSourceMark(demo,'authored-1',image,alpha,crop,settings),/Transparent/);
});
test('regions outside the calibrated workpiece cannot be adopted',()=>{
 const demo=fixture();demo.source.corners=[{x:0,y:0},{x:81,y:0},{x:81,y:240},{x:0,y:240}];
 const r=inspectSourceMark(demo,'authored-1',image,raster(),crop,settings);assert.equal(r.candidates[0].proposalReason,'outside-calibrated-workpiece');
 assert.throws(()=>adoptSourceComponent(demo,'authored-1',image,raster(),crop,settings,'component-1'),/outside/);
});
test('retained history is bounded; unknown selection or malformed old metadata never alters the source',()=>{
 let demo=fixture();for(let i=0;i<8;i++)demo=adoptSourceComponent(demo,'authored-1',image,raster(),crop,settings,'component-1');
 assert.equal(demo.landmarks[0].pixelInspections.length,8);assert.throws(()=>adoptSourceComponent(demo,'authored-1',image,raster(),crop,settings,'component-1'),/eight/);
 assert.throws(()=>adoptSourceComponent(fixture(),'authored-1',image,raster(),crop,settings,'missing'),/current extraction/);
 const bad=fixture();bad.landmarks[0].pixelInspections={};assert.equal(inspectionRelation(bad,'authored-1').status,'invalid');assert.throws(()=>adoptSourceComponent(bad,'authored-1',image,raster(),crop,settings,'component-1'));
});
