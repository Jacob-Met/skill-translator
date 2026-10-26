import {createHash} from 'node:crypto';
import {motionSequence,groupedFrames} from '../../test/helpers/shared-motion-fixture.mjs';
export async function originalMotionBundle(page,frames=groupedFrames()){
  const provisional=motionSequence({frames});
  const pngs=await page.evaluate(moments=>moments.map((moment,index)=>{const c=document.createElement('canvas');c.width=600;c.height=400;const ctx=c.getContext('2d');ctx.fillStyle='#e7dfcc';ctx.fillRect(0,0,600,400);ctx.strokeStyle='#c9c1ae';ctx.lineWidth=1;for(let x=0;x<=600;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,400);ctx.stroke();}for(let y=0;y<=400;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(600,y);ctx.stroke();}
   for(let g=0;g<2;g++){const points=moment.calibratedTask.landmarks.slice(g*3,g*3+3).map(m=>m.sourcePx);ctx.fillStyle=g?'#ad7554':'#537b6b';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
   for(const [i,m] of moment.calibratedTask.landmarks.entries()){ctx.fillStyle='#ffedb5';ctx.beginPath();ctx.arc(m.sourcePx.x,m.sourcePx.y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#203b30';ctx.font='15px sans-serif';ctx.fillText('P'+(i+1),m.sourcePx.x+8,m.sourcePx.y-6);}ctx.fillStyle='#203b30';ctx.font='18px sans-serif';ctx.fillText('Authored original view '+(index+1),18,376);return c.toDataURL('image/png').split(',')[1];}),provisional.moments);
  const images=provisional.moments.map((m,i)=>({...m.image,sha256:createHash('sha256').update(Buffer.from(pngs[i],'base64')).digest('hex')}));
  return {format:'skill-translator.sequence-bundle/v1',sequence:motionSequence({frames,images}),frames:pngs.map((pngBase64,i)=>({momentId:'moment-'+i,pngBase64}))};
 }
