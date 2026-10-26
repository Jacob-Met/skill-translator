import {source} from './helpers/numeric-cue-fixture.mjs';
import {importInstrumentTrace} from '../src/instrument-trace.mjs';
import {mapNarrationTime} from '../src/narration-clock.mjs';
import {inspectNumericCueStudy,NUMERIC_CUE_FORMAT} from '../src/numeric-cue-thresholds.mjs';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'skill-instrument-cue-probe-'));
function sourceFor(i){const s=source(),hash=String(i+1).repeat(64);s.clip.sha256=hash;for(const m of s.moments)m.origin.clip.sha256=hash;return s;}
function receive(s,raw,index,momentId,unit){
 const trace=importInstrumentTrace(s,raw);assert.equal(trace.instrument.unit,unit,'No silent unit conversion');
 const clock={anchors:trace.clock.anchors.map(p=>({transcriptSeconds:p.instrumentSeconds,clipSeconds:p.clipSeconds})),verification:{transcriptSeconds:trace.clock.verification.instrumentSeconds,clipSeconds:trace.clock.verification.clipSeconds},toleranceSeconds:trace.clock.toleranceSeconds,basis:trace.clock.basis};
 const sample=trace.samples[index];assert(sample);const mapped=mapNarrationTime(clock,s.clip.durationSeconds,sample.timeSeconds),moment=s.moments.find(m=>m.id===momentId);assert.equal(mapped.extrapolated,false);assert.equal(mapped.seconds,moment.origin.mediaTimeSeconds,'No nearest-sample guess or unrecorded timing correspondence');
 return {trace,index,originalTime:sample.timeSeconds,mappedTime:mapped.seconds,recordedValue:sample.value,calibrationBasis:trace.instrument.calibrationBasis};
}
try{
 const records=[];
 for(const [i,value] of [1,2,5,6,5.3].entries()){
  const s=sourceFor(i),readings={format:'skill-translator.instrument-readings/v1',evidenceClass:'authored-example',instrument:{name:'Authored scalar source',quantity:'clearance',unit:'mm',calibrationBasis:'Authored numeric control, not a measured physical clearance'},samples:[{timeSeconds:100,value},{timeSeconds:100.5,value:value+.2},{timeSeconds:101,value:value-.1}],clock:{anchors:[{instrumentSeconds:100,clipSeconds:1},{instrumentSeconds:104,clipSeconds:9}],verification:{instrumentSeconds:102,clipSeconds:5},toleranceSeconds:.01,basis:'Authored original timing anchors and independent check'},settings:{threshold:0,direction:'at-or-above',maximumGapSeconds:1,minimumSamples:2}};
  await writeFile(join(dir,'source.json'),JSON.stringify(s));await writeFile(join(dir,'readings.json'),JSON.stringify(readings));const cli=spawnSync(process.execPath,['tools/pair-instrument-trace.mjs',join(dir,'source.json'),join(dir,'readings.json')],{encoding:'utf8'});if(cli.error)throw cli.error;assert.equal(cli.status,0,cli.stderr);const raw=JSON.parse(cli.stdout),admitted=receive(s,raw,0,'moment-1','mm');assert.deepEqual(admitted.trace.samples,readings.samples);assert.deepEqual(admitted.trace.clock,readings.clock);records.push(admitted);
 }
 const row=(r,i)=>({decision:i<2?'hold':'change',basis:'Authored contrasting decision',reading:{range:[r.recordedValue-.1,r.recordedValue+.1],momentId:'moment-1',basis:'Retained instrument sample '+r.index+'; separately declared ±0.1mm bound, not inferred from the clock or calibration narrative'}});
 const raw={format:NUMERIC_CUE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples:records.slice(0,4).map(r=>({source:r.trace.source,stepId:'step-1'}))},quantity:'clearance',unit:'mm',basis:'Authored producer receiving control; all original trace records retained separately by this probe',rows:records.slice(0,4).map(row),target:{source:records[4].trace.source,stepId:'step-1',reading:row(records[4],4).reading}};
 const report=inspectNumericCueStudy(raw);assert.deepEqual(report.findings.families[0].threshold,{lower:2.1,upper:4.9,lowerOpen:true,upperOpen:false});assert.equal(report.target.label,'change');
 const first=records[0],badClock=structuredClone(first.trace);badClock.clock.verification.clipSeconds=5.2;assert.throws(()=>receive(first.trace.source,badClock,0,'moment-1','mm'),/clock check/);assert.throws(()=>receive(records[1].trace.source,first.trace,0,'moment-1','mm'),/source changed/);assert.throws(()=>receive(first.trace.source,first.trace,0,'moment-1','N'),/unit/);assert.throws(()=>receive(first.trace.source,first.trace,1,'moment-1','mm'),/nearest-sample/);
 console.log(JSON.stringify({producer:'maintained tools/pair-instrument-trace.mjs -> source-bound instrument-trace/v1',originalRecords:records.length,sourceValueCopiesAvoided:5,threshold:report.findings.families[0].threshold,target:report.target,refusals:['wrong source','failed clock check','unit mismatch','noncoincident original sample'],limits:'Authored input. Exact nominal timestamp coincidence does not prove synchronization or measurement uncertainty. Production must retain trace provenance inside the numeric account and separately declared uncertainty.'}));
}finally{await rm(dir,{recursive:true,force:true});}
