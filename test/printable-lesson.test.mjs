import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {makePrintableLesson} from '../web/printable-lesson.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFMkAAAAASUVORK5CYII=','base64');
const hash=createHash('sha256').update(png).digest('hex');
function sample(){
 const moment=(id,time)=>({id,label:id,visibleState:'Visible change & context',
   image:{mimeType:'image/png',sha256:hash},origin:{mediaTimeSeconds:time,requestedTimeSeconds:time+.1}});
 return {format:'skill-translator.sequence-bundle/v1',sequence:{
  format:'skill-translator.demonstration-sequence/v1',title:'Task guide',context:'A task with evidence',
  clip:{name:'expert.mp4',mimeType:'video/mp4',sha256:'b'.repeat(64),durationSeconds:6,sizeBytes:200},
  moments:[moment('Before',1),moment('After',3)],steps:[{title:'Make a change',beforeMomentId:'Before',afterMomentId:'After',
   intent:'Good fit',visibleChange:'Changed',sensoryCue:'',recoveryCue:'Stop'}]},
 frames:[{momentId:'Before',pngBase64:png.toString('base64')},{momentId:'After',pngBase64:png.toString('base64')}]};
}
const wrap=x=>new Blob([JSON.stringify(x)],{type:'application/json'});
test('standalone lesson has exact original images, navigable source clocks, and unfilled account',async()=>{
 const html=await (await makePrintableLesson(wrap(sample()))).text();
 assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,2);
 assert.match(html,/href="#source-Before"/);
 assert.match(html,/Original clip SHA-256/);
 assert.match(html,/Presented clock/);
 assert.match(html,/Not supplied by the author/);
 assert.match(html,/default-src 'none'/);
 assert.match(html,new RegExp(hash));
});
test('hostile author strings stay inert even in printed HTML',async()=>{
 const x=sample();
 x.sequence.title='<img src=x onerror=alert(1)>';
 x.sequence.context='</style><script>alert(1)</script>';
 x.sequence.moments[0].label='<iframe src=https://evil.example>';
 x.sequence.steps[0].intent='<svg onload=alert(1)>';
 const html=await (await makePrintableLesson(wrap(x))).text();
 assert.doesNotMatch(html,/<script|<iframe|<svg|<img src=x/i);
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;svg onload=/);
 assert.equal((html.match(/<img /g)||[]).length,2);
});
test('modified PNG, duplicate and missing frames refuse',async()=>{
 const a=sample();a.sequence.moments[0].image.sha256='f'.repeat(64);
 await assert.rejects(makePrintableLesson(wrap(a)),/no longer matches/);
 const b=sample();b.frames[1].momentId='Before';
 await assert.rejects(makePrintableLesson(wrap(b)),/duplicated/);
 const c=sample();c.frames.pop();
 await assert.rejects(makePrintableLesson(wrap(c)),/incomplete/);
 const d=sample();d.sequence.steps[0].beforeMomentId='Wrong';
 await assert.rejects(makePrintableLesson(wrap(d)),/lost its original frame/);
});
test('malformed payload and aborted work produce no document',async()=>{
 const a=sample();a.format='wrong';
 await assert.rejects(makePrintableLesson(wrap(a)),/verified Sequence Studio/);
 const b=sample();b.frames[0].pngBase64=Buffer.from('bad').toString('base64');
 await assert.rejects(makePrintableLesson(wrap(b)),/invalid bytes/);
 const c=new AbortController();c.abort();
 await assert.rejects(makePrintableLesson(wrap(sample()),{signal:c.signal}),/replaced/);
});
test('unassigned frames are included once and source values are not changed',async()=>{
 const s=sample(),snap=JSON.stringify(s);
 s.sequence.moments.push({id:'Extra',label:'Unassigned',visibleState:'',image:{mimeType:'image/png',sha256:hash},origin:{mediaTimeSeconds:5,requestedTimeSeconds:5.1}});
 s.frames.push({momentId:'Extra',pngBase64:png.toString('base64')});
 const html=await (await makePrintableLesson(wrap(s))).text();
 assert.match(html,/id="source-Extra"/);
 assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,3);
 assert.deepEqual(JSON.parse(snap).sequence.steps,s.sequence.steps);
});
