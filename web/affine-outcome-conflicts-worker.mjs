import {diagnoseAffineOutcomeConflicts} from '../src/affine-outcome-conflicts.mjs';
self.onmessage=({data})=>{try{self.postMessage({revision:data.revision,report:diagnoseAffineOutcomeConflicts(data.account)});}catch(error){self.postMessage({revision:data.revision,error:{code:error.code||'INVALID_ACCOUNT',message:error.message}});}};
