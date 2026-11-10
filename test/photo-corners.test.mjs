import test from 'node:test';
import assert from 'node:assert/strict';
import {proposePhotoCorners,originalPhotoCorners} from '../src/photo-corners.mjs';
function raster(shapes,{width=240,height=180,background=30}={}) {
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let value=background;
  for(const {points,color} of shapes){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside)value=color;}
  const k=(y*width+x)*4;data[k]=data[k+1]=data[k+2]=value;data[k+3]=255;
 }return {width,height,data};
}
const quad=[[35,25],[202,39],[185,152],[24,133]];
test('oblique bright and dark source regions yield four original raster corners',()=>{
 for(const [background,color] of [[30,220],[220,30]]){
  const r=proposePhotoCorners(raster([{points:quad,color}],{background}));assert.equal(r.candidates.length,1);
  const c=r.candidates[0];for(let i=0;i<4;i++)assert.ok(Math.hypot(c.corners[i].x-quad[i][0],c.corners[i].y-quad[i][1])<2);
 }
});
test('multiple separate workpieces remain alternatives; none is automatically chosen',()=>{
 const r=proposePhotoCorners(raster([{points:[[15,20],[100,20],[100,150],[15,150]],color:220},{points:[[130,35],[220,35],[220,145],[130,145]],color:220}]));
 assert.equal(r.candidates.length,2);assert.ok(r.candidates[0].areaPx>=r.candidates[1].areaPx);
});
test('uniform, clipped, triangular and circular originals yield no invented rectangle',()=>{
 const circle=Array.from({length:80},(_,i)=>[120+60*Math.cos(i*Math.PI/40),90+60*Math.sin(i*Math.PI/40)]);
 for(const points of [[],[[0,20],[200,20],[200,150],[0,150]],[[30,20],[210,30],[120,150]],circle]){
  assert.equal(proposePhotoCorners(raster(points.length?[{points,color:220}]:[])).candidates.length,0);
 }
});
test('notched region cannot silently become a filled quadrilateral',()=>{
 const points=[[30,20],[210,20],[210,150],[155,150],[155,70],[85,70],[85,150],[30,150]];
 assert.equal(proposePhotoCorners(raster([{points,color:220}])).candidates.length,0);
});
test('coordinate mapping and corner rotation preserve original image dimensions',()=>{
 const candidate={corners:[{x:10,y:20},{x:90,y:20},{x:90,y:70},{x:10,y:70}]};
 assert.deepEqual(originalPhotoCorners(candidate,100,80,400,240,1),[{x:360,y:60},{x:360,y:210},{x:40,y:210},{x:40,y:60}]);
});
test('transparent and oversized analysis rasters are explicitly refused',()=>{
 const r=raster([]);r.data[3]=0;assert.throws(()=>proposePhotoCorners(r),/opaque/);
 assert.throws(()=>proposePhotoCorners({...r,width:2048}),/1024/);
});

test('printed holes do not erase a supported outer board boundary',()=>{
 const board={points:[[25,20],[215,20],[215,160],[25,160]],color:220};
 const holes=[];for(let y=30;y<150;y+=25)for(let x=35;x<205;x+=25)holes.push({points:[[x,y],[x+18,y],[x+18,y+18],[x,y+18]],color:30});
 const report=proposePhotoCorners(raster([board,...holes]));
 assert.ok(report.candidates.some(c=>c.corners.every((p,i)=>Math.hypot(p.x-board.points[i][0],p.y-board.points[i][1])<2)));
});
test('a sparse closed outline is supported but an open three-sided outline is not completed',()=>{
 const outer={points:[[25,20],[215,20],[215,160],[25,160]],color:220},inner={points:[[28,23],[212,23],[212,157],[28,157]],color:30};
 assert.ok(proposePhotoCorners(raster([outer,inner])).candidates.some(c=>c.coverage>.5));
 const gap={points:[[55,16],[185,16],[185,30],[55,30]],color:30};
 assert.equal(proposePhotoCorners(raster([outer,inner,gap])).candidates.length,0);
});
