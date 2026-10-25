import {analyzeDemonstrationHoldouts} from '../src/demonstration-holdout.mjs';
onmessage=event=>{try{postMessage({result:analyzeDemonstrationHoldouts(event.data)});}catch(error){postMessage({error:error.message});}};
