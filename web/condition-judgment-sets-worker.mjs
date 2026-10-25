import {inspectJudgmentSets} from '/src/condition-judgment-sets.mjs';
self.onmessage=({data})=>{try{self.postMessage({ok:true,finding:inspectJudgmentSets(data)});}catch(e){self.postMessage({ok:false,error:e.message});}};
