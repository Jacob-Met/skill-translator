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

## Receive a focused result without losing the full task

After practicing a selected set, export its source annotations and practice
session from Complete Task. Reopen the original review and use **Bring a focused
attempt back** to attach those files with an explicit label. The receiver checks
the original task reference and uses the maintained practice importer to verify
both the supplied source and the unchanged selected subset of the original task.
Changed source geometry, rules, tolerances or target dimensions are refused.

Up to eight separate drill sessions may be retained. Select the particular
original and drill rounds to compare. Raw archived and current placements remain
available; the paired RMS uses only marks actually present in both selected
rounds. Every original mark stays visible, including those not practiced in the
drill. A passing subset cannot complete or replace the original full-task result.
The user may remove an attached drill without altering the original rounds.

The source reference identifies compatible task geometry, not a unique earlier
practice session. Attaching a source-equivalent drill to this review is an
explicit user association. Its declared source review round numbers are retained
as metadata; they do not verify that it followed the particular original rounds
shown here. No acquired-skill or temporal improvement claim is made.

Saving a review with attached results uses the separate
`skill-translator-focused-review/v1` wrapper, retaining the original review and
each focused source/session. This avoids an older simple-review reader silently
accepting and dropping attachments. The current page accepts both formats and
recomputes findings. A late result import cannot attach into a newer original
review. **Open a fresh full-task retest** restores all original marks into the
maintained practice page, with no inherited placements and with targets hidden.
Save the complete review before leaving.

The focused-result browser course is `node tools/browser-focused-results.mjs`,
using the same existing test runtime configuration described below. Its authored
controls include an actual two-round focused session, selected-round comparison,
wrong-source refusal, mobile reopen and a fresh complete-task receiver.

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
