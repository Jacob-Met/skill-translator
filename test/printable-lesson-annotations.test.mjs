import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {makePrintableLesson} from '../web/printable-lesson.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createSequence,appendMoment,upsertStep,attachMomentCalibration,removeMomentCalibration,SEQUENCE_FORMAT} from '../src/demonstration-sequence.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFMkAAAAASUVORK5CYII=','base64');
const encoded=png.toString('base64'),hash=createHash('sha256').update(png).digest('hex');
function fixture(){
 const clip={name:'lesson.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:6};
 let s=createSequence(clip,{title:'Offline calibration'});
 for(const [id,time] of [['before',1],['after',3],['unused',5]]){
  const image={name:id+'.png',mimeType:'image/png',widthPx:1,heightPx:1,pixelCoordinates:'browser-oriented',sha256:hash};
  s=appendMoment(s,{id,label:id,visibleState:'Retained state',image,origin:frameOrigin(clip,time+.1,{mediaTime:time,width:1,height:1},image)});
 }
 s=upsertStep(s,{id:'step',beforeMomentId:'before',afterMomentId:'after',title:'Move the guide',intent:'Align',visibleChange:'',sensoryCue:'',recoveryCue:''});
 let task=createCapture(s.moments[2].image,[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],200,100,{title:'Unused frame geometry',provenance:'Teacher supplied dimensions'});
 task=appendCaptureMark(task,{label:'Quarter position',kind:'fraction',sourcePx:{x:.25,y:.75},toleranceMm:1.25,why:'Retain relative position'});
 task=appendCaptureMark(task,{label:'Left clearance',kind:'edge_offset_mm',edge:'left',sourcePx:{x:.25,y:.5},toleranceMm:2.5,why:'Retain clearance'});
 s=attachMomentCalibration(s,'unused',task);
 return {format:'skill-translator.sequence-bundle/v1',sequence:s,frames:s.moments.map(m=>({momentId:m.id,pngBase64:encoded}))};
}
const render=async raw=>(await makePrintableLesson(new Blob([JSON.stringify(raw)],{type:'application/json'}))).text();
const row=(html,id)=>{const match=html.match(new RegExp('<tr\\b[^>]*data-mark-id="'+id+'"[^>]*>([\\s\\S]*?)</tr>'));assert.ok(match,'visible relationship row '+id);return match[1].replace(/<[^>]+>/g,' ');};
test('offline export retains unassigned calibrated state and analytic declared relationships',async()=>{
 const raw=fixture(),before=JSON.stringify(raw),html=await render(raw);
 assert.equal(JSON.stringify(raw),before);
 assert.match(html,/class="calibration-notes"/);assert.match(html,/class="calibration-source-diagram"/);
 assert.match(html,/data-moment-id="unused"/);assert.match(html,/class="calibration-marks"/);
 const fraction=row(html,'authored-1'),edge=row(html,'authored-2');
 for(const text of ['Quarter position','fraction','0.25','0.75','1.25','Retain relative position'])assert.ok(fraction.includes(text),text);
 for(const text of ['Left clearance','edge_offset_mm','left','0.25','0.5','2.5','Retain clearance'])assert.ok(edge.includes(text),text);
 // Unit-square coordinates on a declared 200 mm-wide rectangle: 0.25 * 200 = 50 mm.
 assert.match(edge,/\b50\b/);assert.match(html,/derived/i);
 assert.match(html,/Teacher supplied dimensions/);
 assert.equal(html.split('data:image/png;base64,'+encoded).length-1,3);
 assert.equal((html.match(/<img\b/g)||[]).length,3);
});
test('clearing last task preserves readable v2 lesson without stale annotations',async()=>{
 const raw=fixture();raw.sequence=removeMomentCalibration(raw.sequence,'unused');const html=await render(raw);
 assert.doesNotMatch(html,/<(?:section|div)[^>]*class="calibration-notes"/);
 assert.doesNotMatch(html,/data-mark-id=/);assert.equal((html.match(/<img\b/g)||[]).length,3);
});
test('annotation labels and provenance remain inert in standalone document',async()=>{
 const raw=fixture(),task=raw.sequence.moments[2].calibratedTask;
 task.landmarks[0].label='<script>BAD()</script>';task.landmarks[0].why='<img src=x onerror=BAD()>';
 task.provenance='</style><iframe src="https://evil.invalid">';task.unknowns=['<svg onload=BAD()>'];
 const html=await render(raw);assert.doesNotMatch(html,/<script\b|<iframe\b|<img src=x|<svg onload/i);
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img src=x/);assert.match(html,/&lt;iframe/);
});
test('invalid attached source identity, timeline, tolerance, or sequence version refuses export',async()=>{
 const edits=[
  x=>{x.sequence.moments[2].calibratedTask.source.image.sha256='f'.repeat(64);},
  x=>{x.sequence.moments[2].calibratedTask.source.origin.requestedTimeSeconds=5.2;},
  x=>{x.sequence.moments[2].calibratedTask.landmarks[0].toleranceMm=0;},
  x=>{x.sequence.format=SEQUENCE_FORMAT;}
 ];
 for(const edit of edits){const raw=fixture();edit(raw);await assert.rejects(render(raw));}
});
