import {createPractice,observePractice} from '../src/practice.mjs';
const corners=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],demo={title:'Authored repeated-photo control',source:{widthMm:100,heightMm:100,corners},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:2},{id:'b',label:'B',kind:'fraction',sourcePx:{x:40,y:30},toleranceMm:2}]};
const photo=(offset,identity)=>({schema:'skill-translator-learner-observation/v1',image:{name:identity+'.png',sha256:identity.repeat(64),widthPx:100,heightPx:100,mimeType:'image/png',pixelCoordinates:'browser-oriented'},calibration:{widthMm:100,heightMm:100,corners},evidenceClass:'authored-image-control',points:demo.landmarks.map(m=>({id:m.id,pixel:{x:m.sourcePx.x+offset,y:30}}))});
let session=createPractice(demo,100,100);session=observePractice(demo,100,100,session,photo(3,'a'));session=observePractice(demo,100,100,session,photo(1,'b'));
export {demo,session};
