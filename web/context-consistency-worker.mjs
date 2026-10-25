import {analyzeContextDisks} from '/src/context-disk-support.mjs';
self.onmessage=event=>{try{self.postMessage({result:analyzeContextDisks(event.data)});}catch(error){self.postMessage({error:error.message});}};
