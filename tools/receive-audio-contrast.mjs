/** Reproducible held-back authored acoustic course; no physical-event labels. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {prepareAudioActivity} from './prepare-audio-activity.mjs';
const out=resolve(process.argv[2]||'');if(!process.argv[2])throw Error('Supply a new output directory');await mkdir(out);
const rate=16000,seconds=2,seed=4298167;let state=seed;
const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/2**32);
function wav(samples){const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(Math.round(v*32767),44+i*2));return b;}
const courses=[];
for(const gain of [.01,.025,.06,.15,.4])for(let repeat=0;repeat<3;repeat++)courses.push({name:'burst-'+gain+'-'+repeat,kind:'burst',gain,start:.4+Math.floor(random()*35)*.02,duration:.12+repeat*.04});
for(const kind of ['stationary-noise','stationary-tone','one-window','below-floor','smooth-rise'])courses.push({name:kind,kind,gain:1,start:.62,duration:kind==='one-window'?.02:.2});
// All labels/specifications are saved before any scoring. The mechanism and
// settings are unchanged between courses, including the adverse smooth rise.
await writeFile(join(out,'specifications.json'),JSON.stringify({seed,rate,seconds,courses},null,2));
const results=[];
for(const spec of courses){
 const samples=Array.from({length:rate*seconds},(_,i)=>{const t=i/rate,noise=(random()*2-1)*.01,carrier=Math.sin(2*Math.PI*713*t),inside=t>=spec.start&&t<spec.start+spec.duration;
  if(spec.kind==='stationary-noise')return noise*3;
  if(spec.kind==='stationary-tone')return .03*carrier;
  if(spec.kind==='smooth-rise')return (.0001+.06*(t/seconds)**2)*carrier;
  if(spec.kind==='below-floor')return .0001*noise+(inside?.0003*carrier:0);
  return spec.gain*(noise+(inside?.3*carrier:0));
 });
 const path=join(out,spec.name+'.wav');await writeFile(path,wav(samples));const {report,analysis}=await prepareAudioActivity(path,0);
 await writeFile(join(out,spec.name+'.json'),JSON.stringify(report));
 const describe=events=>events.map(e=>({start:e.start.seconds,end:e.end.seconds}));
 results.push({spec,source:report.source,fixed:describe(analysis.events),relative:describe(analysis.contrasts.events),background:analysis.contrasts.segments});
}
const hits=(r,key)=>r[key].some(e=>e.start<r.spec.start+r.spec.duration&&e.end>r.spec.start);
const bursts=results.filter(r=>r.spec.kind==='burst');const summary={burstCourses:bursts.length,fixedHits:bursts.filter(r=>hits(r,'fixed')).length,relativeHits:bursts.filter(r=>hits(r,'relative')).length,controls:results.filter(r=>r.spec.kind!=='burst').map(r=>({kind:r.spec.kind,fixed:r.fixed.length,relative:r.relative.length}))};
await writeFile(join(out,'receiving.json'),JSON.stringify({seed,summary,results,limits:'Authored sine/noise originals decoded through maintained FFmpeg producer. This is energy-transition coverage, not real task, physical event, human audibility or learning evidence. Smooth-rise proposals remain a retained limitation.'},null,2));console.log(JSON.stringify(summary));
