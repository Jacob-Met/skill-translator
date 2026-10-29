import {FORMAT as FOUR_FORMAT,inspectAppearanceQuadrupleSamples,minimizeQuadrupleAppearanceCosts} from '/src/appearance-quadruple.mjs';
import {inspectAdditiveAppearanceSamples,minimizeAdditiveAppearanceCosts} from '/src/appearance-additive-cost.mjs';
import {joinAppearanceMinima} from '/src/appearance-triplet.mjs';
let report=null,profiles=null;
self.onmessage=({data})=>{
 try{
  if(data.type==='compute'){
   report=null;profiles=null;
   const inspected=(data.source?.format===FOUR_FORMAT?inspectAppearanceQuadrupleSamples:inspectAdditiveAppearanceSamples)(data.source,data.sequence,data.samples);
   profiles=inspected.profiles;const {profiles:unused,...visible}=inspected;report=visible;
   self.postMessage({type:'result',requestId:data.requestId,result:report});
  }else if(data.type==='four-page'){
   if(!report||!profiles||report.source.format!==FOUR_FORMAT||JSON.stringify(data.source)!==JSON.stringify(report.source))throw Error('Four-original source changed; recompute before paging');
   const commonCost=minimizeQuadrupleAppearanceCosts(profiles,data.page);
   self.postMessage({type:'four-page',requestId:data.requestId,source:report.source,commonCost});
  }else if(data.type==='cost-page'){
   if(!report||!profiles||report.source.format===FOUR_FORMAT||JSON.stringify(data.source)!==JSON.stringify(report.source))throw Error('Composition source changed; recompute before paging');
   const additiveCost=minimizeAdditiveAppearanceCosts(profiles,data.page);
   self.postMessage({type:'cost-page',requestId:data.requestId,source:report.source,additiveCost});
  }else if(data.type==='page'){
   if(!report||report.source.format===FOUR_FORMAT||JSON.stringify(data.source)!==JSON.stringify(report.source))throw Error('Composition source changed; recompute before paging');
   const join=joinAppearanceMinima(report.comparisons.map(r=>r.comparison),data.page);
   self.postMessage({type:'page',requestId:data.requestId,source:report.source,join});
  }else throw Error('Unsupported composition operation');
 }catch(error){self.postMessage({type:'error',requestId:data.requestId,error:error.message});}
};
