import {test} from 'node:test';
import assert from 'node:assert/strict';
import {locateScanChanges} from '../src/scan-change-regions.mjs';
import {compareSamplePixels} from '../src/visual-scan.mjs';
const frame=(t=0,w=32,h=24,value=50)=>({widthPx:w,heightPx:h,presentedSeconds:t,rgba:Uint8ClampedArray.from(Array.from({length:w*h},()=>[value,value,value,255]).flat())});
const put=(f,x,y,v=150)=>f.rgba.set([v,v,v,255],4*(y*f.widthPx+x));
const box=(f,x,y,w,h,v=150)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(f,i,j,v);};

test('localized changed patch is found without mutating samples or scalar baseline',()=>{
 const a=frame(),b=frame(1);box(b,7,9,5,3);const saved=structuredClone(b);
 const r=locateScanChanges(a,b);
 assert.equal(r.status,'analyzed');assert.equal(r.changedPixels,15);
 assert.deepEqual(r.regions.map(x=>x.bbox),[[7,9,12,12]]);
 assert.equal(r.regions[0].accepted,true);assert.deepEqual(r.measures,compareSamplePixels(a,b));assert.deepEqual(b,saved);
});
test('uniform brightness and still controls produce no changed region; raw brightness remains',()=>{
 for(const v of [50,80]){const r=locateScanChanges(frame(),frame(1,32,24,v));assert.equal(r.changedPixels,0);assert.equal(r.regions.length,0);assert.equal(r.measures.meanAbsoluteChange,(v-50)/255);}
});
test('two disconnected changed areas remain distinct, speckles explicitly excluded',()=>{
 const a=frame(),b=frame(1);box(b,2,2,2,2);box(b,20,15,3,2);put(b,30,1);
 const r=locateScanChanges(a,b);assert.equal(r.changedPixels,11);
 assert.equal(r.regions.filter(x=>x.accepted).length,2);assert.equal(r.regions.filter(x=>!x.accepted).length,1);
 assert.equal(r.regions.find(x=>!x.accepted).reason,'below-minimum-area');
});
test('unfamiliar connected shapes and boundary shapes preserve exact occupied extents',()=>{
 const a=frame(),b=frame(1);
 const points=[[0,0],[1,1],[2,2],[3,3],[4,4],[18,10],[18,11],[18,12],[19,12],[20,12]];
 for(const [x,y] of points)put(b,x,y);
 const r=locateScanChanges(a,b);assert.deepEqual(r.regions.map(x=>x.area),[5,5]);
 assert.deepEqual(r.regions.map(x=>x.bbox),[[0,0,5,5],[18,10,21,13]]);
 assert.deepEqual(r.regions.map(x=>x.touchesBoundary),[true,false]);
});
test('duplicate and reversed timing and unsupported raster sizes are unavailable, not zero change',()=>{
 for(const t of [0,-1]){const r=locateScanChanges(frame(),frame(t));assert.equal(r.status,'unavailable');assert.equal(r.changedPixels,undefined);}
 const r=locateScanChanges(frame(0,8,8),frame(1,8,8));assert.equal(r.status,'unavailable');assert.equal(r.regions,undefined);
 assert.throws(()=>locateScanChanges(frame(),{error:'decoder failed'}));
 assert.throws(()=>locateScanChanges(frame(),frame(1,31,24)));
});
test('exact threshold and global light shift retain localized residual support',()=>{
 const a=frame(),b=frame(1,32,24,70);box(b,4,4,2,2,86);put(b,25,20,85);
 const r=locateScanChanges(a,b);assert.equal(r.measures.uniformBrightnessShift,20);
 assert.equal(r.changedPixels,4);assert.deepEqual(r.regions[0].bbox,[4,4,6,6]);
});
test('moving patch exposes departed and arrived appearance without inferring correspondence',()=>{
 const a=frame(),b=frame(1);box(a,2,2,3,3);box(b,20,12,3,3);
 const r=locateScanChanges(a,b);assert.equal(r.regions.length,2);assert.equal(r.changedPixels,18);
 assert.ok(r.regions.every(x=>x.accepted));
});
test('equal scalar changes at different locations produce distinct localization',()=>{
 const a=frame(),left=frame(1),right=frame(1);box(left,2,4,4,3);box(right,23,14,4,3);
 assert.deepEqual(compareSamplePixels(a,left),compareSamplePixels(a,right));
 assert.deepEqual(locateScanChanges(a,left).regions[0].bbox,[2,4,6,7]);
 assert.deepEqual(locateScanChanges(a,right).regions[0].bbox,[23,14,27,17]);
});
