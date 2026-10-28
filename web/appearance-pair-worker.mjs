import {inspectAppearanceSamples} from '/src/appearance-pair.mjs';
self.onmessage=event=>{
 const {revision,source,sequence,before,after}=event.data??{};
 try{if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid appearance request revision');
  self.postMessage({revision,result:inspectAppearanceSamples(source,sequence,before,after)});
 }catch(error){self.postMessage({revision,error:String(error?.message||error)});}
};
