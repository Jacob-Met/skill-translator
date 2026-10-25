# Readiness replay graph reuse

Original source: `5ab4fb2084fa00cc71eb2cb94f82c6885e259b28`.
Scope: `src/task-readiness.mjs`, with unchanged admission, journal format,
observations, practice receiving and returned findings. Compile ordered graph
adjacency/descendants once per admitted replay; retain status results between
observational mutations only. Every accepted observation/practice event clears
the status cache. No cache survives the call or enters an exported record.

## Reproduce the experiment

Retain a separate checkout of the original revision, including its imports.
From the candidate checkout run:

```sh
node tools/benchmark-readiness-replay.mjs /absolute/baseline/src/task-readiness.mjs
node --test test/task-readiness.test.mjs test/readiness-replay.test.mjs
```

The benchmark requires an explicit original module path; it never reconstructs
or silently substitutes a baseline. The original implementation is not shipped
inside application source. It compares complete findings and canonical raw
imports before timing, warms both implementations eight times, alternates their
execution order over forty runs, and reports medians. All inputs are authored
from the maintained readiness fixture. The complete 24-step DAG has 276 edges.
The 500-event cases represent repeated judgments after complete observations,
and mixed observation revisions/judgments respectively. Four-step empty and
12-event controls expose ordinary-case overhead.

Local Node v24.22.1 results during shared-workspace activity:

| Case | Original median ms | Candidate median ms | Ratio |
| --- | ---: | ---: | ---: |
| Complete DAG, 500 choices/observations | 106.573 | 2.847 | 37.44× |
| Complete DAG, 500 mixed revisions | 71.608 | 8.432 | 8.49× |
| Four steps, no events | 0.169 | 0.169 | 1.00× |
| Four steps, 12 events | 0.179 | 0.181 | 0.99× |

These absolute times depend on runtime and shared host load; they are not browser
frame-time or user-study measurements. An earlier local run measured 40.20→1.18ms
and 20.44→2.78ms for the large cases, motivating alternating order and explicit
ordinary controls. Tiny ordinary differences are not presented as gains.

## Independent semantic checks

`test/readiness-replay.test.mjs` uses an independent iterative reachability and
topological completion oracle on 50 seeded eight-node DAGs, each with 150 mixed
observations/judgments and shuffled dependency declaration order. It compares
all final steps and every historical choice; inputs must remain unchanged.
Separate diamond tests retain direct blocker ordering and DFS invalidation
witness ordering, retire both completion checks after pass-to-pass revisions,
and preserve an independent branch. Empty history, blocked observation,
returned-object mutation, ignored forged derived fields, bad events and changed
source are covered. The existing practice suite remains responsible for actual
computed-placement receiving, and is part of full integration verification.

Independent reviewer also compared 60 shuffled 12-node DAGs × 140 events directly
against the original implementation, including definition order changes and
cross-call mutation, with exact parity. Integration/full-browser receiving is
recorded separately on the pull request; this receipt does not claim deployment,
physical performance, learning benefit or cloud/model qualification.

## Independent integration receiving

The lead composed the patch on current main
`22e7b2c4e9f7e603190dd424912eec899c6f7c91`; the original readiness module
still has Git blob `e98caddd540f7af71a460b5f39627febe7a4ed33`.
On Linux x86_64 with Node v22.23.4, all 790 native tests passed. The actual
maintained `tools/browser-task-readiness.mjs` and
`tools/browser-readiness-practice.mjs` courses passed in Chrome 156.0.8078.47,
including original authored PNG evidence, reported and computed practice,
complete source-only download/reopen, and desktop/narrow views. Both receipts
recorded no page errors. These are source consumer checks, not deployment.

The same benchmark on that runtime, with forty alternating runs after eight
warmups, produced:

| Case | Original median ms | Candidate median ms | Ratio |
| --- | ---: | ---: | ---: |
| Complete DAG, 500 choices/observations | 27.591 | 0.871 | 31.67× |
| Complete DAG, 500 mixed revisions | 14.098 | 1.815 | 7.77× |
| Four steps, no events | 0.140 | 0.142 | 0.99× |
| Four steps, 12 events | 0.149 | 0.148 | 1.00× |

The incumbent file was retained separately before applying the candidate,
and its imported dependencies came from the same current-main checkout.
The original application source is not included in the delivered patch.
