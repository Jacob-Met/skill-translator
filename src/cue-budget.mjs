import {importCueStudy} from './cue-sufficiency.mjs';
import {inspectCueQuestions} from './cue-questions.mjs';

export const CUE_BUDGET_FORMAT = 'skill-translator.cue-budget/v1';
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value;
export function createCueBudgetPlan(value, readings = [], budget = 0) {
  const study = importCueStudy(value), report = inspectCueBudget(study, readings, budget);
  return {format:CUE_BUDGET_FORMAT, study, readings:report.readings, budget};
}
export function importCueBudgetPlan(value, matchingStudy = null) {
  if (value?.format !== CUE_BUDGET_FORMAT || !Array.isArray(value.readings))
    throw Error('Open a complete cue-budget plan with explicit readings');
  const plan = createCueBudgetPlan(value.study, value.readings, value.budget);
  if (matchingStudy !== null && JSON.stringify(canonical(plan.study)) !== JSON.stringify(canonical(importCueStudy(matchingStudy))))
    throw Error('The retained demonstrations, cue declarations or decisions changed');
  return plan;
}

export function recordCueBudgetReading(value, reading) {
  const plan = importCueBudgetPlan(value);
  if (plan.budget === 0) throw Error('No question budget remains; explicitly revise the budget before another reading');
  return createCueBudgetPlan(plan.study,[...plan.readings,reading],plan.budget-1);
}

// Unit-cost partial acquisition. Branch admission and unknown compatibility
// belong to the maintained question inspector, not to this budget optimizer.
export function inspectCueBudget(value, readings = [], budget = 0) {
  if (!Number.isSafeInteger(budget) || budget < 0 || budget > 8)
    throw Error('Declare a remaining budget of 0–8 categorical questions');
  const study = importCueStudy(value);
  const initial = inspectCueQuestions(study, readings);
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
    if (!reports.has(id)) reports.set(id, inspectCueQuestions(study, currentReadings));
    return reports.get(id);
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
    if (remaining && best > 1) for (const question of report.questions) {
      const outcomes = question.outcomes.map(branch => score(next(currentReadings,question,branch),remaining-1));
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
    let used = 1;
    while (used <= remaining && score(currentReadings,used) > ceiling) used++;
    if (used > remaining) throw Error('No policy satisfies the retained ambiguity bound');
    const nextCueIds = report.questions.filter(question => question.outcomes.every(branch => {
      const value = score(next(currentReadings,question,branch),used-1);
      return value !== null && value <= ceiling;
    })).map(question => question.cueId);
    return {used,nextCueIds};
  }
  const best = score(initial.readings,budget);
  let result;
  if (best === null) result = {status:initial.status,worstRemainingLabels:null,
    worstQuestionsUsed:0,bestFirstCueIds:[],questions:[]};
  else {
    const selected = policy(initial.readings,budget,best);
    const questions = budget ? initial.questions.map(question => {
      const childReadings = question.outcomes.map(branch => next(initial.readings,question,branch));
      const worst = Math.max(...childReadings.map(readings => score(readings,budget-1)));
      let used = 1;
      while (used < budget && childReadings.some(readings => score(readings,used-1) > worst)) used++;
      return {cueId:question.cueId,worstRemainingLabels:worst,worstQuestionsUsed:used,
        outcomes:question.outcomes.map((branch,i) => {
          const child = policy(childReadings[i],used-1,worst);
          return {answer:branch.answer,kind:branch.kind,exampleIndexes:branch.exampleIndexes,
            retainedLabels:state(childReadings[i]).retainedLabels,
            guaranteedLabelBound:worst,remainingQuestionsUsed:child.used,nextCueIds:child.nextCueIds};
        })};
    }) : [];
    result = {status:best === 1 ? 'one-label-within-budget' : 'partial-discrimination',
      worstRemainingLabels:best,worstQuestionsUsed:selected.used,
      bestFirstCueIds:selected.nextCueIds,questions};
  }
  return {...result, budget, readings: initial.readings,
    compatibleExampleIndexes: initial.compatibleExampleIndexes,
    retainedLabels: initial.retainedLabels,
    completePlanQuestions: initial.worstCaseQuestions,
    statesExamined: scores.size,
    boundary: 'This unit-cost plan minimizes the worst remaining number of distinct declared decision labels, then questions used, within a remaining question budget. It compares retained examples, not probabilities, physical actions or a decision for an unseen task. Unknown decision labels and outside-evidence readings remain unresolved. Synthetic branch categories are analysis only and are never retained observations.'};
}
