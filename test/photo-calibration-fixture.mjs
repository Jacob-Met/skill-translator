import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {inspectImageBytes} from '../src/capture.mjs';
import {createPractice,observePractice} from '../src/practice.mjs';
import {createReview} from '../src/practice-review.mjs';
import {createPhotoRoundFeedback} from '../src/photo-round-feedback.mjs';
const corners=(x,y,size)=>[{x,y},{x:x+size,y},{x:x+size,y:y+size},{x,y:y+size}];
const demo={title:'Authored repeated-photo corner-reading control',source:{widthMm:100,heightMm:100,corners:corners(0,0,100)},landmarks:[{id:'a',label:'First learner mark',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:2},{id:'b',label:'Second learner mark',kind:'fraction',sourcePx:{x:40,y:30},toleranceMm:2}]};
const photo=(offset,hash)=>({schema:'skill-translator-learner-observation/v1',image:{name:`authored-${hash}.png`,sha256:hash.repeat(64),widthPx:120,heightPx:120,mimeType:'image/png',pixelCoordinates:'browser-oriented'},calibration:{widthMm:100,heightMm:100,corners:corners(10,10,100)},evidenceClass:'authored-image-control',points:[{id:'a',pixel:{x:30+offset,y:40}},{id:'b',pixel:{x:50+offset,y:40}}]});
function imageBytes(offset){
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0;};
 const chunk=(name,data)=>{const tag=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([tag,data])));return Buffer.concat([size,tag,data,sum]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(120,0);header.writeUInt32BE(120,4);header[8]=8;header[9]=2;
 const rows=Buffer.alloc(120*(1+120*3),255);for(let y=0;y<120;y++){rows[y*361]=0;for(let x=0;x<120;x++)if((y===10||y===110)&&x>=10&&x<=110||(x===10||x===110)&&y>=10&&y<=110||Math.abs(y-40)<=1&&[30+offset,50+offset].some(px=>Math.abs(x-px)<=1))rows.fill(0,y*361+1+x*3,y*361+1+x*3+3);}
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const before=photo(3,'a'),after=photo(1,'b');for(const [observation,offset,name]of [[before,3,'earlier.png'],[after,1,'later.png']]){const bytes=imageBytes(offset);inspectImageBytes(bytes);observation.image.name=name;observation.image.sha256=createHash('sha256').update(bytes).digest('hex');}


let session=createPractice(demo,100,100);for(const observation of [before,after])session=observePractice(demo,100,100,session,observation);
const base=createPhotoRoundFeedback(createReview(demo,session),{before:{halfWidthPx:.1,halfHeightPx:0},after:{halfWidthPx:.1,halfHeightPx:0}});
export {base,before,after,corners,imageBytes};
