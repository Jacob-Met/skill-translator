import {inspectSelectedBrightness} from '/src/appearance-brightness-consistency.mjs';
import {FORMAT as FOUR_FORMAT,inspectAppearanceQuadrupleBrightnessSamples,minimizeQuadrupleAppearanceCosts} from '/src/appearance-quadruple.mjs';
import {inspectAdditiveAppearanceSamples,minimizeAdditiveAppearanceCosts} from '/src/appearance-additive-cost.mjs';
import {joinAppearanceMinima} from '/src/appearance-triplet.mjs';
let report=null,profiles=null,intervals=null;
self.onmessage=({data})=>{
 try{
  if(data.type==='compute'){
   report=null;profiles=null;intervals=null;
   const inspected=(data.source?.format===FOUR_FORMAT?inspectAppearanceQuadrupleBrightnessSamples:inspectAdditiveAppearanceSamples)(data.source,data.sequence,data.samples);
   profiles=inspected.profiles;intervals=inspected.intervals;const {profiles:unused,intervals:privateIntervals,...visible}=inspected;report=visible;
   self.postMessage({type:'result',requestId:data.requestId,result:report});
  }else if(data.type==='brightness-account'){
   if(!report||!profiles||!intervals||report.source.format!==FOUR_FORMAT)throw Error('Recompute four-original source before selecting an account');
   const answer=inspectSelectedBrightness({source:report.source,profiles,intervals,optimalIntegerResidual:report.commonCost.optimalIntegerResidual},data.selection);
   self.postMessage({type:'brightness-account',requestId:data.requestId,selectionId:data.selectionId,answer});
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
