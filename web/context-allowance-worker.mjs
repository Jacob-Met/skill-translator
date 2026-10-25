import {analyzeContextAllowance} from '/src/context-allowance.mjs';
onmessage=event=>{try{postMessage({result:analyzeContextAllowance(event.data)});}catch(error){postMessage({error:error.message});}};
