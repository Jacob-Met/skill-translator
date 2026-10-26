# One complete task from separately demonstrated relationships

Open **Compose supported relationships for several marks** from the existing
raw-rule proposal page, or visit `/raw-task-proposals`.

Choose 1–12 saved Demonstration Sources accounts or one-mark raw-rule proposals.
They must refer to different marks in the same complete original task. This
includes its original pixel annotations, rules, tolerances and source context;
a similar title or matching mark labels is insufficient. A duplicate mark is
refused: first combine its observations in Demonstration Sources so all evidence
for that mark is considered together. The complete composition is limited to
2 MB and never silently drops an account.

The maintained `inspectRawRuleProposals` mechanism independently compares every
mark's original observations against proportional position and fixed clearance
from the four physical edges. The original rectangular x/y bounds are preserved.
A uniquely compatible relationship supplies a proposal for that mark. Ambiguous,
contradicted and untested accounts remain visible and keep the original authored
rule. Marks without an account also keep their original rule and are labeled
unexamined. These unchanged rules are not presented as evidence-supported.

Enter one target width and height for the composed task. Each account's original
target remains in its source record, but the composition uses the explicitly
shown task dimensions. Inspect the original and proposed targets together,
select a mark to inspect all five candidates and every original reading, and
reattach its original PNG/JPEG through the existing exact-image receiver.
The same digest, dimensions and orientation checks apply as in Demonstration
Sources. Geometry without paired pixels is labeled accordingly.

Accept the complete proposed setup explicitly to open the existing complete-task
practice. All supported changes are present together; unresolved and unexamined
marks remain authored. No previous placements are copied. A task that cannot
fit the target or has no unique proposal cannot open practice. A size draft
retires acceptance and disables saving/practice until it is compared. A newer
edit retires a pending older import; invalid replacements preserve accepted work.

**Save complete task and original evidence** retains only the original raw
accounts and the declared target. Reopening recomputes every finding and target;
saved derived verdicts or proposed sources are not authoritative. Save this file
to keep the full supporting annotations. The practice source and practice session
are useful separate exports, but do not replace the complete evidence account.

## What changed relative to the one-mark workflow

The original producer returns a source with one inferred mark and every other
mark unchanged. Opening a second independent proposal does not compose the first
change. This receiver removes the need to manually merge inferred source files.
For an authored three-mark task, it composes fixed-left, fixed-top and
proportional proposals into targets `(20,44.625)`, `(95.55,25)` and `(136.5,59.5)`
mm on a new 273 × 119 mm workpiece. The maintained practice evaluator accepts
those actual entered placements under the composed task and rejects them under
the original task. One-mark target output and each candidate's complete support
match the maintained single-mark mechanism.

This is software receiving evidence, not a learning study or physical skill
qualification. Independently compatible point rules do not establish jointly
feasible physical operations, tool access, collision avoidance, causal necessity
or interaction between marks. Supplied calibration, correspondence and bounds
remain assumptions. The five-rule family can miss the actual relationship.

## Verification

`node --test --test-isolation=none test/raw-task-proposals.test.mjs` exercises
mixed-rule practice, single-mark parity, ambiguity/no-evidence/no-fit controls,
strict common-source and distinct-mark admission, immutable raw replay,
rectangular bounds, permutation parity, capacity and nonfitting targets.

The actual receiving course uses existing Playwright and Chrome without a
dependency install:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_BINARY=/path/to/chrome \
QA_OUTPUT=/path/to/receipts \
node tools/browser-raw-task-proposals.mjs
```

Set `QA_TMP_ROOT` to an existing owned temporary directory when `/tmp` lacks
space. If `TMPDIR` is also redirected, that directory must be writable by the
Chrome UID (65534 when this harness runs as root), so it can create its own
process sockets. The browser profile is removed after the course. `QA_OUTPUT` controls
retained receipts and screenshots separately.

It launches a separate sandboxed Chromium profile under an unprivileged UID when
run as root, admits the browser through the maintained sandbox check, and serves
the real local application. It exercises the existing entry link, three actual
raw inputs, source PNG reattachment/wrong-image refusal, real download/fresh
reopen, explicit practice handoff and actual placements, invalid imports, size
drafts, late-read retirement, 390px keyboard inspection and unresolved controls.
All images in this course are authored geometric controls generated at runtime.
