# Return a complete practice task to its demonstrated relationships

After practicing a [complete demonstrated task](RAW_TASK_PROPOSALS.md), export
the actual practice session. Follow **Compare this exported attempt with
demonstrated relationships** in the existing practice page. Open the saved
complete task and then its practice session. The same `/demonstration-practice`
page still accepts the original single-mark demonstration accounts and reviews.

The receiver admits sessions bound to either the complete original task or its
recomputed composed proposals. A source, rule, tolerance or provenance mismatch
refuses the incoming session while retaining accepted work. It never rewrites a
session reference to make it match. Actual practice dimensions remain the
session's dimensions, even when they differ from the planned task size.

Select an examined mark and an actual round. The comparison reuses the existing
per-mark five-rule survivor evaluator. It shows the retained placement against
every supported interpretation at that size, together with its original
positional tolerance and unchanged original whole-task score. The complete-task
summary exposes all examined marks and explicitly names unexamined marks.
Ambiguous source relationships are not silently chosen. No-evidence and
contradicted source accounts remain distinct in the summary and supply no
demonstrated-rule agreement. Missing placements remain missing.

Historical rounds and the current round stay separate. A fresh empty round does
not inherit the preceding round's success. Switching marks retains the selected
round. Original practice/photo records remain in the admitted session; this
receiver does not create attempts, move points or clear manual overrides. It
does not invent assistance records that the original practice session lacks. Source geometry and original-image inspection
use the same exact-image receiver as the single-mark workflow.

Save the comparison to keep the complete raw task and actual session together.
Reopening recomputes every score and interpretation; supplied derived verdicts
are ignored. Admission bounds the combined account at 2 MB so a newly accepted
comparison can be saved without discarding sources or rounds. This includes all
raw demonstration accounts from the task, rather than only the selected mark.

## Observed baseline and advance

At merged `3b901184aa6533481172d0514a560dfa3373806f`, a three-mark composed
practice session correctly passes its placement task, but each of its three
separate accounts is refused by the single-mark feedback receiver: that receiver
only admits the original source or a source changing one mark. Manually
rewriting the session reference would erase the actual task's identity.

The new path admits that original composed session directly and applies the
same factored comparison to every examined mark. A separate original-source
attempt can agree with every demonstrated survivor while its original task
score remains failed. Both results are retained. These are authored geometric
controls, not physical demonstrations or evidence of learning.

Per-mark agreement does not establish that the combined rules are jointly
physically feasible, that they express expert intention, or that a learner can
perform the task independently. All interpretations remain conditioned on the
original source calibration, correspondence and supplied bounds. New evidence
may change the conditional comparison without changing the retained attempt.

## Verification

```sh
node --test --test-isolation=none \
  test/raw-task-practice.test.mjs \
  test/demonstration-practice.test.mjs \
  test/raw-task-proposals.test.mjs
```

The existing `tools/browser-raw-task-proposals.mjs` course now carries the actual
complete-task practice download through the existing feedback link, compares
all three marks, retains a completed historical round beside a fresh empty
round, reattaches original PNGs, downloads the comparison and reopens it in a
fresh page. Foreign-session refusal and 390px keyboard inspection exercise the
maintained receiver. Existing browser runtime and optional owned tmpfs setup
are documented in [complete task proposals](RAW_TASK_PROPOSALS.md).
