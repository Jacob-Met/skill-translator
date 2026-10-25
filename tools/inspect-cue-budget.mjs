import {readFile} from 'node:fs/promises';
import {createCueBudgetPlan,importCueBudgetPlan,recordCueBudgetReading,inspectCueBudget,CUE_BUDGET_FORMAT} from '../src/cue-budget.mjs';

// JSON goes to stdout so callers choose their own destination. No source file
// is modified and no remote service or physical operation is invoked.
async function read(path) {
  const bytes=await readFile(path);
  if(bytes.length>48*1024*1024)throw Error('Keep input within 48 MiB');
  return JSON.parse(bytes.toString('utf8'));
}
try {
  const args=process.argv.slice(2), readIndex=args.indexOf('--read');
  let reading=null;
  if(readIndex!==-1){
    if(readIndex!==args.length-3)throw Error('End the command with --read CUE_ID CATEGORY');
    reading={cueId:args[readIndex+1],value:args[readIndex+2]};args.splice(readIndex);
  }
  const [path,budgetText,matchingPath,...extra]=args;
  if(!path||extra.length)throw Error('Usage: node tools/inspect-cue-budget.mjs INPUT.json [BUDGET] [MATCHING_CUE_STUDY.json] [--read CUE_ID CATEGORY]');
  const raw=await read(path), input=raw.input??raw;
  const matching=matchingPath?await read(matchingPath):null;
  let plan;
  if(input.format===CUE_BUDGET_FORMAT){
    plan=importCueBudgetPlan(input,matching?.study??matching);
    if(budgetText!==undefined)plan=createCueBudgetPlan(plan.study,plan.readings,Number(budgetText));
  }else{
    if(budgetText===undefined)throw Error('Supply a remaining question budget for a new cue study');
    plan=createCueBudgetPlan(input.study??input,input.questionReadings??[],Number(budgetText));
    if(matching!==null)plan=importCueBudgetPlan(plan,matching.study??matching);
  }
  if(reading)plan=recordCueBudgetReading(plan,reading);
  const report=inspectCueBudget(plan.study,plan.readings,plan.budget);
  process.stdout.write(JSON.stringify({input:plan,report},null,2)+'\n');
} catch(error) {
  process.stderr.write('Cue-budget inspection refused: '+error.message+'\n');process.exitCode=1;
}
