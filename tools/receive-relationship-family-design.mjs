import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {suggestRelationshipFamilySizes} from '../src/relationship-family-design.mjs';
import {inspectRelationshipFamilies} from '../src/relationship-families.mjs';
const row=(id,w,h,value,kind)=>{
 let dx=kind==='horizontal'?value:0,dy=kind==='vertical'?value:0;
 if(kind==='distance'){dx=value*w/Math.hypot(w,h);dy=value*h/Math.hypot(w,h);}
 return {id,evidenceClass:'authored-example',correspondenceConfirmed:true,annotation:{source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:(w-dx)/2,y:(h-dy)/2},toleranceMm:1},{id:'b',label:'B',kind:'fraction',sourcePx:{x:(w+dx)/2,y:(h+dy)/2},toleranceMm:1}]}};
};
let checks=0,candidates=0,nonzeroSpreads=0,independentIntervals=0;const cases=[];
for(const kind of ['horizontal','vertical','distance'])for(const sign of (kind==='distance'?[1]:[-1,1])){
 const w=197,h=139,base=sign*31.7;
 const raw={format:'skill-translator.relationship-discovery/v1',deviationMm:2,demonstrations:[row('first',w,h,base,kind),row('second',w*1.02,h*.98,base+sign*.23,kind)]};
 const before=JSON.stringify(raw),native=inspectRelationshipFamilies(raw),initial=native.pairs.find(p=>p.kind===kind),design=suggestRelationshipFamilySizes(raw,`a:b:${kind}`);
 assert.ok(initial.hypotheses.every(x=>x.status==='compatible'&&x.spreadReferenceEquivalentMm>0));nonzeroSpreads+=4;
 for(const c of design.candidates){candidates++;const extent=kind==='horizontal'?c.widthMm:kind==='vertical'?c.heightMm:Math.hypot(c.widthMm,c.heightMm);
  for(const interval of c.intervals){
   // Independent scalar inequality reconstruction using original readings.
   const ratios=raw.demonstrations.map(r=>interval.family==='fixed'?1:interval.family==='width-proportional'?r.annotation.source.widthMm/w:interval.family==='height-proportional'?r.annotation.source.heightMm/h:Math.hypot(r.annotation.source.widthMm,r.annotation.source.heightMm)/Math.hypot(w,h));
   const normalized=[base/ratios[0],(base+sign*.23)/ratios[1]];
   const scale=interval.family==='fixed'?1:interval.family==='width-proportional'?c.widthMm/w:interval.family==='height-proportional'?c.heightMm/h:Math.hypot(c.widthMm,c.heightMm)/Math.hypot(w,h);
   const low=Math.max(kind==='distance'?0:-extent,(Math.max(...normalized)-2-1e-9)*scale),high=Math.min(extent,(Math.min(...normalized)+2+1e-9)*scale);
   assert.ok(Math.abs(low-interval.lowMm)<1e-9&&Math.abs(high-interval.highMm)<1e-9);independentIntervals++;
   for(const value of [low-.001,low+.001,(low+high)/2,high-.001,high+.001]){
    if(value<(kind==='distance'?0:-extent)||value>extent)continue;
    const next=structuredClone(raw);next.demonstrations.push(row('fresh',c.widthMm,c.heightMm,value,kind));
    const actual=inspectRelationshipFamilies(next).pairs.find(p=>p.kind===kind).compatibleFamilies.includes(interval.family);
    assert.equal(actual,value>=low&&value<=high,JSON.stringify({kind,sign,value,interval}));checks++;
   }
  }
 }
 assert.equal(JSON.stringify(raw),before);cases.push({kind,sign,recommendation:design.recommendation&&{widthMm:design.recommendation.widthMm,heightMm:design.recommendation.heightMm,separatedPairs:design.recommendation.separatedPairs}});
}
for(const [w,h] of [[1,1],[1,10000],[10000,1],[10000,10000],[1.9,9999]]){
 const raw={format:'skill-translator.relationship-discovery/v1',deviationMm:.1,demonstrations:[row('one',w,h,.2,'horizontal'),row('two',w,h,.21,'horizontal')]};
 const design=suggestRelationshipFamilySizes(raw,'a:b:horizontal');
 assert.ok(design.candidates.every(c=>c.widthMm>=1&&c.widthMm<=10000&&c.heightMm>=1&&c.heightMm<=10000));
 assert.ok(design.candidates.every(c=>c.widthMm!==w||c.heightMm!==h));
}
const twelve={format:'skill-translator.relationship-discovery/v1',deviationMm:.2,demonstrations:Array.from({length:12},(_,i)=>row('demo-'+i,197,139,31.7,'horizontal'))};
const recommended=suggestRelationshipFamilySizes(twelve,'a:b:horizontal').recommendation;
let capFailure=null;
if(recommended){const extra=structuredClone(twelve);extra.demonstrations.push(row('new',recommended.widthMm,recommended.heightMm,31.7,'horizontal'));try{inspectRelationshipFamilies(extra);}catch(e){capFailure=e.message;}}
const result={checks,candidates,independentIntervals,nonzeroSpreads,cases,dimensionBoundaryCourses:5,capAt12:{recommendationPresent:!!recommended,actual13thRefusal:capFailure}};
result.source_sha256=Object.fromEntries(['relationship-family-design','relationship-families','relationship-discovery','geometry'].map(name=>[name+'.mjs',crypto.createHash('sha256').update(fs.readFileSync(new URL('../src/'+name+'.mjs',import.meta.url))).digest('hex')]));
if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
