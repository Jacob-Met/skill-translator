// Internal relay only; execute through authorized Renpo route.
// node SCRIPT QUALIFICATION_SCRIPT BASE_REPO CAND_REPO FIXTURE_DIR OUTPUT_DIR [PAIRS=5] [TIMEOUT_MS=15000]
// FIXTURE_DIR comes from final qualification with explicitly authored overlap.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';

const [workerArg,baseArg,candidateArg,fixturesArg,outArg,pairsArg='5',timeoutArg='15000']=process.argv.slice(2);
assert.ok(workerArg&&baseArg&&candidateArg&&fixturesArg&&outArg,'Expected qualification script, baseline repo, candidate repo, final fixture directory, and output directory');
const worker=resolve(workerArg),repos={baseline:resolve(baseArg),candidate:resolve(candidateArg)},fixtures=resolve(fixturesArg),out=resolve(outArg);
const pairs=Number(pairsArg),timeout=Number(timeoutArg);
assert.ok(Number.isInteger(pairs)&&pairs>=1&&pairs<=5);assert.ok(Number.isInteger(timeout)&&timeout>=1000&&timeout<=60000);
await mkdir(out,{recursive:true});
const json=value=>JSON.stringify(value,null,2)+'\n',sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;return n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;};
const ids=['known-6x8-unit8','overlap-6x8-unit8','overlap-6x8-effort8000'];
const receipt={node:process.version,platform:process.platform,arch:process.arch,repos,fixtures,pairs,timeoutMs:timeout,sourceSha256:{},inputSha256:{},samples:[],summaries:[],startedAt:new Date().toISOString(),note:'Fresh child processes; no warmup. Sequential alternating baseline/candidate order. API elapsed includes public validation. CLI wall includes module startup, file parsing, source admission, plan creation, report inspection and serialization. Profiling overhead excluded.'};
for(const [side,repo] of Object.entries(repos)){
  receipt.sourceSha256[side]={};
  for(const path of ['src/cue-budget.mjs','src/cue-questions.mjs','src/cue-sufficiency.mjs','test/cue-budget-fixture.mjs','tools/inspect-cue-budget.mjs'])
    receipt.sourceSha256[side][path]=sha(await readFile(join(repo,path)));
}
const flush=()=>writeFile(join(out,'benchmark.json'),json(receipt));
const outputBytes=new Map();
let failed=false;
for(const id of ids){
  const fixtureBytes=await readFile(join(fixtures,id+'.input.json'),'utf8'),input=JSON.parse(fixtureBytes);
  receipt.inputSha256[id]=sha(fixtureBytes);
  assert.equal(input.study.rows.length,6);assert.equal(input.study.cues.length,8);
  const fixtureFile=join(out,id+'.input.json');await writeFile(fixtureFile,fixtureBytes);
  const source=input.questionPlan?{format:'skill-translator.cue-bundle/v2',study:input.study,questionReadings:input.readings,questionPlan:input.questionPlan}:input.study;
  const sourceFile=join(out,id+'.source.json');await writeFile(sourceFile,json(source));
  for(let pair=0;pair<pairs;pair++){
    const sides=pair%2?['candidate','baseline']:['baseline','candidate'];
    let complete=true;
    for(const mode of ['api','cli'])for(const side of sides){
      const repo=repos[side];
      const args=mode==='api'?[worker,'--worker',repo,fixtureFile,'inspect']:[join(repo,'tools/inspect-cue-budget.mjs'),sourceFile,String(input.budget)];
      const start=performance.now(),p=spawnSync(process.execPath,args,{cwd:repo,encoding:'utf8',timeout,killSignal:'SIGKILL',maxBuffer:32*1024*1024}),wallMs=performance.now()-start;
      const stem=id+'.pair'+pair+'.'+mode+'.'+side;
      await writeFile(join(out,stem+'.stdout'),p.stdout??'');await writeFile(join(out,stem+'.stderr'),p.stderr??'');
      const sample={id,pair,mode,side,order:sides.indexOf(side),wallMs,exitCode:p.status,signal:p.signal,error:p.error?.message??null,completed:p.status===0&&!p.error};
      receipt.samples.push(sample);await flush();
      if(!sample.completed){complete=false;failed=true;continue;}
      let bytes=p.stdout,reportBytes;
      if(mode==='api'){
        const payload=JSON.parse(bytes);Object.assign(sample,{elapsedMs:payload.elapsedMs,cpuUsed:payload.cpuUsed,maxRSSKiB:payload.maxRSSKiB});
        bytes=json(payload.result);reportBytes=bytes;
      }else reportBytes=json(JSON.parse(bytes).report);
      sample.outputSha256=sha(bytes);sample.reportSha256=sha(reportBytes);
      await writeFile(join(out,stem+'.result.json'),bytes);
      const key=id+'.'+mode,previous=outputBytes.get(key);
      if(previous!==undefined){
        sample.exactOutputEquality=bytes===previous;
        if(!sample.exactOutputEquality){failed=true;complete=false;sample.mismatch='Whole output differs across baseline/candidate or fresh repeats';}
      }else{outputBytes.set(key,bytes);sample.exactOutputEquality='reference';}
      const reportKey=id+'.report',previousReport=outputBytes.get(reportKey);
      if(previousReport!==undefined){
        sample.exactReportEquality=reportBytes===previousReport;
        if(!sample.exactReportEquality){failed=true;complete=false;sample.mismatch='Whole report differs across API/CLI or baseline/candidate';}
      }else{outputBytes.set(reportKey,reportBytes);sample.exactReportEquality='reference';}
      await flush();
    }
    if(!complete)break; // Keep failed evidence and avoid repeating an unresolved request.
  }
  for(const mode of ['api','cli']){
    const selected=receipt.samples.filter(s=>s.id===id&&s.mode===mode),summary={id,mode,requestedPairs:pairs,completedPairs:0,sides:{}};
    for(const side of ['baseline','candidate']){
      const samples=selected.filter(s=>s.side===side&&s.completed&&!s.mismatch);
      summary.sides[side]={samples:samples.length,wallMs:samples.length?median(samples.map(s=>s.wallMs)):null};
      if(mode==='api')summary.sides[side].elapsedMs=samples.length?median(samples.map(s=>s.elapsedMs)):null;
    }
    summary.completedPairs=Math.min(summary.sides.baseline.samples,summary.sides.candidate.samples);
    summary.exactEquality=selected.length===pairs*2&&selected.every(s=>s.completed&&!s.mismatch);
    if(summary.exactEquality){
      summary.medianWallSpeedup=summary.sides.baseline.wallMs/summary.sides.candidate.wallMs;
      if(mode==='api')summary.medianApiSpeedup=summary.sides.baseline.elapsedMs/summary.sides.candidate.elapsedMs;
    }
    receipt.summaries.push(summary);
  }
  await flush();
}
receipt.completed=!failed&&receipt.summaries.every(s=>s.exactEquality);receipt.finishedAt=new Date().toISOString();
await flush();process.stdout.write(json(receipt));if(!receipt.completed)process.exitCode=2;
