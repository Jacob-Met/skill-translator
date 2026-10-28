import {inspectMotionWithDistance} from '/src/motion-distance-invariant.mjs';
self.onmessage=event=>{try{self.postMessage({result:inspectMotionWithDistance(event.data.study,event.data.selection)});}catch(error){self.postMessage({error:error.message});}};
