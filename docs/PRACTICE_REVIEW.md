# Review retained attempts and choose a focused drill

Open `/practice-review` from the Complete Task export section. Export both the
source annotations and practice session, then open that pair. The review uses the
maintained `importPractice` source binding and `evaluatePractice` assessment; it
does not implement another placement score. A source file is limited to 256 KiB,
and a session or saved review to 2 MiB.

Choose an earlier and later retained round. The paired RMS comparison uses only
marks actually placed in both rounds. All other marks remain visibly missing;
they never contribute a zero error. Each mark shows its retained physical
coordinates, signed displacement, distance from target, tolerance result and
per-round error plot. Whole-round summaries retain incompleteness. The active
round may still be unfinished, and archiving a round is not an authenticated
submission.

Select one or more marks explicitly to create a focused drill. The source
geometry, original landmark identities, rules, tolerances and provenance are
preserved. The focused source retains an original task reference and the chosen
round numbers. The existing Complete Task page receives it as an empty fresh
session with target marks hidden. Previous attempts do not become performance
on the focused task. The full original source and raw round history remain in
the saved review bundle; save it before leaving. A focused task is intentionally
incompatible with a full-task practice session when marks were removed.

Save/reopen recomputes all results from retained placements, ignoring saved
derived verdicts. Invalid imports preserve the accepted review, and a late file
read cannot replace a newer example or edited selection. Data stays local.

## Interpretation limits

These sessions did not record assistance history, elapsed time or physical
conditions. A smaller geometric error is a descriptive difference, not evidence
of learning, a cause, expert equivalence or physical task success. Missing rounds
are not failures or passes. Comparing only the common marks exposes the
comparison population; it does not make those observations representative.
Photo-backed source metadata is retained but this page does not authenticate
the source image or the learner's physical actions.

## Verification

`node --test --test-isolation=none test/*.test.mjs` on Node 24 (or the ordinary
maintained test command on supported Node versions) exercises the native course.
`node tools/browser-practice-review.mjs` uses existing Puppeteer/Chrome through
`PUPPETEER_PATH` and `CHROME_BINARY`. The optional `CHROME_TEST_NO_SANDBOX=1` is
only for an explicitly admitted isolated test environment that requires it;
ordinary browser execution keeps its sandbox. The browser course uses authored
geometry, exercises actual Complete Task exports and the focused-task receiver,
and writes source/receipt/screenshots under `QA_OUTPUT` or the dated receipt
directory. Passing it establishes software receiving, not measured skill.
