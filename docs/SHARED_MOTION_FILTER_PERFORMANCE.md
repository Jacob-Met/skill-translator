# Shared-motion maximality filtering

The public shared-motion inspector evaluates every admitted point subset with the
existing proper-rotation fit. Its final maximality filter now uses the same
upward Boolean subset transform as the span receiver, replacing repeated scans
through accepted subsets. Fitting, thresholds, enumeration, witnesses, sorting,
source formats and reported work counts are unchanged.

A larger set can pass the fitted maximum-residual test while intermediate sets
fail. The transform therefore propagates acceptance from all supersets before
checking strict supersets. The public regression uses original four-point
coordinates for which pair p0/p1 and the full set pass, while both intervening
triples fail. An isolated negative control that checks only directly accepted
supersets fails this regression by incorrectly retaining p0/p1 as a second group.

## Reproduce the complete-operation comparison

Create a separate baseline checkout at
`3bb52f0f7147dce23c32e64c45f4e6b06e19ac73`, leaving the current checkout intact.
Use Node 20 or later. No application dependencies are required.

```sh
node tools/benchmark-shared-motion-filter.mjs /path/to/baseline/src/shared-motion-groups.mjs
node tools/benchmark-shared-motion-filter.mjs /path/to/baseline/src/shared-motion-groups.mjs --small-batches
node tools/benchmark-shared-motion-filter.mjs /path/to/baseline/src/shared-motion-groups.mjs --small-batches
```

The default comparison measures five fixed complete-inference fixtures with three
warmups and eleven paired measured rounds, alternating execution order. Input
preparation and checking are outside timing. Every invocation must produce a
deeply equal complete result and leave its original input unchanged. The output
includes raw samples, implementation medians and median paired differences.

The small-batches mode measures only the default and reflection fixtures. Each
implementation receives 200 warmups and twenty paired batches of 100 invocations.
Batch elapsed time is divided by 100. The last result of every batch and the
original inputs are checked outside timing. It reports medians, interquartile
ranges and median paired differences. Run the command twice to obtain fresh
processes; do not combine their samples into one unqualified number.

## Observed comparison — 2026-10-27

The initial run used Node 22.23.4 on an otherwise lightly loaded four-core Linux
host. The comparison is between the exact baseline above and this filter change.

| Fixture | Baseline median, ms | Candidate median, ms | Median paired saving, ms |
| --- | ---: | ---: | ---: |
| Dense 12 points, 2 sources, 4,083 accepted subsets | 20.134876 | 11.922967 | 8.211909 |
| Default 6 points, 3 sources | 0.516942 | 0.505661 | -0.006816 |
| Collapsed geometry | 0.179345 | 0.172504 | 0.002050 |
| Reflection | 0.195602 | 0.436444 | -0.140337 |
| Heterogeneous 12 points, 12 sources, no accepted subsets | 13.315387 | 11.271739 | 2.283811 |

The dense case saved about 8.21 ms per complete inference, approximately 41% in
the paired comparison. The apparent gain with no accepted subsets is not
attributed to this filter.

The initial reflection timing prompted a bounded repeat. Two fresh processes,
each using 200 warmups and twenty 100-call paired batches, observed the following
median paired overheads (positive values below mean the candidate took longer):

| Fixture | Process 1 overhead, microseconds | Process 2 overhead, microseconds |
| --- | ---: | ---: |
| Reflection | 2.431 | 1.776 |
| Default six-point groups | 2.080 | 1.125 |

Interquartile ranges overlapped. The repeat supports a small observed overhead
on these small workloads and did not reproduce the initial large reflection
difference. Retain this tradeoff rather than add a threshold tuned to noisy
timings. Benefits depend on the number and structure of accepted groups.

These deterministic synthetic measurements do not establish workload prevalence
or perceived interaction latency. The benchmark measures the complete public
inspector; it does not measure rendering or original-media loading.

## Behavioral validation

The four focused native test files passed: 34 baseline tests and 35 candidate
tests, including the new nonhereditary-fit regression. The default benchmark
also checked all result fields and input immutability on five fixtures.

The unchanged `tools/browser-shared-motion-groups.mjs` course passed seven
scenarios in Chrome 156.0.8078.47 with active Chromium sandbox admission and zero
page errors: ordinary sequence navigation, original-image source inspection,
save/reopen, changed source, invalid-image rejection, capacity/threshold handling,
and narrow-screen keyboard operation. Desktop and 390px output were inspected.
The ordinary `npm start` path served the exact candidate module bytes.

For the complete repository suite, first follow the documented calibration
fixture preparation in [Calibration drafts](CALIBRATION_DRAFTS.md): run
`python test/calibration-translation-native.py` with the qualified native
dependencies, then `npm test`. Use an isolated test copy for the generated
authored PNG controls. An unprepared checkout reports a missing
`test/calibration-fixtures/native-request.json`; the unchanged baseline has
the same prerequisite. Generated controls are not part of this source change.
