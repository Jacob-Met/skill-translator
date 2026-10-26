// Internal relay script. Execute only through the lead's authorized Renpo route.
// node SCRIPT REPO OUTPUT_DIR [REFERENCE_DIR|-] [REPEATS=1] [TIMEOUT_MS=15000] [PROFILE_CASE_ID]
// Every timed API request runs in a fresh child and includes public admission.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';

const self=fileURLToPath(import.meta.url);
const sha=text=>createHash('sha256').update(text).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
if(process.argv[2]==='--worker'){
  const [, , ,repo,file,mode]=process.argv;
  const api=await import(pathToFileURL(join(repo,'src/cue-budget.mjs')));
  const input=JSON.parse(await readFile(file,'utf8')),before=JSON.stringify(input);
  const start=performance.now(),cpu=process.cpuUsage();
  let result;
  if(mode==='workflow'){
    const plan=api.createCueBudgetPlan(input.study,input.readings,input.budget,input.questionPlan??null);
    result={input:plan,report:plan.questionPlan
      ?api.inspectCueEffortBudget(plan.study,plan.readings,plan.budget,plan.questionPlan)
      :api.inspectCueBudget(plan.study,plan.readings,plan.budget)};
  }else result=input.questionPlan
    ?api.inspectCueEffortBudget(input.study,input.readings,input.budget,input.questionPlan)
    :api.inspectCueBudget(input.study,input.readings,input.budget);
  const elapsedMs=performance.now()-start,cpuUsed=process.cpuUsage(cpu);
  assert.equal(JSON.stringify(input),before,'public request mutated original declarations');
  process.stdout.write(JSON.stringify({elapsedMs,cpuUsed,maxRSSKiB:process.resourceUsage().maxRSS,result})+'\n');
}else{
  const [repoArg,outArg,referenceArg='-',repeatsArg='1',timeoutArg='15000',profileCaseId]=process.argv.slice(2);
  assert.ok(repoArg&&outArg,'Usage: SCRIPT REPO OUTPUT_DIR [REFERENCE_DIR|-] [REPEATS=1] [TIMEOUT_MS=15000]');
  const repo=resolve(repoArg),out=resolve(outArg),reference=referenceArg==='-'?null:resolve(referenceArg);
  const repeats=Number(repeatsArg),timeout=Number(timeoutArg);
  assert.ok(Number.isInteger(repeats)&&repeats>=1&&repeats<=5);
  assert.ok(Number.isInteger(timeout)&&timeout>=1000&&timeout<=60000);
  await mkdir(out,{recursive:true});
  const {study}=await import(pathToFileURL(join(repo,'test/cue-budget-fixture.mjs')));
  const profile=costs=>({format:'skill-translator.cue-question-plan/v1',cues:costs.map((cost,i)=>({cueId:'c'+i,available:cost!==null,effort:cost??1,basis:'Authored qualification conditions'}))});
  const labels=['A','B','C','D','E','F'];
  const known=Array.from({length:6},(_,r)=>Array.from({length:8},(_,c)=>String((r>>(c%3))&1)));
  // Independently authored/reviewed full-capacity overlapping unknowns. Do not
  // generate null incidence from conditional low-bit draws of an LCG.
  const unknown=[
    ['a','0',null,'x','u','0',null,'L'],
    ['a',null,'1','y','v','1','p','R'],
    ['b','1','0','x',null,'0','q','L'],
    ['b','0','1',null,'u','1','p','R'],
    [null,'1','0','y','v',null,'q','L'],
    ['c','2','2','z','w','2','r',null],
  ];
  const grid=study([['0','0'],['0','1'],['1','0'],['1','1']],['A','B','C','D']);
  const cases=[
    {id:'known-6x8-unit8',study:study(known,labels),readings:[],budget:8},
    {id:'overlap-6x8-unit8',study:study(unknown,labels),readings:[],budget:8},
    {id:'overlap-6x8-effort8000',study:study(unknown,labels),readings:[],budget:8000,questionPlan:profile([997,503,251,127,61,29,13,7])},
    {id:'changed-effort-partial',study:study(unknown,labels),readings:[],budget:19,questionPlan:profile([7,29,3,13,2,17,5,11])},
    {id:'unavailable-historical',study:study(unknown,labels),readings:[{cueId:'c0',value:'a'}],budget:8000,questionPlan:profile([null,503,251,null,61,29,13,7])},
    {id:'unknown-decision',study:study(unknown,[null,...labels.slice(1)]),readings:[],budget:8000,questionPlan:profile([997,503,251,127,61,29,13,7])},
    {id:'outside-evidence',study:study(known,labels),readings:[{cueId:'c0',value:'novel'}],budget:8},
    {id:'unit-grid',study:grid,readings:[],budget:1,workflow:true},
    {id:'effort-grid',study:grid,readings:[],budget:4,questionPlan:profile([2,3]),workflow:true},
  ];
  const receipt={node:process.version,platform:process.platform,arch:process.arch,repo,repeats,timeoutMs:timeout,reference,sourceSha256:{},caseInputSha256:{},checks:[],startedAt:new Date().toISOString()};
  for(const path of ['src/cue-budget.mjs','src/cue-questions.mjs','src/cue-sufficiency.mjs','test/cue-budget-fixture.mjs','tools/inspect-cue-budget.mjs'])
    receipt.sourceSha256[path]=sha(await readFile(join(repo,path)));
  const flush=()=>writeFile(join(out,'receipt.json'),json(receipt));
  const run=(args)=>{
    const start=performance.now();
    const p=spawnSync(process.execPath,args,{cwd:repo,encoding:'utf8',timeout,killSignal:'SIGKILL',maxBuffer:32*1024*1024});
    return {...p,wallMs:performance.now()-start};
  };
  const compareReference=async(name,bytes)=>{
    if(!reference)return {referenceStatus:'not-requested'};
    let previous;
    try{previous=await readFile(join(reference,name),'utf8');}catch(error){if(error.code==='ENOENT')return {referenceStatus:'missing-no-parity-claim'};throw error;}
    assert.equal(bytes,previous,'Exact raw output differs from baseline: '+name);
    return {referenceStatus:'exact-raw-equality',referenceSha256:sha(previous)};
  };
  const capture=async(name,p,expectStatus=0)=>{
    await writeFile(join(out,name+'.stdout'),p.stdout??'');
    await writeFile(join(out,name+'.stderr'),p.stderr??'');
    const check={name,wallMs:p.wallMs,exitCode:p.status,signal:p.signal,error:p.error?.message??null,completed:p.status===expectStatus&&!p.error};
    receipt.checks.push(check);await flush();return check;
  };
  for(const c of cases){
    const inputFile=join(out,c.id+'.input.json'),inputBytes=json(c);
    await writeFile(inputFile,inputBytes);receipt.caseInputSha256[c.id]=sha(inputBytes);
    if(reference){
      let referenceInput;
      try{referenceInput=await readFile(join(reference,c.id+'.input.json'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
      if(referenceInput!==undefined)assert.equal(inputBytes,referenceInput,'Baseline and candidate fixture inputs differ: '+c.id);
    }
    let resultBytes;
    for(let repetition=0;repetition<repeats;repetition++){
      const p=run([self,'--worker',repo,inputFile,c.workflow?'workflow':'inspect']);
      const check=await capture(c.id+'.api.'+repetition,p);
      if(!check.completed)break;
      const payload=JSON.parse(p.stdout);Object.assign(check,{elapsedMs:payload.elapsedMs,cpuUsed:payload.cpuUsed,maxRSSKiB:payload.maxRSSKiB});
      const bytes=json(payload.result);
      if(resultBytes!==undefined)assert.equal(bytes,resultBytes,'Repeated request output changed');
      resultBytes=bytes;
      if(repetition===0){await writeFile(join(out,c.id+'.result.json'),bytes);Object.assign(check,{outputSha256:sha(bytes)},await compareReference(c.id+'.result.json',bytes));}
      await flush();
    }
    if(!c.workflow||!resultBytes)continue;
    const sourceFile=join(out,c.id+'.source.json');
    const raw=c.questionPlan?{format:'skill-translator.cue-bundle/v2',study:c.study,questionReadings:c.readings,questionPlan:c.questionPlan}:c.study;
    await writeFile(sourceFile,json(raw));
    const cli=join(repo,'tools/inspect-cue-budget.mjs');
    const first=run([cli,sourceFile,String(c.budget)]),firstCheck=await capture(c.id+'.cli-create',first);
    if(!firstCheck.completed)continue;
    assert.equal(first.stdout,resultBytes,'Actual CLI bytes differ from complete public API workflow');
    Object.assign(firstCheck,{apiParity:'exact-raw-equality'},await compareReference(c.id+'.cli-create.stdout',first.stdout));
    const forged=JSON.parse(first.stdout);forged.report={status:'fake-success',worstRemainingLabels:0};
    const forgedFile=join(out,c.id+'.forged-derived.json');await writeFile(forgedFile,json(forged));
    const reopen=run([cli,forgedFile]),reopenCheck=await capture(c.id+'.cli-reopen',reopen);
    if(reopenCheck.completed)assert.equal(reopen.stdout,first.stdout,'Saved plan failed to recompute forged derived result');
    const continued=run([cli,forgedFile,'--read','c0','1']),continueCheck=await capture(c.id+'.cli-continue',continued);
    if(continueCheck.completed){
      const value=JSON.parse(continued.stdout);assert.equal(value.input.budget,c.budget-(c.questionPlan?2:1));
      assert.deepEqual(value.report.compatibleExampleIndexes,[2,3]);
      Object.assign(continueCheck,await compareReference(c.id+'.cli-continue.stdout',continued.stdout));
    }
    const changed=structuredClone(raw);
    if(c.questionPlan){changed.questionPlan=profile([3,2]);}else changed.rows[0].decision='changed';
    const changedFile=join(out,c.id+'.changed-source.json');await writeFile(changedFile,json(changed));
    const refused=run([cli,forgedFile,String(c.budget),changedFile]),refuseCheck=await capture(c.id+'.cli-refuse-changed',refused,1);
    if(refuseCheck.completed){assert.equal(refused.stdout,'');assert.match(refused.stderr,c.questionPlan?/different declared/:/changed/);}
    await flush();
  }
  if(profileCaseId){
    const selected=cases.find(c=>c.id===profileCaseId);assert.ok(selected,'Unknown profile case');
    const p=run(['--cpu-prof','--cpu-prof-dir='+out,'--cpu-prof-name='+profileCaseId+'.cpuprofile',self,'--worker',repo,join(out,profileCaseId+'.input.json'),selected.workflow?'workflow':'inspect']);
    const check=await capture(profileCaseId+'.profile-overhead-excluded',p);
    if(check.completed)check.profileFile=join(out,profileCaseId+'.cpuprofile');
  }
  receipt.finishedAt=new Date().toISOString();
  receipt.completed=receipt.checks.every(c=>c.completed);
  const compared=receipt.checks.filter(c=>c.name.includes('.api.0')&&c.completed);
  receipt.exactReferenceParity=reference?compared.length===cases.length&&compared.every(c=>c.referenceStatus==='exact-raw-equality'):null;
  await flush();process.stdout.write(json(receipt));
  if(!receipt.completed)process.exitCode=2;
}
