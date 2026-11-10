import {proposePhotoCorners} from '../src/photo-corners.mjs';
self.onmessage=event=>{try{self.postMessage({report:proposePhotoCorners(event.data)});}catch(error){self.postMessage({error:error.message});}};
