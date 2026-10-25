import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectCueQuestions,inspectCueEffort,importCueQuestionPlan} from './cue-questions.mjs';

export const CUE_BUDGET_FORMAT = 'skill-translator.cue-budget/v1';
export const CUE_EFFORT_BUDGET_FORMAT = 'skill-translator.cue-budget/v2';
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value;
export function createCueBudgetPlan(value, readings = [], budget = 0, rawQuestionPlan = null) {
  const study = importCueStudy(value);
  const questionPlan=rawQuestionPlan===null?null:importCueQuestionPlan(study,rawQuestionPlan);
  const report=questionPlan?inspectCueEffortBudget(study,readings,budget,questionPlan):inspectCueBudget(study,readings,budget);
  return {format:questionPlan?CUE_EFFORT_BUDGET_FORMAT:CUE_BUDGET_FORMAT,study,readings:report.readings,budget,...(questionPlan?{questionPlan}:{})};
}
export function importCueBudgetPlan(value, matchingStudy = null) {
  if (![CUE_BUDGET_FORMAT,CUE_EFFORT_BUDGET_FORMAT].includes(value?.format) || !Array.isArray(value.readings))
    throw Error('Open a complete cue-budget plan with explicit readings');
  if(value.format===CUE_BUDGET_FORMAT&&Object.hasOwn(value,'questionPlan'))throw Error('Declared effort requires the v2 cue-budget plan');
  const declared=value.format===CUE_EFFORT_BUDGET_FORMAT?importCueQuestionPlan(value.study,value.questionPlan):null;
  const plan=createCueBudgetPlan(value.study,value.readings,value.budget,declared);
  if (matchingStudy !== null && JSON.stringify(canonical(plan.study)) !== JSON.stringify(canonical(importCueStudy(matchingStudy))))
    throw Error('The retained demonstrations, cue declarations or decisions changed');
  return plan;
}

export function recordCueBudgetReading(value, reading) {
  const plan = importCueBudgetPlan(value);
  const declaration=plan.questionPlan?.cues.find(cue=>cue.cueId===reading?.cueId);
  if(plan.questionPlan&&(!declaration||!declaration.available))throw Error('Choose an available declared cue for a new reading');
  const cost=declaration?.effort??1;
  if (plan.budget < cost) throw Error('Insufficient question budget remains; explicitly revise the budget before another reading');
  return createCueBudgetPlan(plan.study,[...plan.readings,reading],plan.budget-cost,plan.questionPlan??null);
}

// Unit-cost partial acquisition. Branch admission and unknown compatibility
// belong to the maintained question inspector, not to this budget optimizer.
export function inspectCueBudget(value, readings = [], budget = 0) {
  if (!Number.isSafeInteger(budget) || budget < 0 || budget > 8)
    throw Error('Declare a remaining budget of 0–8 categorical questions');
  return inspectBudgetCore(value,readings,budget,null);
}

// Admission and complete-effort analysis belong to the maintained #257 owner.
export function inspectCueEffortBudget(value,readings,budget,rawQuestionPlan) {
  if (!Number.isSafeInteger(budget) || budget < 0 || budget > 8000)
    throw Error('Declare an integer remaining effort budget from 0 to 8000');
  return inspectBudgetCore(value,readings,budget,importCueQuestionPlan(value,rawQuestionPlan));
}

function inspectBudgetCore(value,readings,budget,questionPlan) {
  const study=importCueStudy(value),weighted=questionPlan!==null;
  const costs=new Map(study.cues.map(cue=>{const declaration=questionPlan?.cues.find(c=>c.cueId===cue.id);return [cue.id,weighted?(declaration.available?declaration.effort:null):1];}));
  const inspect=currentReadings=>weighted?inspectCueEffort(study,currentReadings,questionPlan):inspectCueQuestions(study,currentReadings);
  const initial=inspect(readings);
  const scores = new Map(), reports = new Map();
  const key = currentReadings => JSON.stringify(currentReadings.map(r => [r.cueId,r.value]).sort());
  const other = cueId => {
    const index = study.cues.findIndex(c => c.id === cueId);
    let answer = 'Unrecorded analysis category';
    while (study.rows.some(row => row.values[index] === answer)) answer += '_';
    return answer;
  };
  function state(currentReadings) {
    const id = key(currentReadings);
    if (!reports.has(id)) reports.set(id, inspect(currentReadings));
    return reports.get(id);
  }
  const affordable = (report,remaining) => report.questions.filter(question=>costs.get(question.cueId)!==null&&costs.get(question.cueId)<=remaining);
  const thresholdCache=new Map();
  function thresholds(currentReadings,remaining) {
    const asked=new Set(currentReadings.map(r=>r.cueId));
    const remainingCues=study.cues.filter(c=>!asked.has(c.id)&&costs.get(c.id)!==null);
    const cacheKey=remainingCues.map(c=>c.id).join('|');
    if(!thresholdCache.has(cacheKey)){
      let sums=new Set([0]);
      for(const cue of remainingCues)for(const sum of [...sums])sums.add(sum+costs.get(cue.id));
      thresholdCache.set(cacheKey,[...sums].sort((a,b)=>a-b));
    }
    return thresholdCache.get(cacheKey).filter(value=>value<=remaining);
  }
  function next(currentReadings, question, branch) {
    return [...currentReadings, {cueId:question.cueId,
      value:branch.kind === 'other-category' ? other(question.cueId) : branch.answer}];
  }
  function score(currentReadings, remaining) {
    const report = state(currentReadings);
    const id = JSON.stringify([remaining, report.compatibleExampleIndexes,
      currentReadings.map(r => r.cueId).sort()]);
    if (scores.has(id)) return scores.get(id);
    if (!report.retainedLabels.length || report.retainedLabels.includes(null)) return null;
    let best = report.retainedLabels.length;
    if (remaining && best > 1) for (const question of affordable(report,remaining)) {
      const outcomes = question.outcomes.map(branch => score(next(currentReadings,question,branch),remaining-costs.get(question.cueId)));
      if (outcomes.every(value => value !== null)) best = Math.min(best,Math.max(...outcomes));
    }
    scores.set(id,best); return best;
  }
  // Reconstruct under the parent's allowed ambiguity, not the child's own
  // smaller optimum. Otherwise a dominated branch can waste questions while
  // another branch already fixes the overall worst remaining label count.
  function policy(currentReadings, remaining, ceiling) {
    const report = state(currentReadings);
    if (report.retainedLabels.length <= ceiling) return {used:0,nextCueIds:[]};
    const used=thresholds(currentReadings,remaining).find(effort=>score(currentReadings,effort)<=ceiling);
    if (used === undefined) throw Error('No policy satisfies the retained ambiguity bound');
    const nextCueIds = affordable(report,used).filter(question => question.outcomes.every(branch => {
      const value = score(next(currentReadings,question,branch),used-costs.get(question.cueId));
      return value !== null && value <= ceiling;
    })).map(question => question.cueId);
    return {used,nextCueIds};
  }
  const best = score(initial.readings,budget);
  let result;
  if (best === null) result = {status:initial.status,worstRemainingLabels:null,
    [weighted?'worstEffort':'worstQuestionsUsed']:0,bestFirstCueIds:[],questions:[]};
  else {
    const selected = policy(initial.readings,budget,best);
    const questions = budget ? affordable(initial,budget).map(question => {
      const cost=costs.get(question.cueId);
      const childReadings = question.outcomes.map(branch => next(initial.readings,question,branch));
      const worst = Math.max(...childReadings.map(readings => score(readings,budget-cost)));
      const used=thresholds(childReadings[0],budget-cost).map(value=>value+cost).find(effort=>childReadings.every(readings=>score(readings,effort-cost)<=worst));
      return {cueId:question.cueId,worstRemainingLabels:worst,[weighted?'worstEffort':'worstQuestionsUsed']:used,
        outcomes:question.outcomes.map((branch,i) => {
          const child = policy(childReadings[i],used-cost,worst);
          return {answer:branch.answer,kind:branch.kind,exampleIndexes:branch.exampleIndexes,
            retainedLabels:state(childReadings[i]).retainedLabels,
            guaranteedLabelBound:worst,[weighted?'remainingEffort':'remainingQuestionsUsed']:child.used,nextCueIds:child.nextCueIds};
        })};
    }) : [];
    result = {status:best === 1 ? 'one-label-within-budget' : 'partial-discrimination',
      worstRemainingLabels:best,[weighted?'worstEffort':'worstQuestionsUsed']:selected.used,
      bestFirstCueIds:selected.nextCueIds,questions};
  }
  return {...result, budget, readings: initial.readings,
    compatibleExampleIndexes: initial.compatibleExampleIndexes,
    retainedLabels: initial.retainedLabels,
    ...(weighted?{completePlanEffort:initial.worstCaseEffort,questionPlan,unavailableCueIds:initial.unavailableCueIds}:{completePlanQuestions:initial.worstCaseQuestions}),
    statesExamined: scores.size,
    ...(weighted?{attainableThresholds:thresholds(initial.readings,budget).length}:{}),
    boundary: (weighted?'Effort and availability are supplied declarations. ':'Each question costs one unit. ')+'This partial plan minimizes the worst remaining number of distinct declared decision labels, then declared acquisition cost, within a remaining budget. It compares retained examples, not probabilities, physical actions or a decision for an unseen task. Unknown decision labels and outside-evidence readings remain unresolved. Synthetic branch categories are analysis only and are never retained observations.'};
}
