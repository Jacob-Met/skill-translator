import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {AUDIO_SETTINGS,analyzeAudioActivity,mapAudioActivity} from '../src/audio-activity.mjs';
import {findAudioContrasts} from '../src/audio-contrast.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function receive(levels,{channels=1,frames=null}={}){
 const data=Buffer.alloc(levels.length*160*channels*4);
 levels.forEach((level,w)=>{for(let s=0;s<160;s++)for(let c=0;c<channels;c++)data.writeFloatLE((Array.isArray(level)?level[c]:level)*(s%2?1:-1),(w*160*channels+s*channels+c)*4);});
 const report={format:'skill-translator.audio-activity/v1',source:{name:'independent-contrast.pcm',sha256:'a'.repeat(64),sizeBytes:123},stream:{index:0,timeBase:'1/8000',sampleRate:8000,channels,codec:'pcm_f32le'},decoder:{authored:true},frames:frames||[{pts:'8000',samples:160*levels.length}],pcm:{encoding:'f32le-interleaved',sha256:sha(data),base64:data.toString('base64')},settings:{...AUDIO_SETTINGS}};
 return {report,result:await analyzeAudioActivity(report)};
}
const burst=(background=.002,level=.02)=>Array.from({length:100},(_,i)=>i>=31&&i<39?level:background);
test('quiet original contrast is proposed without changing fixed candidates or source',async()=>{
 const {report,result:r}=await receive(burst());assert.equal(r.events.length,0);assert.equal(r.contrasts.events.length,1);
 const e=r.contrasts.events[0];assert.deepEqual([e.firstWindow,e.lastWindow,e.windowCount],[31,38,8]);assert.equal(e.start.exactSeconds,'81/50');assert.equal(e.end.exactSeconds,'89/50');
 assert.ok(Math.abs(r.contrasts.segments[0].backgroundRms[0]-.002)<1e-9);
 const mapped=mapAudioActivity({...r,events:r.contrasts.events},{sourceSha256:report.source.sha256,mediaOriginSeconds:1,basis:'Authored exact origin'},{...report.source,durationSeconds:2});assert.equal(mapped[0].available,true);assert.ok(Math.abs(mapped[0].startSeconds-.62)<1e-12);
 const reopened=await analyzeAudioActivity(JSON.parse(JSON.stringify(report)));assert.deepEqual(reopened,r);
});
test('independent stereo background finds a quiet-channel change beside sustained loud sound',async()=>{
 const levels=burst().map(v=>[.2,v]);const {result:r}=await receive(levels,{channels:2});assert.equal(r.events.length,1);assert.deepEqual([r.events[0].firstWindow,r.events[0].lastWindow],[0,99]);assert.deepEqual(r.contrasts.events.map(e=>[e.firstWindow,e.lastWindow]),[[31,38]]);
});
test('no silence, stationary sound or one-window event is promoted, and insufficient background is explicit',async()=>{
 for(const levels of [Array(100).fill(0),Array(100).fill(.03),Array.from({length:100},(_,i)=>i===32?.03:.002),burst(.00001,.0002)])assert.equal((await receive(levels)).result.contrasts.events.length,0);
 const r=(await receive(Array(24).fill(.1))).result;assert.equal(r.contrasts.segments[0].status,'insufficient-background');assert.equal(r.events.length,1);assert.equal(r.contrasts.events.length,0);
});
test('complete timestamp gaps partition background and prevent bridging',async()=>{
 const levels=[...Array(25).fill(.001),.02,.02,...Array(25).fill(.01),.08,.08];
 const frames=[{pts:'8000',samples:27*160},{pts:'16000',samples:27*160}];const {result:r}=await receive(levels,{frames});assert.equal(r.gaps.length,1);assert.equal(r.contrasts.events.length,2);assert.deepEqual(r.contrasts.segments.map(s=>Math.round(s.backgroundRms[0]*1000)),[1,10]);
 for(const e of r.contrasts.events)assert.ok(e.end.seconds<=r.gaps[0].start.seconds||e.start.seconds>=r.gaps[0].end.seconds);
});
test('lower-fifth order statistic and hysteresis agree with an independent direct-window oracle',()=>{
 let seed=987314;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
 for(let course=0;course<70;course++){
  const n=25+course,channels=course%2+1,rows=Array.from({length:n},(_,i)=>({index:i,segment:0,start:{seconds:i/50},end:{seconds:(i+1)/50},channelRms:Array.from({length:channels},()=>Math.floor(random()*20)/1000)}));
  const bounds=Array.from({length:channels},(_,c)=>{const sorted=rows.map(r=>r.channelRms[c]).sort((a,b)=>a-b),b=sorted[Math.floor((n-1)/5)];return [Math.max(.001,4*b),Math.max(.0005,2*b)];});
  const expected=[];let start=null;for(let i=0;i<=n;i++){const active=i<n&&rows[i].channelRms.some((v,c)=>v>=bounds[c][start===null?0:1]);if(!active&&start!==null){if(i-start>=2)expected.push([start,i-1]);start=null;}if(start===null&&i<n&&rows[i].channelRms.some((v,c)=>v>=bounds[c][0]))start=i;}
  assert.deepEqual(findAudioContrasts(rows,channels).events.map(e=>[e.firstWindow,e.lastWindow]),expected);
 }
});

test('original partial-only segments remain explicitly unavailable',()=>{const r=findAudioContrasts([],1,2);assert.equal(r.events.length,0);assert.deepEqual(r.segments.map(s=>[s.segment,s.windows,s.status]),[[0,0,'insufficient-background'],[1,0,'insufficient-background']]);});
