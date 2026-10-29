import {importCueStudy} from './cue-sufficiency.mjs';
import {planRepeatedCueReadings} from './cue-repeat-schedule.mjs';
import {inspectReadingWithdrawals} from './cue-reading-withdrawals.mjs';

/** Frozen baseline; canonical cue order is declared, not optimized. */
export function executeFixedReadings(raw, inputs, planning, answers) {
  if (!Array.isArray(answers) || answers.length > 6) throw Error('At most six chronological answers required');
  const study = importCueStudy(raw);
  const plan = planRepeatedCueReadings(study, inputs, planning);
  const schedule = plan.schedule?.flatMap(({cue, label, count}) => Array.from({length: count}, () => ({cue, label}))) ?? null;
  const capacity = Math.min(30 - inputs.events.filter(e => e.kind === 'record').length, 90 - inputs.events.length);
  const executable = schedule !== null && schedule.length <= capacity;
  if (answers.length && !executable) throw Error('No executable fixed schedule for this retained baseline');
  if (answers.length > (schedule?.length ?? 0)) throw Error('Original fixed schedule exhausted; no horizon refill');
  const current = structuredClone(inputs), steps = [];
  const fresh = prefix => { let n = 0; while (current.events.some(e => e.id === prefix+n || e.readingId === prefix+n)) n++; return prefix+n; };
  for (const [position, answer] of answers.entries()) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) || Object.keys(answer).sort().join(',') !== 'cue,provenance,value' || answer.cue !== schedule[position].cue) throw Error('Answer must address the next fixed cue with explicit provenance');
    const before = inspectReadingWithdrawals(study, current);
    if (before.indexes.length === 0) throw Error('Previous answers left the retained evidence; no further scheduled answer admitted');
    const event = {id: fresh('fixed-event-'), readingId: fresh('fixed-reading-'), kind:'record', entry:structuredClone(answer)};
    current.events.push(event);
    const account = inspectReadingWithdrawals(study, current);
    steps.push({position, event:structuredClone(event), indexes:account.indexes, labels:account.labels});
  }
  const account = inspectReadingWithdrawals(study, current);
  const status = !schedule ? plan.status : !executable ? 'insufficient-history-capacity' : account.indexes.length === 0 ? 'outside-evidence' : answers.length === schedule.length ? 'schedule-complete' : 'reading-ready';
  return {plan, status, schedule, next:status === 'reading-ready' ? schedule[answers.length] : null, used:answers.length, remaining:executable ? schedule.length-answers.length : null, remainingCapacity:capacity-answers.length, account, steps, currentInputs:current,
    boundary:'The sequence is fixed from the original baseline in cue order. Answers do not refill or recompute it. Every active answer shares the original total mismatch bound; source unknowns remain compatible. A completed schedule separates represented decisions only if at least one retained example still fits. This does not establish independent observations or physical reliability.'};
}
