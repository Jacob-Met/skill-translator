import {inspectAdditiveAppearanceSamples,minimizeAdditiveAppearanceCosts} from '/src/appearance-additive-cost.mjs';
import {joinAppearanceMinima} from '/src/appearance-triplet.mjs';
let report=null,profiles=null;
self.onmessage=({data})=>{
 try{
  if(data.type==='compute'){
   report=null;
   const inspected=inspectAdditiveAppearanceSamples(data.source,data.sequence,data.samples);
   profiles=inspected.profiles;const {profiles:unused,...visible}=inspected;report=visible;
   self.postMessage({type:'result',requestId:data.requestId,result:report});
  }else if(data.type==='cost-page'){
   if(!report||!profiles||JSON.stringify(data.source)!==JSON.stringify(report.source))throw Error('Composition source changed; recompute before paging');
   const additiveCost=minimizeAdditiveAppearanceCosts(profiles,data.page);
   self.postMessage({type:'cost-page',requestId:data.requestId,source:report.source,additiveCost});
  }else if(data.type==='page'){
   if(!report||JSON.stringify(data.source)!==JSON.stringify(report.source))throw Error('Composition source changed; recompute before paging');
   const join=joinAppearanceMinima(report.comparisons.map(r=>r.comparison),data.page);
   self.postMessage({type:'page',requestId:data.requestId,source:report.source,join});
  }else throw Error('Unsupported composition operation');
 }catch(error){self.postMessage({type:'error',requestId:data.requestId,error:error.message});}
};
