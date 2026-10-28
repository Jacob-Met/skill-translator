import {inspectAppearanceTripletSamples,joinAppearanceMinima} from '/src/appearance-triplet.mjs';
let report=null;
self.onmessage=({data})=>{
 try{
  if(data.type==='compute'){
   report=null;
   report=inspectAppearanceTripletSamples(data.source,data.sequence,data.samples);
   self.postMessage({type:'result',requestId:data.requestId,result:report});
  }else if(data.type==='page'){
   if(!report||JSON.stringify(data.source)!==JSON.stringify(report.source))throw Error('Composition source changed; recompute before paging');
   const join=joinAppearanceMinima(report.comparisons.map(r=>r.comparison),data.page);
   self.postMessage({type:'page',requestId:data.requestId,source:report.source,join});
  }else throw Error('Unsupported composition operation');
 }catch(error){self.postMessage({type:'error',requestId:data.requestId,error:error.message});}
};
