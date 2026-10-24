import {analyzeResponseHoldouts} from '../src/response-holdout.mjs';
onmessage=event=>{try{postMessage({result:analyzeResponseHoldouts(event.data)});}catch(error){postMessage({error:error.message});}};
