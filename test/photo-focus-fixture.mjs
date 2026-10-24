import {createHash} from 'node:crypto';import {deflateSync} from 'node:zlib';
import {createPractice,observePractice} from '../src/practice.mjs';import {createReview} from '../src/practice-review.mjs';import {inspectImageBytes} from '../src/capture.mjs';import {createPhotoRoundFeedback} from '../src/photo-round-feedback.mjs';import {createPhotoCalibrationReadings,inspectPhotoCalibrationReadings} from '../src/photo-calibration-readings.mjs';
function imageBytes(xs){
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0;};
 const chunk=(name,data)=>{const tag=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([tag,data])));return Buffer.concat([size,tag,data,sum]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(120,0);header.writeUInt32BE(120,4);header[8]=8;header[9]=2;
 const rows=Buffer.alloc(120*(1+120*3),255);for(let y=0;y<120;y++){rows[y*361]=0;for(let x=0;x<120;x++)if((y===10||y===110)&&x>=10&&x<=110||(x===10||x===110)&&y>=10&&y<=110||Math.abs(y-40)<=1&&xs.some(px=>Math.abs(x-px)<=1))rows.fill(0,y*361+1+x*3,y*361+1+x*3+3);}
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const corners=x=>[{x,y:10},{x:x+100,y:10},{x:x+100,y:110},{x,y:110}];
const demo={title:'Authored aggregate improvement with one persistent focus',source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'Mark A',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:2},{id:'b',label:'Mark B',kind:'fraction',sourcePx:{x:40,y:30},toleranceMm:2}]};
const observations=[];
for(const [name,xs]of [['earlier',[38,51]],['later',[31,54]]]){const bytes=imageBytes(xs);inspectImageBytes(bytes);observations.push({schema:'skill-translator-learner-observation/v1',image:{name:name+'.png',sha256:createHash('sha256').update(bytes).digest('hex'),widthPx:120,heightPx:120,mimeType:'image/png',pixelCoordinates:'browser-oriented'},calibration:{widthMm:100,heightMm:100,corners:corners(10)},evidenceClass:'authored-image-control',points:xs.map((x,i)=>({id:i?'b':'a',pixel:{x,y:40}}))});}
let session=createPractice(demo,100,100);for(const observation of observations)session=observePractice(demo,100,100,session,observation);
const review=createReview(demo,session),base=createPhotoRoundFeedback(review,{before:{halfWidthPx:.1,halfHeightPx:0},after:{halfWidthPx:.1,halfHeightPx:0}});
const readings=createPhotoCalibrationReadings(base,{before:[],after:[{id:'left-small',label:'Proposed 0.2 pixel left boundary',basis:'proposed-reading',corners:corners(9.8)},{id:'right-small',label:'Proposed 0.2 pixel right boundary',basis:'proposed-reading',corners:corners(10.2)}]}),report=inspectPhotoCalibrationReadings(readings);

export {readings as investigation,review,demo,imageBytes};
