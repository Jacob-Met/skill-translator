# Single-replay journal append

Baseline: merged cached replay `78a2b24c37cd8bfc93f00ddc64be00c28012d731`;
`src/task-readiness.mjs` Git blob `b17fb05416b0ae18fd8e853e7ac4f2301572cd0d`.
This increment removes the second complete replay in `recordReadiness`, after
the graph/cache improvement. It must not count that earlier improvement again.

The internal replay receives an additional event and processes the complete
original history first. Only at the original/addition boundary does it check
the combined journal capacity and admit the new event. Thus a malformed original
500-event history still reports its original failure before an append-capacity
error. An undefined event remains an event to reject; it is not a no-op sentinel.
No incremental trusted state, cache across calls, schema or history mutation is
introduced. Existing practice admission and canonical raw exports remain intact.
Original raw practice bytes must still pass both existing bounds. At the append
boundary, the retained canonical prior-session sizes are checked in original
order, aggregate before per-session, then used for the new raw event's budget.
This preserves the former second replay even if canonicalization changes size.
Canonical sizes are collected only for append calls, not ordinary import/findings.

## Reproduce

Use a separate checkout of the cached baseline, including its imported modules:

```sh
node tools/benchmark-readiness-append.mjs /absolute/baseline/src/task-readiness.mjs
node --test test/readiness-append.test.mjs test/readiness-replay.test.mjs test/task-readiness.test.mjs
```

The benchmark checks the supplied module's Git blob against the cached baseline
before importing it. Supplying the old pre-cache baseline is refused, rather
than inflating this increment's measured benefit. It verifies complete returned
source/journal equality before eight warmups and forty alternating-order runs.
The baseline module itself is not distributed as application source.

Local Node v24.22.1 medians during shared-workspace activity:

| Appended journal | Cached baseline ms | Single replay ms | Ratio |
| --- | ---: | ---: | ---: |
| Manual, 0 → 1 events | 0.495 | 0.254 | 1.95× |
| Manual, 12 → 13 events | 0.418 | 0.192 | 2.18× |
| Manual, 499 → 500 events | 1.381 | 0.619 | 2.23× |
| Calibrated practice, 49 → 50 events | 13.794 | 6.618 | 2.08× |

Times vary with runtime/host load. These are authored maintained-API controls,
not browser frame-time, physical observation or learning-benefit measurements.

## Semantic receiving

Three named test groups compare the append operation with the original public
composition of canonical import followed by import with an appended event:

- Every prefix up to 500 manual events, including whitespace canonicalization,
  ignored fabricated fields and nonmutation of both raw input and new event.
- Fifty calibrated-practice prefixes spanning unknown, pass and fail; explicit
  downstream observation retirement, mismatched practice-source refusal and
  refusal of a manual observation that attempts to bypass a practice binding.
  Four original sessions with 900000 bytes each of ignored padding plus another
  padded appended session reproduce the raw-versus-canonical budget distinction:
  the append passes after the admitted prior sessions are canonicalized. A raw
  original aggregate over 4 MB still fails; a new session over 1 MB fails at that
  per-session gate after canonical prior-byte accounting.
- Undefined, null, malformed and foreign events at 0/499/500/501 history lengths;
  original malformed-history precedence, changed-source and wrong-format errors.

Previous replay-oracle/readiness tests also pass locally. Current full-suite and
browser receiving, independent review and merge evidence belong on issue #260
and its pull request; this receipt alone does not claim those gates or deployment.

## Independent integration receiving

On the same merged baseline, the lead ran all 793 native tests with Node
v22.23.4 on Linux x86_64. The actual maintained Readiness Practice browser
course passed in Chrome 156, importing empty, failed and passing raw practice,
retaining journal evidence and downloading/reopening its original source.
Independent MECHANISM and Experimental Earth reviewers inspected both phases
of size admission and ran the three new groups without a blocking finding.

The explicit cached-baseline benchmark on that runtime reported these medians:

| Appended journal | Cached baseline ms | Single replay ms | Ratio |
| --- | ---: | ---: | ---: |
| Manual, 0 → 1 events | 0.350 | 0.174 | 2.01× |
| Manual, 12 → 13 events | 0.316 | 0.165 | 1.92× |
| Manual, 499 → 500 events | 0.892 | 0.559 | 1.60× |
| Calibrated practice, 49 → 50 events | 7.856 | 4.037 | 1.95× |

This comparison includes only the append improvement over the cached baseline.
Published/merged head receiving is recorded on the PR; no deployment is implied.
