import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTranslatedSamples} from '../src/visual-translation.mjs';
import {locateTranslatedChanges} from '../src/translated-change-regions.mjs';
import {locateScanChanges} from '../src/scan-change-regions.mjs';

function sample(width,height,time,pixel){const rgba=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)rgba.set([...pixel(x,y),255],4*(y*width+x));return{widthPx:width,heightPx:height,presentedSeconds:time,rgba};}
function texture(width,height,seed=673901){let state=seed;const pixels=Array.from({length:width*height},()=>Array.from({length:3},()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return 40+state%150;}));return(x,y)=>x<0||y<0||x>=width||y>=height?[70,70,70]:pixels[y*width+x];}
const fit=(a,b,radius=4)=>compareTranslatedSamples(a,b,{radius,includeChangeRegions:true});

// Independent set oracle: enumerate reference samples, build the changed set
// for each retained fit, then intersect/union them in each image's coordinates.
function oracle(before,after,comparison){
 const width=before.widthPx,height=before.heightPx,r=comparison.radius,sets=[];
 for(const shift of comparison.alternatives){const earlier=new Set(),later=new Set();for(let y=r;y<height-r;y++)for(let x=r;x<width-r;x++){
  const a=y*width+x,b=(y+shift.dy)*width+x+shift.dx;
  if([0,1,2].some(c=>Math.abs(after.rgba[4*b+c]-before.rgba[4*a+c]-shift.uniformBrightnessShift)>=16)){earlier.add(a);later.add(b);}
 }sets.push({earlier,later});}
 const result={};for(const frame of ['earlier','later']){const some=new Set(sets.flatMap(s=>[...s[frame]])),every=new Set([...sets[0][frame]].filter(i=>sets.every(s=>s[frame].has(i))));result[frame]={every,some};}return result;
}
function components(set,width,height){const remaining=new Set(set),result=[];while(remaining.size){const first=remaining.values().next().value,queue=[first];remaining.delete(first);const points=[];for(let i=0;i<queue.length;i++){const at=queue[i],x=at%width,y=Math.floor(at/width);points.push([x,y]);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&remaining.has(n)){remaining.delete(n);queue.push(n);}}}result.push({area:points.length,bbox:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),1+Math.max(...points.map(p=>p[0])),1+Math.max(...points.map(p=>p[1]))]});}return result.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
function checkOracle(a,b,comparison){const expected=oracle(a,b,comparison),actual=comparison.changeRegions;assert.equal(actual.status,'analyzed');for(const frame of ['earlier','later'])for(const certainty of ['every','some']){assert.equal(actual[frame][certainty].changedPixels,expected[frame][certainty].size);assert.deepEqual(actual[frame][certainty].regions.map(r=>({area:r.area,bbox:r.bbox})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),components(expected[frame][certainty],a.widthPx,a.heightPx));}}

test('combined pan, brightness and local change retain exact boxes in both original coordinate systems',()=>{
 const width=80,height=64,pixels=texture(width,height);
 for(const [dx,dy,box]of [[3,-2,[28,25,36,31]],[-4,3,[46,34,52,42]],[8,-6,[30,24,40,32]]]){
  const before=sample(width,height,0,pixels),after=sample(width,height,1,(x,y)=>pixels(x-dx,y-dy).map(v=>v+5+(x>=box[0]&&x<box[2]&&y>=box[1]&&y<box[3]?45:0)));
  const beforeBytes=before.rgba.slice(),afterBytes=after.rgba.slice(),comparison=fit(before,after,12),analysis=comparison.changeRegions;
  assert.equal(comparison.alternatives.length,1);assert.deepEqual([comparison.alternatives[0].dx,comparison.alternatives[0].dy],[dx,dy]);
  assert.ok(locateScanChanges(before,after).changedPixels>5000);
  assert.deepEqual(analysis.earlier.every.regions[0].bbox,[box[0]-dx,box[1]-dy,box[2]-dx,box[3]-dy]);assert.deepEqual(analysis.later.every.regions[0].bbox,box);
  checkOracle(before,after,comparison);assert.deepEqual(before.rgba,beforeBytes);assert.deepEqual(after.rgba,afterBytes);
  const plain=compareTranslatedSamples(before,after,{radius:12}),{changeRegions,...unchanged}=comparison;assert.deepEqual(unchanged,plain);
 }
});
test('all tied shifts preserve distinct every-fit and some-fit evidence without an arbitrary correspondence',()=>{
 const before=sample(80,64,0,()=>[90,90,90]),after=sample(80,64,1,(x,y)=>x>=36&&x<41&&y>=28&&y<33?[130,130,130]:[90,90,90]);
 const comparison=fit(before,after),a=comparison.changeRegions;assert.equal(comparison.alternatives.length,81);
 assert.equal(a.earlier.every.changedPixels,0);assert.equal(a.earlier.some.changedPixels,169);assert.equal(a.later.every.changedPixels,25);assert.equal(a.later.some.changedPixels,25);
 assert.deepEqual(a.earlier.some.regions[0].bbox,[32,24,45,37]);assert.deepEqual(a.later.every.regions[0].bbox,[36,28,41,33]);
 assert.equal(a.earlier.fullyCompared.pixelCount,72*56);assert.equal(a.later.fullyCompared.pixelCount,64*48);checkOracle(before,after,comparison);
});
test('independent pixel and connected-component oracle agrees on changed small courses including periodic ambiguity',()=>{
 for(let i=0;i<16;i++){
  const width=28,height=24,pixels=texture(width,height,7793+i),dx=i%5-2,dy=(i*3)%5-2;
  const pixel=i%4===0?(x,y)=>[70+40*(Math.abs(x)%4<2),90,110]:pixels;
  const a=sample(width,height,0,pixel),b=sample(width,height,2,(x,y)=>pixel(x-dx,y-dy).map(v=>v+3+(x>=9+i%4&&x<12+i%4&&y>=10&&y<13?28:0)));
  checkOracle(a,b,fit(a,b,2));
 }
});
test('excluded tiny regions and omitted borders stay distinct from an unchanged whole image',()=>{
 const pixels=texture(48,40),a=sample(48,40,0,pixels),b=sample(48,40,1,(x,y)=>pixels(x,y).map(v=>v+(x===20&&y===20?40:0)+(x<3&&y>=10&&y<20?35:0)));
 const comparison=fit(a,b),r=comparison.changeRegions.earlier.every;
 assert.ok(locateScanChanges(a,b).changedPixels>r.changedPixels);assert.equal(r.changedPixels,1);assert.equal(r.regions.length,1);assert.equal(r.regions[0].accepted,false);checkOracle(a,b,comparison);
});
test('zero residual across 1089 ties has no threshold traversal and unavailable support has no zero substitute',()=>{
 const a=sample(80,64,0,()=>[90,90,90]),b=sample(80,64,1,()=>[103,103,103]),comparison=fit(a,b,16);
 assert.equal(comparison.alternatives.length,1089);assert.equal(comparison.changeRegions.work.evaluatedPixelPairs,0);assert.equal(comparison.changeRegions.earlier.every.changedPixels,0);assert.equal(comparison.changeRegions.later.some.changedPixels,0);
 const tiny=sample(20,20,0,()=>[80,80,80]),later={...tiny,presentedSeconds:1};assert.equal(fit(tiny,later,16).changeRegions.status,'unavailable');
 assert.equal(locateTranslatedChanges(a,{...b,presentedSeconds:0},comparison).status,'unavailable');
 assert.equal(locateTranslatedChanges(a,b,{...comparison,alternatives:[comparison.alternatives[0],comparison.alternatives[0]]}).status,'unavailable');
  assert.throws(()=>fit(a,{...b,widthPx:79}),/Sample pixels are incomplete/);
});
