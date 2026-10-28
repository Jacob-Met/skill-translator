import {inspectFixedMotion} from '/src/fixed-motion.mjs';
self.onmessage=event=>{try{self.postMessage({result:inspectFixedMotion(event.data.study,event.data.selection)});}catch(error){self.postMessage({error:error.message});}};
