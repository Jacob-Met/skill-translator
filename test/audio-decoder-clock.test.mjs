import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {createHash} from 'node:crypto';
import {OPUS_CLOCK_PROFILE,replayOpusClock,verifyOpusClock} from '../src/audio-decoder-clock.mjs';
import {prepareAudioActivity} from '../tools/prepare-audio-activity.mjs';import {prepareOriginalAudio} from '../native/audio-intake.mjs';import {analyzeAudioActivity} from '../src/audio-activity.mjs';
const exec=promisify(execFile),hash=b=>createHash('sha256').update(b).digest('hex'),directory=await mkdtemp(join(tmpdir(),'skill-clock-test-'));
test.after(()=>rm(directory,{recursive:true,force:true}));
const rate=48000,count=rate*2,wav=Buffer.alloc(44+count*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
for(let i=0;i<count;i++)wav.writeInt16LE(i>rate*.8&&i<rate*1.1?Math.round(600*Math.sin(2*Math.PI*443*i/rate)):0,44+i*2);
const original=join(directory,'original.wav'),opus=join(directory,'original.webm'),gap=join(directory,'gap.webm');await writeFile(original,wav);
await exec('ffmpeg',['-v','error','-i',original,'-c:a','libopus',opus]);await exec('ffmpeg',['-v','error','-i',original,'-af',"aselect=not(between(t\\,0.4\\,0.7))",'-c:a','libopus',gap]);
let accepted;
test('strict baseline still refuses coarse Opus; explicit profile retains complete original and separate ledgers',async()=>{
 await assert.rejects(prepareAudioActivity(opus,0),/half a sample/);
 accepted=(await prepareAudioActivity(opus,0,{clockProfile:OPUS_CLOCK_PROFILE,selfContained:true})).report;
 assert.equal(accepted.source.sha256,hash(await readFile(opus)));assert.equal(accepted.frames[1].pts,'14');assert.equal(accepted.decoder.filterFrames[1].pts,'648');
 const analysis=await analyzeAudioActivity(accepted);assert.equal(analysis.clock.originalTickSeconds,.001);assert.ok(analysis.contrasts.events.length>0);assert.equal(analysis.gaps[0].start.exactSeconds,'27/2000');assert.equal(analysis.gaps[0].end.exactSeconds,'7/500');
 assert.deepEqual(accepted.frames,accepted.decoder.originalProbe.frames.map(f=>({pts:String(f.pts),samples:f.nb_samples})));
});
test('raw replay verifies every ledger position: one-sample shift, missing frame, wrong count and source rewrite refuse',async()=>{
 for(const mutate of [r=>r.decoder.filterFrames[3].pts=String(BigInt(r.decoder.filterFrames[3].pts)+1n),r=>r.decoder.filterFrames.pop(),r=>r.decoder.filterFrames[3].samples++,r=>r.frames[3].pts=String(BigInt(r.frames[3].pts)+1n),r=>r.decoder.originalProbe.frames[3].pts++,r=>r.decoder.ffmpeg='ffmpeg version 7.0',r=>r.stream.index++,r=>r.decoder.originalProbe.streams[0].codec_type='video',r=>r.stream.codec='aac',r=>r.stream.timeBase='1/48000']){
  const changed=structuredClone(accepted);mutate(changed);await assert.rejects(analyzeAudioActivity(changed));
 }
 const replay=await analyzeAudioActivity(JSON.parse(JSON.stringify(accepted)));assert.equal(replay.clock.replayedFrames,accepted.frames.length);
});
test('true original timestamp gap stays in source coverage and triggers separately recorded decoder reset',async()=>{
 const {report,analysis}=await prepareAudioActivity(gap,0,{clockProfile:OPUS_CLOCK_PROFILE});assert.ok(analysis.clock.gapResetFrames.length>0);
 assert.ok(analysis.gaps.some(g=>g.end.seconds-g.start.seconds>.25));
 for(const index of analysis.clock.gapResetFrames)assert.equal(BigInt(report.decoder.filterFrames[index].pts),BigInt(report.frames[index].pts)*48n);
});
test('native original input uses explicitly selected profile; strict and unsupported choices refuse',async()=>{
 const bytes=await readFile(opus),options={name:'original.webm',sha256:hash(bytes)};
 await assert.rejects(prepareOriginalAudio(bytes,options),/half a sample/);await assert.rejects(prepareOriginalAudio(bytes,{...options,clockProfile:'anything'}),/supported/);
 const result=await prepareOriginalAudio(bytes,{...options,clockProfile:OPUS_CLOCK_PROFILE});assert.equal(result.status,'prepared');assert.equal(result.report.source.sha256,hash(bytes));assert.equal((await analyzeAudioActivity(result.report)).clock.profile,OPUS_CLOCK_PROFILE);
 const baseline=await prepareAudioActivity(original,0);assert.equal(baseline.report.decoder.clockProfile,undefined);assert.equal(baseline.analysis.clock,null);
});
test('independent integer expected courses cover negative origin, clip interval and forward gap reset',()=>{
 // Hand-computed1ms ticks: first end-24 lies inside [-24,24]; later gap resets.
 assert.deepEqual(replayOpusClock([{pts:'-14',samples:648},{pts:'0',samples:960},{pts:'20',samples:960},{pts:'340',samples:960}]).map(f=>[f.pts,f.gapReset]),[['-672',false],['-24',false],['936',false],['16320',true]]);
 assert.throws(()=>replayOpusClock([{pts:'0.5',samples:960}]));assert.throws(()=>replayOpusClock([{pts:'0',samples:0}]));
});
