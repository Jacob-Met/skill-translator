import {readFile} from 'node:fs/promises';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
import {importCueQuestionPlan} from '../src/cue-questions.mjs';
import {createCueBudgetPlan,importCueBudgetPlan,recordCueBudgetReading,inspectCueBudget,inspectCueEffortBudget,CUE_BUDGET_FORMAT,CUE_EFFORT_BUDGET_FORMAT} from '../src/cue-budget.mjs';

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
  if([CUE_BUDGET_FORMAT,CUE_EFFORT_BUDGET_FORMAT].includes(input.format)){
    plan=importCueBudgetPlan(input,matching?.study??matching);
    if(budgetText!==undefined)plan=createCueBudgetPlan(plan.study,plan.readings,Number(budgetText),plan.questionPlan??null);
  }else{
    if(![CUE_FORMAT,'skill-translator.cue-bundle/v1','skill-translator.cue-bundle/v2'].includes(input.format))throw Error('Unsupported cue study or source-bundle version');
    if(budgetText===undefined)throw Error('Supply a remaining question budget for a new cue study');
    if(input.format==='skill-translator.cue-bundle/v1'&&Object.hasOwn(input,'questionPlan'))throw Error('Cue effort assumptions require the v2 source bundle');
    const weighted=input.format==='skill-translator.cue-bundle/v2';
    if(weighted&&!input.questionPlan)throw Error('The v2 source bundle requires its declared question plan');
    plan=createCueBudgetPlan(input.study??input,input.questionReadings??[],Number(budgetText),weighted?input.questionPlan:null);
    if(matching!==null)plan=importCueBudgetPlan(plan,matching.study??matching);
  }
  if(matching?.format==='skill-translator.cue-bundle/v2'){
    const expected=importCueQuestionPlan(plan.study,matching.questionPlan);
    if(JSON.stringify(plan.questionPlan)!==JSON.stringify(expected))throw Error('Matching source bundle has different declared effort or availability');
  }
  if(reading)plan=recordCueBudgetReading(plan,reading);
  const report=plan.questionPlan?inspectCueEffortBudget(plan.study,plan.readings,plan.budget,plan.questionPlan):inspectCueBudget(plan.study,plan.readings,plan.budget);
  process.stdout.write(JSON.stringify({input:plan,report},null,2)+'\n');
} catch(error) {
  process.stderr.write('Cue-budget inspection refused: '+error.message+'\n');process.exitCode=1;
}
