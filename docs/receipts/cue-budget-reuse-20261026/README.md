# Cue-budget request-local reuse — qualification

Issue: [#416](https://github.com/Jacob-Met/skill-translator/issues/416). Observed October 26, 2026.

## Outcome

The maintained budget CLI reuses one admitted complete-plan inspector during a report instead of rebuilding the same normalized study and complete-plan memo for each recursive reading state. The complete-plan solver, partial policy, declared effort, unknown branches and report format are unchanged. Returned reusable-session reports are detached from retained state.

The baseline is main commit `17e649cbf6aa3e8b73b6a763be558ea8291ea192` (tree `9e9da8be4ea6fd84785d1e5f9c69cf14f0180a44`). Candidate runtime file hashes are in [source provenance](source-provenance.json) and every receipt. There is no cross-request cache.

## Measured consumer result

Five sequential alternating baseline/candidate pairs ran in fresh Node.js 22.23.4 processes on Linux x64. Each authored capacity case has six retained examples and eight declared cues. The overlap matrix explicitly contains unknown cue categories; the weighted case uses effort budget 8000 and unequal costs. All 60 API/CLI child processes completed; every whole report and every CLI output matched across implementations and repeats. Each of the 30 paired process wall-time comparisons favored the candidate.

| Authored capacity case | Baseline CLI median | Candidate CLI median | Ratio of medians | Baseline API median | Candidate API median |
| --- | ---: | ---: | ---: | ---: | ---: |
| Known categories, unit budget 8 | 191.7 ms | 99.2 ms | 1.93 | 107.1 ms | 35.4 ms |
| Overlapping unknown categories, unit budget 8 | 290.0 ms | 150.9 ms | 1.92 | 127.5 ms | 48.3 ms |
| Same overlap, declared effort budget 8000 | 1072.2 ms | 567.3 ms | 1.89 | 488.1 ms | 304.0 ms |

CLI wall time includes module startup, parsing, admission, source-plan creation, inspection and serialization. API elapsed time includes public admission and inspection. No warmup or profiling overhead is included. [Raw benchmark receipt](benchmark.json) retains every sample, exact source/input/output hashes, CPU usage and API process RSS.

These are descriptive measurements on a shared four-CPU host. Its one-minute load changed from 1.60 to 4.33 during the 18.3-second course; the weighted runs show substantial absolute timing variation. Alternating order and agreement of every pair support the observed improvement, but these figures are not a universal latency guarantee or a measurement of human effort, skill or learning.

Weighted API median peak RSS increased from 99,744 to 104,760 KiB (about 4.9 MiB, 5.0%). Unit-cost cases used less peak memory. The retained request-local memo therefore has a measured memory/latency tradeoff; this is not an across-the-board memory reduction.

## Correctness and receiving

The lead executed all commands through Renpō on coord-2. Retained workers authored implementation, consumer/performance harnesses and independent source/evidence review. Worker assessment is distinct from lead execution.

- The original 24 affected test groups passed on the baseline. All 28 groups passed on the candidate, including four session-lifetime tests. The maintained groups contain independent full-plan and partial-policy oracles.
- [Broader differential comparison](differential.mjs) passed 465 full-output/error comparisons, preserving source inputs.
- [Independent review comparison](independent-parity.mjs) passed 209 exact serialized-report/refusal comparisons, including 47 expected refusals. It separately challenges identical support with different asked cues, identical labels with different support, tied choices, excluded/retained unknown decisions, synthetic-other collisions and unavailable historical readings.
- [Final baseline](baseline-qualification.json) and [candidate qualification](candidate-qualification.json) each passed nine API cases and eight actual CLI controls. Candidate outputs match the exact baseline. The CLI creates a plan, reopens it while ignoring forged derived results, continues a supplied reading with the proper charge, and refuses changed source/conditions with no stdout result.
- The original 18-file transitive source closure was checked against Git blob hashes. The candidate changes two runtime files and adds one test file; the unchanged CLI is exercised through its maintained command.

This is affected-module and maintained CLI qualification. A complete repository `npm test`, browser/server launch, older-browser compatibility and browser adoption are not established by this source closure. Browser cue-budget adoption remains with the existing #273/#281 owner. No deployment or public release is included.

## Review findings retained

The first candidate exposed memo-owned arrays and its retained plan through reusable reports. Independent review found that caller mutation could contaminate later inspections. The accepted version returns detached reports and tests returned-data mutation, later input mutation and recovery after rejected readings.

An initial exploratory fixture used low bits of a conditional random generator and did not strongly establish unknown overlap. Its timings were excluded from acceptance. Final qualification and benchmark use the explicit reviewed six-by-eight matrix; exact fixture bytes are checked before baseline comparison. No timeout or failed comparison occurred in the final accepted course.

## Reproduce from complete source checkouts

Keep an untouched checkout of the baseline and a checkout of the candidate containing this receipt. From the candidate repository root:

```sh
git worktree add --detach ../skill-translator-cue-baseline 17e649cbf6aa3e8b73b6a763be558ea8291ea192
node --test test/cue-questions.test.mjs test/cue-budget.test.mjs test/cue-budget-effort.test.mjs test/cue-question-session.test.mjs
node docs/receipts/cue-budget-reuse-20261026/differential.mjs ../skill-translator-cue-baseline/src/cue-budget.mjs ./src/cue-budget.mjs ../skill-translator-cue-baseline/test/cue-budget-fixture.mjs
node docs/receipts/cue-budget-reuse-20261026/independent-parity.mjs ../skill-translator-cue-baseline .
node docs/receipts/cue-budget-reuse-20261026/qualification.mjs ../skill-translator-cue-baseline /tmp/cue-reuse-baseline - 1 15000
node docs/receipts/cue-budget-reuse-20261026/qualification.mjs . /tmp/cue-reuse-candidate /tmp/cue-reuse-baseline 1 15000
node docs/receipts/cue-budget-reuse-20261026/benchmark.mjs docs/receipts/cue-budget-reuse-20261026/qualification.mjs ../skill-translator-cue-baseline . /tmp/cue-reuse-baseline /tmp/cue-reuse-benchmark 5 15000
```

Use fresh output directories when changing source or fixtures. Each API/CLI child has a 15-second bound. A timeout, refusal mismatch or unequal result remains a failure and cannot produce a speedup claim.

## Recovery identities

Team `hamon-8d9f7f-20261026`; execution owner `node-824445595d172c3ede05a19b3ff70854`; service owner `node-e3ef2400feba3208c45a0de7da66184d`; isolated workspace `/home/ubuntu/hamon-work/hamon-8d9f7f-20261026`.

Accepted command IDs: `hamon-8d9f7f-cue-candidate-tests-01`, `hamon-8d9f7f-cue-differential-01`, `hamon-8d9f7f-cue-independent-parity-01`, `hamon-8d9f7f-cue-final-qualification-01`, and `hamon-8d9f7f-cue-alternating-benchmark-01`, all completed with exit 0. [Execution receipt](execution.json) preserves the command generations and request hashes. Publication and merged receiving are recorded on #416 and its PR.
